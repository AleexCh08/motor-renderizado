import { X, ImagePlus, ListPlus, Wand2, Download, Move, Crop, Palette, Focus, LayoutGrid, Sliders, RotateCcw, Eraser } from 'lucide-react';

export default function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay help-overlay">
      <div className="neu-modal help-modal">
        
        <div className="help-header">
          <h2 className="modal-title">Guía Rápida</h2>
          <button className="welcome-close-btn" onClick={onClose} aria-label="Cerrar ayuda">
            <X size={20} />
          </button>
        </div>

        <div className="help-scroll-area">
          <section className="help-section">
            <h3 className="help-section-title">Flujo de Trabajo</h3>
            
            <div className="help-step">
              <div className="help-step-icon"><ImagePlus size={18} /></div>
              <div className="help-step-content">
                <strong>1. Sube tus imágenes:</strong> Arrastra o sube la foto de tu producto (obligatorio) y un fondo escenográfico (opcional). Si no subes un fondo, eliges un color sólido para el mismo.
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-icon"><ListPlus size={18} /></div>
              <div className="help-step-content">
                <strong>2. Agrega detalles:</strong> Define las especificaciones técnicas o características que rodearán al producto.
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-icon"><Wand2 size={18} /></div>
              <div className="help-step-content">
                <strong>3. Magia IA:</strong> Haz clic en "Renderizar". La Inteligencia Artificial recortará el fondo y maquetará la escena.
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3 className="help-section-title">Leyenda de Controles</h3>
            
            <div className="help-legend-grid">
              
              <div className="legend-item">
                <div className="legend-icon"><Move size={16} /></div>
                <span><strong>Interacción:</strong> Toca y arrastra los elementos. Usa los dedos para hacer zoom al producto y las flechas del PC para mover textos píxel a píxel. Puedes usar "Suprimir" para borrar textos en PC.</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-icon"><Crop size={16} /></div>
                <span><strong>Formato:</strong> Cambia la relación de aspecto del lienzo (1:1, 4:3, 16:9, etc.) para adaptarlo a Instagram, Web o Stories.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><Palette size={16} /></div>
                <span><strong>Color de Fondo:</strong> Cambia el color del lienzo en tiempo real (solo visible si no subiste una imagen de fondo).</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><Focus size={16} /></div>
                <span><strong>Centrar Producto:</strong> Devuelve la foto al medio exacto de la pantalla con su tamaño original.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><Eraser size={16} /></div>
                <span><strong>Pulir Recorte:</strong> Abre el quirófano de edición para borrar manualmente los restos de fondo que la IA no haya eliminado.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><LayoutGrid size={16} /></div>
                <span><strong>Reordenar HUD:</strong> Organiza automáticamente las etiquetas de texto a sus posiciones por defecto.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><Sliders size={16} /></div>
                <span><strong>Estilo Visual HUD:</strong> Despliega un menú para personalizar la tipografía, tamaño y colores de neón de los textos.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon"><Download size={16} /></div>
                <span><strong>Descargar:</strong> Exporta el resultado final en formato JPG de alta resolución.</span>
              </div>

              <div className="legend-item">
                <div className="legend-icon" style={{ color: '#FF453A' }}><RotateCcw size={16} /></div>
                <span><strong>Reiniciar Proyecto:</strong> Botón superior derecho. Borra todos los insumos y el lienzo para empezar de cero.</span>
              </div>

            </div>
          </section>
        </div>

        <div className="help-footer">
          <button type="button" className="neu-btn neu-btn-persian" onClick={onClose} style={{ width: '50%' }}>
            ¡A trabajar!
          </button>
        </div>

      </div>
    </div>
  );
}