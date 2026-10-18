import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;

export const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
];

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

export function applyBackgroundCover(canvas, bgImageObj, targetWidth, targetHeight) {
  if (!bgImageObj) return;

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
 * Motor de Renderizado High-Tech (Estilo Referencia)
 */
export function renderHudSpecifications(canvas, specsList, productObj, config) {
  // 1. Limpiar HUD anterior
  const existingSpecs = canvas.getObjects().filter((obj) => obj.customType === 'hud-spec' || obj.customType === 'hud-ring');
  existingSpecs.forEach((obj) => canvas.remove(obj));

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // 2. Dibujar anillos de radar decorativos
  if (productObj) {
    const prodCenter = productObj.getCenterPoint();
    const ringRadius = (productObj.height * productObj.scaleY) * 0.52;

    const ringInner = new fabric.Circle({
      radius: ringRadius,
      left: prodCenter.x,
      top: prodCenter.y,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: config.colorMain,
      strokeWidth: 1.5,
      strokeDashArray: [10, 15],
      opacity: 0.4,
      selectable: false,
      evented: false,
      customType: 'hud-ring'
    });

    const ringOuter = new fabric.Circle({
      radius: ringRadius + 20,
      left: prodCenter.x,
      top: prodCenter.y,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: config.colorMain,
      strokeWidth: 3,
      opacity: 0.15,
      selectable: false,
      evented: false,
      customType: 'hud-ring'
    });

    canvas.add(ringInner, ringOuter);
    ringInner.sendToBack();
    ringOuter.sendToBack();
  }

  // 3. Procesar los datos
  const validSpecs = specsList.filter((s) => s.clave.trim() && s.valor.trim());
  const specsIzq = validSpecs.filter((s) => s.posicion === 'izquierda');
  const specsDer = validSpecs.filter((s) => s.posicion === 'derecha');

  const baseRef = Math.min(canvas.width, canvas.height);
  
  // CORRECCIÓN DE TAMAÑO: Aumentamos la base matemática y la multiplicamos por el slider del usuario
  const sizeClave = Math.max(22, Math.floor(baseRef * 0.028 * config.fontScale));
  const sizeValor = Math.max(18, Math.floor(baseRef * 0.020 * config.fontScale));
  
  const lineLen = Math.floor(canvas.width * 0.12);
  const dropX = Math.floor(canvas.width * 0.05);

  const availableHeight = canvas.height * 0.6;
  const startY = (canvas.height - availableHeight) / 2;

  const prodWidth = productObj ? productObj.getScaledWidth() : canvas.width * 0.3;
  const anchorDist = (prodWidth / 2) + (canvas.width * 0.02);

  const buildColumn = (arr, esDerecha) => {
    const espaciado = arr.length > 1 ? availableHeight / (arr.length - 1) : 0;

    arr.forEach((spec, idx) => {
      const posY = startY + idx * espaciado + (arr.length === 1 ? centerY : 0);
      const isTopHalf = posY < centerY;
      const angleHeight = Math.abs(posY - centerY) > 40 ? 40 : 0; 
      
      const lineY = isTopHalf ? angleHeight : 0;
      const circleY = isTopHalf ? 0 : angleHeight;

      // Título Principal (Color clave y fuente elegida)
      const textoClave = new fabric.Text(spec.clave.trim().toUpperCase(), {
        fontSize: sizeClave,
        fill: config.colorKey,
        fontFamily: config.fontFamily,
        fontWeight: 'bold',
        originX: esDerecha ? 'left' : 'right',
        originY: 'bottom',
        left: esDerecha ? dropX : lineLen,
        top: lineY - 6,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 6, offsetX: 1, offsetY: 1 }),
      });

      // Valor Secundario (Color Main y fuente elegida)
      const textoValor = new fabric.Text(spec.valor.trim().toUpperCase(), {
        fontSize: sizeValor,
        fill: config.colorMain,
        fontFamily: config.fontFamily,
        fontWeight: config.fontFamily === 'Harman Retro' ? 'normal' : '500', // Harman ya es gruesa por defecto
        charSpacing: 50,
        originX: esDerecha ? 'left' : 'right',
        originY: 'top',
        left: esDerecha ? dropX : lineLen,
        top: lineY + 6,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 1, offsetY: 1 }),
      });

      let svgPath = '';
      const circleX = esDerecha ? 0 : lineLen + dropX;
      
      if (esDerecha) {
        svgPath = `M 0 ${circleY} L ${dropX} ${lineY} L ${dropX + lineLen} ${lineY}`;
      } else {
        svgPath = `M 0 ${lineY} L ${lineLen} ${lineY} L ${circleX} ${circleY}`;
      }

      // Líneas
      const rutaLinea = new fabric.Path(svgPath, {
        fill: '',
        stroke: config.colorMain,
        strokeWidth: 2,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4 }),
      });

      // Anclajes
      const anchorCircle = new fabric.Circle({
        radius: 4,
        fill: '#050B1A',
        stroke: config.colorMain,
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        left: circleX,
        top: circleY,
      });

      const detailCircle = new fabric.Circle({
        radius: 2,
        fill: config.colorMain,
        originX: 'center',
        originY: 'center',
        left: esDerecha ? dropX : lineLen,
        top: lineY,
      });

      const groupElements = [rutaLinea, anchorCircle, detailCircle, textoClave, textoValor];
      const absLeft = esDerecha ? centerX + anchorDist : centerX - anchorDist;

      const grupoSpec = new fabric.Group(groupElements, {
        left: absLeft,
        top: posY,
        originX: esDerecha ? 'left' : 'right',
        originY: 'center',
        borderColor: config.colorMain,
        cornerColor: '#050B1A',
        cornerStrokeColor: config.colorMain,
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