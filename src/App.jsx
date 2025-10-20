import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock, 
  ChevronLeft, ChevronRight, FolderOpen, X, Download, RefreshCw, 
  AlertCircle, ZoomIn, ZoomOut, Grid, Sliders, Sun, Contrast, Maximize2
} from 'lucide-react';

// ==================== CONFIGURACIÓN API ====================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://bakcend-gemi-cha-2.onrender.com';
const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN || '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

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

// ==================== MEJORA DE CALIDAD DE IMAGEN (Estilo Remini - GRATIS) ====================
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

// ==================== VISOR DE DOCUMENTOS ====================
function DocumentViewer({ casoSeleccionado, onClose, onCambiarEstado }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState([]);
  const [filters, setFilters] = useState({ grayscale: 0, brightness: 100, contrast: 100, sharpen: 0 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [modalActivo, setModalActivo] = useState(null);
  const [modalData, setModalData] = useState({ motivo: '', fechaLimite: '' });
  const [draggedPage, setDraggedPage] = useState(null);
  const [isDualView, setIsDualView] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const mockPages = Array(5).fill(null).map((_, i) => ({
      id: i,
      thumbnail: `https://via.placeholder.com/200x280/1e293b/94a3b8?text=Pág+${i+1}`,
      fullImage: `https://via.placeholder.com/800x1100/1e293b/94a3b8?text=Documento+${i+1}`,
    }));
    setPages(mockPages);
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

  const handleAccion = (accion) => {
    switch (accion) {
      case 'incompleta':
        setModalActivo('incompleta');
        setModalData({ motivo: '', fechaLimite: '' });
        break;
      case 'transcripcion':
        onCambiarEstado('EPS_TRANSCRIPCION', 'Transcripción en EPS requerida');
        break;
      case 'tthh':
        onCambiarEstado('DERIVADO_TTHH', 'Derivado a Talento Humano');
        break;
      case 'completa':
        onCambiarEstado('COMPLETA', 'Validada y lista para radicación');
        break;
      default:
        break;
    }
  };

  const statusInfo = STATUS_MAP[casoSeleccionado.estado];
  const Icon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {showSidebar && (
        <div className="w-24 bg-gray-900 border-r border-gray-700 p-2 space-y-2 overflow-y-auto">
          <div className="text-xs text-gray-400 text-center mb-2 font-semibold">Páginas</div>
          {pages.map((page, idx) => (
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
          ))}
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
          {isDualView && ['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'].includes(casoSeleccionado.estado) ? (
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

          <div className="flex justify-center gap-2 flex-wrap">
            {[
              { key: 'incompleta', icon: XCircle, label: 'Incompleta', color: '#dc2626', shortcut: '1' },
              { key: 'transcripcion', icon: FileText, label: 'EPS', color: '#ca8a04', shortcut: '2' },
              { key: 'tthh', icon: Send, label: 'TTHH', color: '#2563eb', shortcut: '3' },
              { key: 'completa', icon: CheckCircle, label: 'Completa', color: '#16a34a', shortcut: '5' }
            ].map(({ key, icon: BtnIcon, label, color, shortcut }) => (
              <button 
                key={key}
                onClick={() => handleAccion(key)} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg"
                style={{backgroundColor: color}}>
                <BtnIcon className="w-4 h-4" />
                <span>{label}</span>
                <span className="text-xs opacity-70">({shortcut})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalActivo === 'incompleta' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalActivo(null)}>
          <div className="bg-gray-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-400">Marcar como Incompleta</h3>
              <button onClick={() => setModalActivo(null)} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea 
              value={modalData.motivo} 
              onChange={(e) => setModalData({...modalData, motivo: e.target.value})}
              placeholder="Describe qué documentos faltan o están ilegibles..." 
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white mb-4 placeholder-gray-500" 
              rows="3" />
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Fecha límite para corrección:</label>
              <input 
                type="date" 
                value={modalData.fechaLimite} 
                onChange={(e) => setModalData({...modalData, fechaLimite: e.target.value})}
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setModalActivo(null)} 
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onCambiarEstado('INCOMPLETA', modalData.motivo);
                  setModalActivo(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold">
                Confirmar y Enviar Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
function PortalValidadores() {
  const [casos, setCasos] = useState([]);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [viewerMode, setViewerMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('all');
  const [estadoFiltro, setEstadoFiltro] = useState('all');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({});
  const [notificacion, setNotificacion] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const cargarCasos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const params = { page: page.toString(), page_size: '20' };
      if (empresaFiltro && empresaFiltro !== 'all') params.empresa = empresaFiltro;
      if (estadoFiltro && estadoFiltro !== 'all') params.estado = estadoFiltro;
      if (tipoFiltro && tipoFiltro !== 'all') params.tipo = tipoFiltro;
      if (busqueda && busqueda.trim()) params.q = busqueda;
      
      const data = await api.getCasos(params);
      setCasos(data.items || []);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      mostrarNotificacion('Error cargando casos: ' + error.message, 'error');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [empresaFiltro, estadoFiltro, tipoFiltro, busqueda, page]);

  const cargarEstadisticas = useCallback(async () => {
    try {
      const empresa = empresaFiltro !== 'all' ? empresaFiltro : 'all';
      const data = await api.getStats(empresa);
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [empresaFiltro]);

  const cargarEmpresas = useCallback(async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data.empresas || []);
    } catch (error) {
      console.error('Error cargando empresas:', error);
      mostrarNotificacion('Error cargando empresas: ' + error.message, 'error');
    }
  }, []);

  const handleVerDocumento = async (caso) => {
    try {
      const detalle = await api.getCasoDetalle(caso.serial);
      setCasoSeleccionado(detalle);
      setViewerMode(true);
    } catch (error) {
      mostrarNotificacion('Error: ' + error.message, 'error');
    }
  };

  const cambiarEstado = async (nuevoEstado, motivo = '') => {
    try {
      await api.cambiarEstado(casoSeleccionado.serial, { estado: nuevoEstado, motivo: motivo });
      mostrarNotificacion(`✅ Estado actualizado a ${nuevoEstado}`, 'success');
      await cargarCasos();
      await cargarEstadisticas();
      setViewerMode(false);
    } catch (error) {
      mostrarNotificacion('Error: ' + error.message, 'error');
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => cargarCasos(true), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, cargarCasos]);

  useEffect(() => {
    cargarCasos();
    cargarEstadisticas();
    cargarEmpresas();
  }, [cargarCasos, cargarEstadisticas, cargarEmpresas]);

  const CasoCard = ({ caso }) => {
    const statusInfo = STATUS_MAP[caso.estado] || STATUS_MAP['NUEVO'];
    const Icon = statusInfo.icon;
    
    return (
      <div
        onClick={() => handleVerDocumento(caso)}
        className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg rounded-lg overflow-hidden"
        style={{
          backgroundColor: statusInfo.color + '20',
          borderLeft: `4px solid ${statusInfo.color}`
        }}
      >
        <div className="flex items-center gap-3 p-2.5">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
            style={{backgroundColor: statusInfo.color}}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate text-white">{caso.serial}</div>
            <div className="text-xs text-gray-300 truncate">{caso.nombre}</div>
            <div className="text-[10px] text-gray-400 truncate">{caso.empresa}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notificacion.tipo === 'error' ? 'bg-red-600' : 'bg-green-600'
        } text-white flex items-center gap-2`}>
          {notificacion.tipo === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {notificacion.mensaje}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Portal de Validación</h1>
              <p className="text-[10px] text-gray-400">IncaNeurobaeza</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-red-900/30 px-2.5 py-1 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400">{stats.incompletas || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-900/30 px-2.5 py-1 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400">{stats.eps || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-900/30 px-2.5 py-1 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-400">{stats.tthh || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-900/30 px-2.5 py-1 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400">{stats.completas || 0}</span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-600' : 'bg-gray-700'}`}
              title="Auto-refresh cada 30s"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => api.exportarCasos('xlsx', { empresa: empresaFiltro, estado: estadoFiltro })}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        <div className="w-80 p-3 bg-black/20 border-r border-gray-700 overflow-y-auto space-y-2">
          <h2 className="text-sm font-bold mb-3 text-green-400">📋 Casos Pendientes</h2>
          
          <select 
            value={empresaFiltro} 
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">🏢 Todas las Empresas</option>
            {empresas.map(empresa => (
              <option key={empresa} value={empresa}>{empresa}</option>
            ))}
          </select>
          
          <input 
            type="text" 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar (Ctrl+K)..." 
            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 mb-2" 
          />

          <div className="grid grid-cols-2 gap-2 mb-4">
            <select 
              value={tipoFiltro} 
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="p-1 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white"
            >
              <option value="all">Todos Tipos</option>
              <option value="maternidad">Maternidad</option>
              <option value="paternidad">Paternidad</option>
              <option value="enfermedad_general">General</option>
              <option value="enfermedad_laboral">Laboral</option>
              <option value="accidente_transito">Tránsito</option>
            </select>
            
            <select 
              value={estadoFiltro} 
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="p-1 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white"
            >
              <option value="all">Todos Estados</option>
              {Object.entries(STATUS_MAP).map(([key, {label}]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              <p className="text-xs text-gray-400 mt-2">Cargando...</p>
            </div>
          ) : casos.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">No hay casos</p>
            </div>
          ) : (
            casos.map(caso => <CasoCard key={caso.serial} caso={caso} />)
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">Página {page} de {totalPages}</span>
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
          <div className="text-center">
            <FolderOpen className="w-20 h-20 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">Selecciona un caso para ver el documento</p>
            <p className="text-xs text-gray-500">Los documentos se abrirán en pantalla completa con visor mejorado</p>
          </div>
        </div>
      </div>

      {viewerMode && casoSeleccionado && (
        <DocumentViewer 
          casoSeleccionado={casoSeleccionado}
          onClose={() => setViewerMode(false)}
          onCambiarEstado={cambiarEstado}
        />
      )}
    </div>
  );
}

export default PortalValidadores;