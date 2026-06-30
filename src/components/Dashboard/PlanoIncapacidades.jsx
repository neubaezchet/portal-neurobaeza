import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Download, Search, Pause, Play, ArrowUpDown, X, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════
// PLANO INCAPACIDADES — OCR + Radicación
// Campos extraídos por Mistral + Gemini. Nombre trabajador desde BD.
// Columnas de radicación dinámicas según manifest de cada EPS.
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

const ORIGEN_COLORS = {
  'Laboral':               'bg-red-100 text-red-700',
  'Accidente de Tránsito': 'bg-orange-100 text-orange-700',
  'Común':                 'bg-indigo-100 text-indigo-700',
  'Maternidad':            'bg-pink-100 text-pink-700',
  'Paternidad':            'bg-violet-100 text-violet-700',
};

// Mapeo: nombre de campo en manifest OCR → key del row del plano
const MANIFEST_OCR_A_PLANO = {
  "N° documento":       "cedula",
  "Tipo doc":           "tipo_documento",
  "Fecha inicio":       "fecha_inicio",
  "Días":               "dias_incapacidad",
  "Diagnóstico CIE-10": "codigo_cie10",
  "Tipo incapacidad":   "tipo",
  "Nombre trabajador":  "nombre_trabajador",
  "Tipo accidente":     "tipo_accidente",
  "Municipio atención": "municipio_atencion",
};

// Campos que NUNCA se aproximan (línea roja absoluta)
const CAMPOS_NO_APROXIMAR = new Set(["fecha_inicio", "fecha_fin", "dias_incapacidad", "tipo"]);

// Campos aproximables con lógica simple (amarillo = puede inferirse)
const CAMPOS_APROXIMABLES = new Set(["codigo_cie10", "nombre_trabajador", "tipo_documento"]);

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

// ── Calcula readiness de radicación para una fila ─────────────────────────────
function getReadiness(row, manifests) {
  const manifest = manifests[row.eps_key];
  if (!manifest) return null; // EPS desconocida
  const requeridos = manifest.ocr || [];

  const faltantes      = [];
  const aproximables   = [];
  const bloqueantes    = [];

  requeridos.forEach(campoOcr => {
    const planoKey = MANIFEST_OCR_A_PLANO[campoOcr];
    if (!planoKey) return;
    const valor = row[planoKey];
    const vacio = !valor || valor === '0' || valor === 0 || valor === '—';
    if (!vacio) return;

    if (CAMPOS_NO_APROXIMAR.has(planoKey)) {
      bloqueantes.push(campoOcr);
    } else if (CAMPOS_APROXIMABLES.has(planoKey)) {
      aproximables.push(campoOcr);
    } else {
      faltantes.push(campoOcr);
    }
  });

  const ok = bloqueantes.length === 0 && faltantes.length === 0;
  const soloAproximables = bloqueantes.length === 0 && faltantes.length === 0 && aproximables.length > 0;
  return { ok, soloAproximables, aproximables, faltantes, bloqueantes, requeridos };
}

// ── Badge de estado de radicación ─────────────────────────────────────────────
function ReadinessBadge({ readiness, dias }) {
  if (!readiness) return <span className="text-slate-300 text-[10px]">—</span>;

  if (readiness.bloqueantes.length > 0) {
    return (
      <span title={`Faltan campos críticos: ${readiness.bloqueantes.join(', ')}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold whitespace-nowrap">
        <XCircle size={10} /> Incompleta
      </span>
    );
  }
  if (readiness.faltantes.length > 0) {
    return (
      <span title={`Campos faltantes: ${readiness.faltantes.join(', ')}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold whitespace-nowrap">
        <AlertTriangle size={10} /> Falta info
      </span>
    );
  }
  if (readiness.aproximables.length > 0) {
    const esCorta = (dias || 0) <= 2;
    return (
      <span title={`Se puede aproximar: ${readiness.aproximables.join(', ')}${esCorta ? ' · Incapacidad corta: bot usará defaults' : ''}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold whitespace-nowrap">
        <AlertCircle size={10} /> {esCorta ? 'Bot completa' : 'Aproximable'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold whitespace-nowrap">
      <CheckCircle2 size={10} /> Lista
    </span>
  );
}

// ── Wrapper de celda con alerta cuando EPS requiere el campo y está vacío ──────
function CeldaOcr({ valor, required, aproximable, bloqueante, children }) {
  if (!required) return <>{children}</>;
  const vacio = !valor || valor === '0' || valor === 0;
  if (!vacio) return <>{children}</>;

  if (bloqueante) {
    return (
      <span className="flex items-center gap-1">
        <XCircle size={11} className="text-red-500 flex-shrink-0" />
        <span className="text-red-400 italic text-[10px]">Faltante</span>
      </span>
    );
  }
  if (aproximable) {
    return (
      <span className="flex items-center gap-1">
        <AlertCircle size={11} className="text-yellow-500 flex-shrink-0" />
        <span className="text-yellow-600 italic text-[10px]">Aproximable</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <AlertTriangle size={11} className="text-orange-500 flex-shrink-0" />
      <span className="text-orange-500 italic text-[10px]">Faltante</span>
    </span>
  );
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {sortedData.length} registros
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 w-48 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
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
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-slate-900 select-none whitespace-nowrap ${col.radicacion ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                  style={{ minWidth: col.width || 'auto' }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className={`w-3 h-3 ${sortKey === col.key ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  Sin datos para mostrar
                </td>
              </tr>
            ) : sortedData.map((row, idx) => (
              <tr
                key={idx}
                className={`hover:bg-slate-100 transition-colors ${!row.tiene_ocr ? 'opacity-40' : ''}`}
                title={!row.tiene_ocr ? 'OCR pendiente — sin datos extraídos aún' : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-3 py-2 text-slate-700 whitespace-nowrap ${col.radicacion ? 'bg-indigo-50/40' : ''}`}>
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
  const [manifests,   setManifests]   = useState({});
  const intervalRef = useRef(null);

  // ── Carga manifests una sola vez ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('portal_token') || '';
    fetch(`${API_CONFIG.BASE_URL}/admin/radicacion/manifests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.manifests) setManifests(j.manifests); })
      .catch(() => {});
  }, []);

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

  // ═══ COLUMNAS ═══
  const COLS_PLANO = useMemo(() => {
    // Helper inline para checks de campo
    const check = (row, planoKey) => {
      const m = manifests[row.eps_key];
      if (!m) return { required: false, aproximable: false, bloqueante: false };
      const keys = (m.ocr || []).map(f => MANIFEST_OCR_A_PLANO[f]).filter(Boolean);
      const required    = keys.includes(planoKey);
      const aproximable = required && CAMPOS_APROXIMABLES.has(planoKey);
      const bloqueante  = required && CAMPOS_NO_APROXIMAR.has(planoKey);
      return { required, aproximable, bloqueante };
    };

    return [
      // ── Estado radicación (primera columna) ──────────────────────────────
      {
        key: '_rad',
        label: '📡 Radicación',
        width: '120px',
        radicacion: true,
        accessor: r => {
          const rd = getReadiness(r, manifests);
          if (!rd) return 'sin_eps';
          if (rd.bloqueantes.length > 0) return 'incompleta';
          if (rd.faltantes.length > 0) return 'falta_info';
          if (rd.aproximables.length > 0) return 'aproximable';
          return 'lista';
        },
        render: r => <ReadinessBadge readiness={getReadiness(r, manifests)} dias={r.dias_incapacidad} />,
      },
      {
        key: 'tipo_documento',
        label: 'TIPO DOC.',
        width: '80px',
        accessor: r => r.tipo_documento || 'CC',
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'tipo_documento');
          return (
            <CeldaOcr valor={r.tipo_documento} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                {r.tipo_documento || 'CC'}
              </span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'cedula',
        label: 'Nº DOCUMENTO',
        width: '130px',
        accessor: r => r.cedula,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'cedula');
          return (
            <CeldaOcr valor={r.cedula} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="font-mono text-amber-600 font-bold">{r.cedula || '—'}</span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'nombre_trabajador',
        label: 'NOMBRE',
        width: '180px',
        radicacion: true,
        accessor: r => r.nombre_trabajador,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'nombre_trabajador');
          return (
            <CeldaOcr valor={r.nombre_trabajador} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="uppercase text-slate-600 text-[10px]">{r.nombre_trabajador || '—'}</span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'empresa',
        label: 'EMPRESA',
        width: '160px',
        accessor: r => r.empresa,
        render: r => <span className="uppercase text-slate-700">{r.empresa || '—'}</span>,
      },
      {
        key: 'eps',
        label: 'EPS',
        width: '140px',
        accessor: r => r.eps,
        render: r => <span className="uppercase text-cyan-700">{r.eps || '—'}</span>,
      },
      {
        key: 'dias_incapacidad',
        label: 'DÍAS',
        width: '60px',
        accessor: r => r.dias_incapacidad,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'dias_incapacidad');
          return (
            <CeldaOcr valor={r.dias_incapacidad} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="font-black text-slate-900 text-sm">{r.dias_incapacidad || '—'}</span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'fecha_inicio',
        label: 'F. INICIO',
        width: '100px',
        accessor: r => r.fecha_inicio,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'fecha_inicio');
          return (
            <CeldaOcr valor={r.fecha_inicio} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="text-slate-700">{r.fecha_inicio || '—'}</span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'fecha_fin',
        label: 'F. FIN',
        width: '100px',
        accessor: r => r.fecha_fin,
        render: r => <span className="text-slate-700">{r.fecha_fin || '—'}</span>,
      },
      {
        key: 'codigo_cie10',
        label: 'CIE-10',
        width: '80px',
        accessor: r => r.codigo_cie10,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'codigo_cie10');
          return (
            <CeldaOcr valor={r.codigo_cie10} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="font-mono text-violet-700 text-[10px]">{r.codigo_cie10 || '—'}</span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'diagnostico',
        label: 'DIAGNÓSTICO',
        width: '200px',
        accessor: r => r.diagnostico,
        render: r => (
          <span className="text-slate-700 text-[10px] truncate block max-w-[200px] uppercase" title={r.diagnostico}>
            {r.diagnostico || '—'}
          </span>
        ),
      },
      {
        key: 'tipo',
        label: 'TIPO INCAPACIDAD',
        width: '150px',
        accessor: r => r.tipo,
        render: r => {
          const { required, aproximable, bloqueante } = check(r, 'tipo');
          return (
            <CeldaOcr valor={r.tipo} required={required} aproximable={aproximable} bloqueante={bloqueante}>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase">
                {r.tipo || '—'}
              </span>
            </CeldaOcr>
          );
        },
      },
      {
        key: 'origen',
        label: 'ORIGEN',
        width: '130px',
        accessor: r => r.origen,
        render: r => (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ORIGEN_COLORS[r.origen] || 'bg-slate-100 text-slate-600'}`}>
            {r.origen || '—'}
          </span>
        ),
      },
      {
        key: 'medico',
        label: 'MÉDICO',
        width: '160px',
        accessor: r => r.medico,
        render: r => <span className="uppercase text-slate-500">{r.medico || '—'}</span>,
      },
      {
        key: 'lugar_atencion',
        label: 'LUGAR DE ATENCIÓN',
        width: '180px',
        accessor: r => r.lugar_atencion,
        render: r => <span className="uppercase text-slate-500">{r.lugar_atencion || '—'}</span>,
      },
      {
        key: 'codigo_cie10_check',
        label: 'NIT LUGAR',
        width: '120px',
        accessor: r => r.nit_lugar_atencion,
        render: r => <span className="font-mono text-slate-500">{r.nit_lugar_atencion || '—'}</span>,
      },
    ];
  }, [manifests]);

  const casos = useMemo(() => data?.casos || [], [data]);
  const sinOcr = useMemo(() => casos.filter(c => !c.tiene_ocr).length, [casos]);

  // Contadores de readiness
  const stats = useMemo(() => {
    if (!Object.keys(manifests).length) return null;
    let listas = 0, aproximables = 0, incompletas = 0, sinEps = 0;
    casos.forEach(c => {
      if (!c.tiene_ocr) return;
      const rd = getReadiness(c, manifests);
      if (!rd) { sinEps++; return; }
      if (rd.bloqueantes.length > 0 || rd.faltantes.length > 0) incompletas++;
      else if (rd.aproximables.length > 0) aproximables++;
      else listas++;
    });
    return { listas, aproximables, incompletas, sinEps };
  }, [casos, manifests]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-slate-500">Cargando plano OCR...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-bold">Error cargando datos</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => fetchData()} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-violet-100 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              📋 Plano Incapacidades
              <span className="text-[11px] font-normal text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                OCR + Radicación
              </span>
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Campos extraídos por Mistral + Gemini · Columnas 📡 = campos que requiere la EPS para radicar
              {lastUpdate && (
                <span className="ml-2 text-slate-400">
                  · Actualizado: {lastUpdate.toLocaleTimeString('es-CO')}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={empresa} onChange={e => setEmpresa(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500">
              <option value="all">Todas las empresas</option>
              {empresas.map(emp => (
                <option key={emp.id || emp.nombre} value={emp.nombre}>{emp.nombre}</option>
              ))}
            </select>

            <select value={periodo} onChange={e => setPeriodo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500">
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>

            {periodo === 'personalizado' && (
              <>
                <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900" />
                <span className="text-slate-400 text-xs">→</span>
                <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900" />
              </>
            )}

            <button onClick={() => fetchData()} disabled={loading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors" title="Actualizar ahora">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button onClick={() => setAutoRefresh(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                autoRefresh ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {autoRefresh ? <><Pause className="w-3 h-3" /> En vivo</> : <><Play className="w-3 h-3" /> Pausado</>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ KPI CHIPS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
          <div className="text-2xl font-black text-slate-900">{casos.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Total registros</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="text-2xl font-black text-indigo-700">
            {casos.reduce((s, c) => s + (c.dias_incapacidad || 0), 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Días totales</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-black text-green-700">{casos.filter(c => c.tiene_ocr).length}</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Con OCR</div>
        </div>
        <div className={`rounded-xl p-4 border ${sinOcr > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`text-2xl font-black ${sinOcr > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>{sinOcr}</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Sin OCR aún</div>
        </div>
        {stats && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-2xl font-black text-green-700">{stats.listas}</div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} className="text-green-500" /> Listas radicar
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-2xl font-black text-red-700">{stats.incompletas}</div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1">
                <XCircle size={10} className="text-red-500" /> Incompletas
              </div>
            </div>
          </>
        )}
      </div>

      {/* Leyenda radicación */}
      {Object.keys(manifests).length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[11px]">
          <span className="text-slate-500 font-semibold">Columnas 📡:</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Lista para radicar</span>
          <span className="flex items-center gap-1"><AlertCircle size={11} className="text-yellow-500" /> Campo aproximable (bot lo infiere)</span>
          <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-orange-500" /> Campo faltante</span>
          <span className="flex items-center gap-1"><XCircle size={11} className="text-red-500" /> Campo crítico faltante — intervención manual</span>
        </div>
      )}

      {sinOcr > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-yellow-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{sinOcr}</strong> caso(s) atenuados — OCR aún no procesó su documento.</span>
        </div>
      )}

      {/* ═══ TABLA PRINCIPAL ═══ */}
      <SortableTable
        data={casos}
        columns={COLS_PLANO}
        title="Plano de Incapacidades — OCR + Estado Radicación"
        exportFilename="plano_incapacidades_ocr"
        maxHeight="600px"
      />

    </div>
  );
}
