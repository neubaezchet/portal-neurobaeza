import React, { useState } from 'react';
import { Download, Search, Package, FileText, AlertCircle, Loader2, X, FolderOpen, ExternalLink, Calendar, Clock } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';
import JSZip from 'jszip';

// ═══════════════════════════════════════════════════════════
// EXPORTACIÓN MASIVA DE PDFs — SISTEMA INTELIGENTE
// ≤31 días sin cédulas → ZIP directo por lotes
// >31 días o cédulas → Carpeta temporal en Drive (24h)
// >365 días → Error (máximo 1 año)
// ═══════════════════════════════════════════════════════════

const TIPOS_INCAPACIDAD = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'enfermedad_general', label: 'Enfermedad General' },
  { value: 'enfermedad_laboral', label: 'Enfermedad Laboral' },
  { value: 'accidente_transito', label: 'Accidente de Tránsito' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'prelicencia', label: 'Prelicencia' },
  { value: 'certificado', label: 'Certificado' },
];

const FILTROS_FECHA = [
  { value: 'subida', label: '📤 Fecha de Subida', desc: 'Filtra por la fecha en que se subió al portal' },
  { value: 'incapacidad', label: '🏥 Fecha de Incapacidad', desc: 'Filtra por la fecha de inicio médica' },
];

const daysBetween = (d1, d2) => {
  if (!d1 || !d2) return 0;
  return Math.ceil(Math.abs(new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
};

export default function ExportacionesPDF({ empresas = [] }) {
  // Tab: exportar (principal) o historico (navegar Drive)
  const [tab, setTab] = useState('exportar');

  // ═══ Filtros de exportación ═══
  const [filtroFecha, setFiltroFecha] = useState('subida');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [empresa, setEmpresa] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [cedulas, setCedulas] = useState('');

  // ═══ Histórico (navegar Drive) ═══
  const [fechaDesdeHist, setFechaDesdeHist] = useState('');
  const [fechaHastaHist, setFechaHastaHist] = useState('');
  const [empresaHistorico, setEmpresaHistorico] = useState('all');

  // ═══ Estado ═══
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [progreso, setProgreso] = useState('');
  const [driveResult, setDriveResult] = useState(null);
  const [historicoData, setHistoricoData] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const MAX_DAYS = 365;
  const ZIP_MAX_DAYS = 31;

  const buildBody = () => ({
    filtro_fecha: filtroFecha,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    empresa,
    tipo,
    cedulas: cedulas.trim(),
  });

  // Cálculos derivados
  const rangoActual = (fechaDesde && fechaHasta) ? daysBetween(fechaDesde, fechaHasta) : 0;
  const tieneCedulas = cedulas.trim().length > 0;
  const rangoExcedido = rangoActual > MAX_DAYS;
  const fechasInvalidas = fechaDesde && fechaHasta && new Date(fechaHasta) < new Date(fechaDesde);

  // El sistema decide automáticamente el modo
  const modoAuto = tieneCedulas || rangoActual > ZIP_MAX_DAYS ? 'drive' : 'zip';

  // Validación
  const validarFiltros = () => {
    if (!fechaDesde || !fechaHasta) {
      setError('Debes seleccionar un rango de fechas (Desde y Hasta)');
      return false;
    }
    if (fechasInvalidas) {
      setError('La fecha "Hasta" debe ser posterior a "Desde"');
      return false;
    }
    if (rangoExcedido) {
      setError(`El rango máximo es 1 año (365 días). Seleccionaste ${rangoActual} días.`);
      return false;
    }
    return true;
  };

  // ═══ PREVIEW ═══
  const handlePreview = async () => {
    if (!validarFiltros()) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setDriveResult(null);
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
        body: JSON.stringify(buildBody()),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${resp.status}`);
      }
      setPreview(await resp.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  // ═══ DESCARGA ZIP (≤31 días, sin cédulas) ═══
  const handleDescargarZip = async () => {
    if (!validarFiltros()) return;
    setLoading(true);
    setError(null);

    const totalLotes = preview?.total_lotes || 1;

    try {
      if (totalLotes === 1) {
        setProgreso('Descargando PDFs...');
        const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
          body: JSON.stringify({ ...buildBody(), lote: 1 }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.detail || `Error ${resp.status}`);
        }
        const descargados = resp.headers.get('X-Descargados') || '?';
        setProgreso(`✅ ${descargados} PDFs descargados`);
        const blob = await resp.blob();
        triggerDownload(blob, `incapacidades_${fechaDesde}_${fechaHasta}.zip`);
      } else {
        const finalZip = new JSZip();
        let totalDescargados = 0;
        let totalErrores = 0;

        for (let lote = 1; lote <= totalLotes; lote++) {
          setProgreso(`📦 Descargando lote ${lote} de ${totalLotes}... (${Math.round((lote - 1) / totalLotes * 100)}%)`);
          const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
            body: JSON.stringify({ ...buildBody(), lote }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(`Error en lote ${lote}: ${err.detail || resp.status}`);
          }
          totalDescargados += parseInt(resp.headers.get('X-Descargados') || '0', 10);
          totalErrores += parseInt(resp.headers.get('X-Errores') || '0', 10);

          setProgreso(`📦 Procesando lote ${lote} de ${totalLotes}...`);
          const loteBlob = await resp.blob();
          const loteZip = await JSZip.loadAsync(loteBlob);
          for (const fname of Object.keys(loteZip.files)) {
            const file = loteZip.files[fname];
            if (!file.dir) finalZip.file(fname, await file.async('uint8array'));
          }
        }

        setProgreso(`📦 Generando ZIP final con ${totalDescargados} PDFs...`);
        const finalBlob = await finalZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        triggerDownload(finalBlob, `incapacidades_${fechaDesde}_${fechaHasta}_${totalDescargados}pdfs.zip`);
        setProgreso(`✅ ${totalDescargados} PDFs descargados en ${totalLotes} lotes` + (totalErrores > 0 ? ` (${totalErrores} errores)` : ''));
      }
    } catch (err) {
      setError(err.message);
      setProgreso('');
    } finally {
      setLoading(false);
    }
  };

  // ═══ CREAR CARPETA DRIVE TEMPORAL (>31 días o cédulas) ═══
  const handleCrearDrive = async () => {
    if (!validarFiltros()) return;
    setLoading(true);
    setError(null);
    setDriveResult(null);
    setProgreso('📁 Creando carpeta temporal en Drive y copiando PDFs... Esto puede tardar varios minutos.');

    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
        body: JSON.stringify(buildBody()),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setDriveResult(data);
      setProgreso(`✅ ${data.total_copiados} PDFs copiados a carpeta temporal`);
    } catch (err) {
      setError(err.message);
      setProgreso('');
    } finally {
      setLoading(false);
    }
  };

  // ═══ HISTÓRICO: navegar carpetas existentes por rango de fechas ═══
  const handleHistorico = async () => {
    if (!fechaDesdeHist || !fechaHastaHist) {
      setError('Debes seleccionar un rango de fechas para navegar Drive');
      return;
    }
    if (new Date(fechaHastaHist) < new Date(fechaDesdeHist)) {
      setError('La fecha "Hasta" debe ser posterior a "Desde"');
      return;
    }
    const diasHist = daysBetween(fechaDesdeHist, fechaHastaHist);
    if (diasHist > MAX_DAYS) {
      setError(`El rango máximo es 1 año (365 días). Seleccionaste ${diasHist} días.`);
      return;
    }

    setLoadingHistorico(true);
    setError(null);
    setHistoricoData(null);

    try {
      // Derive unique year/month combinations from the date range
      const start = new Date(fechaDesdeHist);
      const end = new Date(fechaHastaHist);
      const yearMonths = new Set();
      const d = new Date(start);
      while (d <= end) {
        yearMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
        d.setMonth(d.getMonth() + 1);
        d.setDate(1); // Move to first day of next month
      }
      // Also include the end month
      yearMonths.add(`${end.getFullYear()}-${end.getMonth() + 1}`);

      let allCarpetas = [];
      let totalItems = 0;
      let totalCasosBd = 0;
      let conPdfBd = 0;

      for (const ym of yearMonths) {
        const [yr, mo] = ym.split('-').map(Number);
        try {
          const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
            body: JSON.stringify({ year: yr, month: mo, empresa: empresaHistorico }),
          });
          if (resp.ok) {
            const data = await resp.json();
            allCarpetas = allCarpetas.concat(data.carpetas || []);
            totalItems += data.total_items_drive || 0;
            totalCasosBd += data.total_casos_bd || 0;
            conPdfBd += data.con_pdf_bd || 0;
          }
        } catch (e) {
          // Skip months that don't exist in Drive
        }
      }

      if (allCarpetas.length === 0) {
        setError(`No se encontraron carpetas en Drive para ${fechaDesdeHist} — ${fechaHastaHist}`);
        setLoadingHistorico(false);
        return;
      }

      setHistoricoData({
        carpetas: allCarpetas,
        total_carpetas: allCarpetas.length,
        total_items_drive: totalItems,
        total_casos_bd: totalCasosBd,
        con_pdf_bd: conPdfBd,
        rango: `${fechaDesdeHist} — ${fechaHastaHist}`,
        empresa: empresaHistorico,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Etiqueta del modo auto
  const modoLabel = modoAuto === 'zip'
    ? '📦 Descarga directa ZIP (≤31 días)'
    : '📁 Carpeta temporal en Drive (se elimina en 24h)';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700 rounded-xl p-5">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-400" /> Exportación Masiva de PDFs
        </h2>
        <p className="text-gray-400 text-xs mt-1">
          El sistema elige automáticamente: ZIP directo (≤1 mes) o carpeta Drive temporal (más de 1 mes o cédulas). Máximo 1 año.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTab('exportar'); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'exportar' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📦 Exportar PDFs
        </button>
        <button
          onClick={() => { setTab('historico'); setError(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'historico' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📁 Navegar Drive
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: EXPORTAR PDFs (interfaz unificada)           */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'exportar' && (
        <>
          <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" /> Filtros de Exportación
            </h3>

            {/* Tipo de filtro fecha */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 block">Filtro por Fecha</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {FILTROS_FECHA.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFiltroFecha(f.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      filtroFecha === f.value
                        ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500/50'
                        : 'border-gray-700 bg-gray-900/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{f.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de fechas */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Desde *</label>
                  <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPreview(null); setDriveResult(null); }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Hasta *</label>
                  <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPreview(null); setDriveResult(null); }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Indicador de rango + modo automático */}
              {fechaDesde && fechaHasta && !fechasInvalidas && (
                <div className="mt-2 space-y-1">
                  <div className={`text-[10px] font-bold flex items-center gap-1 ${rangoExcedido ? 'text-red-400' : 'text-gray-500'}`}>
                    <Calendar className="w-3 h-3" />
                    {rangoActual} días seleccionados
                    {rangoExcedido && <span className="text-red-400 ml-1">— ⚠️ Máximo permitido: {MAX_DAYS} días (1 año)</span>}
                  </div>
                  {!rangoExcedido && (
                    <div className={`text-[10px] font-bold flex items-center gap-1 ${modoAuto === 'zip' ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {modoAuto === 'zip' ? '📦' : '📁'} Modo: {modoLabel}
                    </div>
                  )}
                </div>
              )}
              {fechasInvalidas && (
                <div className="mt-2 text-[10px] text-red-400 font-bold">⚠️ La fecha "Hasta" debe ser posterior a "Desde"</div>
              )}
            </div>

            {/* Empresa y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Empresa</label>
                <select value={empresa} onChange={e => setEmpresa(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500">
                  <option value="all">Todas las empresas</option>
                  {empresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Tipo de Incapacidad</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500">
                  {TIPOS_INCAPACIDAD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Cédulas */}
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">
                Cédulas Específicas (opcional — activa modo Drive)
              </label>
              <textarea
                value={cedulas}
                onChange={e => { setCedulas(e.target.value); setPreview(null); setDriveResult(null); }}
                placeholder="Separa con comas: 1085043374, 39017565&#10;Si pones cédulas, se creará carpeta temporal en Drive."
                rows={2}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
              />
              {tieneCedulas && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-amber-400 font-bold">
                    📁 {cedulas.split(',').filter(c => c.trim()).length} cédulas → se usará carpeta Drive temporal
                  </span>
                  <button onClick={() => setCedulas('')} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
              <button
                onClick={handlePreview}
                disabled={previewing || loading || rangoExcedido || fechasInvalidas}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Vista Previa
              </button>

              {/* Botón de acción: ZIP o Drive según modo */}
              {preview && preview.con_pdf > 0 && modoAuto === 'zip' && (
                <button
                  onClick={handleDescargarZip}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {loading ? 'Descargando...' : `Descargar ${preview.se_descargarian} PDFs como ZIP`}
                </button>
              )}
              {preview && preview.con_pdf > 0 && modoAuto === 'drive' && (
                <button
                  onClick={handleCrearDrive}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                  {loading ? 'Creando carpeta...' : `Crear Carpeta Drive (${preview.con_pdf} PDFs)`}
                </button>
              )}

              {progreso && !error && (
                <span className="text-xs text-green-400 font-bold">{progreso}</span>
              )}
            </div>
          </div>

          {/* ═══ RESULTADO CARPETA DRIVE ═══ */}
          {driveResult && (
            <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" /> Carpeta Temporal Creada
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-green-400">{driveResult.total_copiados}</div>
                  <div className="text-[10px] text-gray-400 uppercase">PDFs Copiados</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-white">{driveResult.total_con_pdf}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Total con PDF</div>
                </div>
                {driveResult.total_errores > 0 && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-red-400">{driveResult.total_errores}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Errores</div>
                  </div>
                )}
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1"><Clock className="w-4 h-4" /> 24h</div>
                  <div className="text-[10px] text-gray-400 uppercase">Se elimina en</div>
                </div>
              </div>

              <a
                href={driveResult.folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Carpeta en Google Drive
              </a>

              <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                <p className="text-amber-400 text-xs font-bold mb-1">📋 Cómo descargar:</p>
                <ol className="text-[10px] text-amber-300/80 space-y-0.5 list-decimal pl-4">
                  <li>Haz clic en "Abrir Carpeta en Google Drive"</li>
                  <li>Selecciona todos los archivos (Ctrl+A)</li>
                  <li>Click derecho → Descargar</li>
                  <li>Google Drive generará un ZIP automáticamente</li>
                </ol>
                <p className="text-[10px] text-red-400 font-bold mt-2">⚠️ La carpeta se eliminará automáticamente en 24 horas. Los archivos originales no se tocan.</p>
              </div>
            </div>
          )}

          {/* ═══ PREVIEW (muestra datos + indicador modo) ═══ */}
          {preview && !driveResult && (
            <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> Vista Previa
                </h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  modoAuto === 'zip' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {modoAuto === 'zip' ? '📦 ZIP directo' : '📁 Carpeta Drive (24h)'}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-white">{preview.total_casos}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Total Casos</div>
                  </div>
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-green-400">{preview.con_pdf}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Con PDF</div>
                  </div>
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-red-400">{preview.sin_pdf}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Sin PDF</div>
                  </div>
                  <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-indigo-400">{preview.se_descargarian}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Se Exportarán</div>
                  </div>
                  <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-purple-400">{preview.dias_rango || rangoActual}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Días</div>
                  </div>
                </div>

                {/* Info modo ZIP */}
                {modoAuto === 'zip' && preview.total_lotes > 1 && (
                  <div className="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3 text-indigo-300 text-xs">
                    📦 Se necesitan <span className="font-black text-indigo-200">{preview.total_lotes} lotes</span> de {preview.lote_size} PDFs.
                    Se descargan automáticamente y se unen en un ZIP.
                    <span className="text-indigo-400 font-bold"> No cierres la pestaña.</span>
                  </div>
                )}

                {/* Info modo Drive */}
                {modoAuto === 'drive' && (
                  <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 text-amber-300 text-xs">
                    📁 Se creará una <span className="font-black text-amber-200">carpeta temporal en Google Drive</span> con copias de los {preview.con_pdf} PDFs.
                    Podrás descargarlos desde Drive. <span className="text-amber-400 font-bold">La carpeta se elimina en 24 horas.</span>
                    {tieneCedulas && <span className="block mt-1 text-amber-400">🔍 Búsqueda por cédulas → modo Drive automático.</span>}
                  </div>
                )}

                {/* Muestra */}
                {preview.muestra?.length > 0 && (
                  <div>
                    <h4 className="text-xs text-gray-400 font-semibold mb-2">Muestra (primeros 10):</h4>
                    <div className="overflow-auto max-h-52">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-900/80 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-400">Cédula</th>
                            <th className="px-3 py-2 text-left text-gray-400">Nombre</th>
                            <th className="px-3 py-2 text-left text-gray-400">Empresa</th>
                            <th className="px-3 py-2 text-left text-gray-400">Tipo</th>
                            <th className="px-3 py-2 text-left text-gray-400">F. Incap.</th>
                            <th className="px-3 py-2 text-left text-gray-400">Subida</th>
                            <th className="px-3 py-2 text-left text-gray-400">PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {preview.muestra.map((c, i) => (
                            <tr key={i} className="hover:bg-gray-700/30">
                              <td className="px-3 py-2 font-mono text-blue-300">{c.cedula}</td>
                              <td className="px-3 py-2 text-gray-300">{c.nombre}</td>
                              <td className="px-3 py-2 text-gray-400">{c.empresa}</td>
                              <td className="px-3 py-2 text-gray-400">{(c.tipo || '').replace(/_/g, ' ')}</td>
                              <td className="px-3 py-2 text-gray-400">{c.fecha_inicio || '—'}</td>
                              <td className="px-3 py-2 text-gray-400">{c.created_at || '—'}</td>
                              <td className="px-3 py-2">{c.tiene_pdf ? <span className="text-green-400">✅</span> : <span className="text-red-400">❌</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: NAVEGAR DRIVE (histórico por año/mes)        */}
      {/* ═══════════════════════════════════════════════════ */}
      {tab === 'historico' && (
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" /> Navegar Carpetas de Google Drive
          </h3>
          <p className="text-[10px] text-gray-400">
            Selecciona un rango de fechas (máximo 1 año) para ver las carpetas permanentes en Google Drive organizadas por empresa y quincena.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Desde *</label>
              <input type="date" value={fechaDesdeHist} onChange={e => { setFechaDesdeHist(e.target.value); setHistoricoData(null); }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Hasta *</label>
              <input type="date" value={fechaHastaHist} onChange={e => { setFechaHastaHist(e.target.value); setHistoricoData(null); }}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Empresa</label>
              <select value={empresaHistorico} onChange={e => setEmpresaHistorico(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-amber-500">
                <option value="all">Todas las empresas</option>
                {empresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {/* Indicador de rango */}
          {fechaDesdeHist && fechaHastaHist && (() => {
            const dHist = daysBetween(fechaDesdeHist, fechaHastaHist);
            const excedido = dHist > MAX_DAYS;
            return (
              <div className={`text-[10px] font-bold flex items-center gap-1 ${excedido ? 'text-red-400' : 'text-gray-500'}`}>
                <Calendar className="w-3 h-3" /> {dHist} días seleccionados
                {excedido && <span className="text-red-400 ml-1">— ⚠️ Máximo permitido: {MAX_DAYS} días (1 año)</span>}
              </div>
            );
          })()}

          <button
            onClick={handleHistorico}
            disabled={loadingHistorico || !fechaDesdeHist || !fechaHastaHist}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loadingHistorico ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            {loadingHistorico ? 'Buscando...' : 'Buscar Carpetas'}
          </button>

          {historicoData && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-white">{historicoData.total_casos_bd}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Casos en BD</div>
                </div>
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-green-400">{historicoData.con_pdf_bd}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Con PDF</div>
                </div>
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-amber-400">{historicoData.total_carpetas}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Carpetas</div>
                </div>
                <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-black text-purple-400">{historicoData.total_items_drive}</div>
                  <div className="text-[10px] text-gray-400 uppercase">Items Drive</div>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 font-bold">
                📅 {historicoData.rango || ''}
                {historicoData.empresa !== 'all' && ` — ${historicoData.empresa}`}
              </div>

              <div className="space-y-2">
                {historicoData.carpetas.map((c, i) => (
                  <div key={i} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-amber-500/50 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-white">{c.label || c.empresa}</div>
                      <div className="text-[10px] text-gray-400">{c.items} elementos</div>
                    </div>
                    <a href={c.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir en Drive
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-bold text-sm">Error</p>
            <p className="text-red-300 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="text-xs font-bold text-gray-300 mb-2">ℹ️ ¿Cómo funciona?</h4>
        <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-4">
          <li><span className="text-indigo-400 font-bold">≤ 1 mes (31 días)</span> sin cédulas → <span className="text-white font-bold">ZIP directo</span>. Se descarga en lotes de 500 y se une en un solo archivo.</li>
          <li><span className="text-amber-400 font-bold">&gt; 1 mes</span> o <span className="text-amber-400 font-bold">cédulas específicas</span> → <span className="text-white font-bold">Carpeta temporal en Drive</span>. Se crean copias de los PDFs. La carpeta se elimina automáticamente en 24 horas.</li>
          <li><span className="text-red-400 font-bold">&gt; 1 año (365 días)</span> → No permitido. El máximo es 1 año.</li>
          <li><span className="text-gray-400 font-bold">Navegar Drive:</span> accede directamente a las carpetas permanentes organizadas por empresa/año/quincena.</li>
          <li>Los archivos originales <span className="text-green-400 font-bold">nunca se tocan</span>. Las exportaciones son copias.</li>
          <li>Nombre de archivo: <span className="font-mono text-gray-400">empresa_cédula_nombre_fecha.pdf</span></li>
        </ul>
      </div>
    </div>
  );
}
