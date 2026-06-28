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
    <div className="fixed inset-0 bg-slate-200 z-[80] flex flex-col">
      {/* HEADER */}
      <div className="bg-white/95 border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-slate-900 font-bold text-lg">{title}</h2>
          <span className="text-slate-500 text-sm">Procesado localmente ⚡</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Vista */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'slider'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Deslizar
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Lado a lado
            </button>
          </div>

          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
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
            <div className="relative bg-slate-100 rounded-lg overflow-hidden shadow-2xl">
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
                className="absolute top-0 bottom-0 w-1 bg-slate-900/40 shadow-lg group-hover:bg-slate-900/70 transition-colors"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-slate-200">
                  <ChevronRight className="w-4 h-4 text-indigo-600 inline -mr-1" />
                  <ChevronLeft className="w-4 h-4 text-indigo-600 inline -ml-1" />
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
              <div className="absolute top-4 left-4 text-slate-700 text-sm font-semibold bg-white/80 px-2 py-0.5 rounded">
                ANTES
              </div>
              <div className="absolute top-4 right-4 text-slate-700 text-sm font-semibold bg-white/80 px-2 py-0.5 rounded">
                DESPUÉS
              </div>
            </div>
          </div>
        ) : (
          // VISTA LADO A LADO
          <div className="grid grid-cols-2 gap-4 w-full max-w-6xl">
            {/* ORIGINAL */}
            <div className="bg-slate-100 rounded-lg overflow-hidden">
              <div className="bg-slate-200 p-3 font-semibold text-slate-700 text-sm">
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
            <div className="bg-slate-100 rounded-lg overflow-hidden">
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
      <div className="bg-white/95 border-t border-slate-200 p-3 text-center text-slate-500 text-sm">
        💡 Procesa 100% localmente en tu navegador - Sin enviar a servidor
      </div>
    </div>
  );
}
