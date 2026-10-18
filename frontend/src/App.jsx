import { useState, useRef, useCallback, useEffect } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import TopNavPill from './components/TopNavPill';
import ConfigPanel from './components/ConfigPanel';
import WorkspaceCanvas from './components/WorkspaceCanvas';
import FloatingFabBar from './components/FloatingFabBar';
import {
  getTargetDimensions,
  applyBackgroundCover,
  renderHudSpecifications,
} from './utils/hudBuilder';
import NotFound from './components/NotFound';

// Generador de especificación vacía para iniciar limpio y para el reseteo
const getEmptySpec = () => ({
  id: Date.now(),
  posicion: 'izquierda',
  clave: '',
  valor: '',
});

export default function App() {
  // Navegación horizontal ('panel' | 'studio')
  const [activeView, setActiveView] = useState('panel');

  // Estado del Modal de Reseteo
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Archivos e imágenes en caché
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);

  // Caché para no llamar a Python innecesariamente si la foto del producto no cambió
  const [needsAiCall, setNeedsAiCall] = useState(true);
  const [hasRender, setHasRender] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Especificaciones inician con 1 solo campo vacío
  const [specs, setSpecs] = useState([getEmptySpec()]);
  const [selectedRatio, setSelectedRatio] = useState('original');
  const [logicalSize, setLogicalSize] = useState({ width: 1080, height: 1080 });
  const [bgColor, setBgColor] = useState('#14112E');

  const [hudConfig, setHudConfig] = useState({
    fontScale: 1.0,
    fontFamily: 'Plus Jakarta Sans',
    colorMain: '#00D9FF', // Líneas y Valor
    colorKey: '#FFFFFF',  // Clave
  });

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500); // Se oculta solo en 3.5s
  }, []);

  // Referencias a objetos de Fabric.js en memoria
  const canvasRef = useRef(null);
  const bgFabricObjRef = useRef(null);
  const productFabricObjRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Si el entorno está virgen (sin producto, fondo, ni textos escritos), permite salir sin preguntar
      const isVirginState = !productFile && !bgFile && specs.length === 1 && !specs[0].clave && !specs[0].valor;
      if (isVirginState) return;

      e.preventDefault();
      e.returnValue = ''; // Requisito técnico estricto de Chrome/Edge para activar su modal nativo
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [productFile, bgFile, specs]);

  const handleCanvasReady = useCallback((instance) => {
    canvasRef.current = instance;
  }, []);

  // Cargar nuevo fondo
  const handleSelectBg = (file) => {
    const url = URL.createObjectURL(file);
    setBgFile(file);
    setBgPreview(url);

    fabric.Image.fromURL(url, (img) => {
      bgFabricObjRef.current = img;
    });
  };

  // Cargar nuevo producto (Marca que sí requiere llamada a FastAPI)
  const handleSelectProduct = (file) => {
    const url = URL.createObjectURL(file);
    setProductFile(file);
    setProductPreview(url);
    setNeedsAiCall(true);
  };

  // Gestión de filas de especificaciones
  const handleAddSpec = () => {
    setSpecs((prev) => [
      ...prev,
      { id: Date.now(), posicion: 'izquierda', clave: '', valor: '' },
    ]);
  };

  const handleUpdateSpec = (id, field, value) => {
    setSpecs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveSpec = (id) => {
    setSpecs((prev) => prev.filter((item) => item.id !== id));
  };

  // Función que ensambla o actualiza el lienzo según proporción, fondo, producto y HUD
  const composeScene = useCallback(
    async (ratioId, prodObj, bgObj, currentSpecs, currentBgColor, currentHudConfig) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        await document.fonts.load('16px "Harman Retro"');
      } catch {
        // Continúa con fuente de respaldo si falla
      }

      const dims = getTargetDimensions(ratioId, bgObj);
      setLogicalSize(dims);

      canvas.setDimensions(
        { width: dims.width, height: dims.height },
        { backstoreOnly: true }
      );

      // 1. Aplicar fondo en modo Cover
      applyBackgroundCover(canvas, bgObj, dims.width, dims.height);
      if (!bgObj) {
        canvas.setBackgroundColor(currentBgColor, canvas.renderAll.bind(canvas));
      }

      // 2. Posicionar el producto centrado y escalado al 68% de la altura
      if (prodObj) {
        const isNew = !canvas.getObjects().includes(prodObj);
        
        if (isNew) {
          canvas.add(prodObj);
          prodObj.scaleToHeight(dims.height * 0.68);
          canvas.centerObject(prodObj);
        }
        
        // Solo actualizamos colores y bordes, respetando su rotación, escala y posición actual
        prodObj.set({
          borderColor: currentHudConfig ? currentHudConfig.colorMain : '#00D9FF',
          cornerColor: '#050B1A',
          cornerStrokeColor: currentHudConfig ? currentHudConfig.colorMain : '#00D9FF',
          transparentCorners: false,
          cornerSize: 18,
          touchCornerSize: 48,
          cornerStyle: 'circle',
          padding: 16,
          rotatingPointOffset: 50,
          borderDashArray: [6, 6],
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.62)',
            blur: Math.floor(Math.min(dims.width, dims.height) * 0.025),
            offsetX: 0,
            offsetY: Math.floor(dims.height * 0.015),
          }),
        });
        prodObj.setCoords();
      }

      // 3. Dibujar especificaciones HUD alrededor
      renderHudSpecifications(canvas, currentSpecs, prodObj, currentHudConfig);
      canvas.renderAll();
    },
    []
  );

  // Procesar con IA (o actualizar en vivo si ya estaba recortado)
  const handleProcessAndRender = async () => {
    if (!productFile) return;

    setIsProcessing(true);

    try {
      // Si el producto cambió, llamamos a FastAPI
      if (needsAiCall || !productFabricObjRef.current) {
        setStatusMsg('Renderizando producto ...');
        const formData = new FormData();
        formData.append('file', productFile);

        const res = await fetch('/api/process', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Error del servidor: ${res.status}`);
        }

        const blob = await res.blob();
        const processedUrl = URL.createObjectURL(blob);

        await new Promise((resolve) => {
          fabric.Image.fromURL(processedUrl, (img) => {
            if (productFabricObjRef.current && canvasRef.current) {
              canvasRef.current.remove(productFabricObjRef.current);
            }
            productFabricObjRef.current = img;
            resolve();
          });
        });

        setNeedsAiCall(false);
      }

      setStatusMsg('Maquetando escenario ...');
      await composeScene(
        selectedRatio,
        productFabricObjRef.current,
        bgFabricObjRef.current,
        specs,
        bgColor,
        hudConfig
      );

      setStatusMsg(null);
      setHasRender(true);
      setActiveView('studio'); // Desliza horizontalmente hacia la vista del Estudio
      showToast('Renderizado completado con éxito', 'success');
    } catch (error) {
      console.error(error);
      setStatusMsg(null); // Quita el bloqueo de pantalla
      showToast('Error de conexión o fallo al procesar la imagen.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cambio de formato en tiempo real desde la barra FAB (1:1, 4:3, 16:9, etc.)
  const handleSelectRatio = async (newRatioId) => {
    setSelectedRatio(newRatioId);
    await composeScene(
      newRatioId,
      productFabricObjRef.current,
      bgFabricObjRef.current,
      specs,
      bgColor,
      hudConfig
    );
  };

  // Cambiar el color del fondo en vivo sin recargar la escena
  const handleChangeBgColor = (newColor) => {
    setBgColor(newColor);
    const canvas = canvasRef.current;
    if (canvas && !bgFabricObjRef.current) {
      canvas.setBackgroundColor(newColor, canvas.renderAll.bind(canvas));
    }
  };

  // Actualizar configuración del HUD en VIVO (sin reiniciar ni tocar FastAPI)
  const handleUpdateHudConfig = async (field, value) => {
    const newConfig = { ...hudConfig, [field]: value };
    setHudConfig(newConfig);
    
    if (canvasRef.current) {
      if (field === 'fontFamily') {
        try {
          await document.fonts.load(`16px "${value}"`);
        } catch (error) {
          console.warn(`La fuente ${value} tardó en responder.`);
        }
      }
      
      renderHudSpecifications(canvasRef.current, specs, productFabricObjRef.current, newConfig);
    }
  };

  // Acciones rápidas del FAB
  const handleCenterProduct = () => {
    const canvas = canvasRef.current;
    const prod = productFabricObjRef.current;
    if (!canvas || !prod) return;
    prod.set({ angle: 0 });
    prod.scaleToHeight(canvas.height * 0.68);
    canvas.centerObject(prod);
    prod.setCoords();
    canvas.renderAll();
  };

  const handleRelayoutHud = () => {
    if (!canvasRef.current) return;
    renderHudSpecifications(canvasRef.current, specs, productFabricObjRef.current, hudConfig, true);
  };

  // Descarga en alta resolución con el formato elegido en el nombre del archivo
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.renderAll();

    const link = document.createElement('a');
    const ratioTag = selectedRatio.replace(':', 'x');
    link.download = `render_producto_${ratioTag}.jpg`;
    link.href = canvas.toDataURL({
      format: 'jpeg',
      quality: 1.0,
      multiplier: 1,
    });
    link.click();
    showToast('Imagen descargada correctamente', 'success');
  };

  // Abre el modal en lugar del alert del navegador
  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  // Ejecuta la limpieza real y cierra el modal
  const confirmReset = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      canvasRef.current.setBackgroundColor('#14112E', canvasRef.current.renderAll.bind(canvasRef.current));
    }
    bgFabricObjRef.current = null;
    productFabricObjRef.current = null;
    setBgFile(null);
    setBgPreview(null);
    setProductFile(null);
    setProductPreview(null);
    setSpecs([getEmptySpec()]);
    setSelectedRatio('original');
    setHasRender(false);
    setNeedsAiCall(true);
    setActiveView('panel');
    setIsResetModalOpen(false);
    showToast('Proyecto reiniciado correctamente', 'success');
  };

  // Interceptor Nativo 404
  if (currentPath !== '/' && currentPath !== '/index.html') {
    return <NotFound onReturn={() => {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
    }} />;
  }

  return (
    <div className="app-shell">
      <div className="bg-grid-overlay"></div>
      {/* Sistema de Notificaciones Toasts */}
      {toast && (
        <div className="toast-container">
          <div className={`neu-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} color="#34C759" /> : <AlertCircle size={18} color="#FF453A" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Píldora superior de navegación */}
      <TopNavPill
        activeView={activeView}
        setActiveView={setActiveView}
        specsCount={specs.filter((s) => s.clave.trim() && s.valor.trim()).length}
        hasRender={hasRender}
        onResetAll={handleResetClick}
      />

      {/* Indicador de estado flotante */}
      {statusMsg && (
        <div className="global-loader-overlay">
          <div className="tech-spinner-container">
            <div className="tech-spinner-ring outer"></div>
            <div className="tech-spinner-ring inner"></div>
            <div className="tech-spinner-core"></div>
          </div>
          <div className="loader-text">{statusMsg}</div>
        </div>
      )}

      {/* Carrusel de transición horizontal */}
      <main className="viewport-slider">
        <div className={`slider-track ${activeView === 'studio' ? 'view-studio' : 'view-panel'}`}>
          {/* VISTA 1: PANEL DE INPUTS */}
          <div className="slide-page">
            <ConfigPanel
              bgPreview={bgPreview}
              productPreview={productPreview}
              bgFileName={bgFile?.name}
              productFileName={productFile?.name}
              onSelectBg={handleSelectBg}
              onSelectProduct={handleSelectProduct}
              specs={specs}
              onAddSpec={handleAddSpec}
              onUpdateSpec={handleUpdateSpec}
              onRemoveSpec={handleRemoveSpec}
              onProcess={handleProcessAndRender}
              isProcessing={isProcessing}
              needsAiCall={needsAiCall}
              hasRender={hasRender}
            />
          </div>

          {/* VISTA 2: ESTUDIO DE RENDERIZADO */}
          <div className="slide-page studio-page">
            <WorkspaceCanvas
              onCanvasReady={handleCanvasReady}
              logicalSize={logicalSize}
              hasRender={hasRender}
            />
          </div>
        </div>
      </main>

      {/* Barra FAB inferior exclusiva de la vista Estudio */}
      <FloatingFabBar
        visible={activeView === 'studio'}
        selectedRatio={selectedRatio}
        onSelectRatio={handleSelectRatio}
        onCenterProduct={handleCenterProduct}
        onRelayoutHud={handleRelayoutHud}
        onDownload={handleDownload}
        disabled={!hasRender || isProcessing}
        hasBgImage={bgFile !== null}
        bgColor={bgColor}
        onChangeBgColor={handleChangeBgColor}
        hudConfig={hudConfig}
        onUpdateHudConfig={handleUpdateHudConfig}
        hasSpecs={specs.filter((s) => s.clave.trim() && s.valor.trim()).length > 0}
      />

      {/* MODAL PERSONALIZADO DE REINICIO */}
      {isResetModalOpen && (
        <div className="modal-overlay">
          <div className="neu-modal">
            <div className="modal-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">¿Reiniciar proyecto?</h3>
            <p className="modal-desc">
              Se perderán todos los insumos cargados y el renderizado actual.
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="neu-btn" 
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="neu-btn neu-btn-danger-solid" 
                onClick={confirmReset}
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}