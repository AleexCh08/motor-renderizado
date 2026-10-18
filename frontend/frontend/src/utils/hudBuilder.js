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
export function renderHudSpecifications(canvas, specsList, productObj) {
  // 1. Limpiar HUD anterior (textos, líneas y anillos de radar)
  const existingSpecs = canvas.getObjects().filter((obj) => obj.customType === 'hud-spec' || obj.customType === 'hud-ring');
  existingSpecs.forEach((obj) => canvas.remove(obj));

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // 2. Dibujar anillos de radar decorativos detrás del producto (Si existe producto)
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
      stroke: 'rgba(0, 217, 255, 0.25)',
      strokeWidth: 1.5,
      strokeDashArray: [10, 15],
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
      stroke: 'rgba(0, 217, 255, 0.08)',
      strokeWidth: 3,
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
  const sizeClave = Math.max(16, Math.floor(baseRef * 0.016));
  const sizeValor = Math.max(14, Math.floor(baseRef * 0.014));
  
  const lineLen = Math.floor(canvas.width * 0.12); // Largo de línea recta
  const dropX = Math.floor(canvas.width * 0.05);   // Ancho del quiebre diagonal

  // Rango de altura donde se distribuirán los textos
  const availableHeight = canvas.height * 0.6;
  const startY = (canvas.height - availableHeight) / 2;

  // Determinar la distancia de los anclajes para que nazcan justo al borde del producto
  const prodWidth = productObj ? productObj.getScaledWidth() : canvas.width * 0.3;
  const anchorDist = (prodWidth / 2) + (canvas.width * 0.02);

  const buildColumn = (arr, esDerecha) => {
    const espaciado = arr.length > 1 ? availableHeight / (arr.length - 1) : 0;

    arr.forEach((spec, idx) => {
      const posY = startY + idx * espaciado + (arr.length === 1 ? centerY : 0);

      // Trigonometría: Determinar si la línea apunta hacia arriba o hacia abajo buscando el centro
      const isTopHalf = posY < centerY;
      const angleHeight = Math.abs(posY - centerY) > 40 ? 40 : 0; 
      
      // Normalización de coordenadas para evitar bounding boxes negativos en Fabric.js
      const lineY = isTopHalf ? angleHeight : 0;
      const circleY = isTopHalf ? 0 : angleHeight;

      // Componente 1: Título Principal
      const textoClave = new fabric.Text(spec.clave.trim().toUpperCase(), {
        fontSize: sizeClave,
        fill: '#FFFFFF',
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: 'bold',
        originX: esDerecha ? 'left' : 'right',
        originY: 'bottom',
        left: esDerecha ? dropX : lineLen,
        top: lineY - 6, // Separación limpia hacia arriba
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 6, offsetX: 1, offsetY: 1 }),
      });

      // Componente 2: Valor (Sci-Fi Cyan)
      const textoValor = new fabric.Text(spec.valor.trim().toUpperCase(), {
        fontSize: sizeValor,
        fill: '#00D9FF',
        fontFamily: 'Plus Jakarta Sans',
        fontWeight: '500',
        charSpacing: 50, // Letras espaciadas (High-Tech)
        originX: esDerecha ? 'left' : 'right',
        originY: 'top',
        left: esDerecha ? dropX : lineLen,
        top: lineY + 6, // Separación limpia hacia abajo
        shadow: new fabric.Shadow({ color: 'rgba(0, 217, 255, 0.4)', blur: 8 }),
      });

      // Componente 3: Vectores (Línea central)
      let svgPath = '';
      const circleX = esDerecha ? 0 : lineLen + dropX;
      
      if (esDerecha) {
        // Círculo -> Sube/Baja diagonal -> Recto a la derecha
        svgPath = `M 0 ${circleY} L ${dropX} ${lineY} L ${dropX + lineLen} ${lineY}`;
      } else {
        // Recto a la izquierda -> Sube/Baja diagonal -> Círculo
        svgPath = `M 0 ${lineY} L ${lineLen} ${lineY} L ${circleX} ${circleY}`;
      }

      const rutaLinea = new fabric.Path(svgPath, {
        fill: '',
        stroke: '#00D9FF',
        strokeWidth: 2,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        shadow: new fabric.Shadow({ color: 'rgba(0, 217, 255, 0.6)', blur: 6 }),
      });

      // Componente 4: Punto de anclaje (Círculo interno near product)
      const anchorCircle = new fabric.Circle({
        radius: 4,
        fill: '#050B1A',
        stroke: '#00D9FF',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        left: circleX,
        top: circleY,
        shadow: new fabric.Shadow({ color: 'rgba(0, 217, 255, 0.8)', blur: 6 }),
      });

      // Componente 5: Punto de acento (Mini nodo en el quiebre de la línea)
      const detailCircle = new fabric.Circle({
        radius: 2,
        fill: '#00D9FF',
        originX: 'center',
        originY: 'center',
        left: esDerecha ? dropX : lineLen,
        top: lineY,
      });

      const groupElements = [rutaLinea, anchorCircle, detailCircle, textoClave, textoValor];

      // Posicionamiento matemático global de la caja interactiva
      const absLeft = esDerecha ? centerX + anchorDist : centerX - anchorDist;

      const grupoSpec = new fabric.Group(groupElements, {
        left: absLeft,
        top: posY,
        originX: esDerecha ? 'left' : 'right',
        originY: 'center',
        borderColor: '#00D9FF',
        cornerColor: '#050B1A',
        cornerStrokeColor: '#00D9FF',
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