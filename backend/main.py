from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageEnhance, ImageOps
import io

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
    
    # 1. Leer la imagen que envía el frontend y corregir rotación de celular (EXIF)
    contents = await file.read()
    imagen_original = Image.open(io.BytesIO(contents))
    imagen_original = ImageOps.exif_transpose(imagen_original)
    
    # 2. Recorte de fondo con suavizado de máscara y Alpha Matting
    print("Recortando fondo...")
    imagen_sin_fondo = remove(
        imagen_original, 
        session=session_ia,
        post_process_mask=True,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10
    )
    
    # 3. Auto-recorte de aire transparente (Encuadre exacto al borde del producto)
    print("Ajustando caja delimitadora del producto...")
    caja_limite = imagen_sin_fondo.getbbox()
    if caja_limite:
        imagen_sin_fondo = imagen_sin_fondo.crop(caja_limite)

    # 4. Procesamiento de color y textura (Calibración de estudio)
    print("Aplicando realce de color y nitidez Premium...")
    
    # Saturación al 12% para dar vida sin quemar tonos intensos
    realzador_color = ImageEnhance.Color(imagen_sin_fondo)
    imagen_mejorada = realzador_color.enhance(1.12)
    
    # Contraste al 8% para dar volumen manteniendo detalle en prendas oscuras
    realzador_contraste = ImageEnhance.Contrast(imagen_mejorada)
    imagen_mejorada = realzador_contraste.enhance(1.08)

    # Nitidez nativa al 30% para destacar la textura sin crear halos en los bordes
    realzador_nitidez = ImageEnhance.Sharpness(imagen_mejorada)
    imagen_final_pil = realzador_nitidez.enhance(1.3)
    
    # 5. Convertir la imagen a bytes para enviarla por internet
    img_byte_arr = io.BytesIO()
    imagen_final_pil.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    
    print("Devolviendo imagen procesada al cliente.")
    return Response(content=img_byte_arr, media_type="image/png")