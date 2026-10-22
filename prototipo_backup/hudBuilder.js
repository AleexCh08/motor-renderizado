import * as fabricModule from 'fabric';

const fabric =
  fabricModule.fabric ||
  fabricModule.default?.fabric ||
  fabricModule.default ||
  window.fabric;

export const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
];

const DEFAULTS = {
  maxSpecsPerSide: 4,
  useInfoPanels: true,
  useProductGlow: true,
  useThirdRing: true,
  useSafeMargins: true,
  useSelectionFeedback: true,
  useSnapping: true,
  panelOpacity: 0.76,
  ringOpacity: 0.4,
  fontScale: 1,
};

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
  if (!canvas || !bgImageObj || !bgImageObj.width || !bgImageObj.height) return;

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHex(hex) {
  if (typeof hex !== 'string') return '#00E5FF';

  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^[0-9a-f]{6}$/i.test(value)) return `#${value}`;

  return '#00E5FF';
}

function hexToRgba(hex, alpha = 1) {
  const normalized = normalizeHex(hex).replace('#', '');
  const bigint = parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getConfig(config = {}) {
  const merged = { ...DEFAULTS, ...config };

  return {
    ...merged,
    colorMain: normalizeHex(merged.colorMain || '#00E5FF'),
    colorKey: normalizeHex(merged.colorKey || '#FFFFFF'),
    fontFamily: merged.fontFamily || 'Arial',
    fontScale: Number(merged.fontScale) || 1,
  };
}

function createShadow(color, blur, offsetX = 1, offsetY = 1) {
  return new fabric.Shadow({
    color,
    blur,
    offsetX,
    offsetY,
  });
}

function setCoords(object) {
  if (object && typeof object.setCoords === 'function') object.setCoords();
}

function isHudObject(object) {
  return object?.customType === 'hud-spec';
}

function removeExistingHud(canvas) {
  const existingObjects = canvas
    .getObjects()
    .filter(
      (object) =>
        object.customType === 'hud-spec' ||
        object.customType === 'hud-ring' ||
        object.customType === 'hud-glow'
    );

  const savedPositions = {};

  existingObjects.forEach((object) => {
    if (object.customType === 'hud-spec' && object.specId) {
      savedPositions[object.specId] = {
        left: object.left,
        top: object.top,
        angle: object.angle || 0,
        scaleX: object.scaleX || 1,
        scaleY: object.scaleY || 1,
      };
    }

    canvas.remove(object);
  });

  return savedPositions;
}

function createProductRings(canvas, productObj, config) {
  if (!productObj) return;

  const productCenter = productObj.getCenterPoint();
  const productWidth = productObj.getScaledWidth();
  const productHeight = productObj.getScaledHeight();
  const productSize = Math.max(productWidth, productHeight);
  const ringRadius = Math.max(productSize * 0.58, 30);

  if (config.useProductGlow) {
    const productGlow = new fabric.Circle({
      radius: Math.max(productSize * 0.46, 25),
      left: productCenter.x,
      top: productCenter.y,
      originX: 'center',
      originY: 'center',
      fill: new fabric.Gradient({
        type: 'radial',
        coords: {
          x1: productSize * 0.46,
          y1: productSize * 0.46,
          r1: 0,
          x2: productSize * 0.46,
          y2: productSize * 0.46,
          r2: productSize * 0.46,
        },
        colorStops: [
          { offset: 0, color: hexToRgba(config.colorMain, 0.18) },
          { offset: 0.62, color: hexToRgba(config.colorMain, 0.06) },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
      }),
      selectable: false,
      evented: false,
      customType: 'hud-glow',
    });

    canvas.add(productGlow);
    productGlow.sendToBack();
  }

  const ringInner = new fabric.Circle({
    radius: ringRadius,
    left: productCenter.x,
    top: productCenter.y,
    originX: 'center',
    originY: 'center',
    fill: 'transparent',
    stroke: config.colorMain,
    strokeWidth: Math.max(1, productSize * 0.003),
    strokeDashArray: [10, 15],
    opacity: config.ringOpacity,
    selectable: false,
    evented: false,
    customType: 'hud-ring',
  });

  const ringOuter = new fabric.Circle({
    radius: ringRadius + Math.max(18, productSize * 0.025),
    left: productCenter.x,
    top: productCenter.y,
    originX: 'center',
    originY: 'center',
    fill: 'transparent',
    stroke: config.colorMain,
    strokeWidth: Math.max(1, productSize * 0.004),
    opacity: 0.16,
    selectable: false,
    evented: false,
    customType: 'hud-ring',
  });

  canvas.add(ringInner, ringOuter);

  if (config.useThirdRing) {
    const ringAccent = new fabric.Circle({
      radius: ringRadius + Math.max(38, productSize * 0.06),
      left: productCenter.x,
      top: productCenter.y,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: config.colorMain,
      strokeWidth: 1,
      strokeDashArray: [2, 18],
      opacity: 0.1,
      selectable: false,
      evented: false,
      customType: 'hud-ring',
    });

    canvas.add(ringAccent);
  }

  canvas.getObjects().forEach((object) => {
    if (object.customType === 'hud-ring' || object.customType === 'hud-glow') {
      object.sendToBack();
    }
  });
}

function createInfoPanel({
  canvas,
  isRight,
  lineLen,
  dropX,
  lineY,
  panelWidth,
  panelHeight,
  config,
}) {
  if (!config.useInfoPanels) return null;

  return new fabric.Rect({
    width: panelWidth,
    height: panelHeight,
    rx: Math.max(7, panelHeight * 0.18),
    ry: Math.max(7, panelHeight * 0.18),
    fill: `rgba(5, 11, 26, ${config.panelOpacity})`,
    stroke: hexToRgba(config.colorMain, 0.55),
    strokeWidth: 1,
    originX: isRight ? 'left' : 'right',
    originY: 'center',
    left: isRight ? dropX - 14 : lineLen + 14,
    top: lineY,
    shadow: createShadow('rgba(0,0,0,0.28)', 10, 0, 3),
    selectable: false,
    evented: false,
  });
}

function createSpecificationGroup({
  canvas,
  spec,
  index,
  total,
  isRight,
  posY,
  centerX,
  anchorDist,
  lineLen,
  dropX,
  sizeKey,
  sizeValue,
  panelWidth,
  panelHeight,
  savedState,
  config,
}) {
  const centerY = canvas.height / 2;
  const isTopHalf = posY < centerY;
  const angleHeight = Math.abs(posY - centerY) > 40 ? Math.min(40, canvas.height * 0.025) : 0;
  const lineY = isTopHalf ? angleHeight : 0;
  const circleY = isTopHalf ? 0 : angleHeight;
  const textLeft = isRight ? dropX : lineLen;
  const textAlign = isRight ? 'left' : 'right';

  const textWidth = Math.max(panelWidth - 30, canvas.width * 0.13);

  const textoClave = new fabric.Textbox(spec.clave.trim().toUpperCase(), {
    width: textWidth,
    fontSize: sizeKey,
    fill: config.colorKey,
    fontFamily: config.fontFamily,
    fontWeight: 'bold',
    charSpacing: 75,
    lineHeight: 0.9,
    textAlign,
    originX: isRight ? 'left' : 'right',
    originY: 'bottom',
    left: textLeft,
    top: lineY - 9,
    shadow: createShadow('rgba(0,0,0,0.9)', 6),
  });

  const textoValor = new fabric.Textbox(spec.valor.trim().toUpperCase(), {
    width: textWidth,
    fontSize: sizeValue,
    fill: config.colorMain,
    fontFamily: config.fontFamily,
    fontWeight: 'bold',
    charSpacing: 35,
    lineHeight: 1,
    textAlign,
    originX: isRight ? 'left' : 'right',
    originY: 'top',
    left: textLeft,
    top: lineY + 5,
    shadow: createShadow('rgba(0,0,0,0.92)', 7),
  });

  let svgPath;
  const circleX = isRight ? 0 : lineLen + dropX;

  if (isRight) {
    svgPath = `M 0 ${circleY} L ${dropX} ${lineY} L ${dropX + lineLen} ${lineY}`;
  } else {
    svgPath = `M 0 ${lineY} L ${lineLen} ${lineY} L ${circleX} ${circleY}`;
  }

  const rutaLinea = new fabric.Path(svgPath, {
    fill: '',
    stroke: config.colorMain,
    strokeWidth: Math.max(1.5, canvas.width * 0.0015),
    originX: 'left',
    originY: 'top',
    left: 0,
    top: 0,
    shadow: createShadow(hexToRgba(config.colorMain, 0.45), 5, 0, 0),
  });

  const anchorCircle = new fabric.Circle({
    radius: Math.max(5, canvas.width * 0.0045),
    fill: hexToRgba(config.colorMain, 0.16),
    stroke: config.colorMain,
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
    left: circleX,
    top: circleY,
  });

  const anchorCore = new fabric.Circle({
    radius: Math.max(2, canvas.width * 0.002),
    fill: config.colorMain,
    originX: 'center',
    originY: 'center',
    left: circleX,
    top: circleY,
  });

  const detailCircle = new fabric.Circle({
    radius: Math.max(2, canvas.width * 0.002),
    fill: config.colorMain,
    originX: 'center',
    originY: 'center',
    left: isRight ? dropX : lineLen,
    top: lineY,
  });

  const panel = createInfoPanel({
    canvas,
    isRight,
    lineLen,
    dropX,
    lineY,
    panelWidth,
    panelHeight,
    config,
  });

  const groupElements = [
    ...(panel ? [panel] : []),
    rutaLinea,
    anchorCircle,
    anchorCore,
    detailCircle,
    textoClave,
    textoValor,
  ];

  const defaultLeft = isRight ? centerX + anchorDist : centerX - anchorDist;
  const safeMargin = canvas.width * 0.035;
  const finalLeft = savedState?.left ?? (
    config.useSafeMargins
      ? clamp(defaultLeft, safeMargin, canvas.width - safeMargin)
      : defaultLeft
  );
  const finalTop = savedState?.top ?? posY;

  const grupoSpec = new fabric.Group(groupElements, {
    left: finalLeft,
    top: finalTop,
    angle: savedState?.angle ?? 0,
    scaleX: savedState?.scaleX ?? 1,
    scaleY: savedState?.scaleY ?? 1,
    originX: isRight ? 'left' : 'right',
    originY: 'center',
    borderColor: config.colorMain,
    cornerColor: '#050B1A',
    cornerStrokeColor: config.colorMain,
    transparentCorners: false,
    cornerSize: 16,
    touchCornerSize: 44,
    cornerStyle: 'circle',
    padding: 12,
    rotatingPointOffset: 40,
    borderDashArray: [4, 4],
    lockSkewingX: true,
    lockSkewingY: true,
    minScaleLimit: 0.65,
    customType: 'hud-spec',
    specId: spec.id,
    specIndex: index,
    specTotal: total,
  });

  setCoords(grupoSpec);
  return grupoSpec;
}

function installCanvasInteractions(canvas, config) {
  if (!canvas || canvas.__hudInteractionsInstalled) return;

  canvas.__hudInteractionsInstalled = true;

  if (config.useSelectionFeedback) {
    canvas.on('selection:created', ({ selected }) => {
      const selectedObject = selected?.[0];
      if (!isHudObject(selectedObject)) return;

      selectedObject.set({
        borderColor: config.colorMain,
        borderDashArray: [6, 4],
      });

      setCoords(selectedObject);
      canvas.renderAll();
    });

    canvas.on('selection:cleared', () => {
      canvas.renderAll();
    });
  }

  if (config.useSnapping) {
    canvas.on('object:moving', ({ target }) => {
      if (!isHudObject(target)) return;

      const snapDistance = Math.max(6, canvas.width * 0.006);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      if (Math.abs(target.left - centerX) < snapDistance) {
        target.set({ left: centerX });
      }

      if (Math.abs(target.top - centerY) < snapDistance) {
        target.set({ top: centerY });
      }

      if (config.useSafeMargins) {
        const margin = canvas.width * 0.02;
        target.set({
          left: clamp(target.left, margin, canvas.width - margin),
          top: clamp(target.top, margin, canvas.height - margin),
        });
      }

      setCoords(target);
      canvas.renderAll();
    });
  }

  canvas.on('object:modified', ({ target }) => {
    if (isHudObject(target)) setCoords(target);
  });
}

/**
 * Renderiza un HUD comercial alrededor del producto.
 *
 * El modelo de datos se mantiene únicamente como clave-valor:
 * { id, clave, valor, posicion: 'izquierda' | 'derecha' }
 */
export function renderHudSpecifications(
  canvas,
  specsList = [],
  productObj,
  config = {},
  forceRelayout = false
) {
  if (!canvas) return;

  const currentConfig = getConfig(config);
  const savedPositions = removeExistingHud(canvas);

  installCanvasInteractions(canvas, currentConfig);
  createProductRings(canvas, productObj, currentConfig);

  const validSpecs = specsList.filter(
    (spec) => spec?.clave?.trim() && spec?.valor?.trim()
  );

  const specsIzq = validSpecs
    .filter((spec) => spec.posicion === 'izquierda')
    .slice(0, currentConfig.maxSpecsPerSide);

  const specsDer = validSpecs
    .filter((spec) => spec.posicion === 'derecha')
    .slice(0, currentConfig.maxSpecsPerSide);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const baseRef = Math.min(canvas.width, canvas.height);

  const sizeKey = Math.max(
    18,
    Math.floor(baseRef * 0.023 * currentConfig.fontScale)
  );

  const sizeValue = Math.max(
    22,
    Math.floor(baseRef * 0.03 * currentConfig.fontScale)
  );

  const maxItems = Math.max(specsIzq.length, specsDer.length);
  const itemHeight = sizeKey + sizeValue + 48;
  const availableHeight = Math.min(
    canvas.height * 0.68,
    Math.max(itemHeight, maxItems * itemHeight)
  );
  const startY = Math.max(70, (canvas.height - availableHeight) / 2);

  const productWidth = productObj?.getScaledWidth() || canvas.width * 0.3;
  const productHeight = productObj?.getScaledHeight() || canvas.height * 0.3;
  const productSize = Math.max(productWidth, productHeight);
  const anchorDist = productSize / 2 + canvas.width * 0.035;

  const lineLen = clamp(
    Math.floor(canvas.width * 0.12),
    Math.max(55, canvas.width * 0.08),
    Math.max(80, canvas.width * 0.18)
  );
  const dropX = Math.floor(canvas.width * 0.05);
  const panelWidth = clamp(
    canvas.width * 0.24,
    180,
    canvas.width * 0.3
  );
  const panelHeight = Math.max(sizeKey + sizeValue + 27, 74);

  const buildColumn = (items, isRight) => {
    if (!items.length) return;

    const spacing = items.length === 1
      ? 0
      : availableHeight / (items.length - 1);

    items.forEach((spec, index) => {
      // Corrección: un único elemento se centra realmente en el canvas.
      const posY = items.length === 1
        ? centerY
        : startY + index * spacing;

      const savedState = forceRelayout ? null : savedPositions[spec.id];

      const group = createSpecificationGroup({
        canvas,
        spec,
        index,
        total: items.length,
        isRight,
        posY,
        centerX,
        anchorDist,
        lineLen,
        dropX,
        sizeKey,
        sizeValue,
        panelWidth,
        panelHeight,
        savedState,
        config: currentConfig,
      });

      canvas.add(group);
    });
  };

  buildColumn(specsIzq, false);
  buildColumn(specsDer, true);

  canvas.renderAll();
}
