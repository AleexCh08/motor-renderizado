import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;

// Catálogo de formatos de exportación disponibles en el FAB
export const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
];

/**
 * Calcula las dimensiones lógicas de exportación según el formato elegido
 */
export function getTargetDimensions(ratioId, bgImageObj) {
  const preset = ASPECT_RATIOS.find((r) => r.id === ratioId);
  if (!preset || preset.id === 'original') {
    if (bgImageObj && bgImageObj.width > 0 && bgImageObj.height > 0) {
      return { width: bgImageObj.width, height: bgImageObj.height };
    }
    return { width: 1080, height: 1080 };
  }
  return { width: preset.width, height: preset.height };
}

/**
 * Aplica una imagen de fondo en modo "Cover" (sin estirar ni deformar)
 */
export function applyBackgroundCover(canvas, bgImageObj, targetWidth, targetHeight) {
  if (!bgImageObj) {
    canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    canvas.setBackgroundColor('#14112E', canvas.renderAll.bind(canvas));
    return;
  }

  const scaleX = targetWidth / bgImageObj.width;
  const scaleY = targetHeight / bgImageObj.height;
  const scale = Math.max(scaleX, scaleY);

  bgImageObj.set({
    originX: 'center',
    originY: 'center',
    left: targetWidth / 2,
    top: targetHeight / 2,
    scaleX: scale,
    scaleY: scale,
  });

  canvas.setBackgroundImage(bgImageObj, canvas.renderAll.bind(canvas));
}

/**
 * Construye y distribuye los grupos interactivos de especificaciones HUD
 */
export function renderHudSpecifications(canvas, specsList) {
  // 1. Eliminar únicamente las especificaciones previas (conservando el producto)
  const existingSpecs = canvas.getObjects().filter((obj) => obj.customType === 'hud-spec');
  existingSpecs.forEach((obj) => canvas.remove(obj));

  const validSpecs = specsList.filter((s) => s.clave.trim() && s.valor.trim());
  const specsIzq = validSpecs.filter((s) => s.posicion === 'izquierda');
  const specsDer = validSpecs.filter((s) => s.posicion === 'derecha');

  // Usamos el lado menor como referencia para que en 16:9 o 9:16 el texto no se desproporcione
  const baseRef = Math.min(canvas.width, canvas.height);
  const sizeClave = Math.max(18, Math.floor(baseRef * 0.024));
  const sizeValor = Math.max(14, Math.floor(baseRef * 0.018)); // Más pequeño que la clave
  const anchoLinea = Math.floor(canvas.width * 0.14);
  const caidaY = Math.floor(baseRef * 0.03);

  const startY = canvas.height * 0.24;
  const availableHeight = canvas.height * 0.52;

  const buildColumn = (arr, esDerecha) => {
    const espaciado = arr.length > 1 ? availableHeight / (arr.length - 1) : 0;

    arr.forEach((spec, idx) => {
      const posY = startY + idx * espaciado + (arr.length === 1 ? availableHeight / 2 : 0);

      // Clave principal en negritas
      const textoClave = new fabric.Text(spec.clave.trim().toUpperCase(), {
        fontSize: sizeClave,
        fill: '#ffffff',
        fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
        fontWeight: 'bold',
        originX: esDerecha ? 'right' : 'left',
        originY: 'top',
        top: 0,
        left: esDerecha ? anchoLinea + 28 : 0,
        textAlign: esDerecha ? 'right' : 'left',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.88)', blur: 6, offsetX: 2, offsetY: 2 }),
      });

      // Valor en Harman Retro, sin negritas y más pequeño que la clave
      const textoValor = new fabric.Text(spec.valor.trim(), {
        fontSize: sizeValor,
        fill: '#7dd3fc',
        fontFamily: 'Harman Retro',
        fontWeight: 'normal',
        originX: esDerecha ? 'right' : 'left',
        originY: 'top',
        top: textoClave.height + 6,
        left: esDerecha ? anchoLinea + 28 : 0,
        textAlign: esDerecha ? 'right' : 'left',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.88)', blur: 6, offsetX: 2, offsetY: 2 }),
      });

      const inicioLineaY = textoValor.top + textoValor.height + 10;
      const svgPath = esDerecha
        ? `M ${anchoLinea + 28} ${inicioLineaY} L 28 ${inicioLineaY} L 0 ${inicioLineaY + caidaY}`
        : `M 0 ${inicioLineaY} L ${anchoLinea} ${inicioLineaY} L ${anchoLinea + 28} ${inicioLineaY + caidaY}`;

      const rutaLinea = new fabric.Path(svgPath, {
        fill: '',
        stroke: 'rgba(125, 211, 252, 0.92)',
        strokeWidth: Math.max(2, Math.floor(baseRef * 0.0025)),
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.65)', blur: 4, offsetX: 1, offsetY: 1 }),
      });

      const grupoSpec = new fabric.Group([rutaLinea, textoClave, textoValor], {
        left: esDerecha ? canvas.width * 0.93 : canvas.width * 0.07,
        top: posY,
        originX: esDerecha ? 'right' : 'left',
        originY: 'center',
        borderColor: '#7dd3fc',
        cornerColor: '#27187E',
        cornerStrokeColor: '#ffffff',
        transparentCorners: false,
        cornerSize: 10,
        customType: 'hud-spec',
      });

      canvas.add(grupoSpec);
    });
  };

  buildColumn(specsIzq, false);
  buildColumn(specsDer, true);
  canvas.renderAll();
}