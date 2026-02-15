import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  RefreshCw, Download, Search, TrendingUp,
  BarChart3, Pause, Play, ArrowUpDown, X
} from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';
import { AlertaBadge180, EmailConfig180 } from './EmailConfig180';

// ═══════════════════════════════════════════════════════════
// DASHBOARD DE REPORTES 2026 - Completo, Instantáneo, Exportable
// ═══════════════════════════════════════════════════════════

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: '📊' },
  { id: 'tabla', label: 'Tabla Principal', icon: '📋' },
  { id: 'incompletas', label: 'Observación', icon: '⚠️' },
  { id: 'frecuencia', label: 'Frecuencia', icon: '🔄' },
  { id: 'alertas180', label: 'Alertas 180d', icon: '⛔' },
  { id: 'indicadores', label: 'Indicadores', icon: '📈' },
];

const PERIODOS = [
  { value: 'mes_actual', label: 'Mes Actual' },
  { value: 'mes_anterior', label: 'Mes Anterior' },
  { value: 'quincena_1', label: 'Quincena 1 (1-15)' },
  { value: 'quincena_2', label: 'Quincena 2 (16-Fin)' },
  { value: 'año_actual', label: 'Año Actual' },
  { value: 'ultimos_90', label: 'Últimos 90 días' },
];

const ESTADO_COLORS = {
  NUEVO:              { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  EN_REVISION:        { bg: 'bg-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500' },
  INCOMPLETA:         { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  ILEGIBLE:           { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
  INCOMPLETA_ILEGIBLE:{ bg: 'bg-red-600/20', text: 'text-red-500', dot: 'bg-red-600' },
  EPS_TRANSCRIPCION:  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  DERIVADO_TTHH:      { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' },
  CAUSA_EXTRA:        { bg: 'bg-pink-500/20', text: 'text-pink-400', dot: 'bg-pink-500' },
  COMPLETA:           { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
  EN_RADICACION:      { bg: 'bg-teal-500/20', text: 'text-teal-400', dot: 'bg-teal-500' },
};

const ESTADO_LABELS = {
  NUEVO: 'Nuevo', EN_REVISION: 'En Revisión', INCOMPLETA: 'Incompleta',
  ILEGIBLE: 'Ilegible', INCOMPLETA_ILEGIBLE: 'Incompleta+Ilegible',
  EPS_TRANSCRIPCION: 'EPS Transcripción', DERIVADO_TTHH: 'Derivado TTHH',
  CAUSA_EXTRA: 'Causa Extra', COMPLETA: 'Completa', EN_RADICACION: 'En Radicación',
};

function EstadoBadge({ estado }) {
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS.NUEVO;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {ESTADO_LABELS[estado] || estado}
    </span>
  );
}

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// ═══════════════════════════════════════════════════════════
// EXCEL EXPORT (TSV con BOM para Excel — sin dependencias)
// ═══════════════════════════════════════════════════════════
function exportToExcel(data, columns, filename) {
  let csv = '\uFEFF';
  csv += columns.map(c => `"${c.label}"`).join('\t') + '\n';
  data.forEach(row => {
    csv += columns.map(c => {
      let val = c.accessor(row);
      if (val === null || val === undefined) val = '';
      if (Array.isArray(val)) val = val.join(', ');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join('\t') + '\n';
  });
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// SORTABLE TABLE COMPONENT
// ═══════════════════════════════════════════════════════════
function SortableTable({ data, columns, title, exportFilename, maxHeight = '500px' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor(row);
        if (!val) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, columns, search]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return filteredData;
    return [...filteredData].sort((a, b) => {
      let va = col.accessor(a);
      let vb = col.accessor(b);
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
            {sortedData.length} registros
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-500 w-48 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => exportToExcel(sortedData, columns, exportFilename || title)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-xs">
          <thead className="bg-gray-900/80 sticky top-0 z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-3 py-2.5 text-left font-semibold text-gray-400 cursor-pointer hover:text-white select-none whitespace-nowrap"
                  style={{ minWidth: col.width || 'auto' }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-blue-400' : 'text-gray-600'}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  Sin datos para mostrar
                </td>
              </tr>
            ) : sortedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {col.render ? col.render(row) : String(col.accessor(row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════
function KPICard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   'from-blue-600/20 to-blue-800/20 border-blue-500/30',
    green:  'from-green-600/20 to-green-800/20 border-green-500/30',
    red:    'from-red-600/20 to-red-800/20 border-red-500/30',
    yellow: 'from-yellow-600/20 to-yellow-800/20 border-yellow-500/30',
    purple: 'from-purple-600/20 to-purple-800/20 border-purple-500/30',
    orange: 'from-orange-600/20 to-orange-800/20 border-orange-500/30',
    cyan:   'from-cyan-600/20 to-cyan-800/20 border-cyan-500/30',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function ReportsDashboard({ empresas = [] }) {
  const [tab, setTab] = useState('resumen');
  const [empresa, setEmpresa] = useState('all');
  const [periodo, setPeriodo] = useState('mes_actual');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ empresa, periodo }).toString();
      const resp = await fetch(`${API_CONFIG.BASE_URL}/validador/casos/dashboard-completo?${params}`, {
        headers: { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const json = await resp.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [empresa, periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  // ═══ Column definitions ═══
  const COLS_PRINCIPAL = useMemo(() => [
    { key: 'serial', label: 'Serial', width: '100px', accessor: r => r.serial, render: r => <span className="font-mono text-yellow-400">{r.serial}</span> },
    { key: 'cedula', label: 'Cédula (Llave)', width: '110px', accessor: r => r.cedula, render: r => <span className="font-mono text-blue-300">{r.cedula}</span> },
    { key: 'nombre', label: 'Nombre', width: '160px', accessor: r => r.nombre },
    { key: 'empresa', label: 'Empresa', accessor: r => r.empresa },
    { key: 'cargo', label: 'Cargo', accessor: r => r.cargo },
    { key: 'area', label: 'Área', accessor: r => r.area },
    { key: 'centro_costo', label: 'Centro Costo', accessor: r => r.centro_costo },
    { key: 'ciudad', label: 'Ciudad', accessor: r => r.ciudad },
    { key: 'tipo_contrato', label: 'Contrato', accessor: r => r.tipo_contrato },
    { key: 'tipo', label: 'Tipo', accessor: r => r.tipo, render: r => <span className="text-gray-400">{(r.tipo || '').replace(/_/g, ' ')}</span> },
    { key: 'estado', label: 'Estado', accessor: r => r.estado, render: r => <EstadoBadge estado={r.estado} /> },
    { key: 'diagnostico', label: 'Diagnóstico', width: '200px', accessor: r => r.diagnostico, render: r => <span className="text-gray-400 max-w-[200px] truncate block" title={r.diagnostico}>{r.diagnostico || '—'}</span> },
    { key: 'codigo_cie10', label: 'CIE-10', accessor: r => r.codigo_cie10, render: r => {
      if (!r.codigo_cie10) return <span className="text-gray-500">—</span>;
      return <div className="flex flex-col"><span className="font-mono text-purple-300">{r.codigo_cie10}</span>{r.cie10_descripcion && <span className="text-[8px] text-gray-500 truncate max-w-[120px]" title={r.cie10_descripcion}>{r.cie10_descripcion}</span>}</div>;
    }},
    { key: 'dias_incapacidad', label: 'Días Portal', accessor: r => r.dias_incapacidad, render: r => {
      const v = r.dias_validacion;
      if (v && !v.valido) return <span className="font-bold text-yellow-400" title={v.mensaje || 'Días atípicos para este diagnóstico'}>{r.dias_incapacidad} ⚠</span>;
      return <span className="font-bold">{r.dias_incapacidad ?? '—'}</span>;
    }},
    { key: 'dias_kactus', label: 'Días Kactus', accessor: r => r.dias_kactus, render: r => <span className="font-bold text-cyan-400">{r.dias_kactus ?? '—'}</span> },
    { key: 'es_prorroga', label: 'Prórroga', accessor: r => r.es_prorroga, render: r => {
      if (!r.es_prorroga) return <span className="text-gray-500">No</span>;
      const conf = r.prorroga_confianza;
      const color = conf === 'alta' ? 'bg-red-500/20 text-red-400' : conf === 'media' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400';
      return <div className="flex flex-col items-start gap-0.5">
        <span className={`px-1.5 py-0.5 ${color} rounded text-[9px] font-bold`}>SÍ ({conf || 'bd'})</span>
        {r.prorroga_caso_original && <span className="text-[8px] text-gray-500">← {r.prorroga_caso_original}</span>}
      </div>;
    }},
    { key: 'numero_incapacidad', label: 'Nº Incapacidad', accessor: r => r.numero_incapacidad },
    { key: 'medico_tratante', label: 'Médico', width: '150px', accessor: r => r.medico_tratante },
    { key: 'institucion_origen', label: 'Institución', width: '150px', accessor: r => r.institucion_origen },
    { key: 'fecha_inicio', label: 'F. Inicio', accessor: r => r.fecha_inicio, render: r => formatFechaCorta(r.fecha_inicio) },
    { key: 'fecha_fin', label: 'F. Fin', accessor: r => r.fecha_fin, render: r => formatFechaCorta(r.fecha_fin) },
    { key: 'fecha_ingreso', label: 'F. Ingreso Emp.', accessor: r => r.fecha_ingreso, render: r => formatFechaCorta(r.fecha_ingreso) },
    { key: 'fecha_radicacion', label: 'Radicación', accessor: r => r.fecha_radicacion, render: r => formatFechaCorta(r.fecha_radicacion) },
    { key: 'dias_en_portal', label: 'Días en Portal', accessor: r => r.dias_en_portal, render: r => {
      const d = r.dias_en_portal || 0;
      return <span className={`font-bold ${d > 15 ? 'text-red-400' : d > 7 ? 'text-yellow-400' : 'text-green-400'}`}>{d}d</span>;
    }},
    { key: 'eps', label: 'EPS', accessor: r => r.eps },
    { key: 'observacion', label: 'Observación', width: '200px', accessor: r => r.observacion, render: r => <span className="text-gray-400 max-w-[200px] truncate block" title={r.observacion}>{r.observacion || '—'}</span> },
  ], []);

  const COLS_INCOMPLETAS = useMemo(() => [
    { key: 'serial', label: 'Serial', accessor: r => r.serial, render: r => <span className="font-mono text-yellow-400">{r.serial}</span> },
    { key: 'cedula', label: 'Cédula (Llave)', accessor: r => r.cedula, render: r => <span className="font-mono text-blue-300">{r.cedula}</span> },
    { key: 'nombre', label: 'Nombre', width: '150px', accessor: r => r.nombre },
    { key: 'empresa', label: 'Empresa', accessor: r => r.empresa },
    { key: 'area', label: 'Área', accessor: r => r.area },
    { key: 'cargo', label: 'Cargo', accessor: r => r.cargo },
    { key: 'tipo', label: 'Tipo', accessor: r => r.tipo, render: r => <span className="text-gray-400">{(r.tipo || '').replace(/_/g, ' ')}</span> },
    { key: 'estado', label: 'Estado', accessor: r => r.estado, render: r => <EstadoBadge estado={r.estado} /> },
    { key: 'diagnostico', label: 'Diagnóstico', width: '150px', accessor: r => r.diagnostico, render: r => <span className="text-gray-400 max-w-[150px] truncate block" title={r.diagnostico}>{r.diagnostico || '—'}</span> },
    { key: 'codigo_cie10', label: 'CIE-10', accessor: r => r.codigo_cie10 },
    { key: 'docs_faltantes', label: 'Documentos Faltantes', width: '220px', accessor: r => (r.docs_faltantes || []).join(', '),
      render: r => {
        const docs = r.docs_faltantes || [];
        if (docs.length === 0) return <span className="text-gray-500">—</span>;
        return <div className="flex flex-wrap gap-1">{docs.map((d,i) => <span key={i} className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px]">{d}</span>)}</div>;
      }
    },
    { key: 'docs_ilegibles', label: 'Docs. Ilegibles', width: '180px', accessor: r => (r.docs_ilegibles || []).join(', '),
      render: r => {
        const docs = r.docs_ilegibles || [];
        if (docs.length === 0) return <span className="text-gray-500">—</span>;
        return <div className="flex flex-wrap gap-1">{docs.map((d,i) => <span key={i} className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px]">{d}</span>)}</div>;
      }
    },
    { key: 'observacion', label: 'Motivo / Observación', width: '250px', accessor: r => r.observacion,
      render: r => <span className="text-gray-300 max-w-[250px] block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.observacion || '—'}</span>
    },
    { key: 'dias_en_portal', label: 'Días Portal', accessor: r => r.dias_en_portal, render: r => {
      const d = r.dias_en_portal || 0;
      return <span className={`font-bold ${d > 15 ? 'text-red-400' : d > 7 ? 'text-yellow-400' : 'text-green-400'}`}>{d}d</span>;
    }},
    { key: 'fecha_radicacion', label: 'Radicación', accessor: r => r.fecha_radicacion, render: r => formatFechaCorta(r.fecha_radicacion) },
  ], []);

  const COLS_FRECUENCIA = useMemo(() => [
    { key: 'cedula', label: 'Cédula (Llave)', accessor: r => r.cedula, render: r => <span className="font-mono text-blue-300">{r.cedula}</span> },
    { key: 'nombre', label: 'Nombre', width: '160px', accessor: r => r.nombre },
    { key: 'empresa', label: 'Empresa', accessor: r => r.empresa },
    { key: 'area', label: 'Área', accessor: r => r.area },
    { key: 'cargo', label: 'Cargo', accessor: r => r.cargo },
    { key: 'ciudad', label: 'Ciudad', accessor: r => r.ciudad },
    { key: 'total_incapacidades', label: 'Total Inc.', accessor: r => r.total_incapacidades,
      render: r => {
        const t = r.total_incapacidades;
        return <span className={`font-black text-base ${t >= 5 ? 'text-red-400' : t >= 3 ? 'text-orange-400' : 'text-white'}`}>{t}</span>;
      }
    },
    { key: 'total_dias_portal', label: 'Días Portal', accessor: r => r.total_dias_portal, render: r => <span className="font-bold">{r.total_dias_portal}</span> },
    { key: 'total_dias_kactus', label: 'Días Kactus', accessor: r => r.total_dias_kactus, render: r => <span className="font-bold text-cyan-400">{r.total_dias_kactus || '—'}</span> },
    { key: 'prorrogas', label: 'Prórrogas', accessor: r => r.prorrogas, render: r => r.prorrogas > 0 ? <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px] font-bold">{r.prorrogas}</span> : <span className="text-gray-500">0</span> },
    { key: 'dias_prorroga', label: 'Días Prórroga', accessor: r => r.dias_prorroga || 0, render: r => {
      const d = r.dias_prorroga || 0;
      if (d === 0) return <span className="text-gray-500">0</span>;
      if (d >= 180) return <span className="px-1.5 py-0.5 bg-red-500/30 text-red-400 rounded text-[9px] font-black animate-pulse">{d}d ⛔</span>;
      if (d >= 150) return <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px] font-bold">{d}d</span>;
      if (d >= 90) return <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px] font-bold">{d}d</span>;
      return <span className="font-bold text-emerald-400">{d}d</span>;
    }},
    { key: 'max_cadena_dias', label: 'Máx Cadena', accessor: r => r.max_cadena_dias, render: r => {
      const d = r.max_cadena_dias || 0;
      if (d >= 180) return <span className="px-1.5 py-0.5 bg-red-500/30 text-red-400 rounded text-[9px] font-black animate-pulse">{d}d ⛔</span>;
      if (d >= 150) return <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px] font-bold">{d}d 🔴</span>;
      if (d >= 90) return <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[9px] font-bold">{d}d 🟡</span>;
      return <span className="text-gray-400">{d}d</span>;
    }},
    { key: 'tiene_alerta_180', label: 'Alerta 180d', accessor: r => r.tiene_alerta_180, render: r => {
      if (r.supero_180) return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[9px] font-bold animate-pulse">⛔ SUPERÓ 180</span>;
      if (r.cerca_limite_180) return <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-[9px] font-bold">🔴 CERCA</span>;
      return <span className="text-gray-500 text-[9px]">OK</span>;
    }},
    { key: 'huecos', label: 'Huecos', accessor: r => r.huecos_detectados || 0, render: r => {
      const h = r.huecos_detectados || 0;
      if (h === 0) return <span className="text-gray-500 text-[9px]">—</span>;
      return (
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-[9px] font-bold" title={
          (r.huecos_info || []).map(hi => `Hueco: ${hi.dias_hueco}d, potencial: ${hi.dias_potenciales}d`).join(' | ')
        }>
          ⚠️ {h} hueco{h > 1 ? 's' : ''}
        </span>
      );
    }},
    { key: 'diagnosticos', label: 'Diagnósticos', width: '220px', accessor: r => (r.diagnosticos || []).join(', '),
      render: r => {
        const diags = r.diagnosticos || [];
        if (diags.length === 0) return <span className="text-gray-500">—</span>;
        return <div className="flex flex-wrap gap-1">{diags.map((d,i) => <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[9px] max-w-[150px] truncate" title={d}>{d}</span>)}</div>;
      }
    },
    { key: 'codigos_cie10', label: 'CIE-10', width: '120px', accessor: r => (r.codigos_cie10 || []).join(', '),
      render: r => {
        const codes = r.codigos_cie10 || [];
        if (codes.length === 0) return <span className="text-gray-500">—</span>;
        return <div className="flex flex-wrap gap-1">{codes.map((c,i) => <span key={i} className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[9px] font-mono">{c}</span>)}</div>;
      }
    },
    { key: 'desglose', label: 'Desglose Mensual', width: '200px', accessor: r => JSON.stringify(r.desglose_mensual || {}),
      render: r => {
        const d = r.desglose_mensual || {};
        const entries = Object.entries(d).sort();
        if (entries.length === 0) return '—';
        return <div className="flex flex-wrap gap-1">{entries.map(([m,c]) => <span key={m} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[9px]">{m}: <b>{c}</b></span>)}</div>;
      }
    },
    { key: 'es_reincidente', label: 'Reincidente', accessor: r => r.es_reincidente,
      render: r => r.es_reincidente
        ? <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold">⚠ SÍ</span>
        : <span className="text-gray-500">No</span>
    },
    { key: 'primera_fecha', label: 'Primera', accessor: r => r.primera_fecha, render: r => formatFechaCorta(r.primera_fecha) },
    { key: 'ultima_fecha', label: 'Última', accessor: r => r.ultima_fecha, render: r => formatFechaCorta(r.ultima_fecha) },
  ], []);

  // ═══ Columnas para Alertas 180 días ═══
  const COLS_ALERTAS_180 = useMemo(() => [
    { key: 'tipo', label: 'Tipo Alerta', width: '160px', accessor: r => r.tipo, render: r => {
      const colors = { LIMITE_180_SUPERADO: 'bg-red-500/30 text-red-300', ALERTA_CRITICA: 'bg-orange-500/20 text-orange-400', ALERTA_TEMPRANA: 'bg-yellow-500/20 text-yellow-400', PRORROGA_CORTADA: 'bg-purple-500/20 text-purple-400' };
      const icons = { LIMITE_180_SUPERADO: '⛔', ALERTA_CRITICA: '🔴', ALERTA_TEMPRANA: '🟡', PRORROGA_CORTADA: '⚠️' };
      return <span className={`px-2 py-1 rounded text-[10px] font-bold ${colors[r.tipo] || 'bg-gray-700'}`}>{icons[r.tipo] || '⚪'} {(r.tipo || '').replace(/_/g, ' ')}</span>;
    }},
    { key: 'severidad', label: 'Severidad', accessor: r => r.severidad, render: r => {
      const c = { critica: 'text-red-400', alta: 'text-orange-400', media: 'text-yellow-400' };
      return <span className={`font-bold uppercase text-[10px] ${c[r.severidad] || ''}`}>{r.severidad}</span>;
    }},
    { key: 'dias_acumulados', label: 'Días Acum.', accessor: r => r.dias_acumulados, render: r => <span className="font-black text-lg text-red-400">{r.dias_acumulados}</span> },
    { key: 'dias_restantes', label: 'Restantes', accessor: r => r.dias_restantes, render: r => {
      if (r.tipo === 'PRORROGA_CORTADA') return <span className="font-bold text-purple-400">{r.dias_hueco || '?'}d hueco</span>;
      return r.dias_restantes != null ? <span className="font-bold text-yellow-400">{r.dias_restantes}d</span> : <span className="text-red-400 font-bold">EXCEDIDO</span>;
    }},
    { key: 'mensaje', label: 'Detalle', width: '350px', accessor: r => r.mensaje, render: r => <span className="text-gray-300 text-[10px] leading-tight block max-w-[350px]">{r.mensaje}</span> },
    { key: 'normativa', label: 'Normativa', width: '250px', accessor: r => r.normativa, render: r => r.normativa ? <span className="text-gray-500 text-[9px] italic block max-w-[250px]">{r.normativa}</span> : '—' },
    { key: 'codigos', label: 'CIE-10', accessor: r => (r.codigos_involucrados || []).join(', '), render: r => {
      const codes = r.codigos_involucrados || [];
      return <div className="flex flex-wrap gap-0.5">{codes.map((c,i) => <span key={i} className="px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[8px] font-mono">{c}</span>)}</div>;
    }},
  ], []);

  const COLS_INDICADORES = useMemo(() => [
    { key: 'estado', label: 'Estado', accessor: r => r.estado, render: r => <EstadoBadge estado={r.estado} /> },
    { key: 'cantidad', label: 'Cantidad', accessor: r => r.cantidad, render: r => <span className="font-black text-white text-base">{r.cantidad}</span> },
    { key: 'porcentaje', label: '%', accessor: r => r.porcentaje,
      render: r => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${r.porcentaje}%` }} />
          </div>
          <span className="text-gray-300 text-[10px] font-mono">{r.porcentaje}%</span>
        </div>
      )
    },
    { key: 'dias_promedio_incapacidad', label: 'Prom. Días Inc.', accessor: r => r.dias_promedio_incapacidad, render: r => <span className="font-bold">{r.dias_promedio_incapacidad}</span> },
    { key: 'dias_promedio_portal', label: 'Prom. Días Portal', accessor: r => r.dias_promedio_portal,
      render: r => {
        const d = r.dias_promedio_portal || 0;
        return <span className={`font-bold ${d > 15 ? 'text-red-400' : d > 7 ? 'text-yellow-400' : 'text-green-400'}`}>{d}d</span>;
      }
    },
  ], []);

  // ═══ RENDER ═══
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Cargando dashboard...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 text-red-400">
        <p className="font-bold">Error cargando dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => fetchData()} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
          Reintentar
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" /> Dashboard de Reportes
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              {data?.fecha_inicio && data?.fecha_fin
                ? `${formatFecha(data.fecha_inicio)} → ${formatFecha(data.fecha_fin)}`
                : 'Cargando período...'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <select value={empresa} onChange={e => setEmpresa(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white">
              <option value="all">Todas empresas</option>
              {empresas.map((e,i) => <option key={i} value={e}>{e}</option>)}
            </select>
            
            <select value={periodo} onChange={e => setPeriodo(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white">
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-600/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}
              title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}>
              {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            
            <button onClick={() => fetchData()} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* ⛔ Badge alertas 180 días */}
            <AlertaBadge180 
              alertas={data?.alertas_180 || []} 
              onClick={() => { setTab('alertas180'); }}
            />
            
            {/* ⚙️ Config emails */}
            <button
              onClick={() => setShowEmailConfig(true)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 hover:text-white transition flex items-center gap-1.5"
              title="Configurar correos de alertas 180 días"
            >
              📧 Config Alertas
            </button>
            
            {lastUpdate && (
              <span className="text-[10px] text-gray-500">{lastUpdate.toLocaleTimeString('es-CO')}</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <KPICard label="Total" value={kpis.total_casos || 0} icon="📊" color="blue" sub={`${kpis.total_dias_incapacidad || 0} días totales`} />
        <KPICard label="Completas" value={kpis.completas || 0} icon="✅" color="green" sub={`${kpis.total_casos ? Math.round((kpis.completas||0)/kpis.total_casos*100) : 0}%`} />
        <KPICard label="Incompletas" value={kpis.incompletas || 0} icon="❌" color="red" />
        <KPICard label="En Proceso" value={kpis.en_proceso || 0} icon="🔵" color="cyan" />
        <KPICard label="EPS Trans." value={kpis.eps_transcripcion || 0} icon="🟡" color="yellow" />
        <KPICard label="TTHH" value={kpis.derivado_tthh || 0} icon="🟣" color="purple" />
        <KPICard label="Prom. Días" value={kpis.promedio_dias || 0} icon="📅" color="orange" sub="por incapacidad" />
        {(data?.alertas_180?.length || 0) > 0 && <KPICard label="Alertas 180" value={data.alertas_180.length} icon="⛔" color="red" sub="empleados en riesgo" />}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-1 bg-gray-800/60 p-1 rounded-xl border border-gray-700 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t.icon} {t.label}
            {t.id === 'incompletas' && (data?.incompletas?.length || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px]">{data.incompletas.length}</span>
            )}
            {t.id === 'frecuencia' && (data?.frecuencia?.filter(f => f.es_reincidente).length || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[9px]">{data.frecuencia.filter(f => f.es_reincidente).length}</span>
            )}
            {t.id === 'alertas180' && (data?.alertas_180?.length || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[9px] animate-pulse">{data.alertas_180.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB: RESUMEN ═══ */}
      {tab === 'resumen' && data && (
        <div className="space-y-4">
          <div className="bg-gray-800/60 backdrop-blur rounded-xl p-5 border border-gray-700">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Distribución de Estados
            </h3>
            <div className="space-y-3">
              {(data.indicadores || []).map(ind => {
                const c = ESTADO_COLORS[ind.estado] || ESTADO_COLORS.NUEVO;
                return (
                  <div key={ind.estado}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${c.text}`}>{ESTADO_LABELS[ind.estado] || ind.estado}</span>
                      <span className="text-xs text-gray-400 font-mono">{ind.cantidad} ({ind.porcentaje}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${c.dot} transition-all duration-500`} style={{ width: `${ind.porcentaje}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SortableTable
              data={(data.tabla_principal || []).slice(0, 15)}
              columns={[
                { key: 'serial', label: 'Serial', accessor: r => r.serial, render: r => <span className="font-mono text-yellow-400">{r.serial}</span> },
                { key: 'nombre', label: 'Nombre', accessor: r => r.nombre },
                { key: 'estado', label: 'Estado', accessor: r => r.estado, render: r => <EstadoBadge estado={r.estado} /> },
                { key: 'dias_incapacidad', label: 'Días', accessor: r => r.dias_incapacidad },
                { key: 'dias_en_portal', label: 'Portal', accessor: r => r.dias_en_portal, render: r => {
                  const d = r.dias_en_portal || 0;
                  return <span className={d > 15 ? 'text-red-400 font-bold' : d > 7 ? 'text-yellow-400' : 'text-green-400'}>{d}d</span>;
                }},
              ]}
              title="📋 Últimos Casos"
              exportFilename="ultimos_casos"
              maxHeight="320px"
            />
            
            <SortableTable
              data={(data.frecuencia || []).filter(f => f.total_incapacidades >= 2).slice(0, 15)}
              columns={[
                { key: 'cedula', label: 'Cédula', accessor: r => r.cedula, render: r => <span className="font-mono text-blue-300">{r.cedula}</span> },
                { key: 'nombre', label: 'Nombre', accessor: r => r.nombre },
                { key: 'total_incapacidades', label: 'Inc.', accessor: r => r.total_incapacidades, render: r => <span className={`font-black ${r.total_incapacidades >= 5 ? 'text-red-400' : r.total_incapacidades >= 3 ? 'text-orange-400' : 'text-white'}`}>{r.total_incapacidades}</span> },
                { key: 'total_dias_portal', label: 'Días', accessor: r => r.total_dias_portal },
                { key: 'reincidente', label: '', accessor: r => r.es_reincidente, render: r => r.es_reincidente ? <span className="text-red-400 text-[10px] font-bold">⚠ REIN.</span> : null },
              ]}
              title="🔄 Top Reincidentes (2+)"
              exportFilename="reincidentes"
              maxHeight="320px"
            />
          </div>
        </div>
      )}

      {/* ═══ TAB: TABLA PRINCIPAL ═══ */}
      {tab === 'tabla' && data && (
        <SortableTable
          data={data.tabla_principal || []}
          columns={COLS_PRINCIPAL}
          title="📋 Tabla Principal — Todos los Campos"
          exportFilename="reporte_principal_incapacidades"
          maxHeight="calc(100vh - 380px)"
        />
      )}

      {/* ═══ TAB: OBSERVACIÓN / INCOMPLETAS ═══ */}
      {tab === 'incompletas' && data && (
        <SortableTable
          data={data.incompletas || []}
          columns={COLS_INCOMPLETAS}
          title="⚠️ Casos en Observación — Soportes Faltantes y Motivos"
          exportFilename="reporte_incompletas_observacion"
          maxHeight="calc(100vh - 380px)"
        />
      )}

      {/* ═══ TAB: FRECUENCIA / REINCIDENCIA ═══ */}
      {tab === 'frecuencia' && data && (
        <SortableTable
          data={data.frecuencia || []}
          columns={COLS_FRECUENCIA}
          title="🔄 Frecuencia por Empleado (Año) — Reincidencia, Diagnósticos, Días Acumulados, Cadenas de Prórroga"
          exportFilename="reporte_frecuencia_reincidencia"
          maxHeight="calc(100vh - 380px)"
        />
      )}

      {/* ═══ TAB: ALERTAS 180 DÍAS (Ley 776/2002) ═══ */}
      {tab === 'alertas180' && data && (
        <div className="space-y-4">
          {/* Normativa banner */}
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
            <h3 className="text-red-400 font-bold text-sm mb-1">⛔ Alertas Ley 776/2002 — Control de 180 Días</h3>
            <p className="text-gray-400 text-[10px] leading-relaxed">
              La EPS cubre hasta 180 días de incapacidad. Del día 181 al 540, el Fondo de Pensiones asume al 50% del salario (con concepto favorable de rehabilitación).
              El sistema detecta automáticamente cadenas de prórrogas por correlación CIE-10 y cuenta los días acumulados.
            </p>
          </div>
          {(data.alertas_180 || []).length === 0 ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-8 text-center">
              <span className="text-green-400 text-4xl block mb-2">✅</span>
              <span className="text-green-400 font-bold">Sin alertas de 180 días</span>
              <p className="text-gray-500 text-xs mt-1">Ningún empleado se acerca al límite de incapacidad temporal de la EPS</p>
            </div>
          ) : (
            <SortableTable
              data={data.alertas_180 || []}
              columns={COLS_ALERTAS_180}
              title={`⛔ ${data.alertas_180.length} Alertas de Límite 180 Días — Ley 776/2002`}
              exportFilename="alertas_180_dias_ley776"
              maxHeight="calc(100vh - 440px)"
            />
          )}
        </div>
      )}

      {/* ═══ TAB: INDICADORES ═══ */}
      {tab === 'indicadores' && data && (
        <SortableTable
          data={data.indicadores || []}
          columns={COLS_INDICADORES}
          title="📈 Indicadores por Estado — Distribución y Promedios"
          exportFilename="reporte_indicadores_estado"
          maxHeight="calc(100vh - 380px)"
        />
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-3 text-center">
        <span className="text-gray-500 text-[10px]">
          Dashboard 2026 — Auto-refresh {autoRefresh ? '✅ activo (30s)' : '⏸ pausado'}
          {' '} — Todas las tablas exportables a Excel
          {lastUpdate && ` — Última: ${lastUpdate.toLocaleTimeString('es-CO')}`}
        </span>
      </div>

      {/* ═══ MODAL: Config Emails Alertas 180 ═══ */}
      <EmailConfig180 isOpen={showEmailConfig} onClose={() => setShowEmailConfig(false)} />
    </div>
  );
}
