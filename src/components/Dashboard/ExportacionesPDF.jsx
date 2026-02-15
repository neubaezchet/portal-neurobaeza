import React, { useState } from 'react';
import { Download, Search, Package, FileText, AlertCircle, Loader2, X } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════
// EXPORTACIONES MASIVAS DE PDFs EN ZIP
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
  { value: 'historico', label: '📁 Todo el Histórico', desc: 'Descarga todos los PDFs sin filtro de fecha' },
  { value: 'subida', label: '📤 Fecha de Subida', desc: 'Filtra por la fecha en que se subió la incapacidad al portal' },
  { value: 'incapacidad', label: '🏥 Fecha de Incapacidad', desc: 'Filtra por la fecha de inicio de la incapacidad médica' },
];

export default function ExportacionesPDF({ empresas = [] }) {
  const [filtroFecha, setFiltroFecha] = useState('historico');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [empresa, setEmpresa] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [cedulas, setCedulas] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [progreso, setProgreso] = useState('');

  const buildBody = () => ({
    filtro_fecha: filtroFecha,
    fecha_desde: filtroFecha !== 'historico' ? fechaDesde : undefined,
    fecha_hasta: filtroFecha !== 'historico' ? fechaHasta : undefined,
    empresa,
    tipo,
    cedulas: cedulas.trim(),
  });

  const handlePreview = async () => {
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

  const handleDescargar = async () => {
    setLoading(true);
    setError(null);
    setProgreso('Preparando descarga, esto puede tomar unos minutos...');
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/exportar/zip`, {
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
      const total = resp.headers.get('X-Total-Casos') || '?';
      const descargados = resp.headers.get('X-Descargados') || '?';
      setProgreso(`✅ ${descargados} de ${total} PDFs descargados`);
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incapacidades_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
      setProgreso('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700 rounded-xl p-5">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-400" /> Exportación Masiva de PDFs
        </h2>
        <p className="text-gray-400 text-xs mt-1">
          Descarga los PDFs de incapacidades desde Google Drive empaquetados en un archivo ZIP.
          Filtra por fecha, empresa, tipo o cédulas específicas.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" /> Filtros de Exportación
        </h3>

        {/* Tipo de filtro de fecha */}
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 block">
            Filtro por Fecha
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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

        {/* Rango de fechas (solo si no es histórico) */}
        {filtroFecha !== 'historico' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

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
            placeholder="Separa las cédulas con comas. Ej: 1085043374, 39017565, 10865544&#10;Deja vacío para incluir todos los empleados."
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
            disabled={loading || previewing}
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

      {/* Preview */}
      {preview && (
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Vista Previa de Exportación
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            </div>

            {preview.total_casos > 500 && (
              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 text-yellow-400 text-xs">
                ⚠️ Hay más de 500 casos. Se descargarán solo los primeros 500 para no sobrecargar el servidor.
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
                Descargar {preview.se_descargarian} PDFs como ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
        <h4 className="text-xs font-bold text-gray-300 mb-2">ℹ️ Información</h4>
        <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-4">
          <li>Los PDFs se descargan directamente desde Google Drive y se empaquetan en un ZIP.</li>
          <li>El ZIP organiza los archivos en carpetas por empresa.</li>
          <li>Nombre de cada archivo: <span className="font-mono text-gray-400">cédula_nombre_fecha.pdf</span></li>
          <li>Máximo 500 PDFs por descarga. Si necesitas más, usa filtros más específicos.</li>
          <li>Para cédulas específicas, sepáralas con coma: <span className="font-mono text-gray-400">1085043374, 39017565</span></li>
          <li>Usa "Vista Previa" antes de descargar para verificar cuántos casos se incluirán.</li>
        </ul>
      </div>
    </div>
  );
}
