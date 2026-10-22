import { useEffect, useRef, useState } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
import { X, Check, Eraser, Undo } from 'lucide-react';

export default function RefineMaskModal({ processedUrl, onClose, onApply }) {
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const fabricRef = useRef(null);
  const imgRef = useRef(null); // Guardamos la referencia de la imagen para calcular su tamaño

  const [brushSize, setBrushSize] = useState(20);

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const instance = new fabric.Canvas(canvasElRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      isDrawingMode: true,
      backgroundColor: '#0A1020',
    });

    fabricRef.current = instance;

    // Configurar pincel (Línea roja semitransparente que al soltar se vuelve borrador)
    const pencil = new fabric.PencilBrush(instance);
    pencil.width = brushSize;
    pencil.color = 'rgba(255, 69, 58, 0.8)'; 
    instance.freeDrawingBrush = pencil;

    // Cargar SOLO la imagen procesada por la IA
    fabric.Image.fromURL(processedUrl, (procImg) => {
      // Escalar al 85% de la pantalla para trabajar con comodidad
      const scale = Math.min(
        (container.clientWidth * 0.85) / procImg.width,
        (container.clientHeight * 0.85) / procImg.height
      );
      
      procImg.scale(scale);
      instance.centerObject(procImg);
      procImg.set({ selectable: false, evented: false });
      instance.add(procImg);
      imgRef.current = procImg;
      instance.renderAll();
    });

    // Regla matemática: Convertir el trazo en un "agujero" al terminar de dibujar
    instance.on('path:created', (opt) => {
      const path = opt.path;
      path.set({ 
        selectable: false, 
        evented: false,
        globalCompositeOperation: 'destination-out',
        stroke: 'rgba(0,0,0,1)' // Fuerza la opacidad al 100% para perforar el canal Alpha
      });
      instance.renderAll();
    });

    return () => {
      instance.dispose();
      fabricRef.current = null;
    };
  }, [processedUrl]);

  // Actualización fluida del grosor del borrador
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      
      // Construir un círculo vectorial (SVG) del tamaño exacto del pincel
      const size = Math.max(brushSize, 4); // Previene colapsos si el tamaño es muy bajo
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${(size/2) - 1}" fill="rgba(255, 69, 58, 0.15)" stroke="rgba(255, 69, 58, 0.8)" stroke-width="1.5"/>
      </svg>`;
      
      // Convertir el SVG a base64 para inyectarlo como cursor CSS
      const cursorUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      const offset = Math.round(size / 2); // Centrar el punto de acción (hotspot) en el medio del círculo
      
      canvas.freeDrawingCursor = `url('${cursorUrl}') ${offset} ${offset}, crosshair`;
    }
  }, [brushSize]);

  // Historial de deshacer
  const handleUndo = () => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects();
    // El objeto [0] es la prenda. Borramos desde el último trazo hacia atrás.
    if (objects.length > 1) {
      fabricRef.current.remove(objects[objects.length - 1]);
      fabricRef.current.renderAll();
    }
  };

  const handleApply = () => {
    if (!fabricRef.current || !imgRef.current) return;
    const canvas = fabricRef.current;
    const img = imgRef.current;

    // 1. Quitar el fondo azul del quirófano para exportar en PNG transparente
    canvas.backgroundColor = null;
    canvas.renderAll();

    // 2. Extraer dimensiones exactas y aislar la escala
    const rect = img.getBoundingRect();
    const exportScale = 1 / img.scaleX; 

    // 3. RECORTE MATEMÁTICO: Exportar solo la caja de la prenda restaurando su calidad HD
    const dataUrl = canvas.toDataURL({
      format: 'png',
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      multiplier: exportScale
    });

    onApply(dataUrl);
  };

  return (
    <div className="modal-overlay refine-overlay">
      <div className="refine-modal">
        <div className="refine-header">
          <span className="refine-title">Borrar Restos de Fondo</span>
          <button className="icon-circle-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="refine-workspace" ref={containerRef}>
          <canvas ref={canvasElRef} />
        </div>

        <div className="refine-toolbar">
          <div className="refine-tools-group">
            <button 
              className="neu-btn compact-btn active"
              title="Borrador activo"
              style={{ borderColor: '#FF453A', color: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.1)', cursor: 'default' }}
            >
              <Eraser size={20} />
            </button>
            <div className="fab-divider"></div>
            <input
              type="range"
              className="neu-slider refine-slider"
              min="2"
              max="150"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              title="Tamaño del borrador"
            />
          </div>

          <div className="refine-actions-group">
            <button className="neu-btn compact-btn" onClick={handleUndo} title="Deshacer trazo">
              <Undo size={20} />
            </button>
            <button className="neu-btn neu-btn-persian" onClick={handleApply}>
              <Check size={18} />
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}