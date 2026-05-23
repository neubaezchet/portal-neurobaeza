import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Download, Search, Pause, Play, ArrowUpDown, X, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════
// PLANO INCAPACIDADES — 100 % OCR
// Única fuente de verdad: texto extraído por Mistral + Gemini.
// El único campo que viene de BD es "empresa".
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

// Colores por origen
const ORIGEN_COLORS = {
  'Laboral':               'bg-red-500/20 text-red-400',
  'Accidente de Tránsito': 'bg-orange-500/20 text-orange-400',
  'Común':                 'bg-blue-500/20 text-blue-300',
  'Maternidad':            'bg-pink-500/20 text-pink-300',
  'Paternidad':            'bg-purple-500/20 text-purple-300',
};

// Excel export
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
// SORTABLE TABLE
// ═══════════════════════════════════════════════════════════
function SortableTable({ data, columns, title, exportFilename, maxHeight = '520px' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search,  setSearch]  = useState('');

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
      {/* Header */}
      <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-3 flex-wrap">
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
              <tr
                key={idx}
                className={`hover:bg-gray-700/30 transition-colors ${!row.tiene_ocr ? 'opacity-40' : ''}`}
                title={!row.tiene_ocr ? 'OCR pendiente — sin datos extraídos aún' : undefined}
              >
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
        `${API_CONFIG.BASE_URL}/validador/casos/plano-ocr?${params.toString()}`,
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

  // ═══ COLUMNAS — todo desde OCR, salvo empresa ═══
  const COLS_PLANO = useMemo(() => [
    {
      key: 'tipo_documento',
      label: 'TIPO DOC.',
      width: '80px',
      accessor: r => r.tipo_documento || 'CC',
      render: r => (
        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold">
          {r.tipo_documento || 'CC'}
        </span>
      ),
    },
    {
      key: 'cedula',
      label: 'Nº DOCUMENTO',
      width: '130px',
      accessor: r => r.cedula,
      render: r => <span className="font-mono text-yellow-300 font-bold">{r.cedula || '—'}</span>,
    },
    {
      key: 'empresa',
      label: 'EMPRESA',
      width: '160px',
      accessor: r => r.empresa,
      render: r => (
        <span className="uppercase text-gray-200 flex items-center gap-1">
          {r.empresa || '—'}
        </span>
      ),
    },
    {
      key: 'eps',
      label: 'EPS',
      width: '140px',
      accessor: r => r.eps,
      render: r => <span className="uppercase text-cyan-300">{r.eps || '—'}</span>,
    },
    {
      key: 'dias_incapacidad',
      label: 'DÍAS',
      width: '60px',
      accessor: r => r.dias_incapacidad,
      render: r => (
        <span className="font-black text-white text-sm">{r.dias_incapacidad || '—'}</span>
      ),
    },
    {
      key: 'fecha_inicio',
      label: 'F. INICIO',
      width: '100px',
      accessor: r => r.fecha_inicio,
      render: r => <span className="text-gray-300">{r.fecha_inicio || '—'}</span>,
    },
    {
      key: 'fecha_fin',
      label: 'F. FIN',
      width: '100px',
      accessor: r => r.fecha_fin,
      render: r => <span className="text-gray-300">{r.fecha_fin || '—'}</span>,
    },
    {
      key: 'medico',
      label: 'MÉDICO',
      width: '160px',
      accessor: r => r.medico,
      render: r => <span className="uppercase text-gray-400">{r.medico || '—'}</span>,
    },
    {
      key: 'registro_medico',
      label: 'REG. MÉDICO',
      width: '110px',
      accessor: r => r.registro_medico,
      render: r => <span className="font-mono text-gray-400">{r.registro_medico || '—'}</span>,
    },
    {
      key: 'lugar_atencion',
      label: 'LUGAR DE ATENCIÓN',
      width: '180px',
      accessor: r => r.lugar_atencion,
      render: r => <span className="uppercase text-gray-400">{r.lugar_atencion || '—'}</span>,
    },
    {
      key: 'nit_lugar_atencion',
      label: 'NIT LUGAR',
      width: '120px',
      accessor: r => r.nit_lugar_atencion,
      render: r => <span className="font-mono text-gray-400">{r.nit_lugar_atencion || '—'}</span>,
    },
    {
      key: 'codigo_cie10',
      label: 'CIE-10',
      width: '80px',
      accessor: r => r.codigo_cie10,
      render: r => (
        <span className="font-mono text-purple-300 text-[10px]">{r.codigo_cie10 || '—'}</span>
      ),
    },
    {
      key: 'diagnostico',
      label: 'DIAGNÓSTICO',
      width: '200px',
      accessor: r => r.diagnostico,
      render: r => (
        <span className="text-gray-300 text-[10px] truncate block max-w-[200px] uppercase" title={r.diagnostico}>
          {r.diagnostico || '—'}
        </span>
      ),
    },
    {
      key: 'origen',
      label: 'ORIGEN',
      width: '130px',
      accessor: r => r.origen,
      render: r => (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORIGEN_COLORS[r.origen] || 'bg-gray-700 text-gray-400'}`}>
          {r.origen || '—'}
        </span>
      ),
    },
    {
      key: 'tipo',
      label: 'TIPO INCAPACIDAD',
      width: '150px',
      accessor: r => r.tipo,
      render: r => (
        <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[10px] uppercase">
          {r.tipo || '—'}
        </span>
      ),
    },
  ], []);

  const casos = useMemo(() => data?.casos || [], [data]);
  const sinOcr = useMemo(() => casos.filter(c => !c.tiene_ocr).length, [casos]);

  // ═══ LOADING / ERROR ═══
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-gray-400">Cargando plano OCR...</span>
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
              <span className="text-[11px] font-normal text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                100 % OCR
              </span>
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Campos extraídos por Mistral + Gemini · Auto-refresh cada 30s
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
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Días totales (OCR)</div>
        </div>
        <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4">
          <div className="text-2xl font-black text-green-300">
            {casos.filter(c => c.tiene_ocr).length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Con OCR completo</div>
        </div>
        <div className={`rounded-xl p-4 border ${sinOcr > 0 ? 'bg-yellow-900/30 border-yellow-700/40' : 'bg-gray-800/60 border-gray-700'}`}>
          <div className={`text-2xl font-black ${sinOcr > 0 ? 'text-yellow-300' : 'text-gray-500'}`}>
            {sinOcr}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Sin OCR aún</div>
        </div>
      </div>

      {/* Aviso si hay casos sin OCR */}
      {sinOcr > 0 && (
        <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-4 py-2 text-yellow-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{sinOcr}</strong> caso(s) aparecen atenuados porque el OCR aún no ha procesado su documento.
            Se completarán automáticamente cuando el validador IA termine de procesar.
          </span>
        </div>
      )}

      {/* ═══ TABLA PRINCIPAL ═══ */}
      <SortableTable
        data={casos}
        columns={COLS_PLANO}
        title="Plano de Incapacidades — Extracción OCR"
        exportFilename="plano_incapacidades_ocr"
        maxHeight="600px"
      />

    </div>
  );
}
