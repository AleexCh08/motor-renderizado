import { TriangleAlert, Home } from 'lucide-react';

export default function NotFound({ onReturn }) {
  return (
    <div className="not-found-page">
      <div className="neu-card error-card">
        <div className="error-icon-glow">
          <TriangleAlert size={64} />
        </div>
        <h1 className="error-title">404</h1>
        <h2 className="error-subtitle">Página no encontrada</h2>
        <p className="error-text">
          La ruta a la que intentas acceder no existe o el enlace ha sido corrompido.
        </p>
        <button type="button" className="neu-btn neu-btn-persian" onClick={onReturn}>
          <Home size={18} />
          Volver al Estudio
        </button>
      </div>
    </div>
  );
}