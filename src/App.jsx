import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock, 
  ChevronLeft, ChevronRight, FolderOpen, X, Download, RefreshCw, 
  AlertCircle, ZoomIn, ZoomOut, Grid, Sliders, Sun, Contrast, Maximize2
} from 'lucide-react';

// ==================== CONFIGURACIÓN API ====================
const API_BASE_URL = 'https://bakcend-gemi-cha-2.onrender.com';
const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Token': ADMIN_TOKEN,
});

const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = { headers: getHeaders(), ...options };
  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const api = {
  getEmpresas: () => apiFetch('/validador/empresas'),
  getCasos: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiFetch(`/validador/casos?${queryParams}`);
  },
  getCasoDetalle: (serial) => apiFetch(`/validador/casos/${serial}`),
  cambiarEstado: (serial, data) => apiFetch(`/validador/casos/${serial}/estado`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStats: (empresa = 'all') => apiFetch(`/validador/stats?empresa=${empresa}`),
  exportarCasos: async (formato = 'xlsx', filtros = {}) => {
    const params = new URLSearchParams({ formato, ...filtros }).toString();
    const url = `${API_BASE_URL}/validador/exportar/casos?${params}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al exportar');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `casos_export_${new Date().toISOString().split('T')[0]}.${formato}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

const STATUS_MAP = {
  'NUEVO': { label: 'NUEVO', color: '#3b82f6', borderColor: 'border-blue-500', icon: Clock },
  'INCOMPLETA': { label: 'INCOMPLETA', color: '#dc2626', borderColor: 'border-red-500', icon: XCircle },
  'ILEGIBLE': { label: 'ILEGIBLE', color: '#f59e0b', borderColor: 'border-orange-500', icon: AlertCircle },
  'INCOMPLETA_ILEGIBLE': { label: 'INCOMPLETA/ILEGIBLE', color: '#ef4444', borderColor: 'border-red-600', icon: XCircle },
  'EPS_TRANSCRIPCION': { label: 'EPS', color: '#ca8a04', borderColor: 'border-yellow-500', icon: FileText },
  'DERIVADO_TTHH': { label: 'TTHH', color: '#2563eb', borderColor: 'border-blue-500', icon: Send },
  'CAUSA_EXTRA': { label: 'EXTRA', color: '#6b7280', borderColor: 'border-gray-500', icon: Edit3 },
  'COMPLETA': { label: 'VALIDADA', color: '#16a34a', borderColor: 'border-green-500', icon: CheckCircle },
};

// ==================== MEJORA DE CALIDAD DE IMAGEN ====================
function enhanceImage(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const enhancedData = new Uint8ClampedArray(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const factor = 1.5;
    enhancedData[i] = Math.min(255, data[i] + (data[i] - avg) * factor);
    enhancedData[i + 1] = Math.min(255, data[i + 1] + (data[i + 1] - avg) * factor);
    enhancedData[i + 2] = Math.min(255, data[i + 2] + (data[i + 2] - avg) * factor);
  }

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighborIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
            sum += data[neighborIdx + c];
          }
        }
        enhancedData[idx + c] = Math.floor(sum / 9);
      }
    }
  }

  const newImageData = new ImageData(enhancedData, canvas.width, canvas.height);
  ctx.putImageData(newImageData, 0, 0);
}

// ==================== VISOR DE DOCUMENTOS CON SISTEMA DE VALIDACIÓN ====================
function DocumentViewer({ casoSeleccionado, onClose, onCambiarEstado, onRecargarCasos }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState([]);
  const [filters, setFilters] = useState({ grayscale: 0, brightness: 100, contrast: 100, sharpen: 0 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [modalActivo, setModalActivo] = useState(null);
  const [draggedPage, setDraggedPage] = useState(null);
  const [isDualView, setIsDualView] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const canvasRef = useRef(null);

  // ✅ NUEVO: Estados para sistema de validación
  const [accionSeleccionada, setAccionSeleccionada] = useState(null);
  const [checksSeleccionados, setChecksSeleccionados] = useState([]);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [adjuntos, setAdjuntos] = useState([]);
  const [enviandoValidacion, setEnviandoValidacion] = useState(false);
  const [checksDisponibles, setChecksDisponibles] = useState([]);

  // ✅ NUEVO: Función para validar caso
  const handleValidar = async (serial, accion) => {
    setEnviandoValidacion(true);
    const formData = new FormData();
    formData.append('accion', accion);
    
    // Agregar checks seleccionados
    checksSeleccionados.forEach(check => {
      formData.append('checks', check);
    });
    
    // Agregar adjuntos si los hay
    adjuntos.forEach((file) => {
      formData.append('adjuntos', file);
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${serial}/validar`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': ADMIN_TOKEN,
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Caso ${accion} correctamente`);
        console.log('Nuevo link en Drive:', data.nuevo_link);
        
        // Recargar lista de casos
        if (onRecargarCasos) onRecargarCasos();
        
        // Limpiar y cerrar
        setAccionSeleccionada(null);
        setChecksSeleccionados([]);
        setAdjuntos([]);
        onClose();
      } else {
        alert('❌ Error al validar caso');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ NUEVO: Función para notificación libre (botón Extra)
  const handleNotificarLibre = async (serial) => {
    if (!mensajePersonalizado.trim()) {
      alert('⚠️ Escribe un mensaje antes de enviar');
      return;
    }
    
    setEnviandoValidacion(true);
    const formData = new FormData();
    formData.append('mensaje_personalizado', mensajePersonalizado);
    
    adjuntos.forEach((file) => {
      formData.append('adjuntos', file);
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${serial}/notificar-libre`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': ADMIN_TOKEN,
        },
        body: formData
      });
      
      if (response.ok) {
        alert('✅ Notificación enviada');
        setMensajePersonalizado('');
        setAdjuntos([]);
        setAccionSeleccionada(null);
      } else {
        alert('❌ Error al enviar notificación');
      }
    } catch (error) {
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ NUEVO: Toggle de checks
  const toggleCheck = (checkValue) => {
    setChecksSeleccionados(prev => {
      if (prev.includes(checkValue)) {
        return prev.filter(c => c !== checkValue);
      } else {
        return [...prev, checkValue];
      }
    });
  };

  // ========== CARGA REAL DE PDF DESDE EL BACKEND ==========
  useEffect(() => {
    const cargarPDF = async () => {
      setLoadingPdf(true);
      try {
        let intentos = 0;
        while (!window.pdfjsLib && intentos < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          intentos++;
        }

        if (!window.pdfjsLib) {
          throw new Error('PDF.js no está disponible');
        }

        const pdfjsLib = window.pdfjsLib;
        
        const pdfUrl = `${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/pdf`;
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          httpHeaders: getHeaders()
        });
        
        const pdf = await loadingTask.promise;
        const pagesArray = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          
          const fullCanvas = document.createElement('canvas');
          const fullContext = fullCanvas.getContext('2d');
          const fullViewport = page.getViewport({ scale: 3 });
          fullCanvas.height = fullViewport.height;
          fullCanvas.width = fullViewport.width;
          await page.render({ canvasContext: fullContext, viewport: fullViewport }).promise;
          const fullImage = fullCanvas.toDataURL('image/jpeg', 0.9);
          
          pagesArray.push({ id: i - 1, thumbnail, fullImage });
        }
        
        setPages(pagesArray);
      } catch (error) {
        console.error('Error cargando PDF:', error);
        alert('Error al cargar el PDF: ' + error.message);
        const mockPages = Array(5).fill(null).map((_, i) => ({
          id: i,
          thumbnail: `https://via.placeholder.com/200x280/1e293b/94a3b8?text=Pág+${i+1}`,
          fullImage: `https://via.placeholder.com/800x1100/1e293b/94a3b8?text=Documento+${i+1}`,
        }));
        setPages(mockPages);
      } finally {
        setLoadingPdf(false);
      }
    };
    
    cargarPDF();
  }, [casoSeleccionado]);

  useEffect(() => {
    const needsDualView = ['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'].includes(casoSeleccionado.estado);
    setIsDualView(needsDualView);
  }, [casoSeleccionado.estado]);

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(pages.length - 1, p + 1));
    if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(0, p - 1));
    if (e.key === 'Escape' || e.key === 'F11') onClose();
    if (e.key === '+' || e.key === '=') handleZoom(10);
    if (e.key === '-') handleZoom(-10);
  }, [pages, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const applyFiltersAndEnhance = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    enhanceImage(canvas, ctx);
    const filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`;
    canvas.style.filter = filter;
    console.log('Imagen mejorada aplicada');
  };

  const handleDragStart = (e, pageIndex) => {
    setDraggedPage(pageIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedPage === null) return;
    const newPages = [...pages];
    const draggedItem = newPages[draggedPage];
    newPages.splice(draggedPage, 1);
    newPages.splice(targetIndex, 0, draggedItem);
    setPages(newPages);
    setDraggedPage(null);
  };

  const statusInfo = STATUS_MAP[casoSeleccionado.estado];
  const Icon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {showSidebar && (
        <div className="w-24 bg-gray-900 border-r border-gray-700 p-2 space-y-2 overflow-y-auto">
          <div className="text-xs text-gray-400 text-center mb-2 font-semibold">Páginas</div>
          {loadingPdf ? (
            <div className="text-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              <p className="text-[10px] text-gray-400 mt-2">Cargando PDF...</p>
            </div>
          ) : (
            pages.map((page, idx) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onClick={() => setCurrentPage(idx)}
                className={`cursor-move rounded-lg border-2 transition-all hover:scale-105 ${
                  currentPage === idx ? 'border-blue-500 ring-2 ring-blue-400 shadow-lg' : 'border-gray-700'
                }`}
              >
                <img src={page.thumbnail} alt={`Pág ${idx+1}`} className="w-full rounded" />
                <div className="text-center text-[10px] text-gray-400 py-1 bg-gray-800/50">{idx+1}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900/95 backdrop-blur border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{backgroundColor: statusInfo.color}}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-yellow-300">{casoSeleccionado.serial}</div>
              <div className="text-xs text-gray-400">{casoSeleccionado.nombre} • {casoSeleccionado.empresa}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => handleZoom(-10)} className="p-2 hover:bg-gray-800 rounded transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[50px] text-center bg-gray-800 px-2 py-1 rounded">{zoom}%</span>
            <button onClick={() => handleZoom(10)} className="p-2 hover:bg-gray-800 rounded transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>

            {isDualView && (
              <button 
                onClick={() => setIsDualView(!isDualView)}
                className="p-2 hover:bg-gray-800 rounded bg-orange-600/20 border border-orange-600"
                title="Vista lado a lado"
              >
                <Maximize2 className="w-4 h-4 text-orange-400" />
              </button>
            )}

            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-800 rounded transition-colors">
              <Grid className="w-4 h-4" />
            </button>

            <div className="relative group">
              <button className="p-2 hover:bg-gray-800 rounded transition-colors">
                <Sliders className="w-4 h-4" />
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl p-4 shadow-2xl border border-gray-700 z-10">
                <h4 className="font-bold mb-3 text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  Mejorar Calidad (Gratis)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs flex items-center gap-2 mb-1">
                      <Sun className="w-3 h-3" /> Brillo: {filters.brightness}%
                    </label>
                    <input type="range" min="0" max="200" value={filters.brightness}
                      onChange={(e) => setFilters({...filters, brightness: e.target.value})}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs flex items-center gap-2 mb-1">
                      <Contrast className="w-3 h-3" /> Contraste: {filters.contrast}%
                    </label>
                    <input type="range" min="0" max="200" value={filters.contrast}
                      onChange={(e) => setFilters({...filters, contrast: e.target.value})}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Blanco y Negro: {filters.grayscale}%</label>
                    <input type="range" min="0" max="100" value={filters.grayscale}
                      onChange={(e) => setFilters({...filters, grayscale: e.target.value})}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <button 
                    onClick={applyFiltersAndEnhance}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg">
                    ✨ Aplicar Mejoras (IA Gratis)
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">Nitidez + Reducción de ruido incluidos</p>
                </div>
              </div>
            </div>

            <a href={casoSeleccionado.drive_link} target="_blank" rel="noopener noreferrer"
              className="p-2 hover:bg-gray-800 rounded transition-colors" title="Abrir en Google Drive">
              <FolderOpen className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex-1 bg-gray-900 overflow-auto p-4">
          {loadingPdf ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-gray-400">Cargando documento PDF...</p>
                <p className="text-xs text-gray-500 mt-2">Esto puede tomar unos segundos</p>
              </div>
            </div>
          ) : isDualView && ['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'].includes(casoSeleccionado.estado) ? (
            <div className="flex gap-4 h-full">
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-xs text-red-400 mb-2 font-semibold">📄 Documento Original</div>
                <img 
                  ref={canvasRef}
                  src={pages[currentPage]?.fullImage} 
                  alt={`Página ${currentPage+1}`}
                  style={{
                    transform: `scale(${zoom/100})`,
                    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`
                  }}
                  className="max-w-full max-h-full object-contain transition-all shadow-2xl rounded-lg border-2 border-red-500"
                />
              </div>
              <div className="w-px bg-gray-700"></div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-xs text-green-400 mb-2 font-semibold">✨ Vista Mejorada</div>
                <div className="max-w-full max-h-full bg-gray-800 rounded-lg border-2 border-green-500 p-4 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Aplica filtros para ver aquí</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <img 
                ref={canvasRef}
                src={pages[currentPage]?.fullImage} 
                alt={`Página ${currentPage+1}`}
                style={{
                  transform: `scale(${zoom/100})`,
                  filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`
                }}
                className="max-w-full max-h-full object-contain transition-all shadow-2xl rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="bg-gray-900/95 backdrop-blur border-t border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="bg-gray-800 px-4 py-2 rounded-lg min-w-[120px] text-center">
              <span className="text-sm font-semibold">{currentPage + 1}</span>
              <span className="text-xs text-gray-400"> / {pages.length}</span>
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
              disabled={currentPage === pages.length - 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* ✅ BOTONES DE VALIDACIÓN ACTUALIZADOS */}
          <div className="flex justify-center gap-2 flex-wrap">
            <button 
              onClick={() => handleValidar(casoSeleccionado.serial, 'completa')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#16a34a'}}>
              <CheckCircle className="w-4 h-4" />
              <span>✅ Completa</span>
            </button>
            
            <button 
              onClick={() => setAccionSeleccionada('incompleta')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#dc2626'}}>
              <XCircle className="w-4 h-4" />
              <span>❌ Incompleta</span>
            </button>
            
            <button 
              onClick={() => handleValidar(casoSeleccionado.serial, 'eps')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#ca8a04'}}>
              <FileText className="w-4 h-4" />
              <span>📋 EPS</span>
            </button>
            
            <button 
              onClick={() => setAccionSeleccionada('tthh')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#2563eb'}}>
              <Send className="w-4 h-4" />
              <span>🚨 TTHH</span>
            </button>
            
            <button 
              onClick={() => setAccionSeleccionada('extra')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#8b5cf6'}