import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Download, Search, Pause, Play, ArrowUpDown, X } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════
// PLANO INCAPACIDADES — Tabla en Vivo
// Campos EPS: tipo doc, nº doc, empresa, EPS, días, fechas,
// médico, lugar, NIT lugar, diagnóstico, origen, tipo
// ═══════════════════════════════════════════════════════════

const PERIODOS = [
  { value: 'mes_actual',    label: 'Mes Actual' },
  { value: 'mes_anterior',  label: 'Mes Anterior' },
  { value: 'quincena_1',    label: 'Quincena 1 (1-15)' },
  { value: 'quincena_2',    label: 'Quincena 2 (16-Fin)' },
  { value: 'año_actual',    label: 'Año Actual' },
  { value: 'ultimos_90',    label: 'Últimos 90 días' },
  { value: 'todo',          label: 'Todo (Histórico)' },
  { value: 'personalizado', label: '📅 Personalizado...' },
];

// Mapeo tipo → origen de la incapacidad (Colombia)
function getOrigen(tipo) {
  if (!tipo) return '—';
  const t = tipo.toLowerCase();
  if (t.includes('laboral') || t.includes('trabajo')) return 'Laboral';
  if (t.includes('transito')) return 'Accidente de Tránsito';
  return 'Común';
}

// Mapeo tipo → etiqueta legible
function getTipoLabel(tipo) {
  const MAP = {
    enfermedad_general:  'Enf. General',
    enfermedad_laboral:  'Enf. Laboral',
    accidente_laboral:   'Acc. Laboral',
    accidente_transito:  'Acc. Tránsito',
    maternidad:          'Maternidad',
    paternidad:          'Paternidad',
    prelicencia:         'Prelicencia',
    certificado:         'Cert. Hospitalización',
    enfermedad_especial: 'Enf. Especial',
  };
  return MAP[(tipo || '').toLowerCase()] || (tipo || '—').replace(/_/g, ' ');
}

// Excel export idéntico al de ReportsDashboard
function exportToExcel(data, columns, filename) {
  let csv = '﻿';
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// SORTABLE TABLE (misma lógica que ReportsDashboard)
// ═══════════════════════════════════════════════════════════
function SortableTable({ data, columns, title, exportFilename, maxHeight = '520px' }) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState('asc');
  const [search, setSearch]     = useState('');

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
      let va = col.accessor(a) ?? '';
      let vb = col.accessor(b) ?? '';
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const toggleSort = key => {
    if (sortKey === key) setSortDir(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      {/* Header barra */}
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
              className="pl-8 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-500 w-48 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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

      {/* Tabla */}
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
                    <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-indigo-400' : 'text-gray-600'}`} />
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
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function PlanoIncapacidades({ empresas = [] }) {
  const [empresa,     setEmpresa]     = useState('all');
  const [periodo,     setPeriodo]     = useState('mes_actual');
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [fechaDesde,  setFechaDesde]  = useState('');
  const [fechaHasta,  setFechaHasta]  = useState('');
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ empresa, periodo });
      if (periodo === 'personalizado' && fechaDesde && fechaHasta) {
        params.set('fecha_desde', fechaDesde);
        params.set('fecha_hasta', fechaHasta);
      }
      const resp = await fetch(
        `${API_CONFIG.BASE_URL}/validador/casos/dashboard-completo?${params.toString()}`,
        { headers: { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN } }
      );
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const json = await resp.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [empresa, periodo, fechaDesde, fechaHasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  // ═══ COLUMNAS DEL PLANO ═══
  const COLS_PLANO = useMemo(() => [
    {
      key: 'tipo_documento',
      label: 'TIPO DOC.',
      width: '80px',
      accessor: r => r.tipo_documento || 'CC',
      render:   r => (
        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold uppercase">
          {r.tipo_documento || 'CC'}
        </span>
      ),
    },
    {
      key: 'cedula',
      label: 'Nº DOCUMENTO',
      width: '120px',
      accessor: r => r.cedula,
      render:   r => <span className="font-mono text-yellow-300 font-bold">{r.cedula || '—'}</span>,
    },
    {
      key: 'empresa',
      label: 'EMPRESA',
      width: '160px',
      accessor: r => r.empresa,
      render:   r => <span className="uppercase text-gray-200">{r.empresa || '—'}</span>,
    },
    {
      key: 'eps',
      label: 'EPS',
      width: '130px',
      accessor: r => r.eps,
      render:   r => <span className="uppercase text-cyan-300">{r.eps || '—'}</span>,
    },
    {
      key: 'dias_incapacidad',
      label: 'DÍAS',
      width: '60px',
      accessor: r => r.dias_incapacidad,
      render:   r => (
        <span className="font-black text-white text-sm">{r.dias_incapacidad ?? '—'}</span>
      ),
    },
    {
      key: 'fecha_inicio',
      label: 'F. INICIO',
      width: '100px',
      accessor: r => r.fecha_inicio,
      render:   r => <span className="text-gray-300">{r.fecha_inicio || '—'}</span>,
    },
    {
      key: 'fecha_fin',
      label: 'F. FIN',
      width: '100px',
      accessor: r => r.fecha_fin,
      render:   r => <span className="text-gray-300">{r.fecha_fin || '—'}</span>,
    },
    {
      key: 'medico',
      label: 'MÉDICO',
      width: '150px',
      accessor: r => r.medico || r.metadata_form?.medico || '',
      render:   r => {
        const val = r.medico || r.metadata_form?.medico;
        return <span className="uppercase text-gray-400">{val || '—'}</span>;
      },
    },
    {
      key: 'lugar_atencion',
      label: 'LUGAR DE ATENCIÓN',
      width: '170px',
      accessor: r => r.lugar_atencion || r.metadata_form?.lugar_atencion || '',
      render:   r => {
        const val = r.lugar_atencion || r.metadata_form?.lugar_atencion;
        return <span className="uppercase text-gray-400">{val || '—'}</span>;
      },
    },
    {
      key: 'nit_lugar_atencion',
      label: 'NIT LUGAR',
      width: '120px',
      accessor: r => r.nit_lugar_atencion || r.metadata_form?.nit_lugar_atencion || '',
      render:   r => {
        const val = r.nit_lugar_atencion || r.metadata_form?.nit_lugar_atencion;
        return <span className="font-mono text-gray-400">{val || '—'}</span>;
      },
    },
    {
      key: 'diagnostico',
      label: 'DIAGNÓSTICO',
      width: '200px',
      accessor: r => r.diagnostico || r.codigo_cie10 || '',
      render:   r => (
        <div className="max-w-[200px]">
          {r.codigo_cie10 && (
            <span className="font-mono text-purple-300 text-[10px] block uppercase">{r.codigo_cie10}</span>
          )}
          <span className="text-gray-300 text-[10px] truncate block uppercase" title={r.diagnostico}>
            {r.diagnostico || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'origen',
      label: 'ORIGEN',
      width: '120px',
      accessor: r => getOrigen(r.tipo),
      render:   r => {
        const origen = getOrigen(r.tipo);
        const colors = {
          'Laboral':               'bg-red-500/20 text-red-400',
          'Accidente de Tránsito': 'bg-orange-500/20 text-orange-400',
          'Común':                 'bg-blue-500/20 text-blue-300',
        };
        return (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${colors[origen] || 'bg-gray-700 text-gray-400'}`}>
            {origen}
          </span>
        );
      },
    },
    {
      key: 'tipo',
      label: 'TIPO INCAPACIDAD',
      width: '140px',
      accessor: r => getTipoLabel(r.tipo),
      render:   r => (
        <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[10px] uppercase">
          {getTipoLabel(r.tipo)}
        </span>
      ),
    },
  ], []);

  // Casos: usa data.tabla_principal (campo real del endpoint dashboard-completo)
  const casos = useMemo(() => data?.tabla_principal || [], [data]);

  // ═══ ESTADOS DE CARGA ═══
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-gray-400">Cargando plano...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 text-red-400">
        <p className="font-bold">Error cargando datos</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchData()}
          className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-purple-600/20 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              📋 Plano Incapacidades
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Tabla en vivo · Auto-refresh cada 30s
              {lastUpdate && (
                <span className="ml-2 text-gray-500">
                  · Actualizado: {lastUpdate.toLocaleTimeString('es-CO')}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Empresa */}
            <select
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(emp => (
                <option key={emp.id || emp.nombre} value={emp.nombre}>
                  {emp.nombre}
                </option>
              ))}
            </select>

            {/* Período */}
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white focus:ring-1 focus:ring-indigo-500"
            >
              {PERIODOS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Fechas personalizadas */}
            {periodo === 'personalizado' && (
              <>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white"
                />
                <span className="text-gray-500 text-xs">→</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white"
                />
              </>
            )}

            {/* Refresh manual */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Actualizar ahora"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Pausar auto-refresh */}
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                autoRefresh
                  ? 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {autoRefresh
                ? <><Pause className="w-3 h-3" /> En vivo</>
                : <><Play  className="w-3 h-3" /> Pausado</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ═══ KPI CHIPS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-black text-white">{casos.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Total registros</div>
        </div>
        <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-xl p-4">
          <div className="text-2xl font-black text-indigo-300">
            {casos.reduce((s, c) => s + (c.dias_incapacidad || 0), 0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Días totales</div>
        </div>
        <div className="bg-violet-900/30 border border-violet-700/40 rounded-xl p-4">
          <div className="text-2xl font-black text-violet-300">
            {casos.filter(c => getOrigen(c.tipo) === 'Laboral').length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Origen laboral</div>
        </div>
        <div className="bg-cyan-900/30 border border-cyan-700/40 rounded-xl p-4">
          <div className="text-2xl font-black text-cyan-300">
            {new Set(casos.map(c => c.empresa).filter(Boolean)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Empresas</div>
        </div>
      </div>

      {/* ═══ TABLA PRINCIPAL ═══ */}
      <SortableTable
        data={casos}
        columns={COLS_PLANO}
        title="Plano de Incapacidades"
        exportFilename="plano_incapacidades"
        maxHeight="600px"
      />

      {/* ═══ NOTA CAMPOS VACÍOS ═══ */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 text-[11px] text-gray-500">
        Los campos <span className="text-gray-400 font-semibold">Médico</span>,{' '}
        <span className="text-gray-400 font-semibold">Lugar de Atención</span> y{' '}
        <span className="text-gray-400 font-semibold">NIT Lugar</span> se completarán
        automáticamente cuando el validador IA extraiga esos datos del documento OCR.
        Los campos no disponibles muestran <span className="font-mono text-gray-400">—</span>.
      </div>
    </div>
  );
}
