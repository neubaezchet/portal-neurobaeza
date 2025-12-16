import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Send, Edit3, Clock, 
  ChevronLeft, ChevronRight, FolderOpen, X, Download, RefreshCw, 
  AlertCircle, ZoomIn, ZoomOut, Grid, Sliders, Sun, Contrast, Maximize2,
  Undo2, Image
} from 'lucide-react';

// ==================== CONFIGURACIÓN API ====================
const API_BASE_URL = 'https://bakcend-gemi-cha-2.onrender.com';
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

// ==================== EDITOR PDF CON CANVAS ====================
function PDFEditorCanvas({ pageImage, onSave, onClose }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('draw'); // draw, highlight, arrow, crop
  const [color, setColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Redibujar anotaciones
      annotations.forEach(ann => drawAnnotation(ctx, ann));
    };
    
    img.src = pageImage;
  }, [pageImage, annotations]);

  const drawAnnotation = (ctx, ann) => {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.tool === 'highlight' ? 20 : 3;
    ctx.globalAlpha = ann.tool === 'highlight' ? 0.3 : 1;
    
    if (ann.tool === 'draw' || ann.tool === 'highlight') {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      ann.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (ann.tool === 'arrow') {
      drawArrow(ctx, ann.start.x, ann.start.y, ann.end.x, ann.end.y);
    } else if (ann.tool === 'crop') {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
    }
    
    ctx.globalAlpha = 1;
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 20;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    
    if (tool === 'draw' || tool === 'highlight') {
      setAnnotations(prev => [...prev, { tool, color, points: [{ x, y }] }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'draw' || tool === 'highlight') {
      setAnnotations(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, points: [...last.points, { x, y }] }];
      });
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'arrow') {
      setAnnotations(prev => [...prev, { tool, color, start: startPos, end: { x, y } }]);
    } else if (tool === 'crop') {
      const width = x - startPos.x;
      const height = y - startPos.y;
      setAnnotations(prev => [...prev, { tool, x: startPos.x, y: startPos.y, width, height }]);
    }
    
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      onSave(blob);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded text-white">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-white font-semibold">✏️ Editor de PDF</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Herramientas */}
          <button
            onClick={() => setTool('draw')}
            className={`p-2 rounded ${tool === 'draw' ? 'bg-blue-600' : 'bg-gray-800'} text-white`}
          >
            ✏️ Dibujar
          </button>
          
          <button
            onClick={() => setTool('highlight')}
            className={`p-2 rounded ${tool === 'highlight' ? 'bg-yellow-600' : 'bg-gray-800'} text-white`}
          >
            🖍️ Resaltar
          </button>
          
          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded ${tool === 'arrow' ? 'bg-green-600' : 'bg-gray-800'} text-white`}
          >
            ➡️ Flecha
          </button>
          
          <button
            onClick={() => setTool('crop')}
            className={`p-2 rounded ${tool === 'crop' ? 'bg-purple-600' : 'bg-gray-800'} text-white`}
          >
            ✂️ Recortar
          </button>

          {/* Color picker */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />

          {/* Deshacer */}
          <button
            onClick={() => setAnnotations(prev => prev.slice(0, -1))}
            disabled={annotations.length === 0}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white disabled:opacity-30"
          >
            <Undo2 className="w-5 h-5" />
          </button>

          {/* Guardar */}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
          >
            💾 Guardar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-black overflow-auto flex items-center justify-center p-8">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-w-full max-h-full shadow-2xl cursor-crosshair"
        />
      </div>

      <div className="bg-gray-900 p-4 text-center text-gray-400 text-sm border-t border-gray-700">
        💡 Selecciona una herramienta y dibuja sobre el documento. Los cambios se guardarán en Drive.
      </div>
    </div>
  );
}

// ==================== VISOR FULLSCREEN TIPO POWERPOINT ====================
function DocumentViewer({ casoSeleccionado, onClose, onRecargarCasos }) {
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
  const [mostrarReferentes, setMostrarReferentes] = useState(false);
  const [mostrarMiniaturas, setMostrarMiniaturas] = useState(true);
  const [casoActualizado, setCasoActualizado] = useState(casoSeleccionado); // ✅ NUEVO
  const [notificacion, setNotificacion] = useState(null);
  const containerRef = useRef(null);

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

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
  const rotarPagina = async (pageNum, angle, aplicarATodas) => {
    if (!window.confirm(aplicarATodas ? '🔄 ¿Rotar TODAS las páginas?' : '🔄 ¿Rotar esta página?')) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const operaciones = aplicarATodas 
        ? { rotate: pages.map((_, i) => ({ page_num: i, angle })) }
        : { rotate: [{ page_num: pageNum, angle }] };
      
      const response = await fetch(`${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ operaciones })
      });
      
     if (response.ok) {
  mostrarNotificacion('✅ Página(s) rotada(s)', 'success');
  setTimeout(() => window.location.reload(), 1000);
} else {
        alert('❌ Error rotando página');
      }
    } catch (error) {
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ MEJORAR CALIDAD HD
  const mejorarCalidadHD = async (pageNum) => {
    if (!window.confirm('✨ ¿Mejorar calidad HD de esta página?\n\nEsto puede tardar unos segundos.')) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/editar-pdf`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          operaciones: { enhance_quality: { pages: [pageNum] } }
        })
      });
      
      if (response.ok) {
  mostrarNotificacion('✨ Calidad mejorada', 'success');
  setTimeout(() => window.location.reload(), 1500);
}else {
        alert('❌ Error mejorando calidad');
      }
    } catch (error) {
      alert('❌ Error de conexión');
    } finally {
      setEnviandoValidacion(false);
    }
  };

  // ✅ Función validar con imagen SOAT automática
  const handleValidar = async (serial, accion) => {
    // ✅ DETECTAR SI ES UN REENVÍO
    const esReenvio = casoSeleccionado.metadata_reenvio?.tiene_reenvios;
    
    if (esReenvio) {
      // Si es reenvío, usar endpoint especial
      if (accion === 'completa') {
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
            `${API_BASE_URL}/validador/casos/${serial}/aprobar-reenvio`,
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
      const response = await fetch(`${API_BASE_URL}/validador/casos/${serial}/validar`, {
        method: 'POST',
        headers: { 'X-Admin-Token': ADMIN_TOKEN },
        body: formData
      });
      
    if (response.ok) {
  const data = await response.json();
  
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
  
  // Buscar siguiente caso NUEVO automáticamente
  setTimeout(async () => {
    try {
      const filtros = { estado: 'NUEVO', page: 1, page_size: 1 };
      const siguienteCasoData = await api.getCasos(filtros);
      
      if (siguienteCasoData.items && siguienteCasoData.items.length > 0) {
        const siguienteSerial = siguienteCasoData.items[0].serial;
        const detalle = await api.getCasoDetalle(siguienteSerial);
        setCasoActualizado(detalle);
        mostrarNotificacion('📄 Siguiente caso cargado', 'success');
      } else {
        onClose();
        mostrarNotificacion('✅ No hay más casos nuevos', 'success');
      }
    } catch (error) {
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
      const response = await fetch(`${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/toggle-bloqueo`, {
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
// ✅ FUNCIÓN ELIMINAR CASO
  const handleEliminarCaso = async () => {
    if (!window.confirm(`⚠️ ¿ELIMINAR CASO ${casoSeleccionado.serial}?\n\nEsta acción es PERMANENTE y solo quedará en historial.`)) {
      return;
    }
    
    setEnviandoValidacion(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/eliminar`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      if (response.ok) {
        alert('✅ Caso eliminado correctamente');
        onClose();
        if (onRecargarCasos) onRecargarCasos();
      } else {
        alert('❌ Error al eliminar caso');
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
      const response = await fetch(`${API_BASE_URL}/validador/casos/${ultimaAccion.serial}/estado`, {
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
      const response = await fetch(`${API_BASE_URL}/validador/casos/${serial}/notificar-libre`, {
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
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleFullscreenExit);
    
    return () => {
      window.removeEventListener('keydown', handleFullscreenExit);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [onClose]);
// ✅ DETECTAR REENVÍOS AL ABRIR CASO
useEffect(() => {
  const verificarReenvios = async () => {
    if (!casoActualizado?.serial) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/validador/casos/${casoActualizado.serial}/historial-reenvios`,
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
}, [casoSeleccionado?.serial]);
  // ✅ CARGA DE PDF
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
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const fullImage = canvas.toDataURL('image/jpeg', 0.9);
          pagesArray.push({ id: i - 1, fullImage });
        }
        
        setPages(pagesArray);
      } catch (error) {
        console.error('Error cargando PDF:', error);
        alert('Error al cargar el PDF: ' + error.message);
      } finally {
        setLoadingPdf(false);
      }
    };
    
    cargarPDF();
  }, [casoSeleccionado]);

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

  // ✅ NAVEGACIÓN CON TECLADO
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      setCurrentPage(p => Math.min(pages.length - 1, p + 1));
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      setCurrentPage(p => Math.max(0, p - 1));
    }
    if (e.key === 'Escape') onClose();
    if (e.key === 'Home') setCurrentPage(0);
    if (e.key === 'End') setCurrentPage(pages.length - 1);
  }, [pages, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

const statusInfo = STATUS_MAP[casoSeleccionado.estado];
const Icon = statusInfo.icon;

return (
  <>
    {/* Notificación Toast */}
    {notificacion && (
      <div className={`fixed top-4 right-4 z-[70] px-6 py-3 rounded-lg shadow-2xl animate-bounce ${
        notificacion.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white font-semibold`}>
        {notificacion.mensaje}
      </div>
    )}
    
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* HEADER FULLSCREEN */}
      <div className="bg-gray-900/95 backdrop-blur border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{backgroundColor: statusInfo.color}}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-white">
            <div className="font-bold text-yellow-300">{casoSeleccionado.serial}</div>
            <div className="text-xs text-gray-400">{casoSeleccionado.nombre} • {casoSeleccionado.empresa}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* CONTROLES DE EDICIÓN - SUTILES */}
          <button
            onClick={() => rotarPagina(currentPage, 90, false)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs flex items-center gap-1 transition-colors"
            title="Rotar página actual 90°"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => mejorarCalidadHD(currentPage)}
            disabled={enviandoValidacion}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
            title="Mejorar calidad HD con IA"
          >
            ✨
          </button>

          {/* BOTÓN ELIMINAR */}
          <button
            onClick={handleEliminarCaso}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            title="Eliminar caso permanentemente"
          >
            <X className="w-4 h-4" />
            🗑️
          </button>
{/* BOTONES BLOQUEO/DESBLOQUEO (solo para INCOMPLETAS) */}
          {['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'].includes(casoSeleccionado.estado) && (
            <>
              {casoSeleccionado.bloquea_nueva ? (
                <button
                  onClick={() => handleToggleBloqueo('desbloquear')}
                  disabled={enviandoValidacion}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  title="Permitir que el empleado suba nuevas incapacidades"
                >
                  <span className="text-xl">🔓</span>
                  Desbloquear
                </button>
              ) : (
                <button
                  onClick={() => handleToggleBloqueo('bloquear')}
                  disabled={enviandoValidacion}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  title="Forzar que complete esta incapacidad primero"
                >
                  <span className="text-xl">🔒</span>
                  Bloquear
                </button>
              )}
            </>
          )}
          {/* BOTÓN DESHACER */}
          {ultimaAccion && (
            <button
              onClick={handleDeshacer}
              disabled={enviandoValidacion}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Undo2 className="w-4 h-4" />
              Deshacer
            </button>
          )}

          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 text-white">
            <ZoomOut className="w-4 h-4" />
            <span className="text-sm min-w-[50px] text-center">{zoom}%</span>
            <ZoomIn className="w-4 h-4" />
          </div>

          <a 
  href={casoSeleccionado.drive_link || 'https://drive.google.com'} 
  target="_blank" 
  rel="noopener noreferrer"
            className="p-2 hover:bg-gray-800 rounded transition-colors text-white" title="Abrir en Google Drive">
            <FolderOpen className="w-5 h-5" />
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
                    '• labor → Accidente Laboral\n\n' +
                    'Escribe el tipo exacto:'
                  );
                  
                  if (!nuevoTipo) return;
                  
                  const tiposValidos = ['maternity', 'paternity', 'general', 'traffic', 'labor'];
                  if (!tiposValidos.includes(nuevoTipo.toLowerCase())) {
                    alert('❌ Tipo inválido. Usa: maternity, paternity, general, traffic o labor');
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
                      `${API_BASE_URL}/validador/casos/${casoActualizado.serial}/cambiar-tipo`,
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
```

---

## **📍 UBICACIÓN VISUAL:**

El botón debe aparecer aquí:
```
┌─────────────────────────────────────────────┐
│ 🔄 REENVÍO DETECTADO - Comparar Versiones  │
├─────────────────────────────────────────────┤
│                                             │
│  [📄 Ver Nueva Versión]  [🔄 Cambiar...]  │ ← AQUÍ
│                                             │
└─────────────────────────────────────────────┘            
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
                    '• labor → Accidente Laboral\n\n' +
                    'Escribe el tipo exacto:'
                  );
                  
                  if (!nuevoTipo) return;
                  
                  const tiposValidos = ['maternity', 'paternity', 'general', 'traffic', 'labor'];
                  if (!tiposValidos.includes(nuevoTipo.toLowerCase())) {
                    alert('❌ Tipo inválido. Usa: maternity, paternity, general, traffic o labor');
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
                      `${API_BASE_URL}/validador/casos/${casoActualizado.serial}/cambiar-tipo`,
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
      onClick={() => setCurrentPage(idx)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  currentPage === idx ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
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
          className="flex-1 bg-gradient-to-b from-gray-900 to-black overflow-y-auto p-8"
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
          `${API_BASE_URL}/validador/casos/${casoSeleccionado.serial}/aprobar-reenvio`,
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
    </div>
  </>
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