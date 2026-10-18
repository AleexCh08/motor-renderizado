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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OPTIMIZACIÓN CRÍTICA: Inicializar la sesión de IA globalmente
print("Cargando modelo de IA (U-2-Net) en la memoria RAM...")
session_ia = new_session("u2net")
print("Modelo cargado. Servidor listo para recibir fotos.")

@app.post("/process")
async def procesar_imagen(file: UploadFile = File(...)):
    print(f"Recibiendo foto: {file.filename}")
    
    try:
        # 1. BLINDAJE LECTURA: Asegurar que es una imagen válida y corregir orientación
        contents = await file.read()
        try:
            imagen_original = Image.open(io.BytesIO(contents))
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="El archivo subido no es una imagen válida o está corrupto.")

        imagen_original = ImageOps.exif_transpose(imagen_original)
        
        # BLINDAJE COLOR: Forzar a RGBA para evitar fallos si el cliente sube fotos CMYK o indexadas
        imagen_original = imagen_original.convert("RGBA")
        
        # Normalizar tamaño máximo a 1500px (Protección de memoria y estabilidad matricial)
        imagen_original.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
        
        # 2. IA RECORTE: Alpha Matting calibrado para e-commerce
        print("Recortando fondo...")
        with open(os.devnull, "w") as fnull, contextlib.redirect_stdout(fnull), contextlib.redirect_stderr(fnull):
            imagen_sin_fondo = remove(
                imagen_original, 
                session=session_ia,
                post_process_mask=True,
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10, # Bajado a 10 para no comerse las sombras suaves
                alpha_matting_erode_size=10 # Bajado a 10 para no decapitar cuellos de franelas ni hilos
            )
        
        # 3. ENCUADRE: Auto-recorte del aire transparente
        print("Ajustando caja delimitadora del producto...")
        caja_limite = imagen_sin_fondo.getbbox()
        if caja_limite:
            imagen_sin_fondo = imagen_sin_fondo.crop(caja_limite)

        # 4. PDI AVANZADO: Aislar el canal Alpha para proteger el borde
        print("Aplicando PDI: Aislamiento de canales y realce...")
        
        # Separar Rojo, Verde, Azul y Transparencia (Alpha)
        r, g, b, a = imagen_sin_fondo.split()
        imagen_rgb = Image.merge('RGB', (r, g, b))
        
        # 4.1 Realce de Color (Solo afecta la tela, no el borde)
        realzador_color = ImageEnhance.Color(imagen_rgb)
        imagen_rgb = realzador_color.enhance(1.12)
        
        # 4.2 Contraste (Volumen)
        realzador_contraste = ImageEnhance.Contrast(imagen_rgb)
        imagen_rgb = realzador_contraste.enhance(1.08)

        # 4.3 Máscara de Enfoque (Unsharp Masking - Técnica Fotográfica Profesional)
        # Esto es infinitamente superior a ImageEnhance.Sharpness. Detecta bordes por umbral y 
        # aumenta el microcontraste sin inyectar ruido ("grano") en la ropa plana.
        imagen_rgb = imagen_rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=125, threshold=3))
        
        # 4.4 Reensamblar: Juntar la foto mejorada con la máscara de recorte original e intacta
        imagen_final_pil = Image.merge('RGBA', imagen_rgb.split() + (a,))
        
        # 5. CODIFICACIÓN Y RESPUESTA
        img_byte_arr = io.BytesIO()
        imagen_final_pil.save(img_byte_arr, format='PNG', optimize=True)
        img_byte_arr = img_byte_arr.getvalue()
        
        print("Devolviendo imagen procesada al cliente.")
        return Response(content=img_byte_arr, media_type="image/png")

    except HTTPException:
        raise # Deja pasar los errores controlados (ej: foto inválida)
    except Exception as e:
        # Blindaje final: Si algo colapsa (ej. memoria llena), no crashea el servidor
        print(f"Error crítico procesando imagen: {e}")
        raise HTTPException(status_code=500, detail="Error interno en el servidor de IA al procesar la imagen.")