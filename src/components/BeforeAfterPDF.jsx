import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Upload } from 'lucide-react';

/**
 * Componente de vista antes/después para PDFs
 * Muestra dos versiones del PDF lado a lado o deslizable
 */
export default function BeforeAfterPDF({
  originalCanvas,
  editedCanvas,
  title = "Comparación",
  onSave,
  onCancel
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' o 'side-by-side'

  // ⚡ PERF: codificar cada canvas a dataURL UNA sola vez (no en cada render).
  // Antes esto se hacía inline en el JSX, así que el slider re-codificaba ambos
  // PNG completos en cada movimiento del mouse → lag brutal.
  const originalURL = useMemo(
    () => (originalCanvas ? originalCanvas.toDataURL('image/jpeg', 0.92) : null),
    [originalCanvas]
  );
  const editedURL = useMemo(
    () => (editedCanvas ? editedCanvas.toDataURL('image/jpeg', 0.92) : null),
    [editedCanvas]
  );

  // ⚡ PERF: limitar las actualizaciones del slider a 1 por frame (rAF).
  const rafRef = useRef(null);
  const handleMouseMove = useCallback((e) => {
    if (viewMode !== 'slider') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    if (rafRef.current) return; // ya hay un frame pendiente
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const newPosition = ((clientX - rect.left) / rect.width) * 100;
      if (newPosition >= 0 && newPosition <= 100) {
        setSliderPosition(newPosition);
      }
    });
  }, [viewMode]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex flex-col">
      {/* HEADER */}
      <div className="bg-gray-900/95 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <span className="text-gray-400 text-sm">Procesado localmente ⚡</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle Vista */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'slider' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Deslizar
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'side-by-side' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Lado a lado
            </button>
          </div>
          
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {viewMode === 'slider' ? (
          // VISTA DESLIZABLE
          <div
            onMouseMove={handleMouseMove}
            className="relative w-full max-w-4xl cursor-ew-resize group"
          >
            {/* Contenedor */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
              {/* ORIGINAL (Fondo) */}
              <div className="flex justify-center items-center">
                <img
                  src={originalURL}
                  alt="Original"
                  className="max-w-full max-h-[70vh] object-contain"
                  draggable={false}
                />
              </div>

              {/* LÍNEA DIVISORA */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white/50 shadow-lg group-hover:bg-white/80 transition-colors"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2">
                  <ChevronRight className="w-4 h-4 text-blue-600 inline -mr-1" />
                  <ChevronLeft className="w-4 h-4 text-blue-600 inline -ml-1" />
                </div>
              </div>

              {/* EDITADO (Sobrepuesto) */}
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={editedURL}
                  alt="Editado"
                  className="max-h-[70vh] object-contain"
                  draggable={false}
                />
              </div>

              {/* LABELS */}
              <div className="absolute top-4 left-4 text-white/80 text-sm font-semibold">
                ANTES
              </div>
              <div className="absolute top-4 right-4 text-white/80 text-sm font-semibold">
                DESPUÉS
              </div>
            </div>
          </div>
        ) : (
          // VISTA LADO A LADO
          <div className="grid grid-cols-2 gap-4 w-full max-w-6xl">
            {/* ORIGINAL */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-700 p-3 font-semibold text-white text-sm">
                ◀ ANTES
              </div>
              <div className="flex items-center justify-center p-2">
                <img
                  src={originalURL}
                  alt="Original"
                  className="max-w-full max-h-[65vh] object-contain rounded"
                  draggable={false}
                />
              </div>
            </div>

            {/* EDITADO */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-green-700 p-3 font-semibold text-white text-sm">
                DESPUÉS ▶
              </div>
              <div className="flex items-center justify-center p-2">
                <img
                  src={editedURL}
                  alt="Editado"
                  className="max-w-full max-h-[65vh] object-contain rounded"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INFO FOOTER */}
      <div className="bg-gray-900/95 border-t border-gray-700 p-3 text-center text-gray-400 text-sm">
        💡 Procesa 100% localmente en tu navegador - Sin enviar a servidor
      </div>
    </div>
  );
}
