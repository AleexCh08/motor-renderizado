import { ImagePlus, ListPlus, Shirt, Plus, Trash2, Wand2, RefreshCw } from 'lucide-react';

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
            accept="image/*"
             hidden
            onChange={(e) => e.target.files[0] && onSelectBg(e.target.files[0])}
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
            accept="image/*"
            hidden
            onChange={(e) => e.target.files[0] && onSelectProduct(e.target.files[0])}
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
            <button type="button" className="neu-btn" onClick={onAddSpec} style={{ padding: '8px 12px', fontSize: '0.6rem' }}>
                <Plus size={15} />
                Agregar
            </button>
        </div>

        <div className="specs-list">
          {specs.map((item) => (
            <div className="spec-row" key={item.id}>
              <select
                className="neu-select"
                value={item.posicion}
                onChange={(e) => onUpdateSpec(item.id, 'posicion', e.target.value)}
                aria-label="Posición de la especificación"
              >
                <option value="izquierda">Izq ←</option>
                <option value="derecha">Der →</option>
              </select>

              <input
                type="text"
                className="neu-input"
                placeholder="CLAVE (Ej: TELA)"
                value={item.clave}
                onChange={(e) => onUpdateSpec(item.id, 'clave', e.target.value)}
              />

              <input
                type="text"
                className="neu-input spec-input-valor"
                placeholder="Valor (Ej: Algodón)"
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
          ))}
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