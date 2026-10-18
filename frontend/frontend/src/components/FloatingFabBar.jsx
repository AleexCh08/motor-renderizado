import { useState } from 'react';
import { Download, Focus, LayoutGrid, Crop } from 'lucide-react';
import { ASPECT_RATIOS } from '../utils/hudBuilder';

export default function FloatingFabBar({
  visible,
  selectedRatio,
  onSelectRatio,
  onCenterProduct,
  onRelayoutHud,
  onDownload,
  disabled,
}) {
  const [ratioMenuOpen, setRatioMenuOpen] = useState(false);

  if (!visible) return null;

  // Busca el texto del formato actual para mostrarlo en el botón
  const currentRatioLabel = ASPECT_RATIOS.find(r => r.id === selectedRatio)?.label || '1:1';

  return (
    <div className="fab-dock-wrapper">
      <div className="fab-dock">
        
        {/* Contenedor del Botón Desplegable de Formatos */}
        <div className="fab-dropdown-container">
          <button
            type="button"
            className={`neu-btn compact-btn ratio-trigger-btn ${ratioMenuOpen ? 'active' : ''}`}
            onClick={() => setRatioMenuOpen(!ratioMenuOpen)}
            disabled={disabled}
            title="Elegir formato de imagen"
          >
            <Crop size={18} />
            <span className="current-ratio-text">{currentRatioLabel}</span>
          </button>

          {/* Menú flotante con las opciones (se abre hacia arriba) */}
          <div className={`fab-dropdown-menu ${ratioMenuOpen ? 'open' : ''}`}>
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`dropdown-item ${selectedRatio === r.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectRatio(r.id);
                  setRatioMenuOpen(false); // Cierra el menú al elegir
                }}
                disabled={disabled}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fab-divider"></div>

        {/* Acciones Rápidas (Se mantienen iguales) */}
        <div className="fab-actions">
          <button
            type="button"
            className="neu-btn compact-btn"
            onClick={onRelayoutHud}
            disabled={disabled}
            title="Reordenar etiquetas HUD"
          >
            <LayoutGrid size={18} />
          </button>

          <button
            type="button"
            className="neu-btn compact-btn"
            onClick={onCenterProduct}
            disabled={disabled}
            title="Centrar producto"
          >
            <Focus size={18} />
          </button>

          <button
            type="button"
            className="neu-btn neu-btn-persian compact-btn"
            onClick={onDownload}
            disabled={disabled}
            title="Descargar"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}