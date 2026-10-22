import { useEffect, useRef, useState } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
import { ImageIcon, Maximize, Minimize } from 'lucide-react';

export default function WorkspaceCanvas({ onCanvasReady, logicalSize, hasRender }) {
  const canvasElRef = useRef(null);
  const stageBoxRef = useRef(null);
  const fabricRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, [onCanvasReady]); 

  // 2. Escalado visual responsivo
  useEffect(() => {
    const updateVisualScale = () => {
      const canvas = fabricRef.current;
      const stage = stageBoxRef.current;
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

  // 3. Lógica de Pantalla Completa (Mobile UX)
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        // Intento de API Nativa (Funciona excelente en Android/Chrome)
        if (stageBoxRef.current.requestFullscreen) {
          await stageBoxRef.current.requestFullscreen();
          if (window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('landscape').catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Fullscreen nativo no soportado por este navegador (iOS). Usando CSS Fallback.", err);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (err) {
        console.warn("Error saliendo de fullscreen", err);
      }
    }
  };

  // Sincronizar estado si el usuario usa el botón "Atrás" de Android para salir
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  return (
    <div className={`canvas-stage-box ${isFullscreen ? 'mobile-fullscreen-active' : ''}`} ref={stageBoxRef}>
      
      {/* PANTALLA DE ESPERA */}
      <div 
        className="empty-stage-placeholder" 
        style={{ display: hasRender ? 'none' : 'flex' }}
      >
        <div className="pulse-ring"></div>
        <ImageIcon size={48} className="placeholder-icon" />
        <p>Esperando producto e insumos...</p>
      </div>

      {/* LIENZO INTERACTIVO */}
      <div 
        className="canvas-frame-neu" 
        style={{ display: hasRender ? 'inline-flex' : 'none' }}
      >
        {/* BOTÓN PANTALLA COMPLETA: Inyectado permanentemente, oculto por el contenedor padre */}
        <button 
          className="fullscreen-toggle-btn" 
          onClick={toggleFullscreen} 
          title="Pantalla Completa"
        >
          {isFullscreen ? <Minimize size={20} color="#FF453A" /> : <Maximize size={20} color="#00D9FF" />}
        </button>
        
        {/* ENVOLTORIO AISLANTE: Protege al canvas de las validaciones de React */}
        <div className="fabric-isolation-wrapper">
          <canvas ref={canvasElRef} />
        </div>
      </div>

    </div>
  );
}