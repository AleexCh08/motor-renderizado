import { ImagePlus, Shirt, Plus, Trash2, Wand2, RefreshCw, AlignLeft, AlignRight, ListPlus } from 'lucide-react';

export default function ConfigPanel({
  bgPreview,
  productPreview,
  bgFileName,
  productFileName,
  onSelectBg,
  onSelectProduct,
  specs,
  onAddSpec,
  onUpdateSpec,
  onRemoveSpec,
  onProcess,
  isProcessing,
  needsAiCall,
  hasRender,
  hudConfig,
  onUpdateHudConfig,
}) {
  return (
    <div className="panel-grid">
      {/* COLUMNA 1: INSUMOS FOTOGRÁFICOS */}
      <section className="neu-card">
        <div className="card-header">
          <h2 className="card-title">
            <ImagePlus size={18} />
            1. Insumos Visuales
          </h2>
        </div>

        {/* Selector de Fondo */}
        <label className="upload-zone">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && file.type.startsWith('image/')) {
                onSelectBg(file);
              }
              e.target.value = ''; 
            }}
          />
          <div className="upload-thumb">
            {bgPreview ? <img src={bgPreview} alt="Miniatura fondo" /> : <ImagePlus size={22} />}
          </div>
          <div className="upload-info">
            <div className="upload-title">{bgFileName || 'Subir Fondo'}</div>
            <div className="upload-subtitle">
              {bgPreview ? 'Toca para cambiar escenario' : 'Opcional (Pedestal, Estudio, etc.)'}
            </div>
          </div>
        </label>

        {/* Selector de Producto */}
        <label className="upload-zone">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && file.type.startsWith('image/')) {
                onSelectProduct(file);
              }
              e.target.value = ''; 
            }}
          />
          <div className="upload-thumb">
            {productPreview ? (
              <img src={productPreview} alt="Miniatura producto" />
            ) : (
              <Shirt size={22} />
            )}
          </div>
          <div className="upload-info">
            <div className="upload-title">{productFileName || 'Subir Foto del Producto'}</div>
            <div className="upload-subtitle">
              {productPreview ? 'Lista para recorte con IA' : 'Obligatorio (Franela, calzado, etc.)'}
            </div>
          </div>
        </label>
      </section>

      {/* COLUMNA 2: ESPECIFICACIONES HUD */}
      <section className="neu-card">
        <div className="card-header">
            <h2 className="card-title">
                <ListPlus size={18} />
                2. Especificaciones
            </h2>
            <button type="button" className="neu-btn" onClick={onAddSpec} style={{ padding: '8px 12px', fontSize: '0.78rem' }}>
                <Plus size={18} />
            </button>
        </div>

        <div className="specs-list">
          {specs.length === 0 ? (
            <div className="empty-specs-msg">
              Presione "+" para añadir especificación
            </div>
          ) : (
          specs.map((item) => (
            <div className="spec-row" key={item.id}>
              
              {/* Toggle Elegante de Posición (Estilo Figma/SaaS) */}
              <div className="pos-toggle">
                <button
                  type="button"
                  className={`pos-btn ${item.posicion === 'izquierda' ? 'active' : ''}`}
                  onClick={() => onUpdateSpec(item.id, 'posicion', 'izquierda')}
                  title="Alinear a la izquierda"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  type="button"
                  className={`pos-btn ${item.posicion === 'derecha' ? 'active' : ''}`}
                  onClick={() => onUpdateSpec(item.id, 'posicion', 'derecha')}
                  title="Alinear a la derecha"
                >
                  <AlignRight size={16} />
                </button>
              </div>

              <input
                type="text"
                className="neu-input"
                placeholder="PROPIEDAD"
                value={item.clave}
                onChange={(e) => onUpdateSpec(item.id, 'clave', e.target.value)}
              />

              <input
                type="text"
                className="neu-input spec-input-valor"
                placeholder="DETALLE"
                value={item.valor}
                onChange={(e) => onUpdateSpec(item.id, 'valor', e.target.value)}
              />

              <button
                type="button"
                className="neu-btn neu-btn-danger"
                onClick={() => onRemoveSpec(item.id)}
                title="Eliminar fila"
                aria-label="Eliminar fila"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )))}
        </div>

        <button
          type="button"
          className="neu-btn neu-btn-persian"
          onClick={onProcess}
          disabled={isProcessing || !productPreview}
          style={{ width: '50%', margin: '4px auto 0', display: 'flex', justifyContent: 'center'}}
        >
          {isProcessing ? (
            <>
              <RefreshCw size={18} className="spin" />
              Procesando...
            </>
          ) : needsAiCall || !hasRender ? (
            <>
              <Wand2 size={18} />
              Renderizar
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Actualizar Especificaciones
            </>
          )}
        </button>
      </section>
    </div>
  );
}