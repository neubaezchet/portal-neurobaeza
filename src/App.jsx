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
            <button 
              onClick={() => setAccionSeleccionada('extra')}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
              style={{backgroundColor: '#8b5cf6'}}>
              <Edit3 className="w-4 h-4" />
              <span>📝 Extra</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ MODAL: INCOMPLETA */}
      {accionSeleccionada === 'incompleta' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-red-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <XCircle className="w-6 h-6" />
                ❌ Marcar como Incompleta
              </h3>
              <button onClick={() => setAccionSeleccionada(null)} className="p-1 hover:bg-red-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Instrucciones */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">
                  <strong>Selecciona los problemas encontrados.</strong> La IA generará un email claro explicando qué documentos faltan y cómo corregirlos.
                </p>
              </div>

              {/* Grupo: Documentos Faltantes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  📋 Documentos Faltantes
                </h4>
                <div className="space-y-2">
                  {[
                    { key: 'incapacidad_faltante', label: 'Falta soporte de incapacidad', desc: 'No se adjuntó el documento oficial de la EPS/ARL' },
                    { key: 'epicrisis_faltante', label: 'Falta epicrisis/resumen', desc: 'No se adjuntó epicrisis o resumen clínico completo' },
                    { key: 'soat_faltante', label: 'Falta SOAT', desc: 'Solo para Accidente de Tránsito con vehículo identificado' },
                    { key: 'furips_faltante', label: 'Falta FURIPS', desc: 'Solo para Accidente de Tránsito' },
                    { key: 'registro_civil_faltante', label: 'Falta registro civil', desc: 'Solo para Maternidad/Paternidad' },
                    { key: 'nacido_vivo_faltante', label: 'Falta certificado nacido vivo', desc: 'Solo para Maternidad/Paternidad' },
                    { key: 'cedula_padre_faltante', label: 'Falta cédula del padre', desc: 'Solo para Paternidad (ambas caras)' },
                    { key: 'licencia_maternidad_faltante', label: 'Falta licencia maternidad', desc: 'Solo para Paternidad (madre trabajadora)' },
                  ].map(check => (
                    <label key={check.key} className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors border border-gray-200">
                      <input 
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{check.label}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Grupo: Problemas de Legibilidad */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  ⚠️ Problemas de Calidad
                </h4>
                <div className="space-y-2">
                  {[
                    { key: 'ilegible_recortada', label: 'Documento recortado', desc: 'Los bordes no son visibles o está incompleto' },
                    { key: 'ilegible_borrosa', label: 'Documento borroso', desc: 'Mala calidad de imagen, no se puede leer' },
                    { key: 'ilegible_manchada', label: 'Documento con reflejos/manchas', desc: 'Presenta obstáculos visuales' },
                    { key: 'epicrisis_incompleta', label: 'Epicrisis incompleta', desc: 'Faltan páginas del documento' },
                  ].map(check => (
                    <label key={check.key} className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-orange-50 transition-colors border border-gray-200">
                      <input 
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{check.label}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Adjuntar Referentes */}
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  📎 Adjuntar Imágenes Referentes (Opcional)
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  Si falta SOAT o FURIPS, puedes adjuntar imágenes de ejemplo mostrando cómo debe verse el documento correcto.
                </p>
                <input 
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setAdjuntos(Array.from(e.target.files))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 cursor-pointer"
                />
                {adjuntos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {adjuntos.map((file, idx) => (
                      <div key={idx} className="text-xs bg-white px-3 py-1 rounded-full border border-blue-300 flex items-center gap-2">
                        <span>📷 {file.name}</span>
                        <button 
                          onClick={() => setAdjuntos(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleValidar(casoSeleccionado.serial, 'incompleta')}
                  disabled={enviandoValidacion || checksSeleccionados.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoValidacion ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      ✅ Confirmar Incompleta ({checksSeleccionados.length} checks)
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAccionSeleccionada(null);
                    setChecksSeleccionados([]);
                    setAdjuntos([]);
                  }}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: TTHH (ALERTA FRAUDE) */}
      {accionSeleccionada === 'tthh' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Send className="w-6 h-6" />
                🚨 Derivar a Talento Humano
              </h3>
              <button onClick={() => setAccionSeleccionada(null)} className="p-1 hover:bg-blue-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Caso con inconsistencias detectadas.</strong> Se enviará alerta confidencial a Talento Humano y confirmación neutra a la empleada.
                </p>
              </div>

              {/* Checks de inconsistencias */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">🔍 Inconsistencias Detectadas</h4>
                <div className="space-y-2">
                  {[
                    { key: 'solicitar_epicrisis_tthh', label: 'TTHH debe solicitar epicrisis', desc: 'Validación directa requerida' },
                    { key: 'solicitar_transcripcion_tthh', label: 'TTHH debe solicitar transcripción', desc: 'Verificación en EPS necesaria' },
                  ].map(check => (
                    <label key={check.key} className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors border border-gray-200">
                      <input 
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm">{check.label}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Observaciones Adicionales (Opcional)
                </label>
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Describe brevemente las inconsistencias detectadas..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleValidar(casoSeleccionado.serial, 'tthh')}
                  disabled={enviandoValidacion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoValidacion ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      🚨 Confirmar Derivación
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAccionSeleccionada(null);
                    setChecksSeleccionados([]);
                    setMensajePersonalizado('');
                  }}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: EXTRA (NOTIFICACIÓN LIBRE) */}
      {accionSeleccionada === 'extra' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-6 h-6" />
                📝 Notificación Personalizada (IA)
              </h3>
              <button onClick={() => setAccionSeleccionada(null)} className="p-1 hover:bg-purple-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="text-sm text-purple-800">
                  <strong>🤖 Escribe un mensaje informal.</strong> La IA lo convertirá en un email profesional, claro y amable para la empleada.
                </p>
              </div>

              {/* Mensaje personalizado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✍️ Tu Mensaje (Informal)
                </label>
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Ejemplo: 'Hola María, nos falta el registro civil del bebé, si puedes enviarlo hoy sería genial'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Escribe natural, la IA lo profesionalizará
                </p>
              </div>

              {/* Adjuntos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📎 Adjuntar Archivos (Opcional)
                </label>
                <input 
                  type="file"
                  multiple
                  onChange={(e) => setAdjuntos(Array.from(e.target.files))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:font-semibold hover:file:bg-purple-700 cursor-pointer"
                />
                {adjuntos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {adjuntos.map((file, idx) => (
                      <div key={idx} className="text-xs bg-white px-3 py-1 rounded-full border border-purple-300 flex items-center gap-2">
                        <span>📄 {file.name}</span>
                        <button 
                          onClick={() => setAdjuntos(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleNotificarLibre(casoSeleccionado.serial)}
                  disabled={enviandoValidacion || !mensajePersonalizado.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoValidacion ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      📧 Enviar Notificación (IA)
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAccionSeleccionada(null);
                    setMensajePersonalizado('');
                    setAdjuntos([]);
                  }}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function App() {
  const [empresas, setEmpresas] = useState([]);
  const [casos, setCasos] = useState([]);
  const [stats, setStats] = useState({});
  const [filtros, setFiltros] = useState({ empresa: 'all', estado: 'all', tipo: 'all', q: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    cargarEmpresas();
    cargarStats();
  }, []);

  useEffect(() => {
    cargarCasos();
  }, [filtros]);

  const cargarEmpresas = async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data.empresas || []);
    } catch (error) {
      console.error('Error cargando empresas:', error);
    }
  };

  const cargarStats = async () => {
    try {
      const data = await api.getStats(filtros.empresa);
      setStats(data);
    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  };

  const cargarCasos = async () => {
    setLoading(true);
    try {
      const data = await api.getCasos(filtros);
      setCasos(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error('Error cargando casos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFiltros(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="w-8 h-8" />
            Portal de Validadores - IncaBaeza
          </h1>
          <p className="text-blue-100 mt-2">Sistema de gestión de incapacidades médicas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
              <div className="text-2xl font-bold">{value || 0}</div>
              <div className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={filtros.empresa}
              onChange={(e) => handleFiltroChange('empresa', e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>

            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              {Object.keys(STATUS_MAP).map(key => (
                <option key={key} value={key}>{STATUS_MAP[key].label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Buscar por serial, cédula o nombre..."
              value={filtros.q}
              onChange={(e) => handleFiltroChange('q', e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => api.exportarCasos('xlsx', filtros)}
              className="bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Lista de Casos */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Serial</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Empresa</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {casos.map(caso => {
                    const statusInfo = STATUS_MAP[caso.estado];
                    const Icon = statusInfo.icon;
                    return (
                      <tr key={caso.id} className="border-t border-gray-700 hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-yellow-300">{caso.serial}</td>
                        <td className="px-4 py-3 text-sm">{caso.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{caso.empresa}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: statusInfo.color + '20', color: statusInfo.color}}
                          >
                            <Icon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(caso.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setCasoSeleccionado(caso)}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Ver Documento
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          <div className="bg-gray-900/50 px-4 py-3 flex items-center justify-between border-t border-gray-700">
            <button
              onClick={() => handlePageChange(filtros.page - 1)}
              disabled={filtros.page === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {filtros.page} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(filtros.page + 1)}
              disabled={filtros.page >= totalPages}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div
</div>
        </div>
      </div>

      {/* Visor de Documentos (Modal) */}
      {casoSeleccionado && (
        <DocumentViewer
          casoSeleccionado={casoSeleccionado}
          onClose={() => setCasoSeleccionado(null)}
          onRecargarCasos={() => {
            cargarCasos();
            cargarStats();
          }}
        />
      )}
    </div>
  );
}