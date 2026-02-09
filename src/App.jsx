import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock, 
  ChevronLeft, X, Download, RefreshCw, 
  AlertCircle, ZoomIn, ZoomOut, Sliders,
  Undo2, Image, Loader2, Check, ChevronDown, ChevronRight, Save
} from 'lucide-react';
import ReportsDashboard from './components/Dashboard/ReportsDashboard';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ==================== CONFIGURACIÓN API ====================
const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

// ✅ IMAGEN SOAT DE REFERENCIA (Base64)
const SOAT_REFERENCIA_BASE64 = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAH0AfQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKK`;

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

// ==================== VISOR FULLSCREEN TIPO POWERPOINT ====================
function DocumentViewer({ casoSeleccionado, onClose, onRecargarCasos, casosLista = [], indiceActual = 0, onCambiarCaso }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState([]);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [accionSeleccionada, setAccionSeleccionada] = useState(null);
  const [checksSeleccionados, setChecksSeleccionados] = useState([]);
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [adjuntos, setAdjuntos] = useState([]);
  const [enviandoValidacion, setEnviandoValidacion] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState('');
  const [ultimaAccion, setUltimaAccion] = useState(null);
  const [mostrarMiniaturas, setMostrarMiniaturas] = useState(true);
  const [casoActualizado, setCasoActualizado] = useState(casoSeleccionado);
  const [notificacion, setNotificacion] = useState(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [paginasSeleccionadas, setPaginasSeleccionadas] = useState([]);
  const [mostrarInfoDesplegable, setMostrarInfoDesplegable] = useState(true);
  const [guardandoPDF, setGuardandoPDF] = useState(false);
  const [mostradoGuardadoExitoso, setMostradoGuardadoExitoso] = useState(false);
  const [mostraModalLimpiar, setMostrarModalLimpiar] = useState(false);
  const [contraseniaLimpiar, setContraseniaLimpiar] = useState('');
  const [limpiarEnProgreso, setLimpiarEnProgreso] = useState(false);
  const containerRef = useRef(null);

  const mostrarNotificacion = useCallback((mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 2500);
  }, []);

  // ✅ NAVEGACIÓN ENTRE INCAPACIDADES (respetando filtros)
  const irAlSiguiente = useCallback(() => {
    if (indiceActual < casosLista.length - 1) {
      const siguienteIndice = indiceActual + 1;
      if (onCambiarCaso) {
        onCambiarCaso(siguienteIndice); // Solo pasar índice
      }
      setCurrentPage(0);
      mostrarNotificacion(`📄 Siguiente: ${casosLista[siguienteIndice].serial}`, 'info');
    } else {
      mostrarNotificacion('✅ Ya estás en la última incapacidad', 'info');
    }
  }, [indiceActual, casosLista, onCambiarCaso, mostrarNotificacion]);

  const irAlAnterior = useCallback(() => {
    if (indiceActual > 0) {
      const anteriorIndice = indiceActual - 1;
      if (onCambiarCaso) {
        onCambiarCaso(anteriorIndice); // Solo pasar índice
      }
      setCurrentPage(0);
      mostrarNotificacion(`📄 Anterior: ${casosLista[anteriorIndice].serial}`, 'info');
    } else {
      mostrarNotificacion('✅ Ya estás en la primera incapacidad', 'info');
    }
  }, [indiceActual, casosLista, onCambiarCaso, mostrarNotificacion]);

  // ✅ FUNCIÓN PARA RECARGAR PDF (después de editar)
  const recargarPDFInPlace = useCallback(async (serial) => {
    // Simplemente limpiar pages y dejar que el useEffect recargue
    setPages([]);
    setLoadingPdf(true);
    mostrarNotificacion('🔄 Recargando PDF...', 'info');
  }, [mostrarNotificacion]);

  // ✅ Función para convertir Base64 a File
  const base64ToFile = (base64String, filename) => {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };
// ✅ Filtrar checks por tipo de incapacidad
  const getChecksPorTipo = (tipo, categoria) => {
    const tipoNormalizado = tipo?.toLowerCase() || 'enfermedad_general';
    
    const checksDocumentos = {
      'enfermedad_general': [
        { key: 'incapacidad_faltante', label: 'Falta soporte de incapacidad', desc: 'No se adjuntó el documento oficial de la EPS' },
        { key: 'epicrisis_faltante', label: 'Falta epicrisis/resumen', desc: 'Requerido para 3+ días' },
      ],
      'maternidad': [
        { key: 'incapacidad_faltante', label: 'Falta licencia de maternidad', desc: 'Documento oficial de la EPS' },
        { key: 'epicrisis_faltante', label: 'Falta epicrisis', desc: 'Resumen clínico completo' },
        { key: 'registro_civil_faltante', label: 'Falta registro civil', desc: 'Del bebé' },
        { key: 'nacido_vivo_faltante', label: 'Falta certificado nacido vivo', desc: 'Original legible' },
      ],
      'paternidad': [
        { key: 'epicrisis_faltante', label: 'Falta epicrisis de la madre', desc: 'Resumen clínico' },
        { key: 'cedula_padre_faltante', label: 'Falta cédula del padre', desc: 'Ambas caras' },
        { key: 'registro_civil_faltante', label: 'Falta registro civil', desc: 'Del bebé' },
        { key: 'nacido_vivo_faltante', label: 'Falta certificado nacido vivo', desc: 'Original' },
        { key: 'licencia_maternidad_faltante', label: 'Falta licencia maternidad', desc: 'Si madre trabaja' },
      ],
      'accidente_transito': [
        { key: 'incapacidad_faltante', label: 'Falta incapacidad médica', desc: 'Documento oficial' },
        { key: 'epicrisis_faltante', label: 'Falta epicrisis', desc: 'Resumen clínico completo' },
        { key: 'furips_faltante', label: 'Falta FURIPS', desc: 'Formato Único de Reporte' },
        { key: 'soat_faltante', label: 'Falta SOAT', desc: '✅ Se enviará imagen automática', icon: <Image className="w-4 h-4 text-blue-600" /> },
      ],
    };
    
    const checksCalidad = [
      { key: 'ilegible_recortada', label: 'Documento recortado', desc: 'Bordes no visibles' },
      { key: 'ilegible_borrosa', label: 'Documento borroso', desc: 'Mala calidad de imagen' },
      { key: 'ilegible_manchada', label: 'Documento con reflejos/manchas', desc: 'Obstáculos visuales' },
      { key: 'epicrisis_incompleta', label: 'Epicrisis incompleta', desc: 'Faltan páginas' },
    ];
    
    if (categoria === 'documentos') {
      return checksDocumentos[tipoNormalizado] || checksDocumentos['enfermedad_general'];
    }
    return checksCalidad;
  };
 
// ✅ ROTAR PÁGINA
  const rotarPagina = useCallback(async (angle, aplicarATodas) => {
    const pageNum = currentPage; // Usar página actual
    setEnviandoValidacion(true);
    
    try {
      const operaciones = aplicarATodas 
        ? { rotate: pages.map((_, i) => ({ page_num: i, angle })) }
        : { rotate: [{ page_num: pageNum, angle }] };
      
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ operaciones })
      });
      
     if (response.ok) {
        mostrarNotificacion('✅ Página(s) rotada(s)', 'success');
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error rotando página', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [currentPage, pages, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

// ✅ MEJORAR CALIDAD HD CON 3 NIVELES
  const mejorarCalidadHD = useCallback(async (nivel = 'estandar') => {
    setEnviandoValidacion(true);
    
    const niveles = {
      'rapido': { scale: 1.8, label: 'Rápido (1.8x)' },
      'estandar': { scale: 2.5, label: 'Estándar (2.5x)' },
      'premium': { scale: 3.5, label: 'Premium (3.5x)' }
    };
    
    const config = niveles[nivel];
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { enhance_quality: { pages: [currentPage], scale: config.scale } }
        })
      });
      
      if (response.ok) {
        mostrarNotificacion(`✨ Calidad ${config.label} aplicada`, 'success');
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error mejorando calidad', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [currentPage, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

  // ✅ APLICAR FILTRO DE IMAGEN
  const aplicarFiltro = useCallback(async (tipo) => {
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { 
            aplicar_filtro: { 
              page_num: currentPage, 
              filtro: tipo 
            } 
          }
        })
      });
      
      if (response.ok) {
        mostrarNotificacion(`✨ Filtro ${tipo} aplicado`, 'success');
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error aplicando filtro', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [currentPage, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

  // ✅ RECORTE AUTOMÁTICO
  const recorteAutomatico = useCallback(async () => {
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { crop_auto: [{ page_num: currentPage, margin: 10 }] }
        })
      });
      
      if (response.ok) {
        mostrarNotificacion('✂️ Recorte aplicado', 'success');
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error recortando', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [currentPage, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

  // ✅ CORREGIR INCLINACIÓN
  const corregirInclinacion = useCallback(async () => {
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { deskew: { page_num: currentPage } }
        })
      });
      
      if (response.ok) {
        mostrarNotificacion('🔄 Inclinación corregida', 'success');
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error corrigiendo', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [currentPage, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

  // ✅ ELIMINAR PÁGINAS SELECCIONADAS
  const eliminarPaginasSeleccionadas = useCallback(async () => {
    if (paginasSeleccionadas.length === 0) {
      mostrarNotificacion('⚠️ Selecciona páginas primero', 'error');
      return;
    }
    
    if (!window.confirm(`¿Eliminar ${paginasSeleccionadas.length} página(s)?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { delete_pages: paginasSeleccionadas.sort((a, b) => a - b) }
        })
      });
      
      if (response.ok) {
        mostrarNotificacion(`🗑️ ${paginasSeleccionadas.length} página(s) eliminada(s)`, 'success');
        setPaginasSeleccionadas([]);
        await recargarPDFInPlace(casoSeleccionado.serial);
        if (currentPage >= paginasSeleccionadas.length) {
          setCurrentPage(Math.max(0, currentPage - 1));
        }
      } else {
        mostrarNotificacion('❌ Error eliminando páginas', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [paginasSeleccionadas, casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace, currentPage]);

  // ✅ TOGGLE SELECCIÓN DE PÁGINA
  const toggleSeleccionPagina = useCallback((pageIndex) => {
    setPaginasSeleccionadas(prev => {
      if (prev.includes(pageIndex)) {
        return prev.filter(p => p !== pageIndex);
      } else {
        return [...prev, pageIndex];
      }
    });
  }, []);

  // ✅ GUARDAR PDF EN DRIVE
  const guardarPDFEnDrive = useCallback(async () => {
    setGuardandoPDF(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/guardar-drive`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (response.ok) {
        mostrarNotificacion('💾 Guardado en Drive', 'success');
        setMostradoGuardadoExitoso(true);
        setTimeout(() => setMostradoGuardadoExitoso(false), 3000);
      } else {
        mostrarNotificacion('❌ Error guardando', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setGuardandoPDF(false);
    }
  }, [casoSeleccionado.serial, mostrarNotificacion]);

  // ✅ Función validar con imagen SOAT automática
  const handleValidar = async (serial, accion) => {
    // ✅ DETECTAR SI ES UN REENVÍO
    const esReenvio = casoSeleccionado.metadata_reenvio?.tiene_reenvios;
    
    if (esReenvio) {
      // Si es reenvío, usar endpoint especial
      if (accion === 'completa') {
        // ✅ CORRECCIÓN 3: Validar serial antes de aprobar reenvío
        const partesSerial = casoSeleccionado.serial.split(' ');
        if (partesSerial.length < 7) {
          alert('❌ Error: Serial con formato inválido. No se puede aprobar.');
          return;
        }
        
        // ✅ APROBAR REENVÍO
        if (!window.confirm('✅ ¿Aprobar este reenvío?\n\nSe desbloqueará el caso y se marcará como COMPLETA.')) {
          return;
        }
        
        setEnviandoValidacion(true);
        
        const formData = new FormData();
        formData.append('decision', 'aprobar');
        formData.append('motivo', 'Documentos correctos');
        
        try {
          const response = await fetch(
            `${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/aprobar-reenvio`,
            {
              method: 'POST',
              headers: { 'X-Admin-Token': ADMIN_TOKEN },
              body: formData
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            alert(`✅ ${data.mensaje}`);
            if (onRecargarCasos) onRecargarCasos();
            onClose();
          } else {
            alert('❌ Error al aprobar reenvío');
          }
        } catch (error) {
          alert('❌ Error de conexión');
        } finally {
          setEnviandoValidacion(false);
        }
        
        return; // ← IMPORTANTE: Salir aquí
      }
      
      if (accion === 'incompleta') {
        // ❌ RECHAZAR REENVÍO (abrir modal de checks)
        setAccionSeleccionada('incompleta');
        return; // ← Abre el modal normal
      }
    }
    
    // ✅ FLUJO NORMAL (sin reenvío)
    setEnviandoValidacion(true);
    setErrorValidacion('');
    
    const formData = new FormData();
    formData.append('accion', accion);
    
    if (checksSeleccionados.length > 0) {
      checksSeleccionados.forEach(check => {
        formData.append('checks', check);
      });
    }
    
    // ✅ SI SELECCIONÓ "SOAT_FALTANTE", AGREGAR IMAGEN AUTOMÁTICAMENTE
    if (checksSeleccionados.includes('soat_faltante') && !adjuntos.some(f => f.name.includes('SOAT'))) {
      const soatFile = base64ToFile(SOAT_REFERENCIA_BASE64, 'SOAT_Referencia.jpg');
      adjuntos.push(soatFile);
      console.log('✅ Imagen SOAT agregada automáticamente');
    }
    
    adjuntos.forEach((file) => {
      formData.append('adjuntos', file);
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/validar`, {
        method: 'POST',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
        body: formData
      });
      
    if (response.ok) {
  await response.json();
  
  // ✅ GUARDAR ÚLTIMA ACCIÓN PARA DESHACER
  setUltimaAccion({
    serial: serial,
    accion: accion,
    timestamp: new Date().toISOString()
  });
  
  // Notificación sutil
  mostrarNotificacion(`✅ Caso ${accion} correctamente`, 'success');
  
  // Recargar casos
  if (onRecargarCasos) onRecargarCasos();
  
  // Limpiar estado
  setAccionSeleccionada(null);
  setChecksSeleccionados([]);
  setAdjuntos([]);
  
  // ✅ Buscar siguiente caso del MISMO FILTRO automáticamente
  setTimeout(async () => {
    try {
      // Usar el siguiente caso de la lista actual (respetando filtro)
      if (onCambiarCaso && casosLista) {
        const siguienteCasoEnLista = casosLista[indiceActual + 1];
        
        if (siguienteCasoEnLista) {
          // Hay más casos en la lista actual
          const detalle = await api.getCasoDetalle(siguienteCasoEnLista.serial);
          setCasoActualizado(detalle);
          onCambiarCaso(indiceActual + 1);
          mostrarNotificacion('📄 Siguiente caso cargado', 'success');
        } else {
          // No hay más casos en esta página/filtro
          onClose();
          mostrarNotificacion('✅ No hay más casos en este filtro', 'success');
        }
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error al cargar siguiente caso:', error);
      onClose();
    }
  }, 1500);
} else {
        const errorData = await response.json().catch(() => ({}));
        setErrorValidacion(errorData.detail || 'Error al validar caso');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorValidacion('Error de conexión con el servidor');
    } finally {
      setEnviandoValidacion(false);
    }
  };
// ✅ FUNCIÓN CAMBIAR TIPO (Inline, sin modal)
  const handleCambiarTipo = async (nuevoTipo) => {
    if (!window.confirm(
      `🔄 ¿Cambiar tipo a "${nuevoTipo}"?\n\n` +
      `El empleado recibirá un email con los nuevos documentos requeridos.`
    )) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/cambiar-tipo`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ nuevo_tipo: nuevoTipo })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        mostrarNotificacion(`✅ ${data.mensaje}`, 'success');
        if (onRecargarCasos) onRecargarCasos();
        setCasoActualizado(prev => ({...prev, tipo: nuevoTipo}));
      } else {
        const errorData = await response.json().catch(() => ({}));
        mostrarNotificacion(`❌ Error: ${errorData.detail || 'No se pudo cambiar el tipo'}`, 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  };
  // ✅ FUNCIÓN TOGGLE BLOQUEO
  // ✅ FUNCIÓN ELIMINAR INCAPACIDAD COMPLETAMENTE
  const handleEliminarIncapacidad = async () => {
    if (!window.confirm(
      '🗑️ ¿ELIMINAR PERMANENTEMENTE esta incapacidad?\n\n' +
      '⚠️ ADVERTENCIA:\n' +
      '• Se eliminará de la base de datos\n' +
      '• Se eliminará de Google Drive\n' +
      '• Esta acción NO se puede deshacer\n\n' +
      '¿Estás seguro?'
    )) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}`,
        {
          method: 'DELETE',
          headers: {
            'X-Admin-Token': ADMIN_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        mostrarNotificacion(`✅ ${data.mensaje}`, 'success');
        
        // Cerrar el caso actual
        onClose();
        
        // Recargar lista
        if (onRecargarCasos) onRecargarCasos();
      } else {
        const errorData = await response.json().catch(() => ({}));
        mostrarNotificacion(`❌ Error: ${errorData.detail || 'No se pudo eliminar'}`, 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ FUNCIÓN LIMPIAR TODOS LOS CASOS
  const handleLimpiarSistema = async () => {
    if (!contraseniaLimpiar) {
      mostrarNotificacion('❌ Debes ingresar la contraseña', 'error');
      return;
    }
    
    if (!window.confirm(
      '🧹 ¿LIMPIAR TODO EL SISTEMA?\n\n' +
      '⚠️ ADVERTENCIA:\n' +
      '• Se eliminarán TODOS los casos\n' +
      '• Se eliminarán de la base de datos\n' +
      '• Se eliminarán de Google Drive\n' +
      '• Esta acción NO se puede deshacer\n\n' +
      '¿Estás 100% seguro?'
    )) {
      return;
    }
    
    setLimpiarEnProgreso(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/validador/casos-limpiar-todos?contraseña=${encodeURIComponent(contraseniaLimpiar)}`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        mostrarNotificacion(`🧹 ${data.mensaje}`, 'success');
        setMostrarModalLimpiar(false);
        setContraseniaLimpiar('');
        
        // Cerrar el caso actual
        onClose();
        
        // Recargar lista
        if (onRecargarCasos) onRecargarCasos();
      } else {
        const errorData = await response.json().catch(() => ({}));
        mostrarNotificacion(`❌ ${errorData.detail || 'Error al limpiar'}`, 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setLimpiarEnProgreso(false);
    }
  };

  // ✅ FUNCIÓN TOGGLE BLOQUEO
  const handleToggleBloqueo = async (accion) => {
    const accionTexto = accion === 'bloquear' ? 'BLOQUEAR' : 'DESBLOQUEAR';
    const motivo = prompt(`¿Por qué deseas ${accionTexto} este caso?\n\n(Ejemplo: "Casos especiales", "Urgencia médica", etc.)`);
    
    if (!motivo) return;
    
    setEnviandoValidacion(true);
    
    const formData = new FormData();
    formData.append('accion', accion);
    formData.append('motivo', motivo);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/toggle-bloqueo`, {
        method: 'POST',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const emoji = accion === 'bloquear' ? '🔒' : '🔓';
        alert(`${emoji} ${data.mensaje}`);
        
        // Actualizar estado local
        setCasoActualizado(prev => ({
          ...prev,
          bloquea_nueva: data.bloquea_nueva
        }));
        
        if (onRecargarCasos) onRecargarCasos();
      } else {
        alert('❌ Error al cambiar estado de bloqueo');
      }
    } catch (error) {
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ FUNCIÓN DESHACER/REVERTIR
  const handleDeshacer = async () => {
    if (!ultimaAccion) {
      alert('❌ No hay ninguna acción reciente para deshacer');
      return;
    }
    
    if (!window.confirm('¿Deshacer la última validación? Se enviará un email avisando del error.')) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      // Cambiar estado a NUEVO
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(ultimaAccion.serial)}/estado`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          estado: 'NUEVO',
          motivo: `Revertido por error. Acción anterior: ${ultimaAccion.accion}`
        })
      });
      
      if (response.ok) {
        alert('✅ Acción revertida. Se ha enviado email al empleado informando del error.');
        setUltimaAccion(null);
        if (onRecargarCasos) onRecargarCasos();
        onClose();
      } else {
        alert('❌ Error al revertir acción');
      }
    } catch (error) {
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ Notificación libre
  const handleNotificarLibre = async (serial) => {
    if (!mensajePersonalizado.trim()) {
      setErrorValidacion('⚠️ Escribe un mensaje antes de enviar');
      return;
    }
    
    setEnviandoValidacion(true);
    setErrorValidacion('');
    
    const formData = new FormData();
    formData.append('mensaje_personalizado', mensajePersonalizado);
    
    adjuntos.forEach((file) => {
      formData.append('adjuntos', file);
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/notificar-libre`, {
        method: 'POST',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Notificación enviada\n${data.mensaje || ''}`);
        setMensajePersonalizado('');
        setAdjuntos([]);
        setAccionSeleccionada(null);
        if (onRecargarCasos) onRecargarCasos();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorValidacion(errorData.detail || 'Error al enviar notificación');
      }
    } catch (error) {
      setErrorValidacion('Error de conexión con el servidor');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  const toggleCheck = (checkValue) => {
    setChecksSeleccionados(prev => {
      if (prev.includes(checkValue)) {
        return prev.filter(c => c !== checkValue);
      } else {
        return [...prev, checkValue];
      }
    });
  };

  // ✅ FULLSCREEN AUTOMÁTICO
  useEffect(() => {
    // Entrar en fullscreen al abrir
    const enterFullscreen = async () => {
      try {
        if (document.fullscreenElement) {
          console.log('✅ Ya en fullscreen');
          return;
        }
        
        // ✅ DESACTIVAR SCROLL DEL NAVEGADOR
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        await document.documentElement.requestFullscreen();
        console.log('✅ Fullscreen activado');
      } catch (err) {
        console.log('⚠️ Fullscreen no soportado:', err);
      }
    };
    
    enterFullscreen();
    
    // Salir con F11 o ESC
    const handleFullscreenExit = (e) => {
      if (e.key === 'F11' || (e.key === 'Escape' && document.fullscreenElement)) {
        e.preventDefault();
        
        // ✅ RESTAURAR SCROLL DEL NAVEGADOR
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleFullscreenExit);
    
    return () => {
      window.removeEventListener('keydown', handleFullscreenExit);
      // Restaurar al desmontar
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

// ✅ CERRAR DROPDOWN AL PRESIONAR ESCAPE
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && showToolsMenu) {
      setShowToolsMenu(false);
    }
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [showToolsMenu]);

// ✅ ATAJOS PARA LIMPIAR SISTEMA (Ctrl+Shift+Delete o Ctrl+F11)
useEffect(() => {
  const handleLimpiarHotkey = (e) => {
    // Opción 1: Ctrl + Shift + Delete (funciona en portátiles)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
      e.preventDefault();
      setMostrarModalLimpiar(true);
    }
    // Opción 2: Ctrl + F11 (backup para teclados normales)
    if ((e.ctrlKey || e.metaKey) && e.key === 'F11') {
      e.preventDefault();
      setMostrarModalLimpiar(true);
    }
  };
  document.addEventListener('keydown', handleLimpiarHotkey);
  return () => document.removeEventListener('keydown', handleLimpiarHotkey);
}, []);

// ✅ DETECTAR REENVÍOS AL ABRIR CASO
useEffect(() => {
  const verificarReenvios = async () => {
    if (!casoActualizado?.serial) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoActualizado.serial)}/historial-reenvios`,
        { headers: getHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.tiene_reenvios && data.total_reenvios > 0) {
          // Hay reenvíos pendientes
          console.log(`🔄 Caso ${casoActualizado.serial} tiene ${data.total_reenvios} reenvío(s)`);
          
          // Cambiar estado del caso a NUEVO para forzar revisión
          setCasoActualizado(prev => ({
            ...prev,
            estado: 'NUEVO',
            metadata_reenvio: {
              tiene_reenvios: true,
              total_reenvios: data.total_reenvios,
              ultimo_reenvio: data.historial[data.historial.length - 1]
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error verificando reenvíos:', error);
    }
  };
  
  verificarReenvios();
}, [casoActualizado?.serial]);

  // ✅ NUEVA FUNCIÓN: Cargar PDF INSTANTÁNEO desde stream
  useEffect(() => {
    const cargarPDFDirecto = async () => {
      setLoadingPdf(true);
      
      try {
        const pdfUrl = `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/pdf/stream`;
        
        // ✅ CORRECCIÓN 2: Timeout aumentado para Railway (25s → 35s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const response = await fetch(pdfUrl, {
          headers: getHeaders(),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const arrayBuffer = await response.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          disableAutoFetch: false
        });
        
        const pdf = await loadingTask.promise;
        const pagesArray = [];
        
        // ⚡ Renderizar SOLO primera página INMEDIATAMENTE
        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.8 });
        const canvas1 = document.createElement('canvas');
        canvas1.width = viewport1.width;
        canvas1.height = viewport1.height;
        
        const ctx1 = canvas1.getContext('2d');
        await page1.render({
          canvasContext: ctx1,
          viewport: viewport1
        }).promise;
        
        pagesArray.push({
          id: 0,
          fullImage: canvas1.toDataURL('image/jpeg', 0.85)
        });
        
        setPages([...pagesArray]);
        setCurrentPage(0);
        setLoadingPdf(false);
        
        // 📥 Cargar resto en background
        for (let i = 2; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const context = canvas.getContext('2d');
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          pagesArray.push({
            id: i - 1,
            fullImage: canvas.toDataURL('image/jpeg', 0.85)
          });
          
          setPages([...pagesArray]);
        }
        
      } catch (error) {
        console.error('❌ Error cargando PDF:', error);
        setLoadingPdf(false);
      }
    };
    
    if (casoSeleccionado?.serial) {
      cargarPDFDirecto();
    }
  }, [casoSeleccionado?.serial]);

  // ✅ PRECARGA AGRESIVA DEL SIGUIENTE + PRÓXIMO PDF (triple carga para velocidad)
  useEffect(() => {
    // Precarga el siguiente y el siguiente del siguiente
    const precargaMultiple = async () => {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) return;
      
      // Precarga los próximos 3 casos en paralelo (no secuencial)
      const indicesToPrefetch = [];
      for (let i = 1; i <= 3; i++) {
        if (indiceActual + i < casosLista.length) {
          indicesToPrefetch.push(indiceActual + i);
        }
      }
      
      // Cargar todos en paralelo sin esperar (fire and forget)
      indicesToPrefetch.forEach((idx) => {
        const caso = casosLista[idx];
        const delay = idx === indiceActual + 1 ? 500 : (idx === indiceActual + 2 ? 2000 : 5000);
        
        setTimeout(() => {
          try {
            const pdfUrl = `${API_BASE_URL}/validador/casos/${encodeURIComponent(caso.serial)}/pdf`;
            const loadingTask = pdfjsLib.getDocument({
              url: pdfUrl,
              httpHeaders: getHeaders(),
              disableAutoFetch: false // Asegurar que descarga todo
            });
            
            // Trigger la descarga pero no esperar
            loadingTask.promise
              .then(() => console.log(`✅ Precargué: ${caso.serial}`))
              .catch(() => console.log(`⚠️ Precarga falló: ${caso.serial}`));
          } catch (error) {
            console.log(`⚠️ Error en precarga de ${caso.serial}`);
          }
        }, delay);
      });
    };
    
    // Ejecutar precarga sin bloquear la renderización
    if (casosLista.length > 0) {
      precargaMultiple();
    }
  }, [indiceActual, casosLista]);

  // ✅ ZOOM CON SCROLL DEL MOUSE
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(50, Math.min(300, prev + delta)));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);
  // ✅ NAVEGACIÓN CON TECLADO (tanto páginas como incapacidades)
  const handleKeyPress = useCallback((e) => {
    // Verificar si hay un modal abierto - no navegar si estamos escribiendo
    const modalAbierto = accionSeleccionada !== null;
    const tieneInputFocused = document.activeElement?.tagName === 'TEXTAREA' || 
                               document.activeElement?.tagName === 'INPUT';
    
    // Si hay un modal o un input enfocado, solo permitir ESC
    if (modalAbierto && e.key !== 'Escape') {
      return;
    }
    
    // ✅ NAVEGACIÓN DE INCAPACIDADES (con Ctrl+Flecha O sin Ctrl si es borde del PDF)
    if (e.ctrlKey || e.altKey) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        irAlSiguiente();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        irAlAnterior();
        return;
      }
    }
    
    // ✅ FLECHAS SIN MODIFICADORES: 
    // Si estamos en la última página → siguiente incapacidad
    // Si estamos en la primera página → anterior incapacidad
    // Si estamos en una página intermedia → navegar páginas
    if (!tieneInputFocused) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        // Si estamos en la ÚLTIMA página del PDF, ir al siguiente caso
        if (currentPage === pages.length - 1 && pages.length > 0) {
          e.preventDefault();
          irAlSiguiente();
          return;
        }
        // Si no, navegar a la siguiente página
        setCurrentPage(p => Math.min(pages.length - 1, p + 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        // Si estamos en la PRIMERA página del PDF, ir al caso anterior
        if (currentPage === 0 && pages.length > 0) {
          e.preventDefault();
          irAlAnterior();
          return;
        }
        // Si no, navegar a la página anterior
        setCurrentPage(p => Math.max(0, p - 1));
      }
      if (e.key === 'Home') setCurrentPage(0);
      if (e.key === 'End') setCurrentPage(pages.length - 1);
    }
    
    if (e.key === 'Escape') onClose();
  }, [pages, onClose, accionSeleccionada, irAlSiguiente, irAlAnterior, currentPage]);

  // ✅ ATAJOS DE TECLADO PARA HERRAMIENTAS
  useEffect(() => {
    const handleToolsKeyPress = (e) => {
      // Ignorar si hay modal abierto o input enfocado
      const modalAbierto = accionSeleccionada !== null;
      const tieneInputFocused = document.activeElement?.tagName === 'TEXTAREA' || 
                                document.activeElement?.tagName === 'INPUT';
      
      if (modalAbierto || tieneInputFocused) return;
      
      // 🔧 TECLA + : Abrir/Cerrar Herramientas
      if (e.key === '+' || (e.shiftKey && e.key === '=')) {
        e.preventDefault();
        setShowToolsMenu(prev => !prev);
        mostrarNotificacion(
          showToolsMenu ? '❌ Herramientas cerradas' : '✅ Herramientas abiertas',
          'info'
        );
        return;
      }
      
      // ✨ TECLA R : Rotar 90° página actual
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey) {
        e.preventDefault();
        rotarPagina(90, false);
        setShowToolsMenu(false);
        return;
      }
      
      // 🎨 TECLA Q : Mejorar Calidad
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey) {
        e.preventDefault();
        mejorarCalidadHD();
        setShowToolsMenu(false);
        return;
      }
      
      // ✂️ TECLA C : Recorte Automático
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey) {
        e.preventDefault();
        recorteAutomatico();
        setShowToolsMenu(false);
        return;
      }
      
      // ⚪ TECLA B : Blanco y Negro
      if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey) {
        e.preventDefault();
        aplicarFiltro('grayscale');
        setShowToolsMenu(false);
        return;
      }
      
      // 📐 TECLA A : Corregir Ángulo
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey) {
        e.preventDefault();
        corregirInclinacion();
        setShowToolsMenu(false);
        return;
      }
    };
    
    window.addEventListener('keydown', handleToolsKeyPress);
    return () => window.removeEventListener('keydown', handleToolsKeyPress);
  }, [showToolsMenu, accionSeleccionada, rotarPagina, mejorarCalidadHD, recorteAutomatico, aplicarFiltro, corregirInclinacion, mostrarNotificacion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

const statusInfo = STATUS_MAP[casoSeleccionado.estado];
const Icon = statusInfo.icon;

return (
  <>
    {/* Notificación Toast - Sutil y minimalista */}
    {notificacion && (
      <div className={`fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-lg shadow-lg border-l-4 flex items-center gap-3 animate-fade-in transition-all duration-300 backdrop-blur-sm ${
        notificacion.tipo === 'success' ? 'bg-green-50/90 border-l-green-500 text-green-900' : 
        notificacion.tipo === 'error' ? 'bg-red-50/90 border-l-red-500 text-red-900' : 
        'bg-blue-50/90 border-l-blue-500 text-blue-900'
      }`}>
        {notificacion.tipo === 'success' && <Check className="w-4 h-4 flex-shrink-0 text-green-600" />}
        {notificacion.tipo === 'error' && <X className="w-4 h-4 flex-shrink-0 text-red-600" />}
        {notificacion.tipo === 'info' && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-blue-600" />}
        <span className="text-sm font-medium">{notificacion.mensaje}</span>
      </div>
    )}
    
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* HEADER FULLSCREEN */}
      <div className="bg-gray-900/95 backdrop-blur border-b border-gray-700 p-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* ✅ BOTONES DE NAVEGACIÓN ENTRE INCAPACIDADES (RESPONSIVE) */}
          <div className="flex items-center gap-0.5 px-1.5 py-1 bg-gray-800 rounded-lg border border-gray-700 flex-shrink-0">
            <button
              onClick={irAlAnterior}
              disabled={indiceActual === 0}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Anterior (← o Ctrl+←)"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-xs font-semibold text-gray-400 px-1.5 min-w-[50px] text-center whitespace-nowrap">
              {indiceActual + 1}/{casosLista.length}
            </span>
            <button
              onClick={irAlSiguiente}
              disabled={indiceActual >= casosLista.length - 1}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Siguiente (→ o Ctrl+→)"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
          
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
            style={{backgroundColor: statusInfo.color}}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-white min-w-0">
            <div className="font-bold text-yellow-300 text-sm truncate">{casoSeleccionado.serial}</div>
            <div className="text-xs text-gray-400 truncate">{casoSeleccionado.nombre} • {casoSeleccionado.empresa}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 🗑️ BOTÓN ELIMINAR */}
          <button
            onClick={handleEliminarIncapacidad}
            disabled={enviandoValidacion}
            className="p-2 bg-red-600/20 hover:bg-red-600 rounded-xl text-red-300 hover:text-white transition-all duration-300 border border-red-600/30 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar incapacidad permanentemente"
          >
            🗑️
          </button>

          {/* Separador */}
          <div className="h-10 w-px bg-gray-600"></div>

          {/* ✂️ Botón Herramientas */}
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-semibold transition-all duration-300"
            title="Herramientas (Tecla +)"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden md:inline">Herramientas</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
          </button>
          {/* Separador */}
          <div className="h-10 w-px bg-gray-600"></div>

          {/* 🔒/🔓 Bloqueo (solo para INCOMPLETAS) */}
          {['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'].includes(casoSeleccionado.estado) && (
            <>
              {casoSeleccionado.bloquea_nueva ? (
                <button
                  onClick={() => handleToggleBloqueo('desbloquear')}
                  disabled={enviandoValidacion}
                  className="p-3 bg-green-600 hover:bg-green-700 rounded-xl text-white transition-all duration-300 transform hover:scale-110 disabled:opacity-50 shadow-lg"
                  title="🔓 Desbloquear - Permitir nuevas incapacidades"
                >
                  <span className="text-xl">🔓</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleBloqueo('bloquear')}
                  disabled={enviandoValidacion}
                  className="p-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-white transition-all duration-300 transform hover:scale-110 disabled:opacity-50 shadow-lg"
                  title="🔒 Bloquear - Forzar completar esta incapacidad"
                >
                  <span className="text-xl">🔒</span>
                </button>
              )}
            </>
          )}

          {/* ↩️ Deshacer */}
          {ultimaAccion && (
            <button
              onClick={handleDeshacer}
              disabled={enviandoValidacion}
              className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white transition-all duration-300 transform hover:scale-110 disabled:opacity-50 shadow-lg"
              title="↩️ Deshacer última validación"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}

          {/* Separador */}
          <div className="h-10 w-px bg-gray-600"></div>

          {/* 🔍 Zoom */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 text-white shadow-lg">
            <ZoomOut className="w-4 h-4" />
            <span className="text-sm min-w-[50px] text-center font-semibold">{zoom}%</span>
            <ZoomIn className="w-4 h-4" />
          </div>

          {/* � Botón Guardar */}
          {!mostradoGuardadoExitoso ? (
            <button
              onClick={guardarPDFEnDrive}
              disabled={guardandoPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="Guardar cambios en Drive"
            >
              <Save className="w-4 h-4" />
              <span className="hidden md:inline text-xs">{guardandoPDF ? 'Guardando...' : 'Guardar'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-400 font-semibold animate-pulse">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Guardado en Drive</span>
            </div>
          )}

          {/* �📁 Drive */}
          <a 
            href={casoSeleccionado.drive_link || 'https://drive.google.com'}
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white transition-all duration-300 transform hover:scale-110 shadow-lg" 
            title="📄 Abrir PDF en Google Drive"
          >
            <FileText className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* ✅ BANNER DE REENVÍO */}
      {casoActualizado.metadata_reenvio?.tiene_reenvios && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 border-b-4 border-orange-600 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <div>
                <h3 className="font-bold text-lg">
                  🔄 REENVÍO DETECTADO - Comparar Versiones
                </h3>
                <p className="text-sm text-orange-100">
                  El empleado ha reenviado documentos. Total de intentos: {casoActualizado.metadata_reenvio.total_reenvios}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Botón Ver Nueva Versión */}
              <button
                onClick={() => {
                  const ultimo = casoActualizado.metadata_reenvio.ultimo_reenvio;
                  window.open(ultimo.link, '_blank');
                }}
                className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
 >
                📄 Ver Nueva Versión
              </button>
              
              {/* ✅ BOTÓN CAMBIAR PROTOTIPO */}
              <button
                onClick={async () => {
                  const nuevoTipo = prompt(
                    '🔄 Cambiar tipo de incapacidad\n\n' +
                    'Opciones disponibles:\n' +
                    '• maternity → Maternidad\n' +
                    '• paternity → Paternidad\n' +
                    '• general → Enfermedad General\n' +
                    '• traffic → Accidente de Tránsito\n' +
                    '• labor → Accidente Laboral\n' +
                    '• certificado_hospitalizacion → Certificado Hospitalización\n' +
                    '• prelicencia → Prelicencia\n\n' +
                    'Escribe el tipo exacto:'
                  );
                  
                  if (!nuevoTipo) return;
                  
                  const tiposValidos = ['maternity', 'paternity', 'general', 'traffic', 'labor', 'certificado_hospitalizacion', 'prelicencia'];
                  if (!tiposValidos.includes(nuevoTipo.toLowerCase())) {
                    alert('❌ Tipo inválido. Usa: maternity, paternity, general, traffic, labor, certificado_hospitalizacion o prelicencia');
                    return;
                  }
                  
                  if (!window.confirm(
                    `¿Cambiar tipo de incapacidad a "${nuevoTipo}"?\n\n` +
                    `El empleado recibirá un email con los nuevos documentos requeridos.`
                  )) {
                    return;
                  }
                  
                  setEnviandoValidacion(true);
                  
                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoActualizado.serial)}/cambiar-tipo`,
                      {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({ nuevo_tipo: nuevoTipo.toLowerCase() })
                      }
                    );
                    
                    if (response.ok) {
                      const data = await response.json();
                      alert(`✅ ${data.mensaje}\n\n📧 El empleado recibirá un email con los nuevos documentos.`);
                      if (onRecargarCasos) onRecargarCasos();
                      onClose();
                    } else {
                      const errorData = await response.json().catch(() => ({}));
                      alert(`❌ Error: ${errorData.detail || 'No se pudo cambiar el tipo'}`);
                    }
                  } catch (error) {
                    alert('❌ Error de conexión');
                  } finally {
                    setEnviandoValidacion(false);
                  }
                }}
                disabled={enviandoValidacion}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              
              >
                🔄 Cambiar Prototipo
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ✅ BANNER DE REENVÍO */}
      {casoActualizado.metadata_reenvio?.tiene_reenvios && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 border-b-4 border-orange-600 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <div>
                <h3 className="font-bold text-lg">🔄 REENVÍO DETECTADO</h3>
                <p className="text-sm text-orange-100">
                  Total de intentos: {casoActualizado.metadata_reenvio.total_reenvios}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.open(casoActualizado.metadata_reenvio.ultimo_reenvio.link, '_blank')}
              className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              📄 Ver Nueva Versión
            </button>
          </div>
        </div>
      )}

{/* VIEWER FULLSCREEN */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel lateral de miniaturas */}
        <div className={`${mostrarMiniaturas ? 'w-48' : 'w-12'} bg-gray-900 border-r border-gray-700 overflow-y-auto p-2 transition-all duration-300 flex-shrink-0`}>
          <div className="sticky top-0 bg-gray-900 py-2 z-10">
  <button
    onClick={() => setMostrarMiniaturas(!mostrarMiniaturas)}
    className="w-full flex items-center justify-between text-white text-xs font-semibold hover:bg-gray-800 p-2 rounded"
  >
    {mostrarMiniaturas ? '📄 Páginas' : '📄'}
    {mostrarMiniaturas && <ChevronLeft className="w-4 h-4" />}
  </button>
</div>
{mostrarMiniaturas && (
          <div className="space-y-2">
  {pages.map((page, idx) => (
    <div
      key={page.id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('pageIndex', idx)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('pageIndex'));
        if (fromIndex !== idx) {
          const newPages = [...pages];
          const [movedPage] = newPages.splice(fromIndex, 1);
          newPages.splice(idx, 0, movedPage);
          setPages(newPages);
        }
      }}
      onClick={() => {
        setCurrentPage(idx);
        // Desplazarse suavemente a la página
        setTimeout(() => {
          const pageElement = document.getElementById(`page-${idx}`);
          if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 0);
      }}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  currentPage === idx ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                {/* Checkbox para eliminar */}
                <input
                  type="checkbox"
                  checked={paginasSeleccionadas.includes(idx)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSeleccionPagina(idx);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 w-4 h-4 z-10 cursor-pointer accent-red-600"
                  title="Seleccionar para eliminar"
                />
                
                <img 
                  src={page.fullImage} 
                  alt={`Página ${idx + 1}`}
                  className="w-full h-auto"
                />
                <div className="text-center text-xs text-gray-400 bg-gray-800 p-1">
                  Pág {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Visor principal - SCROLL VERTICAL CON PÁGINAS EN CASCADA */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-gradient-to-b from-gray-900 to-black overflow-y-auto p-8 scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {loadingPdf ? (
            <div className="text-center py-20">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-white text-lg">Cargando documento PDF...</p>
              <p className="text-xs text-gray-400 mt-2">Las páginas aparecerán en cascada con scroll</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-40">
              {pages.map((page, idx) => (
                <div 
                  key={page.id}
                  id={`page-${idx}`}
                  data-page-index={idx}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('pageIndex', idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(e.dataTransfer.getData('pageIndex'));
                    if (fromIndex !== idx) {
                      const newPages = [...pages];
                      const [movedPage] = newPages.splice(fromIndex, 1);
                      newPages.splice(idx, 0, movedPage);
                      setPages(newPages);
                    }
                  }}
                  className={`bg-white shadow-2xl transition-all duration-300 ${
                    currentPage === idx ? 'ring-4 ring-blue-500' : 'opacity-90 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentPage(idx)}
                >
                  <img 
                    src={page.fullImage} 
                    alt={`Página ${idx + 1}`}
                    style={{ 
                      transform: `scale(${zoom/100})`,
                      transformOrigin: 'top center',
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                    className="cursor-pointer"
                  />
                  <div className="bg-gray-800 text-white text-center py-2 text-sm font-semibold">
                    📄 Página {idx + 1} de {pages.length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ⭐ TAB HANDLE - DERECHA */}
      <div 
        className={`fixed right-0 top-[60px] bottom-[60px] w-7 bg-gradient-to-l from-blue-500/10 border-l border-blue-500/30 flex items-center justify-center cursor-pointer z-[80] transition-all hover:w-10 ${showToolsMenu ? 'bg-blue-500/20' : ''}`}
        onClick={() => setShowToolsMenu(!showToolsMenu)}
        title="Herramientas (Tecla +)"
      >
        <span className="text-blue-400 text-lg transition-transform" style={{transform: showToolsMenu ? 'scaleX(-1)' : 'scaleX(1)'}}>◀</span>
      </div>

      {/* ⭐ SIDEBAR DERECHO - HERRAMIENTAS */}
      <div className={`fixed right-0 top-[60px] bottom-[60px] w-80 bg-gray-900/95 backdrop-blur border-l border-gray-700 transform transition-transform duration-300 z-[85] overflow-y-auto flex flex-col ${showToolsMenu ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="bg-blue-600/20 border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
          <span className="text-white font-bold flex items-center gap-2">🔧 Herramientas</span>
          <button onClick={() => setShowToolsMenu(false)} className="p-1 hover:bg-gray-800 rounded text-white">✕</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* INFORMACIÓN (DESPLEGABLE) */}
          <div className="border-b border-gray-700 pb-4 mb-4">
            <button 
              onClick={() => setMostrarInfoDesplegable(!mostrarInfoDesplegable)}
              className="w-full px-4 py-3 bg-gray-800/50 text-white font-semibold text-sm hover:bg-gray-800 flex items-center justify-between transition-colors rounded-t-lg"
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                👤 Información
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mostrarInfoDesplegable ? 'rotate-180' : ''}`} />
            </button>
            
            {mostrarInfoDesplegable && (
              <div className="bg-gray-800/30 p-3 space-y-2 rounded-b-lg">
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Nombre</div>
                  <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.nombre || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Cédula</div>
                  <div className="text-xs text-yellow-300 font-semibold bg-black/30 px-2 py-1.5 rounded">{casoActualizado.cedula || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Teléfono</div>
                  <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.telefono || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Email</div>
                  <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded break-all">{casoActualizado.email || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Empresa</div>
                  <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded">{casoActualizado.empresa || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Estado</div>
                  <div className="flex items-center gap-2 bg-red-600/20 px-2 py-1.5 rounded border border-red-500/30">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    <span className="text-xs text-red-300 font-semibold">{casoActualizado.estado}</span>
                  </div>
                </div>
                
                {casoActualizado.metadata_reenvio?.tiene_reenvios && (
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Reenvíos</div>
                    <div className="text-xs text-orange-300 bg-black/30 px-2 py-1.5 rounded">
                      {casoActualizado.metadata_reenvio.total_reenvios} intentos
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Días</div>
                  <div className="text-xs text-yellow-300 font-semibold bg-black/30 px-2 py-1.5 rounded">
                    {casoActualizado.dias || 'N/A'} días
                  </div>
                </div>
                
                <div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tipo</div>
                  <div className="text-xs text-gray-200 bg-black/30 px-2 py-1.5 rounded capitalize">
                    {casoActualizado.tipo?.replace('_', ' ') || 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ROTACIÓN */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 flex items-center justify-between">
              <span>🔄 Rotación</span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-2 space-y-1">
              <button onClick={() => {rotarPagina(90, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">↻ 90° Derecha</button>
              <button onClick={() => {rotarPagina(-90, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">↺ 90° Izquierda</button>
              <button onClick={() => {rotarPagina(180, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">↻ 180°</button>
            </div>
          </div>

          {/* CALIDAD */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 flex items-center justify-between">
              <span>✨ Mejorar Calidad</span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-2 space-y-1">
              <button onClick={() => {mejorarCalidadHD('rapido'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">⚡ Rápido (1.8x)</button>
              <button onClick={() => {mejorarCalidadHD('estandar'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">⚡ Estándar (2.5x)</button>
              <button onClick={() => {mejorarCalidadHD('premium'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">⚡ Premium (3.5x)</button>
            </div>
          </div>

          {/* FILTROS */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-green-600 text-white font-semibold text-sm hover:bg-green-700 flex items-center justify-between">
              <span>🎨 Filtros</span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-2 space-y-1">
              <button onClick={() => {aplicarFiltro('grayscale'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">⚪ B&N</button>
              <button onClick={() => {aplicarFiltro('contrast'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">◈ Contraste</button>
              <button onClick={() => {aplicarFiltro('brightness'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">☀️ Brillo</button>
              <button onClick={() => {aplicarFiltro('sharpen'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">🎯 Enfoque</button>
            </div>
          </div>

          {/* GEOMETRÍA */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 flex items-center justify-between">
              <span>📐 Geometría</span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-2 space-y-1">
              <button onClick={() => {recorteAutomatico(); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">✂️ Recorte</button>
              <button onClick={() => {corregirInclinacion(); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded disabled:opacity-50">📐 Ángulo</button>
            </div>
          </div>

          {/* CAMBIAR TIPO */}
          <div className="border border-amber-700/30 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold text-sm flex items-center justify-between transition-colors">
              <span className="flex items-center gap-2">
                🔄 Cambiar Tipo
              </span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-2 space-y-1">
              <button onClick={() => {handleCambiarTipo('maternity'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-amber-600 text-white text-xs rounded disabled:opacity-50">👶 Maternidad</button>
              <button onClick={() => {handleCambiarTipo('paternity'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-amber-600 text-white text-xs rounded disabled:opacity-50">👨‍👦 Paternidad</button>
              <button onClick={() => {handleCambiarTipo('general'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-amber-600 text-white text-xs rounded disabled:opacity-50">🏥 Enfermedad General</button>
              <button onClick={() => {handleCambiarTipo('traffic'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-amber-600 text-white text-xs rounded disabled:opacity-50">🚗 Accidente Tránsito</button>
              <button onClick={() => {handleCambiarTipo('labor'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-amber-600 text-white text-xs rounded disabled:opacity-50">🏭 Accidente Laboral</button>
              <hr className="border-gray-700 my-1" />
              <button onClick={() => {handleCambiarTipo('certificado_hospitalizacion'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-purple-600 text-white text-xs rounded disabled:opacity-50">🏥 Certificado Hospitalización</button>
              <button onClick={() => {handleCambiarTipo('prelicencia'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-gray-700 hover:bg-cyan-600 text-white text-xs rounded disabled:opacity-50">📋 Prelicencia</button>
            </div>
          </div>

          {/* ELIMINAR PÁGINAS */}
          <div className="border border-red-700/30 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-semibold text-sm flex items-center justify-between transition-colors">
              <span className="flex items-center gap-2">
                🗑️ Eliminar Páginas
              </span>
              <span>▼</span>
            </button>
            <div className="bg-gray-800/50 p-3">
              <div className="text-xs text-gray-300 mb-2">
                Seleccionadas: <strong className="text-white">{paginasSeleccionadas.length}/{pages.length}</strong>
              </div>
              <button
                onClick={eliminarPaginasSeleccionadas}
                disabled={paginasSeleccionadas.length === 0 || enviandoValidacion}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {paginasSeleccionadas.length === 0 ? '❌ Selecciona primero' : `🗑️ Eliminar ${paginasSeleccionadas.length} pág.`}
              </button>
            </div>
          </div>

          {/* INFO */}
          <div className="border border-red-700/30 rounded-lg bg-red-900/10 p-3">
            <h4 className="text-red-300 font-semibold text-xs mb-2">📋 Atajos</h4>
            <ul className="text-xs text-red-200 space-y-1">
              <li>+ = Abrir/Cerrar</li>
              <li>R = Rotar</li>
              <li>Q = Calidad</li>
              <li>C = Recorte</li>
              <li>B = B&N</li>
              <li>A = Ángulo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FOOTER CON BOTONES DE VALIDACIÓN - SIEMPRE VISIBLE (FIJO) */}
      <div className="bg-gray-900/98 backdrop-blur-xl border-t-2 border-gray-700 p-4 flex-shrink-0 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        {/* BOTONES DE VALIDACIÓN */}
        <div className="flex justify-center gap-2 flex-wrap">
          <button 
            onClick={() => handleValidar(casoSeleccionado.serial, 'completa')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#16a34a'}}>
            <CheckCircle className="w-4 h-4" />
            ✅ Completa
          </button>
          
          <button 
            onClick={() => setAccionSeleccionada('incompleta')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#dc2626'}}>
            <XCircle className="w-4 h-4" />
            ❌ Incompleta
          </button>
          
          <button 
            onClick={() => handleValidar(casoSeleccionado.serial, 'eps')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#ca8a04'}}>
            <FileText className="w-4 h-4" />
            📋 EPS
          </button>
          
          <button 
            onClick={() => setAccionSeleccionada('tthh')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#2563eb'}}>
            <Send className="w-4 h-4" />
            🚨 TTHH
          </button>
          
          <button 
            onClick={() => setAccionSeleccionada('extra')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#8b5cf6'}}>
            <Edit3 className="w-4 h-4" />
            📝 Extra
          </button>
        </div>
      </div>

      {/* MODAL INCOMPLETA */}
      {accionSeleccionada === 'incompleta' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-red-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <XCircle className="w-6 h-6" />
                ❌ Marcar como Incompleta
              </h3>
              <button onClick={() => {
                setAccionSeleccionada(null);
                setChecksSeleccionados([]);
                setAdjuntos([]);
                setErrorValidacion('');
              }} className="p-1 hover:bg-red-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorValidacion && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {errorValidacion}
                </div>
              )}

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">
                  <strong>Selecciona los problemas encontrados.</strong> La IA generará un email claro explicando qué documentos faltan y cómo corregirlos.
                </p>
              </div>

              {/* Documentos Faltantes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  📋 Documentos Faltantes para {casoSeleccionado.tipo || 'este tipo'}
                </h4>
                <div className="space-y-2">
                  {getChecksPorTipo(casoSeleccionado.tipo, 'documentos').map(check => (
                    <label key={check.key} className={`flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors border ${checksSeleccionados.includes(check.key) ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}`}>
                      <input 
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                          {check.label}
                          {check.icon}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Problemas de Calidad */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  ⚠️ Problemas de Calidad
                </h4>
                <div className="space-y-2">
                  {getChecksPorTipo(casoSeleccionado.tipo, 'calidad').map(check => (
                    <label key={check.key} className={`flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-orange-50 transition-colors border ${checksSeleccionados.includes(check.key) ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}>
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
                  🔎 Adjuntar Imágenes Referentes (Opcional)
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
{/* SISTEMA HÍBRIDO: Texto libre con IA */}
              <div className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  🤖 O escribe libremente (la IA lo convertirá en email profesional)
                </h4>
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Ejemplo: 'Falta la epicrisis completa y el registro civil está recortado'"
                  className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-600 mt-2">
                  💡 Si escribes aquí, no es necesario seleccionar checks arriba
                </p>
              </div>
                  
{/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
    const esReenvio = casoSeleccionado.metadata_reenvio?.tiene_reenvios;
    
    if (esReenvio) {
      // ❌ RECHAZAR REENVÍO
      if (checksSeleccionados.length === 0) {
        alert('⚠️ Selecciona al menos 1 check antes de rechazar');
        return;
      }
      
      if (!window.confirm('❌ ¿Rechazar este reenvío?\n\nSeguirá bloqueado y se enviará email con los problemas.')) {
        return;
      }
      
      setEnviandoValidacion(true);
      
      const formData = new FormData();
      formData.append('decision', 'rechazar');
      checksSeleccionados.forEach(check => {
        formData.append('checks', check);
      });
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/aprobar-reenvio`,
          {
            method: 'POST',
            headers: { 'X-Admin-Token': ADMIN_TOKEN },
            body: formData
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          alert(`❌ ${data.mensaje}`);
          setAccionSeleccionada(null);
          if (onRecargarCasos) onRecargarCasos();
          onClose();
        } else {
          alert('❌ Error al rechazar reenvío');
        }
      } catch (error) {
        alert('❌ Error de conexión');
      } finally {
        setEnviandoValidacion(false);
      }
    } else {
      // ✅ FLUJO NORMAL (sin reenvío)
      handleValidar(casoSeleccionado.serial, 'incompleta');
    }
  }}
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
      {casoSeleccionado.metadata_reenvio?.tiene_reenvios 
        ? `❌ Rechazar Reenvío (${checksSeleccionados.length} checks)` 
        : `✅ Confirmar Incompleta (${checksSeleccionados.length} checks)`
      }
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

      {/* MODAL TTHH */}
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

      {/* MODAL EXTRA */}
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

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔎 Adjuntar Archivos (Opcional)
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

      {/* 🧹 MODAL LIMPIAR SISTEMA */}
      {mostraModalLimpiar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-[9999]">
          <div className="bg-gray-900 rounded-xl border border-red-500/50 p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">🧹</div>
              <div>
                <h2 className="text-2xl font-bold text-white">Limpiar Sistema</h2>
                <p className="text-xs text-gray-400">Ingresa contraseña para continuar</p>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-300">
                <strong>⚠️ ADVERTENCIA:</strong> Esta acción eliminará TODOS los casos del sistema.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Contraseña</label>
              <input
                type="password"
                value={contraseniaLimpiar}
                onChange={(e) => setContraseniaLimpiar(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLimpiarSistema();
                  if (e.key === 'Escape') {
                    setMostrarModalLimpiar(false);
                    setContraseniaLimpiar('');
                  }
                }}
                placeholder="Ingresa la contraseña..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLimpiarSistema}
                disabled={limpiarEnProgreso || !contraseniaLimpiar}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {limpiarEnProgreso ? '⏳ Limpiando...' : '🧹 Limpiar Todo'}
              </button>
              <button
                onClick={() => {
                  setMostrarModalLimpiar(false);
                  setContraseniaLimpiar('');
                }}
                disabled={limpiarEnProgreso}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Atajos: <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mr-2">Ctrl + Shift + Delete</kbd>
              o <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 ml-2">Ctrl + F11</kbd>
            </p>
          </div>
        </div>
      )}
    </div>
  </>
  );
}


// ==================== COMPONENTE PRINCIPAL ====================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 15000,
    },
  },
});

export default function App() {
  const [empresas, setEmpresas] = useState([]);
  const [casos, setCasos] = useState([]);
  const [stats, setStats] = useState({});
  const [filtros, setFiltros] = useState({ empresa: 'all', estado: 'all', tipo: 'all', q: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [indiceActual, setIndiceActual] = useState(0); // ✅ Índice en la lista filtrada
  const [tabActual, setTabActual] = useState('validacion'); // 'validacion' o 'reportes'

  useEffect(() => {
    cargarEmpresas();
    cargarStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarCasos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ✅ CAMBIAR DE CASO DENTRO DEL VISOR (por índice)
  const handleCambiarCaso = async (nuevoIndice) => {
    if (nuevoIndice >= 0 && nuevoIndice < casos.length) {
      const nuevoCaso = casos[nuevoIndice];
      try {
        // Cargar detalle completo del caso
        const detalle = await api.getCasoDetalle(nuevoCaso.serial);
        setCasoSeleccionado(detalle);
        setIndiceActual(nuevoIndice);
      } catch (error) {
        console.error('Error al cargar caso:', error);
      }
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
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

          {/* ⭐ TABS SELECTOR */}
          <div className="flex gap-2 border-b-2 border-gray-700">
            <button
              onClick={() => setTabActual('validacion')}
              className={`px-4 py-3 font-semibold transition-colors ${
                tabActual === 'validacion'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              ✅ Validación de Casos
            </button>
            <button
              onClick={() => setTabActual('reportes')}
              className={`px-4 py-3 font-semibold transition-colors ${
                tabActual === 'reportes'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📊 Reportes y Tablas Vivas
            </button>
          </div>

          {/* ⭐ TAB 1: VALIDACIÓN (CÓDIGO EXISTENTE) */}
          {tabActual === 'validacion' && (
            <>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-yellow-300">{caso.serial}</span>
                            {/* ✅ BADGE DE REENVÍO */}
                            {caso.metadata_form?.reenvios && caso.metadata_form.reenvios.length > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white animate-pulse">
                                🔄 {caso.metadata_form.reenvios.length}
                              </span>
                            )}
                            {caso.bloquea_nueva && (
                              <span 
                                className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500"
                                title="Este caso está bloqueando al empleado"
                              >
                                🔒
                              </span>
                            )}
                          </div>
                        </td>
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
                            onClick={() => {
                              setCasoSeleccionado(caso);
                              setIndiceActual(casos.indexOf(caso));
                            }}
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
          </div>
        </div>
            </>
          )}

          {/* ⭐ TAB 2: REPORTES (CÓDIGO NUEVO) */}
          {tabActual === 'reportes' && (
            <ReportsDashboard empresas={empresas} />
          )}
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
            casosLista={casos}
            indiceActual={indiceActual}
            onCambiarCaso={handleCambiarCaso}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}     