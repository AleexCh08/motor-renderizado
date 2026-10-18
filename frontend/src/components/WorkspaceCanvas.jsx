import { useEffect, useRef } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
import { ImageIcon } from 'lucide-react';

export default function WorkspaceCanvas({ onCanvasReady, logicalSize, hasRender }) {
  const canvasElRef = useRef(null);
  const stageBoxRef = useRef(null);
  const fabricRef = useRef(null);

  // 1. Inicializar Fabric.js UNA SOLA VEZ en la vida del componente
  useEffect(() => {
    if (!canvasElRef.current) return; 

    const instance = new fabric.Canvas(canvasElRef.current, {
      width: 1080,
      height: 1080,
      preserveObjectStacking: true,
      backgroundColor: '#14112E',
      selectionColor: 'rgba(0, 217, 255, 0.15)',
      selectionBorderColor: '#00D9FF',
      selectionLineWidth: 1.5,
      allowTouchScrolling: true, 
    });

    instance.on('touch:gesture', (e) => {
      if (e.e.touches && e.e.touches.length === 2) {
        const target = instance.getActiveObject();
        
        if (target && target.type === 'image') {
          const scaleDiff = (e.self.scale - 1) * 0.1; 
          let newScale = target.scaleX + scaleDiff;
        
          if (newScale > 0.2 && newScale < 3) {
            target.scale(newScale);
            target.setCoords(); 
            instance.renderAll();
          }
        }
      }
    });

    fabricRef.current = instance;
    onCanvasReady(instance);

    return () => {
      instance.dispose();
      fabricRef.current = null;
    };
  }, [onCanvasReady]); // CRÍTICO: Se eliminó `hasRender` de aquí para que no mate a Fabric.js

  // 2. Escalado visual responsivo
  useEffect(() => {
    const updateVisualScale = () => {
      const canvas = fabricRef.current;
      const stage = stageBoxRef.current;
      // Si el lienzo está oculto o no existe, no escalamos
      if (!canvas || !stage || !hasRender) return;

      const availW = Math.max(240, stage.clientWidth - 28);
      const availH = Math.max(240, stage.clientHeight - 28);

      const scale = Math.min(availW / logicalSize.width, availH / logicalSize.height);
      const cssW = Math.floor(logicalSize.width * scale);
      const cssH = Math.floor(logicalSize.height * scale);

      canvas.setDimensions(
        { width: logicalSize.width, height: logicalSize.height },
        { backstoreOnly: true }
      );

      canvas.setDimensions(
        { width: `${cssW}px`, height: `${cssH}px` },
        { cssOnly: true }
      );

      canvas.renderAll();
    };

    // Usamos un pequeño timeout para asegurar que el display: block ya hizo efecto en el DOM
    const timeoutId = setTimeout(updateVisualScale, 50);

    const observer = new ResizeObserver(updateVisualScale);
    if (stageBoxRef.current) {
      observer.observe(stageBoxRef.current);
    }
    window.addEventListener('resize', updateVisualScale);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateVisualScale);
    };
  }, [logicalSize, hasRender]);

  return (
    <div className="canvas-stage-box" ref={stageBoxRef}>
      
      {/* PANTALLA DE ESPERA (Se oculta con display: none pero no se destruye) */}
      <div 
        className="empty-stage-placeholder" 
        style={{ display: hasRender ? 'none' : 'flex' }}
      >
        <div className="pulse-ring"></div>
        <ImageIcon size={48} className="placeholder-icon" />
        <p>Esperando producto e insumos...</p>
      </div>

      {/* LIENZO INTERACTIVO (Se oculta con display: none para proteger la instancia) */}
      <div 
        className="canvas-frame-neu" 
        style={{ display: hasRender ? 'inline-flex' : 'none' }}
      >
        <canvas ref={canvasElRef} />
      </div>

    </div>
  );
}