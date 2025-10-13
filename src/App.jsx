import { useState, useEffect, useCallback } from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock, 
  Search, ChevronLeft, ChevronRight, FolderOpen, X,
  Download, RefreshCw, AlertCircle
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
  const defaultOptions = {
    headers: getHeaders(),
    ...options,
  };

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

// ==================== MAPEO DE ESTADOS ====================
const STATUS_MAP = {
  'NUEVO': { label: 'NUEVO', color: 'bg-blue-600', borderColor: 'border-blue-500', icon: Clock },
  'INCOMPLETA': { label: 'INCOMPLETA', color: 'bg-red-600', borderColor: 'border-red-500', icon: XCircle },
  'EPS_TRANSCRIPCION': { label: 'EPS', color: 'bg-yellow-600', borderColor: 'border-yellow-500', icon: FileText },
  'DERIVADO_TTHH': { label: 'TTHH', color: 'bg-blue-600', borderColor: 'border-blue-500', icon: Send },
  'CAUSA_EXTRA': { label: 'EXTRA', color: 'bg-gray-500', borderColor: 'border-gray-500', icon: Edit3 },
  'COMPLETA': { label: 'VALIDADA', color: 'bg-green-600', borderColor: 'border-green-500', icon: CheckCircle },
};

// ==================== COMPONENTE PRINCIPAL ====================
function PortalValidadores() {
  const [casos, setCasos] = useState([]);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('all');
  const [estadoFiltro, setEstadoFiltro] = useState('all');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({});
  const [modalActivo, setModalActivo] = useState(null);
  const [notificacion, setNotificacion] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [modalData, setModalData] = useState({
    motivo: '',
    fechaLimite: '',
    emailBody: '',
    emailSubject: ''
  });

  const cargarCasos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await api.getCasos({
        empresa: empresaFiltro !== 'all' ? empresaFiltro : undefined,
        estado: estadoFiltro !== 'all' ? estadoFiltro : undefined,
        tipo: tipoFiltro !== 'all' ? tipoFiltro : undefined,
        q: busqueda || undefined,
        page: page.toString(),
        page_size: '20'
      });
      setCasos(data.items || []);
      setTotalPages(data.pages || 1);
      if (data.items && data.items.length > 0 && !casoSeleccionado) {
        cargarDetalleCaso(data.items[0].serial);
      }
    } catch (error) {
      mostrarNotificacion('Error cargando casos: ' + error.message, 'error');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [empresaFiltro, estadoFiltro, tipoFiltro, busqueda, page, casoSeleccionado]);

  const cargarEstadisticas = useCallback(async () => {
    try {
      const data = await api.getStats(empresaFiltro !== 'all' ? empresaFiltro : undefined);
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [empresaFiltro]);

  const cargarEmpresas = useCallback(async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data.empresas || []);
      console.log('✅ Empresas cargadas:', data.empresas);
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
      mostrarNotificacion('Error cargando empresas: ' + error.message, 'error');
    }
  }, []);

  const cargarDetalleCaso = async (serial) => {
    try {
      const data = await api.getCasoDetalle(serial);
      setCasoSeleccionado(data);
    } catch (error) {
      mostrarNotificacion('Error cargando detalle: ' + error.message, 'error');
    }
  };

  const cambiarEstado = async (nuevoEstado, motivo = '') => {
    try {
      await api.cambiarEstado(casoSeleccionado.serial, {
        estado: nuevoEstado,
        motivo: motivo,
        fecha_limite: modalData.fechaLimite || null
      });
      mostrarNotificacion(`✅ Estado actualizado a ${nuevoEstado}`, 'success');
      await cargarDetalleCaso(casoSeleccionado.serial);
      await cargarCasos();
      await cargarEstadisticas();
      setModalActivo(null);
    } catch (error) {
      mostrarNotificacion('Error: ' + error.message, 'error');
    }
  };

  const handleAccion = (accion) => {
    if (!casoSeleccionado) {
      mostrarNotificacion('Selecciona un caso primero', 'error');
      return;
    }
    switch (accion) {
      case 'incompleta':
        setModalActivo('incompleta');
        setModalData({ motivo: '', fechaLimite: '', emailBody: '', emailSubject: '' });
        break;
      case 'transcripcion':
        cambiarEstado('EPS_TRANSCRIPCION', 'Transcripción en EPS requerida');
        break;
      case 'tthh':
        cambiarEstado('DERIVADO_TTHH', 'Derivado a Talento Humano');
        break;
      case 'causaExtra':
        setModalActivo('causaExtra');
        setModalData({
          ...modalData,
          emailSubject: `Información Adicional - ${casoSeleccionado.serial}`,
          emailBody: ''
        });
        break;
      case 'completa':
        cambiarEstado('COMPLETA', 'Validada y lista para radicación');
        break;
      default:
        break;
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'info') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 5000);
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

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchBar')?.focus();
      }
      if (casoSeleccionado && !modalActivo) {
        if (e.key === '1') handleAccion('incompleta');
        if (e.key === '2') handleAccion('transcripcion');
        if (e.key === '3') handleAccion('tthh');
        if (e.key === '4') handleAccion('causaExtra');
        if (e.key === '5') handleAccion('completa');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [casoSeleccionado, modalActivo]);

  const CasoCard = ({ caso }) => {
    const statusInfo = STATUS_MAP[caso.estado] || STATUS_MAP['NUEVO'];
    const IconComponent = statusInfo.icon;
    return (
      <div
        onClick={() => cargarDetalleCaso(caso.serial)}
        className={`p-3 rounded-xl cursor-pointer transition-all hover:bg-white/20 border-l-4 ${statusInfo.borderColor} ${
          casoSeleccionado?.serial === caso.serial ? 'bg-white/15 ring-2 ring-blue-400' : 'bg-white/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-yellow-300 truncate">{caso.serial}</span>
              <IconComponent className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400 truncate">{caso.nombre} ({caso.cedula})</p>
            <p className="text-[10px] text-gray-500 truncate">{caso.tipo}</p>
          </div>
        </div>
      </div>
    );
  };

  const MiniContador = () => {
    const incompletas = stats.incompletas || 0;
    const eps = stats.eps || 0;
    const completas = stats.completas || 0;
    const tthh = stats.tthh || 0;
    return (
      <div className="flex justify-between text-xs font-semibold mb-4 p-2 rounded-lg bg-white/10">
        <span className="text-red-400">❌ {incompletas}</span>
        <span className="text-yellow-400">📋 {eps}</span>
        <span className="text-blue-400">👥 {tthh}</span>
        <span className="text-green-400">✅ {completas}</span>
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

      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Portal de Validación</h1>
            <p className="text-xs text-gray-400">IncaNeurobaeza</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-600' : 'bg-gray-700'}`}
            title="Auto-refresh cada 30s"
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => api.exportarCasos('xlsx', { empresa: empresaFiltro, estado: estadoFiltro })}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            title="Exportar a Excel"
          >
            <Download className="w-5 h-5" />
          </button>
          <div className="p-2 rounded-full bg-gray-700 cursor-pointer hover:bg-gray-600">
            <User className="w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-80 flex flex-col p-4 bg-black/20 border-r border-gray-700 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-green-300">Flujo de Trabajo</h2>
          <MiniContador />
          <div className="space-y-3 mb-4">
            <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-2 border border-gray-600">
              <option value="all">🏢 Todas las Empresas</option>
              {empresas.map(empresa => (
                <option key={empresa} value={empresa}>{empresa}</option>
              ))}
            </select>
            <input id="searchBar" type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar (Ctrl+K)..." className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500" />
            <div className="grid grid-cols-2 gap-2">
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
                className="p-1 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white">
                <option value="all">Todos Tipos</option>
                <option value="maternidad">Maternidad</option>
                <option value="paternidad">Paternidad</option>
                <option value="general">General</option>
                <option value="labor">Laboral</option>
                <option value="traffic">Tránsito</option>
              </select>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
                className="p-1 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white">
                <option value="all">Todos Estados</option>
                {Object.keys(STATUS_MAP).map(estado => (
                  <option key={estado} value={estado}>{STATUS_MAP[estado].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-gray-400 mt-2">Cargando...</p>
              </div>
            ) : casos.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 mx-auto text-gray-500" />
                <p className="text-sm text-gray-400 mt-2">No hay casos</p>
              </div>
            ) : (
              casos.map(caso => <CasoCard key={caso.serial} caso={caso} />)
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm">Página {page} de {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {!casoSeleccionado ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Selecciona un caso del panel lateral</p>
                <p className="text-xs text-gray-500 mt-2">Usa los filtros para buscar casos específicos</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border-2 p-6 transition-all ${STATUS_MAP[casoSeleccionado.estado]?.borderColor || 'border-gray-700'} bg-gray-800/50`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-yellow-300">{casoSeleccionado.serial}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[casoSeleccionado.estado]?.color || 'bg-gray-600'} text-white`}>
                  {STATUS_MAP[casoSeleccionado.estado]?.label || casoSeleccionado.estado}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div><span className="text-gray-400">Nombre:</span><p className="font-medium">{casoSeleccionado.nombre}</p></div>
                <div><span className="text-gray-400">Cédula:</span><p className="font-medium">{casoSeleccionado.cedula}</p></div>
                <div><span className="text-gray-400">Empresa:</span><p className="font-medium">{casoSeleccionado.empresa}</p></div>
                <div><span className="text-gray-400">Tipo:</span><p className="font-medium">{casoSeleccionado.tipo}</p></div>
                <div><span className="text-gray-400">Email:</span><p className="font-medium text-xs">{casoSeleccionado.email_form}</p></div>
                <div><span className="text-gray-400">Teléfono:</span><p className="font-medium">{casoSeleccionado.telefono_form}</p></div>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-6 pt-6 border-t border-gray-700">
                {['incompleta', 'transcripcion', 'tthh', 'causaExtra', 'completa'].map((accion) => {
                  const config = {
                    incompleta: { icon: XCircle, label: 'Incompleta', color: '#dc2626', key: '1' },
                    transcripcion: { icon: FileText, label: 'EPS', color: '#ca8a04', key: '2' },
                    tthh: { icon: Send, label: 'TTHH', color: '#2563eb', key: '3' },
                    causaExtra: { icon: Edit3, label: 'Extra', color: '#6b7280', key: '4' },
                    completa: { icon: CheckCircle, label: 'Completa', color: '#16a34a', key: '5' }
                  }[accion];
                  const Icon = config.icon;
                  return (
                    <button 
                      key={accion}
                      onClick={() => handleAccion(accion)} 
                      className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm border-none cursor-pointer min-w-[100px] hover:scale-105 active:scale-95 transition-transform"
                      style={{backgroundColor: config.color}}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{config.label} ({config.key})</span>
                    </button>
                  );
                })}
              </div>
              {casoSeleccionado.drive_link && (
                <div className="mt-6 text-center">
                  <a href={casoSeleccionado.drive_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    <FolderOpen className="w-5 h-5" />
                    Ver Documentos en Drive
                  </a>
                </div>
              )}
            </div>
          )}
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
            <textarea value={modalData.motivo} onChange={(e) => setModalData({...modalData, motivo: e.target.value})}
              placeholder="Describe qué documentos faltan o están ilegibles..." 
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white mb-4 placeholder-gray-500" 
              rows="3" />
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Fecha límite para corrección:</label>
              <input type="date" value={modalData.fechaLimite} onChange={(e) => setModalData({...modalData, fechaLimite: e.target.value})}
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalActivo(null)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => cambiarEstado('INCOMPLETA', modalData.motivo)} 
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold">
                Confirmar y Enviar Email
              </button>
            </div>
          </div>
        </div>
      )}

      {modalActivo === 'causaExtra' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalActivo(null)}>
          <div className="bg-gray-800 p-6 rounded-2xl max-w-xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-300">Causa Extra - Email Personalizado</h3>
              <button onClick={() => setModalActivo(null)} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input type="text" value={modalData.emailSubject} onChange={(e) => setModalData({...modalData, emailSubject: e.target.value})}
              placeholder="Asunto del correo" className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white mb-4 placeholder-gray-500" />
            <textarea value={modalData.emailBody} onChange={(e) => setModalData({...modalData, emailBody: e.target.value})}
              placeholder="Escribe el mensaje personalizado para el trabajador..." 
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white mb-4 placeholder-gray-500" 
              rows="6" />
            <div className="flex gap-3">
              <button onClick={() => setModalActivo(null)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => cambiarEstado('CAUSA_EXTRA', modalData.emailBody)} 
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors font-semibold">
                Enviar Correo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalValidadores;