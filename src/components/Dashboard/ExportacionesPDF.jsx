import React, { useState } from 'react';
import { Download, Search, Package, FileText, AlertCircle, Loader2, X, FolderOpen, ExternalLink, Calendar } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';
import JSZip from 'jszip';

// ═══════════════════════════════════════════════════════════
// EXPORTACIONES MASIVAS DE PDFs EN ZIP — CON LOTES + HISTÓRICO
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

const MODOS_EXPORTACION = [
  { value: 'filtros', label: '📦 Exportar por Filtros', desc: 'Descarga PDFs de un rango de fechas. Si pasa de 500, se descarga en lotes automáticos y se unen en un solo ZIP.' },
  { value: 'historico', label: '📁 Histórico Anual', desc: 'Accede a la carpeta de Google Drive con todas las incapacidades de un año. Descarga directo desde Drive.' },
];

const FILTROS_FECHA = [
  { value: 'subida', label: '📤 Fecha de Subida', desc: 'Filtra por la fecha en que se subió al portal' },
  { value: 'incapacidad', label: '🏥 Fecha de Incapacidad', desc: 'Filtra por la fecha de inicio médica' },
];

export default function ExportacionesPDF({ empresas = [] }) {
  // Modo
  const [modo, setModo] = useState('filtros');
  
  // Filtros normales
  const [filtroFecha, setFiltroFecha] = useState('subida');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [empresa, setEmpresa] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [cedulas, setCedulas] = useState('');
  
  // Histórico
  const [yearHistorico, setYearHistorico] = useState(new Date().getFullYear());
  const [empresaHistorico, setEmpresaHistorico] = useState('all');
  
  // Estado
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [progreso, setProgreso] = useState('');
  const [historicoData, setHistoricoData] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const buildBody = () => ({
    filtro_fecha: filtroFecha,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
    empresa,
    tipo,
    cedulas: cedulas.trim(),
  });

  // ═══ PREVIEW ═══
  const handlePreview = async () => {
    if (!fechaDesde || !fechaHasta) {
      setError('Debes seleccionar un rango de fechas (Desde y Hasta)');
      return;
    }
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': API_CONFIG.ADMIN_TOKEN,
        },
        body: JSON.stringify(buildBody()),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  // ═══ DESCARGA POR LOTES CON MERGE ═══
  const handleDescargar = async () => {
    if (!fechaDesde || !fechaHasta) {
      setError('Debes seleccionar un rango de fechas');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const totalLotes = preview?.total_lotes || 1;
    
    try {
      if (totalLotes === 1) {
        // ═══ UN SOLO LOTE: descarga directa ═══
        setProgreso('Descargando PDFs, esto puede tomar unos minutos...');
        const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': API_CONFIG.ADMIN_TOKEN,
          },
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
        // ═══ MÚLTIPLES LOTES: descargar cada uno y unir con JSZip ═══
        const finalZip = new JSZip();
        let totalDescargados = 0;
        let totalErrores = 0;
        
        for (let lote = 1; lote <= totalLotes; lote++) {
          setProgreso(`📦 Descargando lote ${lote} de ${totalLotes}... (${Math.round((lote - 1) / totalLotes * 100)}%)`);
          
          const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Token': API_CONFIG.ADMIN_TOKEN,
            },
            body: JSON.stringify({ ...buildBody(), lote }),
          });
          
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(`Error en lote ${lote}: ${err.detail || resp.status}`);
          }
          
          totalDescargados += parseInt(resp.headers.get('X-Descargados') || '0', 10);
          totalErrores += parseInt(resp.headers.get('X-Errores') || '0', 10);
          
          // Leer el ZIP del lote y extraer archivos al ZIP final
          setProgreso(`📦 Procesando lote ${lote} de ${totalLotes}...`);
          const loteBlob = await resp.blob();
          const loteZip = await JSZip.loadAsync(loteBlob);
          
          // Copiar cada archivo del lote al ZIP final
          const fileNames = Object.keys(loteZip.files);
          for (const fname of fileNames) {
            const file = loteZip.files[fname];
            if (!file.dir) {
              const content = await file.async('uint8array');
              finalZip.file(fname, content);
            }
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
  
  // ═══ HISTÓRICO: obtener links de Drive ═══
  const handleHistorico = async () => {
    setLoadingHistorico(true);
    setError(null);
    setHistoricoData(null);
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/historico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': API_CONFIG.ADMIN_TOKEN,
        },
        body: JSON.stringify({ year: yearHistorico, empresa: empresaHistorico }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setHistoricoData(data);
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

  // Generar años disponibles (2024 al actual)
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2024; y--) years.push(y);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700 rounded-xl p-5">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-400" /> Exportación Masiva de PDFs
        </h2>
        <p className="text-gray-400 text-xs mt-1">
          Descarga PDFs de incapacidades en ZIP o accede directamente a las carpetas de Google Drive.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODOS_EXPORTACION.map(m => (
          <button
            key={m.value}
            onClick={() => { setModo(m.value); setPreview(null); setHistoricoData(null); setError(null); setProgreso(''); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              modo === m.value
                ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500/50'
                : 'border-gray-700 bg-gray-800/60 hover:bg-gray-700/50'
            }`}
          >
            <div className="text-sm font-bold text-white">{m.label}</div>
            <div className="text-[10px] text-gray-400 mt-1">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* ═══════ MODO FILTROS ═══════ */}
      {modo === 'filtros' && (
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" /> Filtros de Exportación
          </h3>

          {/* Tipo de filtro de fecha */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 block">
              Filtro por Fecha
            </label>
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

          {/* Rango de fechas - OBLIGATORIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Desde *</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Hasta *</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Empresa y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Empresa</label>
              <select
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Todas las empresas</option>
                {empresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Tipo de Incapacidad</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500"
              >
                {TIPOS_INCAPACIDAD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cédulas específicas */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">
              Cédulas Específicas (opcional)
            </label>
            <textarea
              value={cedulas}
              onChange={e => setCedulas(e.target.value)}
              placeholder="Separa las cédulas con comas. Ej: 1085043374, 39017565&#10;Deja vacío para incluir todos los empleados."
              rows={2}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono"
            />
            {cedulas.trim() && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-indigo-400 font-bold">
                  {cedulas.split(',').filter(c => c.trim()).length} cédulas ingresadas
                </span>
                <button onClick={() => setCedulas('')} className="text-gray-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
            <button
              onClick={handlePreview}
              disabled={previewing || loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Vista Previa
            </button>
            <button
              onClick={handleDescargar}
              disabled={loading || previewing || !preview || preview.con_pdf === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? 'Descargando...' : 'Descargar ZIP'}
            </button>

            {progreso && !error && (
              <span className="text-xs text-green-400 font-bold">{progreso}</span>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODO HISTÓRICO ═══════ */}
      {modo === 'historico' && (
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" /> Histórico Anual — Google Drive
          </h3>
          <p className="text-[10px] text-gray-400">
            Accede directamente a las carpetas de Google Drive donde se almacenan todos los PDFs del año.
            Desde Drive puedes seleccionar todo y descargar (Drive genera el ZIP automáticamente).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Año</label>
              <select
                value={yearHistorico}
                onChange={e => setYearHistorico(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-amber-500"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Empresa</label>
              <select
                value={empresaHistorico}
                onChange={e => setEmpresaHistorico(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">Todas las empresas</option>
                {empresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleHistorico}
            disabled={loadingHistorico}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingHistorico ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            {loadingHistorico ? 'Buscando carpetas...' : 'Buscar Carpetas en Drive'}
          </button>

          {/* Resultados histórico */}
          {historicoData && (
            <div className="space-y-3 mt-2">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
              </div>

              {/* Lista de carpetas */}
              <div className="space-y-2">
                {historicoData.carpetas.map((c, i) => (
                  <div key={i} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-amber-500/50 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-white">{c.empresa}</div>
                      <div className="text-[10px] text-gray-400">
                        {c.year} — {c.items} elementos en carpeta
                      </div>
                    </div>
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir en Drive
                    </a>
                  </div>
                ))}
              </div>

              {/* Instrucciones */}
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
                <p className="text-amber-400 text-xs font-bold mb-1">📋 Cómo descargar desde Drive:</p>
                <ol className="text-[10px] text-amber-300/80 space-y-0.5 list-decimal pl-4">
                  <li>Haz clic en "Abrir en Drive" para la empresa deseada</li>
                  <li>Selecciona todos los archivos (Ctrl+A)</li>
                  <li>Click derecho → Descargar</li>
                  <li>Google Drive generará un ZIP automáticamente</li>
                </ol>
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
            <p className="text-red-400 font-bold text-sm">Error en exportación</p>
            <p className="text-red-300 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Preview (solo modo filtros) */}
      {preview && modo === 'filtros' && (
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Vista Previa de Exportación
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* KPIs */}
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
                <div className="text-[10px] text-gray-400 uppercase">Se Descargarán</div>
              </div>
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-black text-purple-400">{preview.total_lotes}</div>
                <div className="text-[10px] text-gray-400 uppercase">{preview.total_lotes === 1 ? 'Lote' : 'Lotes'}</div>
              </div>
            </div>

            {preview.total_lotes > 1 && (
              <div className="bg-indigo-900/30 border border-indigo-600/50 rounded-lg p-3 text-indigo-300 text-xs">
                📦 Se necesitan <span className="font-black text-indigo-200">{preview.total_lotes} lotes</span> de {preview.lote_size} PDFs.
                La descarga se hará automáticamente lote por lote y se unirán en un solo archivo ZIP.
                <span className="text-indigo-400 font-bold"> No cierres la pestaña durante el proceso.</span>
              </div>
            )}

            {/* Muestra */}
            {preview.muestra && preview.muestra.length > 0 && (
              <div>
                <h4 className="text-xs text-gray-400 font-semibold mb-2">Muestra (primeros 10):</h4>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-900/80 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400">Cédula</th>
                        <th className="px-3 py-2 text-left text-gray-400">Nombre</th>
                        <th className="px-3 py-2 text-left text-gray-400">Empresa</th>
                        <th className="px-3 py-2 text-left text-gray-400">Tipo</th>
                        <th className="px-3 py-2 text-left text-gray-400">F. Incapacidad</th>
                        <th className="px-3 py-2 text-left text-gray-400">F. Subida</th>
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

            {/* Botón descargar desde preview */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleDescargar}
                disabled={loading || preview.con_pdf === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar {preview.se_descargarian} PDFs 
                {preview.total_lotes > 1 ? ` (${preview.total_lotes} lotes)` : ''} como ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="text-xs font-bold text-gray-300 mb-2">ℹ️ Información</h4>
        <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-4">
          <li><span className="text-gray-400 font-bold">Exportar por Filtros:</span> Descarga PDFs de un rango de fechas. Si hay más de 500, se descargan en lotes automáticos y se unen en un solo ZIP.</li>
          <li><span className="text-gray-400 font-bold">Histórico Anual:</span> Abre directamente Google Drive con todas las incapacidades del año seleccionado. Ideal para volúmenes grandes.</li>
          <li>El ZIP organiza los archivos en carpetas por empresa.</li>
          <li>Nombre de cada archivo: <span className="font-mono text-gray-400">cédula_nombre_fecha.pdf</span></li>
          <li>Para cédulas específicas, sepáralas con coma: <span className="font-mono text-gray-400">1085043374, 39017565</span></li>
          <li>Usa "Vista Previa" antes de descargar para verificar cuántos lotes se necesitan.</li>
        </ul>
      </div>
    </div>
  );
}
