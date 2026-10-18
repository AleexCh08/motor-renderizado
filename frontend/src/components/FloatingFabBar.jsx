import { useState } from 'react';
import { Download, Focus, LayoutGrid, Crop, Palette, Sliders } from 'lucide-react';
import { ASPECT_RATIOS } from '../utils/hudBuilder';

export default function FloatingFabBar({
  visible,
  selectedRatio,
  onSelectRatio,
  onCenterProduct,
  onRelayoutHud,
  onDownload,
  disabled,
  hasBgImage,
  bgColor,
  onChangeBgColor,
  hudConfig,
  onUpdateHudConfig,
}) {
  const [ratioMenuOpen, setRatioMenuOpen] = useState(false);
  const [configMenuOpen, setConfigMenuOpen] = useState(false);

  if (!visible) return null;

  const currentRatioLabel = ASPECT_RATIOS.find((r) => r.id === selectedRatio)?.label || '1:1';

  return (
    <div className="fab-dock-wrapper">
      <div className="fab-dock">
        {/* Desplegable de Formatos */}
        <div className="fab-dropdown-container">
          <button
            type="button"
            className={`neu-btn compact-btn ratio-trigger-btn ${ratioMenuOpen ? 'active' : ''}`}
            onClick={() => { setRatioMenuOpen(!ratioMenuOpen); setConfigMenuOpen(false); }}
            disabled={disabled}
            title="Elegir formato de imagen"
          >
            <Crop size={18} />
            <span className="current-ratio-text">{currentRatioLabel}</span>
          </button>

          <div className={`fab-dropdown-menu ${ratioMenuOpen ? 'open' : ''}`}>
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`dropdown-item ${selectedRatio === r.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectRatio(r.id);
                  setRatioMenuOpen(false);
                }}
                disabled={disabled}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fab-divider"></div>

        <div className="fab-actions">
          {/* Selector de color de fondo si no hay foto */}
          {!hasBgImage && (
            <div className="color-picker-wrapper" title="Color de fondo">
              <input
                type="color"
                className="color-picker-input"
                value={bgColor}
                onChange={(e) => onChangeBgColor(e.target.value)}
                disabled={disabled}
              />
              <Palette size={16} className="color-picker-icon" />
            </div>
          )}

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
            className="neu-btn compact-btn"
            onClick={onRelayoutHud}
            disabled={disabled}
            title="Reordenar etiquetas HUD"
          >
            <LayoutGrid size={18} />
          </button>

          {/* Menú Desplegable de Configuración Visual (HUD) */}
          <div className="fab-dropdown-container">
            <button
              type="button"
              className={`neu-btn compact-btn ${configMenuOpen ? 'active' : ''}`}
              onClick={() => { setConfigMenuOpen(!configMenuOpen); setRatioMenuOpen(false); }}
              disabled={disabled}
              title="Personalizar visual del HUD"
            >
              <Sliders size={18} />
            </button>

            <div className={`fab-config-menu ${configMenuOpen ? 'open' : ''}`}>
              <span className="fab-config-title" style={{ textAlign: 'center' }}>Estilo Visual HUD</span>
              
              <div className="config-group">
                <label>Tipografía</label>
                <select
                  className="neu-select"
                  value={hudConfig.fontFamily}
                  onChange={(e) => onUpdateHudConfig('fontFamily', e.target.value)}
                >
                  <option value="Plus Jakarta Sans">High-Tech (Jakarta)</option>
                  <option value="Harman Retro">Vintage (Harman Retro)</option>
                  <option value="Arial">Clásica (Arial)</option>
                </select>
              </div>

              <div className="config-group">
                <label>Tamaño de textos</label>
                <input
                  type="range"
                  className="neu-slider"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={hudConfig.fontScale}
                  onChange={(e) => onUpdateHudConfig('fontScale', parseFloat(e.target.value))}
                />
              </div>

              <div className="config-colors">
                <div className="color-picker-wrapper outline" title="Color Título">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={hudConfig.colorKey}
                    onChange={(e) => onUpdateHudConfig('colorKey', e.target.value)}
                  />
                  <span className="color-label" style={{ color: hudConfig.colorKey }}>Títulos</span>
                </div>

                <div className="color-picker-wrapper outline" title="Color Líneas y Valor">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={hudConfig.colorMain}
                    onChange={(e) => onUpdateHudConfig('colorMain', e.target.value)}
                  />
                  <span className="color-label" style={{ color: hudConfig.colorMain }}>Neón</span>
                </div>
              </div>
            </div>
          </div>

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