import { Sliders, Sparkles, RotateCcw } from 'lucide-react';

export default function TopNavPill({
  activeView,
  setActiveView,
  specsCount,
  hasRender,
  onResetAll,
}) {
  return (
    <header className="top-header">
      <nav className="nav-pill-container" aria-label="Cambiar vista de trabajo">
        <button
          type="button"
          className={`nav-pill-tab ${activeView === 'panel' ? 'active' : ''}`}
          onClick={() => setActiveView('panel')}
        >
          <Sliders size={16} />
          <span>Panel</span>         
        </button>

        <button
          type="button"
          className={`nav-pill-tab ${activeView === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveView('studio')}
        >
          <Sparkles size={16} />
          <span>Estudio</span>
        </button>
      </nav>

      <button
        type="button"
        className="icon-circle-btn"
        onClick={onResetAll}
        title="Reiniciar todo el proyecto"
        aria-label="Reiniciar todo el proyecto"
      >
        <RotateCcw size={18} />
      </button>
    </header>
  );
}