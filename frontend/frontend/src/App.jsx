import { useState, useRef, useCallback } from 'react';
import * as fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default?.fabric || fabricModule.default || window.fabric;
import TopNavPill from './components/TopNavPill';
import ConfigPanel from './components/ConfigPanel';
import WorkspaceCanvas from './components/WorkspaceCanvas';
import FloatingFabBar from './components/FloatingFabBar';
import {
  getTargetDimensions,
  applyBackgroundCover,
  renderHudSpecifications,
} from './utils/hudBuilder';

const INITIAL_SPECS = [
  { id: 1, posicion: 'izquierda', clave: 'TIPO DE TELA', valor: 'Algodón 100%' },
  { id: 2, posicion: 'izquierda', clave: 'TALLAS', valor: 'S, M, L, XL' },
  { id: 3, posicion: 'derecha', clave: 'PRECIO', valor: '$15.00' },
];

export default function App() {
  // Navegación horizontal ('panel' | 'studio')
  const [activeView, setActiveView] = useState('panel');

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

  // Especificaciones y Formato de salida
  const [specs, setSpecs] = useState(INITIAL_SPECS);
  const [selectedRatio, setSelectedRatio] = useState('original');
  const [logicalSize, setLogicalSize] = useState({ width: 1080, height: 1080 });

  // Referencias a objetos de Fabric.js en memoria
  const canvasRef = useRef(null);
  const bgFabricObjRef = useRef(null);
  const productFabricObjRef = useRef(null);

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
    async (ratioId, prodObj, bgObj, currentSpecs) => {
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

      // 2. Posicionar el producto centrado y escalado al 68% de la altura
      if (prodObj) {
        if (!canvas.getObjects().includes(prodObj)) {
          canvas.add(prodObj);
        }
        prodObj.scaleToHeight(dims.height * 0.68);
        prodObj.set({
          angle: 0,
          borderColor: '#7dd3fc',
          cornerColor: '#27187E',
          cornerStrokeColor: '#ffffff',
          transparentCorners: false,
          cornerSize: 12,
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.62)',
            blur: Math.floor(Math.min(dims.width, dims.height) * 0.025),
            offsetX: 0,
            offsetY: Math.floor(dims.height * 0.015),
          }),
        });
        canvas.centerObject(prodObj);
        prodObj.setCoords();
      }

      // 3. Dibujar especificaciones HUD alrededor
      renderHudSpecifications(canvas, currentSpecs);
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
        setStatusMsg('Procesando...');
        const formData = new FormData();
        formData.append('file', productFile);

        const res = await fetch('http://127.0.0.1:8000/process', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Error en el servidor Python');

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

      setStatusMsg('Maquetando escenario...');
      await composeScene(
        selectedRatio,
        productFabricObjRef.current,
        bgFabricObjRef.current,
        specs
      );

      setHasRender(true);
      setActiveView('studio'); // Desliza horizontalmente hacia la vista del Estudio
      setStatusMsg('');
    } catch (err) {
      console.error(err);
      setStatusMsg('Error: Verifica que FastAPI esté activo en el puerto 8000');
      setTimeout(() => setStatusMsg(''), 4000);
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
      specs
    );
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
    renderHudSpecifications(canvasRef.current, specs);
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
      quality: 0.95,
      multiplier: 1,
    });
    link.click();
  };

  // Reinicio completo (Botón circular superior)
  const handleResetAll = () => {
    if (!window.confirm('¿Deseas reiniciar el lienzo y limpiar los insumos?')) return;
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
    setSpecs(INITIAL_SPECS);
    setSelectedRatio('original');
    setHasRender(false);
    setNeedsAiCall(true);
    setActiveView('panel');
  };

  return (
    <div className="app-shell">

      {/* Píldora superior de navegación */}
      <TopNavPill
        activeView={activeView}
        setActiveView={setActiveView}
        specsCount={specs.filter((s) => s.clave.trim() && s.valor.trim()).length}
        hasRender={hasRender}
        onResetAll={handleResetAll}
      />

      {/* Indicador de estado flotante (Heurística #1 de Nielsen) */}
      {statusMsg && <div className="status-banner">{statusMsg}</div>}

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
      />
    </div>
  );
}