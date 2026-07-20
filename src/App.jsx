import React, {
  useState, useEffect, useCallback, useRef
} from 'react';
import ProgressBar, { useProgress } from './components/ProgressBar';
import { useTenantTheme, applyPaletteVars } from './hooks/useTenantTheme';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import {
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock,
  ChevronLeft, X, Download, RefreshCw,
  AlertCircle, ZoomIn, ZoomOut, Sliders,
  Undo2, Image, Loader2, Check, ChevronDown, ChevronRight, Save,
  LogOut, Settings
} from 'lucide-react';
import ReportsDashboard from './components/Dashboard/ReportsDashboard';
import PlanoIncapacidades from './components/Dashboard/PlanoIncapacidades';
import EstadoRadicacion from './components/Dashboard/EstadoRadicacion';
import ExportacionesPDF from './components/Dashboard/ExportacionesPDF';
import PowerBIDashboard from './components/Dashboard/PowerBIDashboard';
import BeforeAfterPDF from './components/BeforeAfterPDF';
import LivePDFEditor from './components/LivePDFEditor';
import LoginPage from './components/LoginPage';
import DemoBanner from './components/DemoBanner';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
// pdfUtils imports removidos — rotación ahora usa CSS + pdf-lib dinámico en guardarPDFEnDrive
// Legacy cache imports (reemplazado por pdfSmartLoader)
// import { pdfCacheManager } from './utils/pdfCache';
// import { preloadNextCase } from './utils/validationOptimizations';
import { loadPDFSmart, prefetchNextCases, invalidatePDFCache } from './utils/pdfSmartLoader';

// ==================== CONFIGURACIÓN API ====================
const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

// ✅ IMAGEN SOAT DE REFERENCIA (Base64)
const SOAT_REFERENCIA_BASE64 = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAH0AfQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKK`;

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Admin-Token': ADMIN_TOKEN,
  };
  // JWT del usuario: el backend fuerza el aislamiento por empresa (multi-tenant)
  const jwt = localStorage.getItem('portal_token');
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  return headers;
};

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
  'EPS_TRANSCRIPCION': { label: 'EN VALIDACION', color: '#ca8a04', borderColor: 'border-yellow-500', icon: FileText },
  'DERIVADO_TTHH': { label: 'ES POSIBLE FRAUDE', color: '#dc2626', borderColor: 'border-red-600', icon: AlertCircle },
  'CAUSA_EXTRA': { label: 'EXTRA', color: '#6b7280', borderColor: 'border-gray-500', icon: Edit3 },
  'COMPLETA': { label: 'VALIDADA', color: '#16a34a', borderColor: 'border-green-500', icon: CheckCircle },
};

// ==================== VISOR FULLSCREEN TIPO POWERPOINT ====================
function DocumentViewer({ casoSeleccionado, onClose, onRecargarCasos, casosLista = [], indiceActual = 0, onCambiarCaso }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState([]);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [previewInstant, setPreviewInstant] = useState(null); // ⚡ imagen instantánea 1ª página mientras baja el PDF
  const [reloadToken, setReloadToken] = useState(0); // fuerza recarga del PDF tras guardar/editar
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
  // eslint-disable-next-line no-unused-vars
  const [editedPDFFile, setEditedPDFFile] = useState(null);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [beforeAfterCanvases, setBeforeAfterCanvases] = useState(null);
  const [showLiveEditor, setShowLiveEditor] = useState(null); // null | { mode: string, pdfFile: File }
  const [currentPDFFile, setCurrentPDFFile] = useState(null); // File del PDF actual en cache
  const [pageRotations, setPageRotations] = useState({}); // {pageIndex: angle} rotaciones CSS pendientes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // indicador de cambios sin guardar
  
  // 🚀 OPTIMIZACIONES
  const progressBar = useProgress();
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
    // Limpiar pages e incrementar el token para forzar que el useEffect
    // de carga vuelva a ejecutarse. El serial NO cambia al guardar, así que
    // sin este token el spinner se quedaba "cargando" para siempre y los
    // cambios nunca se reflejaban.
    setPages([]);
    setLoadingPdf(true);
    setReloadToken(t => t + 1);
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
        { key: 'fotocopia_documento_identidad_faltante', label: 'Falta fotocopia del documento', desc: 'Cédula de la madre' },
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
      'enfermedad_laboral': [
        { key: 'incapacidad_faltante', label: 'Falta incapacidad médica', desc: 'Documento oficial de ARL' },
        { key: 'epicrisis_faltante', label: 'Falta epicrisis', desc: 'Resumen clínico completo' },
      ],
      'prelicencia': [
        { key: 'incapacidad_faltante', label: 'Falta prelicencia', desc: 'Documento oficial de la EPS' },
        { key: 'epicrisis_faltante', label: 'Falta soporte de atención', desc: 'Resumen clínico completo' },
      ],
      'certificado': [
        { key: 'incapacidad_faltante', label: 'Falta certificado', desc: 'Certificado de hospitalización' },
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
 
// ✅ ROTAR PÁGINA - 100% INSTANTÁNEO (solo CSS transform, sin servidor)
  const rotarPagina = useCallback((angle, aplicarATodas) => {
    if (aplicarATodas) {
      // Rotar todas las páginas
      setPageRotations(prev => {
        const updated = { ...prev };
        pages.forEach((_, idx) => {
          updated[idx] = ((updated[idx] || 0) + angle + 360) % 360;
        });
        return updated;
      });
      mostrarNotificacion('✅ Todas las páginas rotadas', 'success');
    } else {
      // Rotar solo la página actual
      setPageRotations(prev => ({
        ...prev,
        [currentPage]: ((prev[currentPage] || 0) + angle + 360) % 360,
      }));
      mostrarNotificacion('✅ Página rotada', 'success');
    }
    setHasUnsavedChanges(true);
  }, [currentPage, pages, mostrarNotificacion]);

// ✅ ABRIR EDITOR EN VIVO (para cualquier herramienta)
  const abrirEditorEnVivo = useCallback(async (mode) => {
    setEnviandoValidacion(true);
    mostrarNotificacion('⚡ Cargando editor...');
    
    try {
      let pdfFile = currentPDFFile;
      if (!pdfFile) {
        const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/pdf/fast`, {
          headers: getHeaders()
        });
        const pdfBlob = await response.blob();
        pdfFile = new File([pdfBlob], `${casoSeleccionado.serial}.pdf`, { type: 'application/pdf' });
        setCurrentPDFFile(pdfFile);
      }
      
      setShowLiveEditor({ mode, pdfFile });
    } catch (error) {
      mostrarNotificacion('❌ Error cargando PDF', 'error');
      console.error(error);
    } finally {
      setEnviandoValidacion(false);
    }
  }, [casoSeleccionado.serial, mostrarNotificacion, currentPDFFile]);

  // ✅ GUARDAR DESDE EDITOR EN VIVO
  const guardarDesdeEditorVivo = useCallback(async (editedBlob) => {
    setEnviandoValidacion(true);
    mostrarNotificacion('💾 Guardando cambios...');
    
    try {
      const formData = new FormData();
      formData.append('archivo', new File([editedBlob], 'edited.pdf', { type: 'application/pdf' }));
      
      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/guardar-pdf-editado`,
        { method: 'POST', headers: { 'X-Admin-Token': ADMIN_TOKEN }, body: formData }
      );
      
      if (response.ok) {
        mostrarNotificacion('✅ Cambios guardados en Drive', 'success');
        setShowLiveEditor(null);
        setCurrentPDFFile(null);
        setPageRotations({});
        setHasUnsavedChanges(false);
        await invalidatePDFCache(casoSeleccionado.serial);
        await recargarPDFInPlace(casoSeleccionado.serial);
      } else {
        mostrarNotificacion('❌ Error guardando', 'error');
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setEnviandoValidacion(false);
    }
  }, [casoSeleccionado.serial, mostrarNotificacion, recargarPDFInPlace]);

  // ✅ MEJORA HD (servidor): mejora el PDF en el backend y muestra antes/después
  // nivel: rapido (1.8x) | estandar (2.5x) | premium (3.5x)
  // modo:  auto (binariza texto puro, conserva sellos/fotos) | bw | color | hd (IA)
  const mejorarCalidadHD = useCallback(async (nivel = 'estandar', modo = 'auto') => {
    setEnviandoValidacion(true);
    mostrarNotificacion(
      modo === 'hd' ? '🤖 Mejorando con IA (puede tardar)...' : `⚡ Mejorando calidad (${nivel})...`
    );

    try {
      // 1) Obtener el PDF actual (reusa el de caché si ya está cargado)
      let pdfFile = currentPDFFile;
      if (!pdfFile) {
        const resp = await fetch(
          `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/pdf/fast`,
          { headers: getHeaders() }
        );
        pdfFile = new File([await resp.blob()], `${casoSeleccionado.serial}.pdf`, { type: 'application/pdf' });
        setCurrentPDFFile(pdfFile);
      }

      // 2) Enviar al backend para mejorar
      const fd = new FormData();
      fd.append('archivo', pdfFile, 'original.pdf');

      const enhanceResp = await fetch(
        `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/mejorar-hd?nivel=${nivel}&modo=${modo}`,
        {
          method: 'POST',
          headers: { 'X-Admin-Token': ADMIN_TOKEN },
          body: fd,
          // El modo IA puede tener arranque en frío en la GPU; damos margen amplio
          signal: AbortSignal.timeout(modo === 'hd' ? 300000 : 90000),
        }
      );
      if (!enhanceResp.ok) throw new Error(`Error ${enhanceResp.status}`);

      const enhancedBlob = await enhanceResp.blob();
      const enhancedFile = new File([enhancedBlob], 'enhanced.pdf', { type: 'application/pdf' });

      // 3) Renderizar la página actual ANTES y DESPUÉS a canvases
      const { renderPDFPageToCanvas } = await import('./utils/pdfUtils');
      const [originalCanvas, editedCanvas] = await Promise.all([
        renderPDFPageToCanvas(pdfFile, currentPage, 1.5),
        renderPDFPageToCanvas(enhancedFile, currentPage, 1.5),
      ]);

      // 4) Mostrar el comparador antes/después
      setEditedPDFFile(enhancedFile);                 // lo que se guardará al aceptar
      setBeforeAfterCanvases({ originalCanvas, editedCanvas });
      setShowBeforeAfter(true);
      mostrarNotificacion('✅ Listo — revisa el antes/después', 'success');
    } catch (err) {
      console.error('[mejorarCalidadHD]', err);
      mostrarNotificacion(
        err.name === 'TimeoutError' ? '⏱️ Tardó demasiado, intenta modo rápido' : '❌ Error al mejorar',
        'error'
      );
    } finally {
      setEnviandoValidacion(false);
    }
  }, [casoSeleccionado.serial, currentPDFFile, currentPage, mostrarNotificacion]);
  const aplicarFiltro = useCallback((tipo) => {
    if (tipo === 'grayscale') abrirEditorEnVivo('grayscale');
    else if (tipo === 'contrast') abrirEditorEnVivo('contrast');
    else if (tipo === 'brightness') abrirEditorEnVivo('brightness');
    else if (tipo === 'sharpen') abrirEditorEnVivo('sharpen');
    else abrirEditorEnVivo('filters');
  }, [abrirEditorEnVivo]);
  const recorteAutomatico = useCallback(() => abrirEditorEnVivo('crop'), [abrirEditorEnVivo]);
  const corregirInclinacion = useCallback(() => abrirEditorEnVivo('contrast'), [abrirEditorEnVivo]);

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

  // ✅ GUARDAR PDF EN DRIVE (aplica rotaciones pendientes + sube)
  const guardarPDFEnDrive = useCallback(async () => {
    setGuardandoPDF(true);
    
    try {
      // Si hay rotaciones pendientes, aplicarlas al PDF antes de subir
      const tieneRotaciones = Object.values(pageRotations).some(a => a !== 0);
      
      if (tieneRotaciones) {
        mostrarNotificacion('💾 Aplicando cambios y guardando...');
        
        // Obtener PDF
        let pdfFile = currentPDFFile;
        if (!pdfFile) {
          const resp = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/pdf/fast`, {
            headers: getHeaders()
          });
          pdfFile = new File([await resp.blob()], `${casoSeleccionado.serial}.pdf`, { type: 'application/pdf' });
        }
        
        // Aplicar todas las rotaciones con pdf-lib
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        Object.entries(pageRotations).forEach(([pageIdx, angle]) => {
          if (angle === 0) return;
          const page = pdfDoc.getPage(parseInt(pageIdx));
          const current = page.getRotation().angle || 0;
          page.setRotation({ type: 0, angle: (current + angle + 360) % 360 });
        });
        
        const newPdfBytes = await pdfDoc.save();
        const editedBlob = new Blob([newPdfBytes], { type: 'application/pdf' });
        
        // Subir PDF modificado
        const formData = new FormData();
        formData.append('archivo', new File([editedBlob], 'edited.pdf', { type: 'application/pdf' }));
        
        const response = await fetch(
          `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/guardar-pdf-editado`,
          { method: 'POST', headers: { 'X-Admin-Token': ADMIN_TOKEN }, body: formData }
        );
        
        if (response.ok) {
          await invalidatePDFCache(casoSeleccionado.serial);
          setPageRotations({});
          setHasUnsavedChanges(false);
          setCurrentPDFFile(null);
          mostrarNotificacion('💾 Guardado en Drive', 'success');
          setMostradoGuardadoExitoso(true);
          setTimeout(() => setMostradoGuardadoExitoso(false), 3000);
          await recargarPDFInPlace(casoSeleccionado.serial);
        } else {
          mostrarNotificacion('❌ Error guardando', 'error');
        }
      } else {
        // Sin rotaciones pendientes, guardar directamente
        const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/guardar-drive`, {
          method: 'POST',
          headers: getHeaders()
        });
        
        if (response.ok) {
          await invalidatePDFCache(casoSeleccionado.serial);
          setHasUnsavedChanges(false);
          mostrarNotificacion('💾 Guardado en Drive', 'success');
          setMostradoGuardadoExitoso(true);
          setTimeout(() => setMostradoGuardadoExitoso(false), 3000);
        } else {
          mostrarNotificacion('❌ Error guardando', 'error');
        }
      }
    } catch (error) {
      mostrarNotificacion('❌ Error de conexión', 'error');
    } finally {
      setGuardandoPDF(false);
    }
  }, [casoSeleccionado.serial, mostrarNotificacion, pageRotations, currentPDFFile, recargarPDFInPlace]);

  // ✅ Función validar con imagen SOAT automática
  const handleValidar = async (serial, accion) => {
    // ✅ DETECTAR SI ES UN REENVÍO
    const esReenvio = casoSeleccionado.metadata_reenvio?.tiene_reenvios;
    
    // ✅ PARA COMPLETA: USAR EL NUEVO ENDPOINT /estado (con directorio + WhatsApp)
    if (accion === 'completa' && !esReenvio) {
      setEnviandoValidacion(true);
      setErrorValidacion('');
      
      try {
        progressBar.show({
          message: `Validando ${serial} como COMPLETA...`,
          totalSteps: 2
        });
        
        progressBar.update(50, { message: 'Enviando al servidor...', step: 1 });
        
        const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/estado`, {
          method: 'POST',
          headers: {
            'X-Admin-Token': ADMIN_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            estado: 'COMPLETA',
            motivo: 'Validado correctamente por el validador'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          progressBar.finish();
          
          console.log('📤 Respuesta /estado:', JSON.stringify(data));
          
          // ✅ Feedback detallado — ahora usa cola de notificaciones
          if (data.notificacion_encolada) {
            mostrarNotificacion('✅ Caso VALIDADO - Notificaciones en cola de envío', 'success');
            if (data.email_destino) {
              mostrarNotificacion(`📧 Email → ${data.email_destino}`, 'success');
            }
            if (data.whatsapp_destino) {
              mostrarNotificacion(`📱 WhatsApp → ${data.whatsapp_destino}`, 'success');
            }
            if (data.emails_directorio && data.emails_directorio.length > 0) {
              mostrarNotificacion(`📧 Copia directorio → ${data.emails_directorio.join(', ')}`, 'info');
            }
          } else if (data.notificacion_enviada) {
            // Fallback: campo viejo por compatibilidad
            mostrarNotificacion('✅ Caso VALIDADO como COMPLETO - Notificaciones enviadas', 'success');
          } else {
            mostrarNotificacion('✅ Caso VALIDADO como COMPLETO', 'success');
            if (!data.email_destino) {
              mostrarNotificacion('⚠️ Sin email registrado - No se envió notificación', 'warning');
            }
          }
          
          // Recargar casos
          if (onRecargarCasos) onRecargarCasos();
          
          // Limpiar estado
          setAccionSeleccionada(null);
          setChecksSeleccionados([]);
          setAdjuntos([]);
          
          // ✅ AUTO-AVANCE
          try {
            if (casosLista && casosLista.length > 0) {
              const siguienteCasoEnLista = casosLista[indiceActual + 1];
              
              if (siguienteCasoEnLista) {
                const detalle = await api.getCasoDetalle(siguienteCasoEnLista.serial);
                setCasoActualizado(detalle);
                if (onCambiarCaso) {
                  onCambiarCaso(indiceActual + 1);
                } else {
                  irAlSiguiente();
                }
                mostrarNotificacion(`📄 Siguiente: ${siguienteCasoEnLista.serial}`, 'info');
              } else {
                mostrarNotificacion('✅ No hay más casos en este filtro', 'success');
                if (onClose) onClose();
              }
            } else {
              irAlSiguiente();
            }
          } catch (errorAvance) {
            console.error('Error al avanzar:', errorAvance);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setErrorValidacion(errorData.detail || 'Error al validar');
          progressBar.hide();
        }
      } catch (error) {
        console.error('Error:', error);
        setErrorValidacion('Error de conexión');
        progressBar.hide();
      } finally {
        setEnviandoValidacion(false);
      }
      
      return; // ← IMPORTANTE: Salir aquí
    }
    
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
      // 🚀 VALIDACIÓN OPTIMIZADA CON PROGRESO VISUAL
      progressBar.show({
        message: `Validando ${casoSeleccionado.serial}...`,
        totalSteps: 3
      });
      
      console.time(`validacion-${serial}`);
      
      progressBar.update(20, { message: 'Preparando datos...', step: 1 });
      let tiempoValidacion = Date.now();
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - tiempoValidacion;
        if (elapsed < 2000) {
          progressBar.update(30 + (elapsed / 2000) * 30);
        } else if (elapsed < 4000) {
          progressBar.update(60 + (elapsed / 4000) * 30);
        }
      }, 100);
      
      progressBar.update(50, { message: 'Enviando al servidor...', step: 2 });
      
      const response = await fetch(`${API_BASE_URL}/validador/casos/${encodeURIComponent(serial)}/validar`, {
        method: 'POST',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
        body: formData,
        signal: AbortSignal.timeout(45000) // 45 segundos max (IA + backend pueden tardar)
      });
      
      clearInterval(progressInterval);
      const tiempoTranscurrido = Date.now() - tiempoValidacion;
      console.timeEnd(`validacion-${serial}`);
      console.log(`⏱️ Validación completada en ${tiempoTranscurrido}ms`);
      
      progressBar.update(90, { message: 'Procesando respuesta...', step: 3 });
      
      if (response.ok) {
        await response.json();
        
        progressBar.finish();
        
        // ✅ GUARDAR ÚLTIMA ACCIÓN PARA DESHACER
        setUltimaAccion({
          serial: serial,
          accion: accion,
          timestamp: new Date().toISOString()
        });
        
        // Notificación sutil con mensaje específico para COMPLETA
        if (accion === 'completa') {
          mostrarNotificacion('✅ Caso VALIDADO como COMPLETO - Avanzando...', 'success');
        } else if (accion === 'incompleta') {
          mostrarNotificacion('⚠️ Caso marcado como INCOMPLETO', 'success');
        } else if (accion === 'tthh') {
          mostrarNotificacion('� Caso marcado como POSIBLE FRAUDE', 'success');
        } else if (accion === 'eps') {
          mostrarNotificacion('🏥 Caso derivado a EPS', 'success');
        } else if (accion === 'solicitar_epicrisis') {
          mostrarNotificacion('📋 Solicitud de epicrisis enviada al colaborador/a', 'success');
        } else if (accion === 'enviar_validar') {
          mostrarNotificacion('🔍 Caso enviado a validar - Email al colaborador y al área de validación', 'success');
        } else if (accion === 'falsa_confirmada') {
          mostrarNotificacion('🚫 INCAPACIDAD ADULTERADA - Notificada al área encargada', 'success');
        } else {
          mostrarNotificacion(`✅ Caso ${accion} correctamente`, 'success');
        }
        
        // 🚀 INVALIDAR CACHÉ DEL CASO VALIDADO + PRECARGAR SIGUIENTE
        await invalidatePDFCache(serial);
        if (casosLista && indiceActual + 1 < casosLista.length) {
          prefetchNextCases(casosLista, indiceActual, 3);
        }
        
        // Recargar casos
        if (onRecargarCasos) onRecargarCasos();
        
        // Limpiar estado
        setAccionSeleccionada(null);
        setChecksSeleccionados([]);
        setAdjuntos([]);
        
        // ✅ AUTO-AVANCE PARA TODOS LOS ESTADOS
        try {
          // Usar el siguiente caso de la lista actual (respetando filtro)
          if (casosLista && casosLista.length > 0) {
            const siguienteCasoEnLista = casosLista[indiceActual + 1];
            
            if (siguienteCasoEnLista) {
              // Hay más casos en la lista actual
              const detalle = await api.getCasoDetalle(siguienteCasoEnLista.serial);
              setCasoActualizado(detalle);
              if (onCambiarCaso) {
                onCambiarCaso(indiceActual + 1);
              } else {
                // Fallback: usar irAlSiguiente si onCambiarCaso no existe
                irAlSiguiente();
              }
              mostrarNotificacion(`📄 Siguiente: ${siguienteCasoEnLista.serial}`, 'info');
            } else {
              // No hay más casos en esta página/filtro
              mostrarNotificacion('✅ Completado - No hay más casos en este filtro', 'success');
              if (onClose) onClose();
            }
          } else {
            // Sin lista (fallback)
            irAlSiguiente();
          }
        } catch (errorAvance) {
          console.error('Error al cargar siguiente caso:', errorAvance);
          // Continuar aunque falle el siguiente
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorValidacion(errorData.detail || 'Error al validar caso');
        progressBar.hide();
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorValidacion('Error de conexión con el servidor');
      progressBar.hide();
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
      '⚠️ ADVERTENCIA — SE ELIMINARÁ:\n' +
      '• Todas las incapacidades (casos)\n' +
      '• Documentos, eventos, notas\n' +
      '• Correos de notificación\n' +
      '• Alertas y logs de 180 días\n' +
      '• Historial de búsquedas\n' +
      '• Archivos de Google Drive\n\n' +
      '✅ SE CONSERVA:\n' +
      '• Empleados (Hoja 1 del Excel)\n' +
      '• Empresas (Hoja 2 del Excel)\n\n' +
      '⚠️ Esta acción NO se puede deshacer.\n' +
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
        // Mostrar detalle de lo eliminado
        let detalle = data.mensaje;
        if (data.detalle) {
          const d = data.detalle;
          detalle += `\n\nDetalle:\n• ${d.casos || 0} casos\n• ${d.documentos || 0} documentos\n• ${d.eventos || 0} eventos\n• ${d.notas || 0} notas\n• ${d.correos_notificacion || 0} correos\n• ${d.alertas_email || 0} alertas\n• ${data.archivos_drive_eliminados || 0} archivos Drive`;
        }
        alert(detalle);
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

// ✅ ATAJO CTRL+N PARA LIMPIAR SISTEMA
useEffect(() => {
  const handleLimpiarHotkey = (e) => {
    // Ctrl + N para limpiar sistema
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
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

  // ✅ CARGA PDF ULTRA-RÁPIDA con IndexedDB + /pdf/fast
  useEffect(() => {
    let abortController = new AbortController();
    
    const cargarPDFSmart = async () => {
      setLoadingPdf(true);
      setPreviewInstant(null);

      // ⚡ PREVIEW INSTANTÁNEO: imagen liviana de la 1ª página (~80 KB) que se
      // muestra de inmediato mientras el PDF completo baja por debajo.
      (async () => {
        try {
          const resp = await fetch(
            `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/preview`,
            { headers: getHeaders(), signal: abortController.signal }
          );
          if (resp.ok) {
            const blob = await resp.blob();
            setPreviewInstant((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return URL.createObjectURL(blob);
            });
          }
        } catch (_) { /* el preview es opcional — si falla, queda el spinner */ }
      })();

      try {
        await loadPDFSmart(casoSeleccionado.serial, {
          signal: abortController.signal,
          
          // ⚡ Primera página lista → mostrar de inmediato
          onFirstPage: (firstPages, info) => {
            setPages(firstPages);
            setCurrentPage(0);
            setLoadingPdf(false);
            console.log(`⚡ Primera página en ${info.loadTimeMs.toFixed(0)}ms ${info.fromCache ? '(caché)' : '(red)'}`);
          },
          
          // 📥 Todas las páginas listas
          onAllPages: (allPages, info) => {
            setPages([...allPages]);
            console.log(`✅ ${info.totalPages} páginas en ${info.loadTimeMs.toFixed(0)}ms ${info.fromCache ? '(caché)' : '(red)'}`);
          },
          
          onError: (error) => {
            console.error('❌ Error cargando PDF:', error);
            setLoadingPdf(false);
          }
        });
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('❌ Error cargando PDF:', error);
          setLoadingPdf(false);
        }
      }
    };
    
    if (casoSeleccionado?.serial) {
      cargarPDFSmart();
    }
    
    return () => {
      abortController.abort();
    };
  }, [casoSeleccionado?.serial, reloadToken]);

  // ✅ PRECARGA INTELIGENTE: Descarga próximos PDFs a IndexedDB en background
  useEffect(() => {
    if (casosLista.length > 0) {
      prefetchNextCases(casosLista, indiceActual, 3);
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

const _isFraudeConf = casoSeleccionado.metadata_form?.fraude_confirmado || casoActualizado?.metadata_form?.fraude_confirmado;
const statusInfo = _isFraudeConf 
  ? { label: 'ADULTERADA', color: '#7f1d1d', icon: XCircle }
  : STATUS_MAP[casoSeleccionado.estado];
const Icon = statusInfo.icon;

return (
  <>
    {/* Barra de progreso para validaciones */}
    <ProgressBar
      isVisible={progressBar.isVisible}
      progress={progressBar.progress}
      message={progressBar.message}
      currentStep={progressBar.currentStep}
      totalSteps={progressBar.totalSteps}
      estimatedTimeLeft={progressBar.estimatedTimeLeft}
    />
    
    {/* Modal Comparador Antes/Después */}
    {showBeforeAfter && beforeAfterCanvases && (
      <BeforeAfterPDF
        originalCanvas={beforeAfterCanvases.originalCanvas}
        editedCanvas={beforeAfterCanvases.editedCanvas}
        title="Cambios Realizados"
        onSave={async () => {
          // Guardar PDF editado
          if (editedPDFFile) {
            setEnviandoValidacion(true);
            try {
              const formData = new FormData();
              formData.append('archivo', editedPDFFile);
              
              const response = await fetch(
                `${API_BASE_URL}/validador/casos/${encodeURIComponent(casoSeleccionado.serial)}/guardar-pdf-editado`,
                {
                  method: 'POST',
                  headers: { 'X-Admin-Token': ADMIN_TOKEN },
                  body: formData
                }
              );
              
              if (response.ok) {
                mostrarNotificacion('✅ Cambios guardados en Drive', 'success');
                setShowBeforeAfter(false);
                setBeforeAfterCanvases(null);
                // Limpiar caché para que se recargue el PDF mejorado
                await invalidatePDFCache(casoSeleccionado.serial);
                setCurrentPDFFile(null);
                setHasUnsavedChanges(false);
                await recargarPDFInPlace(casoSeleccionado.serial);
              } else {
                mostrarNotificacion('❌ Error guardando', 'error');
              }
            } catch (error) {
              mostrarNotificacion('❌ Error de conexión', 'error');
            } finally {
              setEnviandoValidacion(false);
            }
          }
        }}
        onCancel={() => {
          setShowBeforeAfter(false);
          setBeforeAfterCanvases(null);
        }}
      />
    )}

    {/* ✅ EDITOR EN VIVO (brillo/contraste/crop/sharpen) */}
    {showLiveEditor && (
      <LivePDFEditor
        pdfFile={showLiveEditor.pdfFile}
        pageNum={currentPage}
        serial={casoSeleccionado.serial}
        initialMode={showLiveEditor.mode}
        onSave={guardarDesdeEditorVivo}
        onClose={() => setShowLiveEditor(null)}
        onAttachToEmail={(file) => {
          setAdjuntos(prev => [...prev, file]);
          mostrarNotificacion('📎 Recorte adjuntado al correo', 'success');
        }}
      />
    )}

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
    
    <div className="fixed inset-0 bg-slate-200 z-50 flex flex-col">
      {/* HEADER FULLSCREEN */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 p-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-slate-700" />
          </button>

          {/* ✅ BOTONES DE NAVEGACIÓN ENTRE INCAPACIDADES (RESPONSIVE) */}
          <div className="flex items-center gap-0.5 px-1.5 py-1 bg-slate-100 rounded-lg border border-slate-200 flex-shrink-0">
            <button
              onClick={irAlAnterior}
              disabled={indiceActual === 0}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Anterior (← o Ctrl+←)"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="text-xs font-semibold text-slate-500 px-1.5 min-w-[50px] text-center whitespace-nowrap">
              {indiceActual + 1}/{casosLista.length}
            </span>
            <button
              onClick={irAlSiguiente}
              disabled={indiceActual >= casosLista.length - 1}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Siguiente (→ o Ctrl+→)"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
          
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
            style={{backgroundColor: statusInfo.color}}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-slate-900 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-600 text-sm truncate">{casoSeleccionado.serial}</span>
              {casoActualizado.intentos_incompletos > 0 && (
                <span className="text-[10px] bg-orange-500/80 text-white px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" title={`Enviada como incompleta ${casoActualizado.intentos_incompletos} veces`}>
                  {casoActualizado.intentos_incompletos}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 truncate">{casoSeleccionado.nombre} • {casoSeleccionado.empresa}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 🗑️ BOTÓN ELIMINAR */}
          <button
            onClick={handleEliminarIncapacidad}
            disabled={enviandoValidacion}
            className="p-2 bg-red-600/10 hover:bg-red-600 rounded-xl text-red-600 hover:text-white transition-all duration-300 border border-red-600/30 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar incapacidad permanentemente"
          >
            🗑️
          </button>

          {/* 🧹 BOTÓN LIMPIAR SISTEMA */}
          <button
            onClick={() => setMostrarModalLimpiar(true)}
            className="p-2 bg-orange-600/10 hover:bg-orange-600 rounded-xl text-orange-600 hover:text-white transition-all duration-300 border border-orange-600/30 hover:border-orange-500"
            title="Limpiar todo el sistema (Ctrl+N)"
          >
            🧹
          </button>

          {/* Separador */}
          <div className="h-10 w-px bg-slate-300"></div>

          {/* ✂️ Botón Herramientas */}
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold transition-all duration-300"
            title="Herramientas (Tecla +)"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden md:inline">Herramientas</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
          </button>
          {/* Separador */}
          <div className="h-10 w-px bg-slate-300"></div>

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
          <div className="h-10 w-px bg-slate-300"></div>

          {/* 🔍 Zoom */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 text-slate-700 shadow-sm">
            <ZoomOut className="w-4 h-4" />
            <span className="text-sm min-w-[50px] text-center font-semibold">{zoom}%</span>
            <ZoomIn className="w-4 h-4" />
          </div>

          {/* 💾 Botón Guardar */}
          {!mostradoGuardadoExitoso ? (
            <button
              onClick={guardarPDFEnDrive}
              disabled={guardandoPDF}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                hasUnsavedChanges 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'
              }`}
              title={hasUnsavedChanges ? 'Hay cambios sin guardar - Click para guardar en Drive' : 'Guardar cambios en Drive'}
            >
              <Save className="w-4 h-4" />
              <span className="hidden md:inline text-xs">
                {guardandoPDF ? 'Guardando...' : hasUnsavedChanges ? '⚠️ Guardar cambios' : 'Guardar'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 font-semibold animate-pulse">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline text-xs">Guardado en Drive</span>
            </div>
          )}

          {/* �📁 Drive */}
          <a 
            href={casoSeleccionado.drive_link || 'https://drive.google.com'}
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-all duration-300 transform hover:scale-110 shadow-sm"
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
                  El empleado ha reenviado documentos.
                  <span className="font-bold text-white ml-2">Intentos incompletos: {casoActualizado.metadata_reenvio.total_reenvios}</span>
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
        <div className={`${mostrarMiniaturas ? 'w-48' : 'w-12'} bg-white border-r border-slate-200 overflow-y-auto p-2 transition-all duration-300 flex-shrink-0`}>
          <div className="sticky top-0 bg-white py-2 z-10">
  <button
    onClick={() => setMostrarMiniaturas(!mostrarMiniaturas)}
    className="w-full flex items-center justify-between text-slate-700 text-xs font-semibold hover:bg-slate-100 p-2 rounded"
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
                  currentPage === idx ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-200 hover:border-slate-400'
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
                  className="w-full h-auto transition-transform duration-200"
                  style={{ transform: pageRotations[idx] ? `rotate(${pageRotations[idx]}deg)` : undefined }}
                />
                <div className="text-center text-xs text-slate-500 bg-slate-100 p-1">
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
          className="flex-1 bg-slate-100 overflow-y-auto p-8 scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {loadingPdf ? (
            previewInstant ? (
              /* ⚡ Preview instantáneo de la 1ª página mientras baja el PDF completo */
              <div className="max-w-4xl mx-auto pb-40">
                <div className="flex items-center justify-center gap-2 mb-3 text-indigo-600 text-sm font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cargando documento completo… (vista previa instantánea)
                </div>
                <div className="bg-white shadow-2xl">
                  <img src={previewInstant} alt="Vista previa del soporte" className="w-full h-auto" />
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto text-indigo-600 mb-4" />
                <p className="text-slate-700 text-lg">Cargando documento PDF...</p>
                <p className="text-xs text-slate-500 mt-2">Las páginas aparecerán en cascada con scroll</p>
              </div>
            )
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
                    currentPage === idx ? 'ring-4 ring-indigo-500' : 'opacity-90 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentPage(idx)}
                >
                  <img 
                    src={page.fullImage} 
                    alt={`Página ${idx + 1}`}
                    style={{ 
                      transform: `scale(${zoom/100})${pageRotations[idx] ? ` rotate(${pageRotations[idx]}deg)` : ''}`,
                      transformOrigin: 'center center',
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      transition: 'transform 0.2s ease',
                    }}
                    className="cursor-pointer"
                  />
                  <div className="bg-slate-100 text-slate-600 text-center py-2 text-sm font-semibold">
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
        className={`fixed right-0 top-[60px] bottom-[60px] w-7 bg-gradient-to-l from-indigo-500/10 border-l border-indigo-500/30 flex items-center justify-center cursor-pointer z-[80] transition-all hover:w-10 ${showToolsMenu ? 'bg-indigo-500/20' : ''}`}
        onClick={() => setShowToolsMenu(!showToolsMenu)}
        title="Herramientas (Tecla +)"
      >
        <span className="text-indigo-600 text-lg transition-transform" style={{transform: showToolsMenu ? 'scaleX(-1)' : 'scaleX(1)'}}>◀</span>
      </div>

      {/* ⭐ SIDEBAR DERECHO - HERRAMIENTAS */}
      <div className={`fixed right-0 top-[60px] bottom-[60px] w-80 bg-white/95 backdrop-blur border-l border-slate-200 transform transition-transform duration-300 z-[85] overflow-y-auto flex flex-col ${showToolsMenu ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="bg-indigo-50 border-b border-slate-200 p-4 flex items-center justify-between flex-shrink-0">
          <span className="text-slate-900 font-bold flex items-center gap-2">🔧 Herramientas</span>
          <button onClick={() => setShowToolsMenu(false)} className="p-1 hover:bg-slate-100 rounded text-slate-700">✕</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* INFORMACIÓN (DESPLEGABLE) */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <button
              onClick={() => setMostrarInfoDesplegable(!mostrarInfoDesplegable)}
              className="w-full px-4 py-3 bg-slate-50 text-slate-700 font-semibold text-sm hover:bg-slate-100 flex items-center justify-between transition-colors rounded-t-lg"
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                👤 Información
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mostrarInfoDesplegable ? 'rotate-180' : ''}`} />
            </button>
            
            {mostrarInfoDesplegable && (
              <div className="bg-slate-50 p-3 space-y-2 rounded-b-lg">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded">{casoActualizado.nombre ? casoActualizado.nombre : 'En proceso'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cédula</div>
                  <div className="text-xs text-amber-600 font-semibold bg-slate-100 px-2 py-1.5 rounded">{casoActualizado.cedula ? casoActualizado.cedula : 'En proceso'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Teléfono</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded">{casoActualizado.telefono_form ? casoActualizado.telefono_form : 'En proceso'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded break-all">{casoActualizado.email_form ? casoActualizado.email_form : 'En proceso'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Empresa</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded">{casoActualizado.empresa ? casoActualizado.empresa : 'En proceso'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">EPS</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded">{casoActualizado.eps ? casoActualizado.eps : 'No registrada'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Estado</div>
                  <div className="flex items-center gap-2 bg-red-50 px-2 py-1.5 rounded border border-red-200">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    <span className="text-xs text-red-600 font-semibold">{casoActualizado.estado === 'DERIVADO_TTHH' ? 'ES POSIBLE FRAUDE' : (casoActualizado.estado ? casoActualizado.estado : 'En proceso')}</span>
                  </div>
                </div>
                {casoActualizado.metadata_reenvio?.tiene_reenvios && (
                  <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reenvíos</div>
                    <div className="text-xs text-orange-600 bg-slate-100 px-2 py-1.5 rounded">
                      {casoActualizado.metadata_reenvio.total_reenvios} intentos
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Días</div>
                  <div className="text-xs text-amber-600 font-semibold bg-slate-100 px-2 py-1.5 rounded">
                    {casoActualizado.dias_incapacidad !== undefined && casoActualizado.dias_incapacidad !== null && casoActualizado.dias_incapacidad !== '' ? casoActualizado.dias_incapacidad : 'En proceso'} días
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo</div>
                  <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1.5 rounded capitalize">
                    {casoActualizado.tipo ? casoActualizado.tipo.replace('_', ' ') : 'En proceso'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ROTACIÓN */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 flex items-center justify-between">
              <span>🔄 Rotación</span>
              <span>▼</span>
            </button>
            <div className="bg-slate-50 p-2 space-y-1">
              <button onClick={() => {rotarPagina(90, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">↻ 90° Derecha</button>
              <button onClick={() => {rotarPagina(-90, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">↺ 90° Izquierda</button>
              <button onClick={() => {rotarPagina(180, false); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">↻ 180°</button>
            </div>
          </div>

          {/* ✨ EDITOR EN VIVO (abre panel con sliders) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 flex items-center justify-between">
              <span>✨ Editor en Vivo</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">NUEVO</span>
            </button>
            <div className="bg-slate-50 p-2 space-y-1">
              <button onClick={() => {abrirEditorEnVivo('filters'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-violet-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50 flex items-center gap-2">🎛️ Abrir Editor Completo</button>
              <button onClick={() => {abrirEditorEnVivo('brightness'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">☀️ Brillo (en vivo)</button>
              <button onClick={() => {abrirEditorEnVivo('contrast'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">◈ Contraste (en vivo)</button>
              <button onClick={() => {abrirEditorEnVivo('sharpen'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">🎯 Enfoque HD (en vivo)</button>
              <button onClick={() => {abrirEditorEnVivo('grayscale'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded disabled:opacity-50">⚪ Blanco y Negro</button>
            </div>
          </div>

          {/* ✨ MEJORA HD HÍBRIDA (SERVIDOR) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:from-emerald-700 hover:to-teal-700 flex items-center justify-between">
              <span>✨ Mejorar Calidad HD</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">AUTO</span>
            </button>
            <div className="bg-slate-50 p-2 space-y-1">
              <button
                onClick={() => { mejorarCalidadHD('rapido'); setShowToolsMenu(false); }}
                disabled={enviandoValidacion}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50 flex items-center gap-2"
              >
                ⚡ Rápido (1.8x)
              </button>
              <button
                onClick={() => { mejorarCalidadHD('estandar'); setShowToolsMenu(false); }}
                disabled={enviandoValidacion}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50 flex items-center gap-2"
              >
                ⚡ Estándar (2.5x)
              </button>
              <button
                onClick={() => { mejorarCalidadHD('premium'); setShowToolsMenu(false); }}
                disabled={enviandoValidacion}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50 flex items-center gap-2"
              >
                ⚡ Premium (3.5x)
              </button>
              <button
                onClick={() => { mejorarCalidadHD('estandar', 'hd'); setShowToolsMenu(false); }}
                disabled={enviandoValidacion}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-violet-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50 flex items-center gap-2"
              >
                🤖 IA máxima (tipo Artguru)
              </button>
              <p className="text-[10px] text-slate-500 px-1 pt-1">
                Binariza el texto puro y conserva sellos/fotos automáticamente. Endereza y quita ruido.
              </p>
            </div>
          </div>

          {/* ✂️ RECORTE */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 flex items-center justify-between">
              <span>✂️ Recorte</span>
              <span>▼</span>
            </button>
            <div className="bg-slate-50 p-2 space-y-1">
              <button onClick={() => {abrirEditorEnVivo('crop'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-orange-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">✂️ Recorte manual (dibujar)</button>
              <button onClick={() => {abrirEditorEnVivo('crop'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-orange-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">📐 Auto-recorte (quitar bordes)</button>
            </div>
          </div>

          {/* CAMBIAR TIPO */}
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 font-semibold text-sm flex items-center justify-between transition-colors">
              <span className="flex items-center gap-2">
                🔄 Cambiar Tipo
              </span>
              <span>▼</span>
            </button>
            <div className="bg-slate-50 p-2 space-y-1">
              <button onClick={() => {handleCambiarTipo('maternity'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">👶 Maternidad</button>
              <button onClick={() => {handleCambiarTipo('paternity'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">👨‍👦 Paternidad</button>
              <button onClick={() => {handleCambiarTipo('general'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">🏥 Enfermedad General</button>
              <button onClick={() => {handleCambiarTipo('traffic'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">🚗 Accidente Tránsito</button>
              <button onClick={() => {handleCambiarTipo('labor'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">🏭 Accidente Laboral</button>
              <hr className="border-slate-200 my-1" />
              <button onClick={() => {handleCambiarTipo('certificado_hospitalizacion'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-violet-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">🏥 Certificado Hospitalización</button>
              <button onClick={() => {handleCambiarTipo('prelicencia'); setShowToolsMenu(false);}} disabled={enviandoValidacion} className="w-full px-3 py-2 bg-slate-100 hover:bg-cyan-600 text-slate-700 hover:text-white text-xs rounded disabled:opacity-50">📋 Prelicencia</button>
            </div>
          </div>

          {/* ELIMINAR PÁGINAS */}
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <button className="w-full px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-700 font-semibold text-sm flex items-center justify-between transition-colors">
              <span className="flex items-center gap-2">
                🗑️ Eliminar Páginas
              </span>
              <span>▼</span>
            </button>
            <div className="bg-slate-50 p-3">
              <div className="text-xs text-slate-600 mb-2">
                Seleccionadas: <strong className="text-slate-900">{paginasSeleccionadas.length}/{pages.length}</strong>
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
          <div className="border border-red-200 rounded-lg bg-red-50 p-3">
            <h4 className="text-red-700 font-semibold text-xs mb-2">📋 Atajos</h4>
            <ul className="text-xs text-red-600 space-y-1">
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
      <div className="bg-white/98 backdrop-blur-xl border-t-2 border-slate-200 p-4 flex-shrink-0 fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
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
            📋 Transcribir ante la EPS
          </button>
          
          <button 
            onClick={() => setAccionSeleccionada('tthh')}
            disabled={enviandoValidacion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50"
            style={{backgroundColor: '#dc2626'}}>
            <AlertCircle className="w-4 h-4" />
            🚨 Posible Fraude
          </button>
          
          {/* VALIDADA VERDADERA / FALSA VALIDADA - Solo visible cuando caso está en P. FRAUDE */}
          {casoSeleccionado.estado === 'DERIVADO_TTHH' && (
            <>
              <button 
                onClick={() => {
                  if (window.confirm('✅ ¿Está seguro/a que esta incapacidad es VERDADERA?\n\nSe moverá a Completa/Validada. Esta acción no se puede deshacer.')) {
                    handleValidar(casoSeleccionado.serial, 'completa');
                  }
                }}
                disabled={enviandoValidacion}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50 ring-2 ring-green-400 ring-offset-2 ring-offset-white"
                style={{backgroundColor: '#059669'}}>
                <CheckCircle className="w-4 h-4" />
                ✅ Validada Verdadera
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('🚫 ¿Está seguro/a que esta incapacidad es FALSA/ADULTERADA?\n\nSe notificará al área encargada y quedará registrada como adulterada. Esta acción no se puede deshacer.')) {
                    handleValidar(casoSeleccionado.serial, 'falsa_confirmada');
                  }
                }}
                disabled={enviandoValidacion}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg disabled:opacity-50 ring-2 ring-red-400 ring-offset-2 ring-offset-white"
                style={{backgroundColor: '#b91c1c'}}>
                <XCircle className="w-4 h-4" />
                🚫 Falsa Validada
              </button>
            </>
          )}
          
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
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  📋 Documentos Faltantes para {casoSeleccionado.tipo || 'este tipo'}
                </h4>
                <div className="space-y-2">
                  {getChecksPorTipo(casoSeleccionado.tipo, 'documentos').map(check => (
                    <label key={check.key} className={`flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors border ${checksSeleccionados.includes(check.key) ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                          {check.label}
                          {check.icon}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Problemas de Calidad */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  ⚠️ Problemas de Calidad
                </h4>
                <div className="space-y-2">
                  {getChecksPorTipo(casoSeleccionado.tipo, 'calidad').map(check => (
                    <label key={check.key} className={`flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-orange-50 transition-colors border ${checksSeleccionados.includes(check.key) ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={checksSeleccionados.includes(check.key)}
                        onChange={() => toggleCheck(check.key)}
                        className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 text-sm">{check.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{check.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Adjuntar Referentes */}
              <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  🔎 Adjuntar Imágenes Referentes (Opcional)
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Si falta SOAT o FURIPS, puedes adjuntar imágenes de ejemplo mostrando cómo debe verse el documento correcto.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  onChange={(e) => setAdjuntos(Array.from(e.target.files))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:font-semibold hover:file:bg-indigo-700 cursor-pointer"
                />
                {adjuntos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {adjuntos.map((file, idx) => (
                      <div key={idx} className="text-xs bg-white px-3 py-1 rounded-full border border-indigo-300 flex items-center gap-2">
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
              <div className="bg-violet-50 border-2 border-dashed border-violet-300 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  🤖 O escribe libremente (la IA lo convertirá en email profesional)
                </h4>
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Ejemplo: 'Falta la epicrisis completa y el registro civil está recortado'"
                  className="w-full px-4 py-3 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none text-slate-900 bg-white placeholder-slate-400"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-2">
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
                  className="px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg font-semibold transition-colors"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POSIBLE FRAUDE */}
      {accionSeleccionada === 'tthh' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-red-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                🚨 Posible Fraude
              </h3>
              <button onClick={() => { setAccionSeleccionada(null); setMensajePersonalizado(''); }} className="p-1 hover:bg-red-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Caso con posibles inconsistencias.</strong> Seleccione la acción a realizar:
                </p>
              </div>

              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
                <p className="text-sm text-indigo-800">
                  <strong>📋 Solicitar Epicrisis:</strong> Se envía email al colaborador/a pidiéndole el resumen de atención (epicrisis) como si la EPS lo solicitara.
                </p>
              </div>

              <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded">
                <p className="text-sm text-violet-800">
                  <strong>🔍 Enviar a Validar:</strong> Se envía email neutro al colaborador/a (confirmación normal) y un correo aparte al área de validación con los soportes adjuntos e información del caso para verificar con la EPS.
                </p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <p className="text-sm text-amber-800">
                  <strong>📌 Flujo:</strong> Después de enviar a validar, cuando la EPS responda aparecerán los botones <strong>"Validada Verdadera"</strong> o <strong>"Falsa Validada"</strong> para cerrar el caso.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setAccionSeleccionada(null);
                    setMensajePersonalizado('');
                    handleValidar(casoSeleccionado.serial, 'solicitar_epicrisis');
                  }}
                  disabled={enviandoValidacion}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoValidacion ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      📋 Solicitar Epicrisis
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAccionSeleccionada(null);
                    setMensajePersonalizado('');
                    handleValidar(casoSeleccionado.serial, 'enviar_validar');
                  }}
                  disabled={enviandoValidacion}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {enviandoValidacion ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      🔍 Enviar a Validar
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => {
                  setAccionSeleccionada(null);
                  setMensajePersonalizado('');
                }}
                className="w-full px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg font-semibold transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXTRA */}
      {accionSeleccionada === 'extra' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-violet-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-6 h-6" />
                📝 Notificación Personalizada (IA)
              </h3>
              <button onClick={() => setAccionSeleccionada(null)} className="p-1 hover:bg-violet-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded">
                <p className="text-sm text-violet-800">
                  <strong>🤖 Escribe un mensaje informal.</strong> La IA lo convertirá en un email profesional, claro y amable para la empleada.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ✍️ Tu Mensaje (Informal)
                </label>
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  placeholder="Ejemplo: 'Hola María, nos falta el registro civil del bebé, si puedes enviarlo hoy sería genial'"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-slate-900 bg-white placeholder-slate-400"
                  rows={5}
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 Escribe natural, la IA lo profesionalizará
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🔎 Adjuntar Archivos (Opcional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setAdjuntos(Array.from(e.target.files))}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:font-semibold hover:file:bg-violet-700 cursor-pointer"
                />
                {adjuntos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {adjuntos.map((file, idx) => (
                      <div key={idx} className="text-xs bg-white px-3 py-1 rounded-full border border-violet-300 flex items-center gap-2">
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
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
                  className="px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg font-semibold transition-colors"
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
          <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">🧹</div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Limpiar Sistema</h2>
                <p className="text-xs text-slate-500">Ingresa contraseña para continuar</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>⚠️ ADVERTENCIA:</strong> Esta acción eliminará TODOS los casos del sistema.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
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
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
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
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Atajo: <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-600">Ctrl + N</kbd>
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
  // ==================== AUTH ====================
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('portal_token'));
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portal_user')); } catch { return null; }
  });

  const handleLogin = async (token, user) => {
    localStorage.setItem('portal_token', token);
    localStorage.setItem('portal_user', JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);

    // Si es tenant admin, cargar y guardar la config de su empresa para el branding
    if (user?.es_tenant_admin && user?.company_id) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/tenants/${user.company_id}`,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const tenantData = await res.json();
          // Guardar en formato que useTenantTheme espera
          const config = {
            nombre:         tenantData.nombre         || tenantData.company?.nombre,
            nit:            tenantData.nit             || tenantData.tenant_config?.nit,
            logo_url:       tenantData.logo_url        || tenantData.tenant_config?.logo_url,
            paleta_colores: tenantData.paleta_colores  || tenantData.tenant_config?.paleta_colores,
            estilo_ui:      tenantData.estilo_ui       || tenantData.tenant_config?.estilo_ui,
            ciclo_reporte:  tenantData.ciclo_reporte   || tenantData.tenant_config?.ciclo_reporte,
          };
          localStorage.setItem('tenant_config', JSON.stringify(config));
        }
      } catch (err) {
        console.warn('No se pudo cargar el tema del tenant:', err);
      }
    } else {
      // Usuario global → limpiar cualquier tenant_config anterior
      localStorage.removeItem('tenant_config');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    localStorage.removeItem('tenant_config');
    applyPaletteVars(null, true); // restaurar la paleta por defecto del portal
    setAuthToken(null);
    setAuthUser(null);
  };

  // Show login page if not authenticated
  if (!authToken || !authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ==================== APP STATE ====================
  return <AppContent authUser={authUser} onLogout={handleLogout} />;
}     

function AppContent({ authUser, onLogout }) {
  // ── Tema tenant (branding multi-empresa) ──────────────────
  const tenantTheme = useTenantTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const [empresas, setEmpresas] = useState([]);
  const [casos, setCasos] = useState([]);
  const [stats, setStats] = useState({});
  const [filtros, setFiltros] = useState({ empresa: 'all', estado: 'all', tipo: 'all', q: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [indiceActual, setIndiceActual] = useState(0); // ✅ Índice en la lista filtrada
  // ✅ PERMISOS: determinar pestañas permitidas para este usuario
  const userPermisos = authUser?.permisos || {};
  const isSuperOrAdmin = ['superadmin', 'admin'].includes(authUser?.rol);

  const TAB_CONFIG = [
    { id: 'validacion',    permKey: 'validador',     label: '✅ Validación de Casos',      borderColor: 'border-indigo-600', textColor: 'text-indigo-600' },
    { id: 'reportes',      permKey: 'reportes',      label: '📊 Reportes y Tablas Vivas',  borderColor: 'border-indigo-600', textColor: 'text-indigo-600' },
    { id: 'exportaciones', permKey: 'exportaciones',  label: '📦 Exportaciones PDF',        borderColor: 'border-indigo-600', textColor: 'text-indigo-600' },
    { id: 'powerbi',       permKey: 'powerbi',       label: '📈 Power BI',                 borderColor: 'border-yellow-500', textColor: 'text-yellow-400' },
    { id: 'plano-incapacidades', permKey: 'reportes', label: '📋 Plano Incapacidades', borderColor: 'border-indigo-500', textColor: 'text-indigo-400' },
    { id: 'estado-radicacion',   permKey: 'reportes', label: '📡 Estado de Radicación', borderColor: 'border-indigo-500', textColor: 'text-indigo-400' },
  ];

  const tabsPermitidas = TAB_CONFIG.filter(t => isSuperOrAdmin || userPermisos[t.permKey]);
  const [tabActual, setTabActual] = useState(() => tabsPermitidas[0]?.id || 'validacion');

  useEffect(() => {
    cargarEmpresas();
    cargarStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarEmpresas = async () => {
    try {
      const data = await api.getEmpresas();
      // API returns either {empresas: [...]} or [...] directly
      const lista = Array.isArray(data) ? data : (data.empresas || []);
      setEmpresas(lista);
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

  const cargarCasos = useCallback(async ({ silent = false, keepSelection = true } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getCasos(filtros);
      const items = data.items || [];
      setCasos(items);
      setTotalPages(data.total_pages || 1);

      if (keepSelection && casoSeleccionado?.serial) {
        const nuevoIndice = items.findIndex(item => item.serial === casoSeleccionado.serial);
        if (nuevoIndice >= 0) {
          setIndiceActual(nuevoIndice);
        }
      }
    } catch (error) {
      console.error('Error cargando casos:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filtros, casoSeleccionado?.serial]);

  useEffect(() => {
    cargarCasos();
  }, [cargarCasos]);

  useEffect(() => {
    if (tabActual !== 'validacion') return;

    const intervalId = setInterval(() => {
      cargarCasos({ silent: true, keepSelection: true });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [tabActual, filtros, casoSeleccionado?.serial, cargarCasos]);

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
      {/* Banner de demo — solo visible para tenant admins en modo demo */}
      {authUser?.es_tenant_admin && authUser?.company_id && (
        <DemoBanner companyId={authUser.company_id} onLogout={onLogout} />
      )}
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header — con branding tenant si está configurado */}
          <div
            className="rounded-2xl p-6 shadow-2xl text-white"
            style={tenantTheme.loaded ? {
              background: `linear-gradient(135deg, ${tenantTheme.primary}, ${tenantTheme.secondary})`,
            } : {
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A78BFA 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Logo del tenant si existe */}
                {tenantTheme.loaded && tenantTheme.logoUrl ? (
                  <img
                    src={tenantTheme.logoUrl}
                    alt={tenantTheme.nombreEmpresa || 'Logo'}
                    className="w-14 h-14 object-contain rounded-xl bg-white/15 p-1 flex-shrink-0"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <User className="w-8 h-8 flex-shrink-0" />
                )}
                <div>
                  <h1 className="text-3xl font-bold">
                    {tenantTheme.loaded && tenantTheme.nombreEmpresa
                      ? tenantTheme.nombreEmpresa
                      : 'Portal de Validadores'
                    }
                  </h1>
                  <p className="text-blue-100 mt-1 opacity-80">
                    {tenantTheme.loaded && tenantTheme.nit
                      ? `NIT ${tenantTheme.nit} · Sistema de gestión de incapacidades`
                      : 'Sistema de gestión de incapacidades médicas'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-blue-100 bg-white/10 px-3 py-1.5 rounded-lg block">
                    {authUser?.nombre || authUser?.username}
                  </span>
                  <span className="text-[10px] text-blue-200/60 mt-0.5 block">
                    {authUser?.rol === 'superadmin' ? '🔑 Super Admin' :
                     authUser?.rol === 'admin' ? '🛡️ Administrador' :
                     authUser?.rol === 'th' ? '👥 Talento Humano' :
                     authUser?.rol === 'sst' ? '🦺 SST' :
                     authUser?.rol === 'nomina' ? '💰 Nómina' : '👁️ Visualizador'}
                  </span>
                </div>
                {authUser?.es_tenant_admin && (
                  <button
                    onClick={() => setShowThemeModal(true)}
                    className="flex items-center gap-1.5 text-sm text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                    title="Personalizar colores de tus portales"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-sm text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </div>
            </div>
          </div>

          {/* ⚙️ Tuerquita — personalización de paleta por portal */}
          {showThemeModal && <ThemeSettingsModal onClose={() => setShowThemeModal(false)} />}

          {/* ⭐ TABS SELECTOR — filtrado por permisos del usuario */}
          <div className="flex gap-2 border-b-2 border-slate-200">
            {tabsPermitidas.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActual(tab.id)}
                className={`px-4 py-3 font-semibold transition-colors ${
                  tabActual === tab.id
                    ? `border-b-2 ${tab.borderColor} ${tab.textColor}`
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {tabsPermitidas.length === 0 && (
              <span className="px-4 py-3 text-slate-500 text-sm">Sin permisos asignados — contacte al administrador</span>
            )}
          </div>

          {/* ⭐ TAB 1: VALIDACIÓN (CÓDIGO EXISTENTE) */}
          {tabActual === 'validacion' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-bold text-slate-900">{value || 0}</div>
              <div className="text-sm text-slate-500 capitalize">{key.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={filtros.empresa}
              onChange={(e) => handleFiltroChange('empresa', e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>

            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los estados</option>
              {Object.keys(STATUS_MAP).map(key => (
                <option key={key} value={key}>{STATUS_MAP[key].label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Buscar serial, cédula, nombre o +5 (≥5 días)..."
              value={filtros.q}
              onChange={(e) => handleFiltroChange('q', e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={() => api.exportarCasos('xlsx', filtros)}
              className="rounded-lg px-4 py-2 font-semibold transition-colors flex items-center justify-center gap-2"
              style={tenantTheme.loaded ? {
                background: `var(--tenant-primary, #16a34a)`,
                color: 'white',
              } : {
                background: '#16a34a',
                color: 'white',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Lista de Casos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
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
                    const isFraudeConfirmado = caso.fraude_confirmado || (caso.metadata_form?.fraude_confirmado);
                    const statusInfo = isFraudeConfirmado 
                      ? { label: 'ADULTERADA', color: '#7f1d1d', icon: XCircle }
                      : STATUS_MAP[caso.estado];
                    const Icon = statusInfo.icon;
                    const tieneReenvios = caso.total_reenvios > 0;
                    return (
                      <tr key={caso.id} className={`border-t border-slate-200 hover:bg-slate-100 transition-colors ${
                        tieneReenvios ? 'bg-rose-50' : ''
                      }`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-amber-600">{caso.serial}</span>
                            {/* Badge de reenvíos: muestra cuántas veces se ha enviado como incompleta */}
                            {tieneReenvios && (
                              <span 
                                className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-rose-500/80 text-white"
                                title={`Reenviado ${caso.total_reenvios} vez${caso.total_reenvios > 1 ? 'es' : ''}`}
                              >
                                {caso.total_reenvios}
                              </span>
                            )}
                            {caso.bloquea_nueva && (
                              <span 
                                className="text-xs px-2 py-0.5 bg-red-500/20 text-red-600 rounded-full border border-red-300"
                                title="Este caso está bloqueando al empleado"
                              >
                                🔒
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{caso.nombre}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{caso.empresa}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: statusInfo.color + '20', color: statusInfo.color}}
                          >
                            <Icon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(caso.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={async () => {
                              try {
                                const detalle = await api.getCasoDetalle(caso.serial);
                                setCasoSeleccionado(detalle);
                              } catch (e) {
                                setCasoSeleccionado(caso);
                              }
                              setIndiceActual(casos.indexOf(caso));
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
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
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200">
            <button
              onClick={() => handlePageChange(filtros.page - 1)}
              disabled={filtros.page === 1}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {filtros.page} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(filtros.page + 1)}
              disabled={filtros.page >= totalPages}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

          {/* ⭐ TAB 3: EXPORTACIONES MASIVAS PDF */}
          {tabActual === 'exportaciones' && (
            <ExportacionesPDF empresas={empresas} />
          )}

          {/* ⭐ TAB 4: POWER BI — ANÁLISIS INDIVIDUAL */}
          {tabActual === 'powerbi' && (
            <PowerBIDashboard empresas={empresas} />
          )}

          {/* ⭐ TAB 7: PLANO INCAPACIDADES */}
          {tabActual === 'plano-incapacidades' && (
            <PlanoIncapacidades empresas={empresas} />
          )}

          {/* ⭐ TAB 8: ESTADO DE RADICACIÓN (browser-use) */}
          {tabActual === 'estado-radicacion' && (
            <EstadoRadicacion />
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