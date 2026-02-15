import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Scissors, Save, Undo2 } from 'lucide-react';
import {
  buildCSSFilter,
  createSharpenSVGMarkup,
  renderPDFPageToCanvas,
  applyAllAdjustments,
  autoCropCanvas,
} from '../utils/pdfUtils';

// ═══════════════════════════════════════════════════════════
// Componente de edición PDF en vivo
// Brillo, Contraste, B&N, Enfoque, Recorte — todo en tiempo real
// ═══════════════════════════════════════════════════════════

const DEFAULT_ADJUSTMENTS = {
  brightness: 1,
  contrast: 1,
  grayscale: false,
  sharpness: 0,
  cropRect: null, // {x, y, width, height} normalizado 0-1
};

export default function LivePDFEditor({
  pdfFile,        // File|Blob del PDF
  pageNum,        // Página actual (0-indexed)
  serial,         // Serial del caso
  onSave,         // (editedBlob) => void
  onClose,        // () => void
  initialMode,    // 'filters' | 'crop' | 'brightness' | 'contrast' | 'sharpen' | 'grayscale'
}) {
  // Estado de la imagen base
  const [baseCanvas, setBaseCanvas] = useState(null);
  const [baseImageURL, setBaseImageURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado de ajustes (se aplican en vivo via CSS)
  const [adjustments, setAdjustments] = useState({ ...DEFAULT_ADJUSTMENTS });
  
  // Estado del modo crop
  const [cropMode, setCropMode] = useState(initialMode === 'crop');
  const [cropRect, setCropRect] = useState(null); // {startX, startY, endX, endY} en % del contenedor
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [cropHandle, setCropHandle] = useState(null); // null | 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
  
  // SVG filter para sharpen
  const [sharpenSVG, setSharpenSVG] = useState('');
  
  // Refs
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const cropOverlayRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // Cargar página PDF → canvas → imagen
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    
    async function loadPage() {
      setLoading(true);
      try {
        const canvas = await renderPDFPageToCanvas(pdfFile, pageNum, 2.0);
        if (cancelled) return;
        setBaseCanvas(canvas);
        setBaseImageURL(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        console.error('[LiveEditor] Error cargando página:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadPage();
    return () => { cancelled = true; };
  }, [pdfFile, pageNum]);

  // Activar modo inicial
  useEffect(() => {
    if (initialMode === 'grayscale') {
      setAdjustments(prev => ({ ...prev, grayscale: true }));
    } else if (initialMode === 'brightness') {
      // Solo abrir, el slider empieza en 1
    } else if (initialMode === 'contrast') {
      // Solo abrir
    } else if (initialMode === 'sharpen') {
      setAdjustments(prev => ({ ...prev, sharpness: 0.5 }));
    }
  }, [initialMode]);

  // Actualizar SVG filter cuando cambia sharpness
  useEffect(() => {
    if (adjustments.sharpness > 0) {
      setSharpenSVG(createSharpenSVGMarkup(adjustments.sharpness));
    }
  }, [adjustments.sharpness]);

  // ═══════════════════════════════════════════════════════════
  // CSS Filter en vivo (GPU acelerado, instantáneo)
  // ═══════════════════════════════════════════════════════════
  const cssFilter = useMemo(() => {
    return buildCSSFilter(adjustments);
  }, [adjustments]);

  const hasChanges = useMemo(() => {
    return adjustments.brightness !== 1 
      || adjustments.contrast !== 1 
      || adjustments.grayscale 
      || adjustments.sharpness > 0
      || cropRect !== null;
  }, [adjustments, cropRect]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS de sliders
  // ═══════════════════════════════════════════════════════════
  const updateAdjustment = useCallback((key, value) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setCropRect(null);
    setCropMode(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // CROP - Interacción del mouse
  // ═══════════════════════════════════════════════════════════
  const getRelativePos = useCallback((e) => {
    if (!cropOverlayRef.current) return { x: 0, y: 0 };
    const rect = cropOverlayRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleCropMouseDown = useCallback((e) => {
    if (!cropMode) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    
    if (cropRect) {
      // Determinar si estamos en un handle o en el área de movimiento
      const handle = getCropHandle(pos, cropRect);
      if (handle) {
        setCropHandle(handle);
        setDragStart(pos);
        setIsDragging(true);
        return;
      }
    }
    
    // Iniciar nuevo rectángulo
    setCropRect(null);
    setDragStart(pos);
    setIsDragging(true);
    setCropHandle(null);
  }, [cropMode, cropRect, getRelativePos]);

  const handleCropMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    
    if (cropHandle === 'move' && cropRect) {
      // Mover todo el rectángulo
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      const w = cropRect.endX - cropRect.startX;
      const h = cropRect.endY - cropRect.startY;
      
      let newStartX = cropRect.startX + dx;
      let newStartY = cropRect.startY + dy;
      newStartX = Math.max(0, Math.min(1 - w, newStartX));
      newStartY = Math.max(0, Math.min(1 - h, newStartY));
      
      setCropRect({
        startX: newStartX,
        startY: newStartY,
        endX: newStartX + w,
        endY: newStartY + h,
      });
      setDragStart(pos);
    } else if (cropHandle && cropRect) {
      // Resize por handle
      const newRect = { ...cropRect };
      if (cropHandle.includes('n')) newRect.startY = pos.y;
      if (cropHandle.includes('s')) newRect.endY = pos.y;
      if (cropHandle.includes('w')) newRect.startX = pos.x;
      if (cropHandle.includes('e')) newRect.endX = pos.x;
      
      // Normalizar
      if (newRect.startX > newRect.endX) [newRect.startX, newRect.endX] = [newRect.endX, newRect.startX];
      if (newRect.startY > newRect.endY) [newRect.startY, newRect.endY] = [newRect.endY, newRect.startY];
      
      setCropRect(newRect);
    } else {
      // Dibujando nuevo rectángulo
      setCropRect({
        startX: Math.min(dragStart.x, pos.x),
        startY: Math.min(dragStart.y, pos.y),
        endX: Math.max(dragStart.x, pos.x),
        endY: Math.max(dragStart.y, pos.y),
      });
    }
  }, [isDragging, dragStart, cropHandle, cropRect, getRelativePos]);

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
    setCropHandle(null);
    setDragStart(null);
    
    // Eliminar crop rects muy pequeños (clicks accidentales)
    if (cropRect && (cropRect.endX - cropRect.startX < 0.02 || cropRect.endY - cropRect.startY < 0.02)) {
      setCropRect(null);
    }
  }, [cropRect]);

  // Determinar cursor/handle en posición
  function getCropHandle(pos, rect) {
    if (!rect) return null;
    const THRESHOLD = 0.03;
    
    const nearLeft = Math.abs(pos.x - rect.startX) < THRESHOLD;
    const nearRight = Math.abs(pos.x - rect.endX) < THRESHOLD;
    const nearTop = Math.abs(pos.y - rect.startY) < THRESHOLD;
    const nearBottom = Math.abs(pos.y - rect.endY) < THRESHOLD;
    const insideX = pos.x > rect.startX + THRESHOLD && pos.x < rect.endX - THRESHOLD;
    const insideY = pos.y > rect.startY + THRESHOLD && pos.y < rect.endY - THRESHOLD;
    
    if (nearTop && nearLeft) return 'nw';
    if (nearTop && nearRight) return 'ne';
    if (nearBottom && nearLeft) return 'sw';
    if (nearBottom && nearRight) return 'se';
    if (nearTop && insideX) return 'n';
    if (nearBottom && insideX) return 's';
    if (nearLeft && insideY) return 'w';
    if (nearRight && insideY) return 'e';
    if (insideX && insideY) return 'move';
    return null;
  }

  // Auto-crop
  const handleAutoCrop = useCallback(async () => {
    if (!baseCanvas) return;
    const result = autoCropCanvas(baseCanvas);
    if (result.cropped) {
      // Convertir a rectángulo normalizado
      const srcCtx = baseCanvas.getContext('2d');
      const w = baseCanvas.width;
      const h = baseCanvas.height;
      
      // El autoCrop ya devolvió el canvas recortado, necesitamos los bounds
      // Recalcular para obtener las coordenadas
      const data = srcCtx.getImageData(0, 0, w, h).data;
      const threshold = 240;
      const margin = 10;
      let top = 0, bottom = h - 1, left = 0, right = w - 1;
      
      const isWhite = (idx) => data[idx] >= threshold && data[idx + 1] >= threshold && data[idx + 2] >= threshold;
      
      find_top: for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!isWhite((y * w + x) * 4)) { top = y; break find_top; }
        }
      }
      find_bottom: for (let y = h - 1; y >= 0; y--) {
        for (let x = 0; x < w; x++) {
          if (!isWhite((y * w + x) * 4)) { bottom = y; break find_bottom; }
        }
      }
      find_left: for (let x = 0; x < w; x++) {
        for (let y = top; y <= bottom; y++) {
          if (!isWhite((y * w + x) * 4)) { left = x; break find_left; }
        }
      }
      find_right: for (let x = w - 1; x >= 0; x--) {
        for (let y = top; y <= bottom; y++) {
          if (!isWhite((y * w + x) * 4)) { right = x; break find_right; }
        }
      }
      
      top = Math.max(0, top - margin);
      bottom = Math.min(h - 1, bottom + margin);
      left = Math.max(0, left - margin);
      right = Math.min(w - 1, right + margin);
      
      setCropRect({
        startX: left / w,
        startY: top / h,
        endX: (right + 1) / w,
        endY: (bottom + 1) / h,
      });
      setCropMode(true);
    }
  }, [baseCanvas]);

  // ═══════════════════════════════════════════════════════════
  // GUARDAR - Aplicar todo y generar PDF
  // ═══════════════════════════════════════════════════════════
  const handleSave = useCallback(async () => {
    if (!hasChanges || !pdfFile) return;
    setSaving(true);
    
    try {
      const finalAdjustments = {
        ...adjustments,
        cropRect: cropRect ? {
          x: cropRect.startX,
          y: cropRect.startY,
          width: cropRect.endX - cropRect.startX,
          height: cropRect.endY - cropRect.startY,
        } : null,
      };
      
      const editedBlob = await applyAllAdjustments(pdfFile, pageNum, finalAdjustments);
      onSave(editedBlob);
    } catch (err) {
      console.error('[LiveEditor] Error guardando:', err);
      alert('Error aplicando cambios');
    } finally {
      setSaving(false);
    }
  }, [hasChanges, pdfFile, pageNum, adjustments, cropRect, onSave]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center">
        <div className="text-white text-lg flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Cargando página...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[90] flex flex-col">
      {/* SVG Filter para sharpen en vivo */}
      {adjustments.sharpness > 0 && (
        <div dangerouslySetInnerHTML={{ __html: sharpenSVG }} />
      )}

      {/* ═══ HEADER ═══ */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h2 className="text-white font-bold text-base">Editor en Vivo</h2>
          <span className="text-gray-500 text-xs">Página {pageNum + 1} — {serial}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            disabled={!hasChanges}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg disabled:opacity-30 flex items-center gap-1"
          >
            <Undo2 className="w-3 h-3" /> Reset
          </button>
          
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 hover:bg-red-600 text-white text-xs rounded-lg"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
          >
            {saving ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aplicando...</>
            ) : (
              <><Save className="w-3 h-3" /> Guardar</>
            )}
          </button>
        </div>
      </div>

      {/* ═══ CUERPO: Imagen + Panel lateral ═══ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* IMAGEN PRINCIPAL con filtros CSS en vivo */}
        <div 
          className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-950"
          ref={containerRef}
        >
          <div 
            className="relative max-w-full max-h-full"
            ref={cropOverlayRef}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
            style={{ cursor: cropMode ? 'crosshair' : 'default' }}
          >
            {/* Imagen con CSS filters aplicados en vivo */}
            <img
              ref={imageRef}
              src={baseImageURL}
              alt="PDF Preview"
              className="max-w-full max-h-[calc(100vh-140px)] object-contain select-none"
              style={{ filter: cssFilter }}
              draggable={false}
            />
            
            {/* Overlay de crop */}
            {cropMode && cropRect && (
              <>
                {/* Oscurecer áreas fuera del crop */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: `
                    linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)) 0 0 / ${cropRect.startX * 100}% 100% no-repeat,
                    linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)) ${cropRect.endX * 100}% 0 / ${(1 - cropRect.endX) * 100}% 100% no-repeat,
                    linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)) ${cropRect.startX * 100}% 0 / ${(cropRect.endX - cropRect.startX) * 100}% ${cropRect.startY * 100}% no-repeat,
                    linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)) ${cropRect.startX * 100}% ${cropRect.endY * 100}% / ${(cropRect.endX - cropRect.startX) * 100}% ${(1 - cropRect.endY) * 100}% no-repeat
                  `,
                }} />
                
                {/* Borde del crop */}
                <div
                  className="absolute border-2 border-blue-400 border-dashed"
                  style={{
                    left: `${cropRect.startX * 100}%`,
                    top: `${cropRect.startY * 100}%`,
                    width: `${(cropRect.endX - cropRect.startX) * 100}%`,
                    height: `${(cropRect.endY - cropRect.startY) * 100}%`,
                  }}
                >
                  {/* Handles de esquinas */}
                  {['nw', 'ne', 'sw', 'se'].map(pos => (
                    <div
                      key={pos}
                      className="absolute w-3 h-3 bg-blue-400 border border-white rounded-sm"
                      style={{
                        [pos.includes('n') ? 'top' : 'bottom']: '-6px',
                        [pos.includes('w') ? 'left' : 'right']: '-6px',
                        cursor: `${pos}-resize`,
                      }}
                    />
                  ))}
                  
                  {/* Dimensiones */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                    {Math.round((cropRect.endX - cropRect.startX) * 100)}% x {Math.round((cropRect.endY - cropRect.startY) * 100)}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ PANEL LATERAL DE CONTROLES ═══ */}
        <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-3 space-y-4">
            
            {/* ☀️ BRILLO */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-xs font-semibold">☀️ Brillo</label>
                <span className="text-blue-400 text-xs font-mono">
                  {adjustments.brightness === 1 ? '0' : ((adjustments.brightness - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.02"
                value={adjustments.brightness}
                onChange={(e) => updateAdjustment('brightness', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-yellow-400"
              />
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>Oscuro</span>
                <button 
                  onClick={() => updateAdjustment('brightness', 1)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  Reset
                </button>
                <span>Claro</span>
              </div>
            </div>

            {/* ◈ CONTRASTE */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-xs font-semibold">◈ Contraste</label>
                <span className="text-blue-400 text-xs font-mono">
                  {adjustments.contrast === 1 ? '0' : ((adjustments.contrast - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3"
                step="0.02"
                value={adjustments.contrast}
                onChange={(e) => updateAdjustment('contrast', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>Bajo</span>
                <button 
                  onClick={() => updateAdjustment('contrast', 1)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  Reset
                </button>
                <span>Alto</span>
              </div>
            </div>

            {/* 🎯 ENFOQUE / SHARPEN */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-xs font-semibold">🎯 Enfoque (HD)</label>
                <span className="text-blue-400 text-xs font-mono">
                  {adjustments.sharpness === 0 ? 'OFF' : (adjustments.sharpness * 100).toFixed(0) + '%'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={adjustments.sharpness}
                onChange={(e) => updateAdjustment('sharpness', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-400"
              />
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>Normal</span>
                <button 
                  onClick={() => updateAdjustment('sharpness', 0)}
                  className="text-gray-500 hover:text-white cursor-pointer"
                >
                  Reset
                </button>
                <span>Máximo</span>
              </div>
            </div>

            <hr className="border-gray-700" />

            {/* ⚪ B&N TOGGLE */}
            <button
              onClick={() => updateAdjustment('grayscale', !adjustments.grayscale)}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                adjustments.grayscale
                  ? 'bg-white text-gray-900 ring-2 ring-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ⚪ Blanco y Negro {adjustments.grayscale ? '(ON)' : '(OFF)'}
            </button>

            <hr className="border-gray-700" />

            {/* ✂️ RECORTE */}
            <div className="space-y-2">
              <label className="text-gray-300 text-xs font-semibold block">✂️ Recorte</label>
              
              <button
                onClick={() => {
                  setCropMode(!cropMode);
                  if (cropMode) setCropRect(null);
                }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  cropMode
                    ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                {cropMode ? 'Dibuja el recorte en la imagen' : 'Recorte manual'}
              </button>

              <button
                onClick={handleAutoCrop}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                ✂️ Auto-recorte (quitar bordes blancos)
              </button>

              {cropRect && (
                <button
                  onClick={() => { setCropRect(null); setCropMode(false); }}
                  className="w-full px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-900/30 flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" /> Quitar recorte
                </button>
              )}
            </div>

            <hr className="border-gray-700" />

            {/* 📋 PRESETS RÁPIDOS */}
            <div className="space-y-2">
              <label className="text-gray-300 text-xs font-semibold block">⚡ Presets</label>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setAdjustments({ ...DEFAULT_ADJUSTMENTS, contrast: 1.3, sharpness: 0.5 })}
                  className="px-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded-lg"
                >
                  📄 Documento
                </button>
                <button
                  onClick={() => setAdjustments({ ...DEFAULT_ADJUSTMENTS, brightness: 1.2, contrast: 1.4, sharpness: 0.8 })}
                  className="px-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded-lg"
                >
                  🔍 Texto claro
                </button>
                <button
                  onClick={() => setAdjustments({ ...DEFAULT_ADJUSTMENTS, contrast: 1.8, grayscale: true })}
                  className="px-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded-lg"
                >
                  📋 Fotocopia
                </button>
                <button
                  onClick={() => setAdjustments({ ...DEFAULT_ADJUSTMENTS, brightness: 1.1, contrast: 1.2 })}
                  className="px-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded-lg"
                >
                  ✨ Mejorar
                </button>
              </div>
            </div>
          </div>

          {/* Info footer */}
          <div className="mt-auto p-3 border-t border-gray-700 bg-gray-900/50">
            <div className="text-gray-500 text-[10px] text-center">
              💡 Preview en vivo via GPU • Los cambios se aplican al guardar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
