from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageEnhance, ImageOps, ImageFilter, UnidentifiedImageError
import io
import os
import contextlib

app = FastAPI(title="Motor de Franelas API")

# Configuración CORS vital para que el Frontend web se pueda conectar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://motor-renderizado.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# El modelo se carga una sola vez para evitar reinicializaciones y conservar rendimiento.
print("Cargando modelo de IA (U-2-Net)...")
session_ia = new_session("u2net")
print("Modelo cargado. Servidor listo para recibir fotos.")

# U-2-Net trabaja internamente con su propia resolución. Mantener una imagen de entrada
# demasiado grande solo consume memoria, pero 1500 px podía eliminar detalle del resultado.
# Se puede ajustar sin tocar el código: MAX_IMAGE_SIDE=2400.
MAX_IMAGE_SIDE = max(1500, int(os.getenv("MAX_IMAGE_SIDE", "2400")))


def limitar_tamano(imagen: Image.Image, lado_maximo: int) -> Image.Image:
    """Reduce solo imágenes grandes; nunca amplía ni cambia la proporción."""
    if max(imagen.size) <= lado_maximo:
        return imagen
    imagen = imagen.copy()
    imagen.thumbnail((lado_maximo, lado_maximo), Image.Resampling.LANCZOS)
    return imagen


def recortar_con_margen(imagen: Image.Image, margen: int = 12) -> Image.Image:
    """Recorta transparencia sobrante sin cortar antialiasing ni sombras suaves."""
    alpha = imagen.getchannel("A")

    # Un umbral muy bajo ignora únicamente píxeles totalmente transparentes.
    # Así no se pierde el borde semitransparente creado por alpha matting.
    bbox = alpha.point(lambda valor: 255 if valor > 3 else 0).getbbox()
    if not bbox:
        return imagen

    izquierda, superior, derecha, inferior = bbox
    izquierda = max(0, izquierda - margen)
    superior = max(0, superior - margen)
    derecha = min(imagen.width, derecha + margen)
    inferior = min(imagen.height, inferior + margen)
    return imagen.crop((izquierda, superior, derecha, inferior))


def realzar_solo_el_interior(rgb: Image.Image, alpha: Image.Image) -> Image.Image:
    """Mejora color/contraste/enfoque sin realzar el fondo transparente ni sus halos."""
    mejorada = ImageEnhance.Color(rgb).enhance(1.10)
    mejorada = ImageEnhance.Contrast(mejorada).enhance(1.06)
    mejorada = mejorada.filter(
        ImageFilter.UnsharpMask(radius=1.35, percent=105, threshold=4)
    )

    # En el borde se conserva el píxel original. El realce completo comienza en el
    # interior opaco, evitando contornos claros/oscuros alrededor de la prenda.
    peso = alpha.point(lambda valor: min(255, max(0, (valor - 20) * 2)))
    return Image.composite(mejorada, rgb, peso)


@app.post("/process")
async def procesar_imagen(file: UploadFile = File(...)):
    print(f"Recibiendo foto: {file.filename}")

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")

        try:
            imagen_original = Image.open(io.BytesIO(contents))
            # Fuerza la decodificación completa antes de cerrar cualquier buffer interno.
            imagen_original.load()
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="El archivo subido no es una imagen válida o está corrupto.",
            )

        # Respeta orientación EXIF y normaliza modos CMYK, paleta, escala de grises, etc.
        imagen_original = ImageOps.exif_transpose(imagen_original).convert("RGB")
        imagen_original = limitar_tamano(imagen_original, MAX_IMAGE_SIDE)

        print("Recortando fondo...")
        with open(os.devnull, "w") as fnull, contextlib.redirect_stdout(fnull), contextlib.redirect_stderr(fnull):
            imagen_sin_fondo = remove(
                imagen_original,
                session=session_ia,
                post_process_mask=True,
                alpha_matting=True,
                # Erosión menor: conserva hilos, costuras y bordes delgados.
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=3,
            )

        # rembg normalmente devuelve RGBA; se normaliza por seguridad para que el
        # endpoint sea estable ante cambios de versión del paquete.
        imagen_sin_fondo = imagen_sin_fondo.convert("RGBA")
        imagen_sin_fondo = recortar_con_margen(imagen_sin_fondo, margen=12)

        print("Aplicando realce de calidad sin contaminar el borde...")
        r, g, b, alpha = imagen_sin_fondo.split()
        rgb = Image.merge("RGB", (r, g, b))
        rgb = realzar_solo_el_interior(rgb, alpha)
        imagen_final = Image.merge("RGBA", (*rgb.split(), alpha))

        # PNG conserva el canal alpha sin pérdida. compress_level 6 ofrece una buena
        # relación entre tamaño de respuesta y tiempo de CPU.
        salida = io.BytesIO()
        imagen_final.save(salida, format="PNG", optimize=True, compress_level=6)

        print("Devolviendo imagen procesada al cliente.")
        return Response(content=salida.getvalue(), media_type="image/png")

    except HTTPException:
        raise
    except Exception as error:
        print(f"Error crítico procesando imagen: {error}")
        raise HTTPException(
            status_code=500,
            detail="Error interno en el servidor de IA al procesar la imagen.",
        )
