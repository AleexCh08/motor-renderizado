import { useEffect, useRef } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;

export default function WorkspaceCanvas({ onCanvasReady, logicalSize }) {
  const canvasElRef = useRef(null);
  const stageBoxRef = useRef(null);
  const fabricRef = useRef(null);

  // 1. Inicializar Fabric.js una sola vez (Persistencia garantizada al deslizar vistas)
  useEffect(() => {
    const instance = new fabric.Canvas(canvasElRef.current, {
      width: 1080,
      height: 1080,
      preserveObjectStacking: true,
      backgroundColor: '#14112E',
      selectionColor: 'rgba(39, 24, 126, 0.15)',
      selectionBorderColor: '#27187E',
      selectionLineWidth: 2,
    });

    fabricRef.current = instance;
    onCanvasReady(instance);

    return () => {
      instance.dispose();
    };
  }, [onCanvasReady]);

  // 2. Escalado visual responsivo para Móvil y Monitor PC (Sin alterar la resolución de exportación)
  useEffect(() => {
    const updateVisualScale = () => {
      const canvas = fabricRef.current;
      const stage = stageBoxRef.current;
      if (!canvas || !stage) return;

      const availW = Math.max(240, stage.clientWidth - 28);
      const availH = Math.max(240, stage.clientHeight - 28);

      const scale = Math.min(availW / logicalSize.width, availH / logicalSize.height);
      const cssW = Math.floor(logicalSize.width * scale);
      const cssH = Math.floor(logicalSize.height * scale);

      // Actualiza la resolución interna real de exportación
      canvas.setDimensions(
        { width: logicalSize.width, height: logicalSize.height },
        { backstoreOnly: true }
      );

      // Actualiza el tamaño visual en la pantalla del teléfono o monitor
      canvas.setDimensions(
        { width: `${cssW}px`, height: `${cssH}px` },
        { cssOnly: true }
      );

      canvas.renderAll();
    };

    updateVisualScale();

    const observer = new ResizeObserver(updateVisualScale);
    if (stageBoxRef.current) {
      observer.observe(stageBoxRef.current);
    }
    window.addEventListener('resize', updateVisualScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateVisualScale);
    };
  }, [logicalSize]);

  return (
    <div className="canvas-stage-box" ref={stageBoxRef}>
      <div className="canvas-frame-neu">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}