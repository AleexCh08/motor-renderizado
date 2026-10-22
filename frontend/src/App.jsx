import { useState, useRef, useCallback, useEffect } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
if (fabric.Text) {
  fabric.Text.prototype.textBaseline = 'alphabetic';
}
import { AlertTriangle, CheckCircle2, AlertCircle, X, ArrowRight, MessageSquare } from 'lucide-react';
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
import HelpModal from './components/HelpModal';
import RefineMaskModal from './components/RefineMaskModal';

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

  const [showWelcome, setShowWelcome] = useState(() => {
    return sessionStorage.getItem('welcomeClosed') !== 'true';
  });

  const handleCloseWelcome = () => {
    sessionStorage.setItem('welcomeClosed', 'true');
    setShowWelcome(false);
  };

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

  // Estado del Modal de Ayuda
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Estado del Quirófano de Edición
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

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
              onOpenHelp={() => setIsHelpOpen(true)}
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
        onOpenRefine={() => setIsRefineModalOpen(true)}
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

      {/* MODAL DE BIENVENIDA (ONBOARDING) */}
      {showWelcome && (
        <div className="modal-overlay welcome-overlay">
          <div className="neu-modal welcome-modal">
            
            <button className="welcome-close-btn" onClick={handleCloseWelcome} aria-label="Cerrar bienvenida">
              <X size={20} />
            </button>

            <div className="welcome-logo-box">
              <img src="/favicon.png" alt="RenderStudio Logo" />
            </div>

            <h2 className="welcome-title"><span className="text-glow">RenderStudio HUD</span></h2>
            <h3 className="welcome-subtitle">¡Bienvenido a la plataforma!</h3>
            
            <p className="welcome-text">
              Renderizado de alta definición para comercio electrónico.
            </p>

            <div className="welcome-actions">
              <button type="button" className="welcome-btn-primary" onClick={handleCloseWelcome}>
                Continuar al estudio
                <ArrowRight size={18} />
              </button>

              <button 
                type="button"
                onClick={() => window.open('https://api.whatsapp.com/send?phone=584126158019&text=Hola,%20necesito%20soporte%20con%20RenderStudio%20HUD', '_blank')}
                className="welcome-btn-support"
              >
                {/* SVG Oficial de WhatsApp en Verde */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#25D366" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                </svg>
                Soporte Técnico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AYUDA (?) */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}
      
      {/* QUIRÓFANO DE EDICIÓN */}
      {isRefineModalOpen && (
        <RefineMaskModal
          processedUrl={productFabricObjRef.current?.getSrc()}
          onClose={() => setIsRefineModalOpen(false)}
          onApply={(newImageUrl) => {
            fabric.Image.fromURL(newImageUrl, (newImg) => {
              const canvas = canvasRef.current;
              const oldImg = productFabricObjRef.current;

              if (canvas && oldImg) {
                newImg.set({
                  left: oldImg.left,
                  top: oldImg.top,
                  scaleX: oldImg.scaleX,
                  scaleY: oldImg.scaleY,
                  angle: oldImg.angle,
                  borderColor: oldImg.borderColor,
                  cornerColor: oldImg.cornerColor,
                  cornerStrokeColor: oldImg.cornerStrokeColor,
                  transparentCorners: oldImg.transparentCorners,
                  cornerSize: oldImg.cornerSize,
                  touchCornerSize: oldImg.touchCornerSize,
                  cornerStyle: oldImg.cornerStyle,
                  padding: oldImg.padding,
                  rotatingPointOffset: oldImg.rotatingPointOffset,
                  borderDashArray: oldImg.borderDashArray,
                  shadow: oldImg.shadow,
                });

                canvas.remove(oldImg);
                canvas.add(newImg);
                canvas.setActiveObject(newImg);
                productFabricObjRef.current = newImg;
                canvas.renderAll();
              }
            });
            setIsRefineModalOpen(false);
            showToast('Recorte pulido aplicado', 'success');
          }}
        />
      )}
    </div>   
  );
}