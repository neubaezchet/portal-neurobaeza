import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, Download, CheckCircle, XCircle, Clock,
  AlertCircle, Loader2, Copy, Check, ChevronRight,
  Activity, FileSpreadsheet, X, FileText, Building2, Calendar,
  Paperclip, Trash2, Upload, KeyRound, ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';

const ESTADO_CONFIG = {
  pendiente:        { label: 'En espera',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    Icon: Clock },
  procesando:       { label: 'En proceso',   bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200',  dot: 'bg-yellow-500',  Icon: Loader2, spin: true },
  exitosa:          { label: 'Radicada',     bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   dot: 'bg-green-500',   Icon: CheckCircle },
  fallo_temporal:   { label: 'Reintentando', bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500',  Icon: AlertCircle },
  fallo_definitivo: { label: 'Rechazada',    bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     Icon: XCircle },
};

const EPS_NOMBRES = {
  compensar:'Compensar', nueva_eps:'Nueva EPS', salud_total:'Salud Total',
  famisanar:'Famisanar', sura_eps:'EPS SURA', sanitas:'EPS Sanitas',
  medimas:'Medimás', coosalud:'Coosalud', colsanitas:'Colsanitas',
  aliansalud:'Aliansalud', cruz_blanca:'Cruz Blanca / Emssanar', mutual_ser:'Mutual Ser',
  cafe_salud:'Café Salud', coomeva:'Coomeva EPS', arl_sura:'ARL SURA',
  positiva:'ARL Positiva', colmena:'Colmena ARL', liberty:'Liberty ARL',
  bolivar:'Bolívar ARL', mapfre:'Mapfre ARL', equidad:'La Equidad ARL',
  axa_colpatria:'AXA Colpatria ARL',
};

// ─── Helpers de extracción de datos ──────────────────────────────────────────

function getCedula(item) {
  const o = item.datos_ocr || {};
  return o['N° documento'] || o['numero_documento'] || o['cedula'] || '';
}

function getNombre(item) {
  const o = item.datos_ocr || {};
  return o['Nombre trabajador'] || o['nombre'] || o['nombre_trabajador'] || '';
}

function getFechaInicio(item) {
  const o = item.datos_ocr || {};
  return o['Fecha inicio'] || o['fecha_inicio'] || '';
}

function getDias(item) {
  const o = item.datos_ocr || {};
  const raw = o['Días'] || o['dias'] || o['Dias'] || '';
  return String(raw).replace(/\D/g, '') || '';
}

function getTipo(item) {
  const o = item.datos_ocr || {};
  return (
    o['Tipo incapacidad'] || o['tipo_incapacidad'] ||
    o['Tipo doc'] || item.tipo_incapacidad || ''
  );
}

function calcFechaHasta(fechaInicio, dias) {
  if (!fechaInicio || !dias) return null;
  try {
    let d;
    if (String(fechaInicio).includes('/')) {
      const [a, b, c] = fechaInicio.split('/');
      // Soporta DD/MM/YYYY y MM/DD/YYYY — asumimos DD/MM/YYYY
      d = new Date(parseInt(c), parseInt(b) - 1, parseInt(a));
    } else {
      d = new Date(fechaInicio);
    }
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + parseInt(dias) - 1);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return null; }
}

function fmtCorta(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return iso; }
}

function fmtLarga(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return iso; }
}

function getObservacion(item) {
  if (item.fallo_motivo) return item.fallo_motivo;
  if (item.ultimo_error) return item.ultimo_error;
  if (item.estado === 'exitosa')    return '';
  if (item.estado === 'procesando') return 'Radicación en curso';
  if (item.estado === 'pendiente')  return 'En espera de ser procesada';
  if (item.estado === 'fallo_temporal') return `Programado reintento ${item.intentos + 1}`;
  return '';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EstadoRadicacion() {
  const [subTab, setSubTab]           = useState('bandeja');
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEps, setFiltroEps]     = useState('');
  const [copiados, setCopiados]       = useState(new Set());
  const [ultimaAct, setUltimaAct]     = useState(null);
  const [itemDetalle, setItemDetalle] = useState(null);
  const intervalRef = useRef(null);

  // ── Credenciales / soportes ──
  const [configs, setConfigs]               = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [subiendoSoporte, setSubiendoSoporte] = useState({});
  const [errorConfigs, setErrorConfigs]     = useState(null);
  const fileInputRefs = useRef({});

  const getToken = () => localStorage.getItem('portal_token') || '';

  const cargarDatos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const res = await fetch(`${API_BASE_URL}/admin/radicacion/cola?limit=500`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
      setUltimaAct(new Date());
    } catch (e) {
      console.error('Error cargando radicaciones:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    intervalRef.current = setInterval(() => cargarDatos(true), 15000);
    return () => clearInterval(intervalRef.current);
  }, [cargarDatos]);

  const cargarConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    setErrorConfigs(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/bots/todos`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (e) {
      setErrorConfigs('No se pudieron cargar las configuraciones.');
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'credenciales') cargarConfigs();
  }, [subTab, cargarConfigs]);

  const subirSoporte = async (config, file) => {
    const key = config.id;
    setSubiendoSoporte(p => ({ ...p, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `${API_BASE_URL}/admin/empresas/${encodeURIComponent(config.nombre_empresa)}/bots/${encodeURIComponent(config.bot_nombre)}/soporte`,
        { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await cargarConfigs();
    } catch (e) {
      alert('Error al subir el soporte: ' + e.message);
    } finally {
      setSubiendoSoporte(p => ({ ...p, [key]: false }));
      if (fileInputRefs.current[key]) fileInputRefs.current[key].value = '';
    }
  };

  const quitarSoporte = async (config) => {
    if (!window.confirm(`¿Quitar el soporte de ${EPS_NOMBRES[config.bot_nombre] || config.bot_nombre} (${config.nombre_empresa})?`)) return;
    const key = config.id;
    setSubiendoSoporte(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/empresas/${encodeURIComponent(config.nombre_empresa)}/bots/${encodeURIComponent(config.bot_nombre)}/soporte`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await cargarConfigs();
    } catch (e) {
      alert('Error al quitar el soporte: ' + e.message);
    } finally {
      setSubiendoSoporte(p => ({ ...p, [key]: false }));
    }
  };

  // ─── Filtrado ───────────────────────────────────────────────────────────────

  const itemsFiltrados = items.filter(item => {
    const cedula  = getCedula(item).toLowerCase();
    const empresa = (item.empresa || '').toLowerCase();
    const serial  = (item.serial_caso || '').toLowerCase();
    const nombre  = getNombre(item).toLowerCase();
    const q       = busqueda.trim().toLowerCase();

    const matchQ = !q || cedula.includes(q) || empresa.includes(q) || serial.includes(q) || nombre.includes(q);
    const matchE = !filtroEstado || item.estado === filtroEstado;
    const matchP = !filtroEps    || item.eps_key === filtroEps;
    return matchQ && matchE && matchP;
  });

  // ─── Acciones ───────────────────────────────────────────────────────────────

  const copiarRadicado = async (id, radicado, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(radicado);
      setCopiados(prev => new Set([...prev, id]));
      setTimeout(() => setCopiados(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
    } catch {}
  };

  const exportarExcel = () => {
    const rows = itemsFiltrados.map(item => {
      const fechaInicio = getFechaInicio(item);
      const dias        = getDias(item);
      const conf        = ESTADO_CONFIG[item.estado] || {};
      return {
        'Cédula':           getCedula(item),
        'Nombre':           getNombre(item),
        'Serial/Soporte':   item.serial_caso || '',
        'Empresa':          item.empresa || '',
        'EPS':              EPS_NOMBRES[item.eps_key] || item.eps_key || '',
        'Fecha inicio':     fechaInicio,
        'Fecha hasta':      calcFechaHasta(fechaInicio, dias) || '',
        'Días':             dias,
        'Tipo incapacidad': getTipo(item),
        'N° Radicado':      item.radicado || '',
        'Observación':      item.fallo_motivo || item.ultimo_error || '',
        'Fecha radicación': fmtCorta(item.procesado_en),
        'Estado':           conf.label || item.estado,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Radicaciones');
    XLSX.writeFile(wb, `radicaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ─── Conteos para stats ──────────────────────────────────────────────────────

  const cnt = {
    total:     items.length,
    radicadas: items.filter(i => i.estado === 'exitosa').length,
    proceso:   items.filter(i => ['pendiente','procesando','fallo_temporal'].includes(i.estado)).length,
    rechazadas:items.filter(i => i.estado === 'fallo_definitivo').length,
  };

  const epsUnicas = [...new Set(items.map(i => i.eps_key).filter(Boolean))];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Cabecera + sub-tabs ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">

        {/* Título + stats + actualizar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">Estado de Radicación</h2>
              {ultimaAct && (
                <span className="text-xs text-slate-400">
                  · act. {String(ultimaAct.getHours()).padStart(2,'0')}:{String(ultimaAct.getMinutes()).padStart(2,'0')}:{String(ultimaAct.getSeconds()).padStart(2,'0')}
                </span>
              )}
            </div>
            <button
              onClick={() => cargarDatos()}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Total',       value: cnt.total,     bg: 'bg-slate-100',   text: 'text-slate-700' },
              { label: 'Radicadas',   value: cnt.radicadas, bg: 'bg-green-100',   text: 'text-green-700' },
              { label: 'En proceso',  value: cnt.proceso,   bg: 'bg-yellow-100',  text: 'text-yellow-700' },
              { label: 'Rechazadas',  value: cnt.rechazadas,bg: 'bg-red-100',     text: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg}`}>
                <span className={`text-base font-bold ${s.text}`}>{s.value}</span>
                <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-100">
          {[
            { id: 'bandeja',      label: '🔔 Bandeja de Notificaciones' },
            { id: 'reporte',      label: '📊 Reporte Excel' },
            { id: 'credenciales', label: '🔐 Credenciales' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                subTab === t.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Búsqueda + filtros — oculto en tab credenciales */}
        <div className={`p-4 flex flex-wrap gap-3 ${subTab === 'credenciales' ? 'hidden' : ''}`}>
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cédula, empresa o soporte..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todos los estados</option>
            <option value="exitosa">Radicadas</option>
            <option value="procesando">En proceso</option>
            <option value="pendiente">En espera</option>
            <option value="fallo_temporal">Reintentando</option>
            <option value="fallo_definitivo">Rechazadas</option>
          </select>
          <select
            value={filtroEps}
            onChange={e => setFiltroEps(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Todas las EPS / ARL</option>
            {epsUnicas.map(k => (
              <option key={k} value={k}>{EPS_NOMBRES[k] || k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          SUB-TAB: BANDEJA DE NOTIFICACIONES
      ──────────────────────────────────────────────────────────────────────── */}
      {subTab === 'bandeja' && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" />
              Cargando radicaciones...
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
              {busqueda
                ? <>No se encontraron resultados para <strong>"{busqueda}"</strong></>
                : 'No hay radicaciones registradas aún'}
            </div>
          ) : (
            itemsFiltrados.map(item => {
              const conf       = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
              const { Icon }   = conf;
              const cedula     = getCedula(item);
              const nombre     = getNombre(item);
              const fechaInicio= getFechaInicio(item);
              const dias       = getDias(item);
              const tipo       = getTipo(item);
              const fechaHasta = calcFechaHasta(fechaInicio, dias);
              const obs        = getObservacion(item);
              const copiado    = copiados.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setItemDetalle(item)}
                  className={`bg-white rounded-xl border ${conf.border} shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">

                      {/* Dot de estado */}
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${conf.dot} ${item.estado === 'procesando' ? 'animate-pulse' : ''}`} />

                      <div className="flex-1 min-w-0">

                        {/* Fila 1: cédula · nombre · empresa · badge */}
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                          <span className="text-base font-bold text-slate-800 tracking-wide">
                            {cedula || 'Sin cédula'}
                          </span>
                          {nombre && (
                            <span className="text-sm text-slate-600">— {nombre}</span>
                          )}
                          {item.empresa && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {item.empresa}
                            </span>
                          )}
                          <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${conf.bg} ${conf.text}`}>
                            <Icon size={11} className={item.estado === 'procesando' ? 'animate-spin' : ''} />
                            {conf.label}
                          </span>
                        </div>

                        {/* Fila 2: EPS · tipo · días */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-slate-500">
                          <span className="font-medium text-slate-700">
                            {EPS_NOMBRES[item.eps_key] || item.eps_key || '—'}
                          </span>
                          {tipo && <><span className="text-slate-300">·</span><span>{tipo}</span></>}
                          {dias && <><span className="text-slate-300">·</span><span className="font-semibold text-slate-700">{dias} días</span></>}
                        </div>

                        {/* Fila 3: fechas */}
                        {fechaInicio && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {fechaInicio}
                            {fechaHasta && <> <span className="text-slate-300">→</span> {fechaHasta}</>}
                          </div>
                        )}

                        {/* Radicado (si exitosa) */}
                        {item.estado === 'exitosa' && item.radicado && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                              N° Radicado: {item.radicado}
                            </span>
                            <button
                              onClick={(e) => copiarRadicado(item.id, item.radicado, e)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copiar número de radicado"
                            >
                              {copiado
                                ? <Check size={13} className="text-green-500" />
                                : <Copy size={13} />
                              }
                            </button>
                          </div>
                        )}

                        {/* Observación (si no exitosa) */}
                        {item.estado !== 'exitosa' && obs && (
                          <div className={`mt-2 text-xs px-2.5 py-1.5 rounded-lg ${conf.bg} ${conf.text} max-w-xl leading-snug`}>
                            {obs}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {item.serial_caso && (
                          <span title={item.serial_caso}>
                            📄 {item.serial_caso.length > 45
                              ? item.serial_caso.substring(0, 45) + '…'
                              : item.serial_caso}
                          </span>
                        )}
                        {item.procesado_en
                          ? <span>Radicado: {fmtLarga(item.procesado_en)}</span>
                          : item.creado_en
                          ? <span>Creado: {fmtLarga(item.creado_en)}</span>
                          : null
                        }
                        {item.estado === 'fallo_temporal' && item.intentos > 0 && (
                          <span className="text-orange-500">Intento {item.intentos}</span>
                        )}
                      </div>

                      <span className="flex items-center gap-1 text-xs text-slate-300 group-hover:text-indigo-400 flex-shrink-0 ml-2 transition-colors">
                        Ver detalle <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          SUB-TAB: REPORTE EXCEL
      ──────────────────────────────────────────────────────────────────────── */}
      {subTab === 'reporte' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-green-600" />
              <span className="font-medium text-slate-700">{itemsFiltrados.length} registro(s)</span>
            </div>
            <button
              onClick={exportarExcel}
              disabled={itemsFiltrados.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download size={15} />
              Exportar Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[
                    'Cédula','Nombre','Empresa','EPS',
                    'F. inicio','F. hasta','Días','Tipo',
                    'N° Radicado','Observación','F. radicación','Estado',
                  ].map(col => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-slate-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" />Cargando...
                    </td>
                  </tr>
                ) : itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-slate-400">
                      Sin registros para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map(item => {
                    const conf       = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
                    const { Icon }   = conf;
                    const fechaInicio= getFechaInicio(item);
                    const dias       = getDias(item);
                    const obs        = item.fallo_motivo || item.ultimo_error || '';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setItemDetalle(item)}
                        className="border-b border-slate-50 hover:bg-indigo-50/60 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                          {getCedula(item) || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[130px] truncate">
                          {getNombre(item) || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[120px] truncate">
                          {item.empresa || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {EPS_NOMBRES[item.eps_key] || item.eps_key || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {fechaInicio || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {calcFechaHasta(fechaInicio, dias) || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-700 font-medium">
                          {dias || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[110px] truncate">
                          {getTipo(item) || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-green-700 whitespace-nowrap">
                          {item.radicado || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 max-w-[200px]">
                          <span title={obs} className="block truncate">{obs || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {fmtCorta(item.procesado_en)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                            <Icon size={10} className={item.estado === 'procesando' ? 'animate-spin' : ''} />
                            {conf.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          SUB-TAB: CREDENCIALES / SOPORTES
      ──────────────────────────────────────────────────────────────────────── */}
      {subTab === 'credenciales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Cabecera de la sección */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-indigo-600" />
              <span className="font-semibold text-slate-800">Soportes por EPS / ARL</span>
              <span className="text-xs text-slate-400 ml-1">· adjunto automático al radicar</span>
            </div>
            <button
              onClick={cargarConfigs}
              disabled={loadingConfigs}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} className={loadingConfigs ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {loadingConfigs ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Cargando configuraciones...
            </div>
          ) : errorConfigs ? (
            <div className="flex items-center justify-center py-16 text-red-500 gap-2">
              <AlertCircle size={18} /> {errorConfigs}
            </div>
          ) : configs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <ShieldCheck size={18} /> No hay configuraciones de bots registradas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {configs.map(cfg => {
                const key = cfg.id;
                const busy = !!subiendoSoporte[key];
                const epsNombre = EPS_NOMBRES[cfg.bot_nombre] || cfg.bot_nombre;
                return (
                  <div key={key} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">

                    {/* Indicador soporte */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.tiene_soporte ? 'bg-green-500' : 'bg-slate-300'}`} title={cfg.tiene_soporte ? 'Con soporte' : 'Sin soporte'} />

                    {/* Info empresa + EPS */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{cfg.nombre_empresa}</span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">{epsNombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.estado === 'activo' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {cfg.estado}
                        </span>
                      </div>
                      {cfg.tiene_soporte ? (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                          <Paperclip size={11} />
                          <span className="truncate max-w-[280px]">{cfg.soporte_nombre}</span>
                          {cfg.soporte_actualizado_en && (
                            <span className="text-slate-400">· {fmtCorta(cfg.soporte_actualizado_en)}</span>
                          )}
                          {cfg.soporte_drive_url && (
                            <a
                              href={cfg.soporte_drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-500 hover:underline ml-1"
                              onClick={e => e.stopPropagation()}
                            >
                              Ver
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-slate-400">Sin soporte adjunto</div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Input de archivo oculto */}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        ref={el => { fileInputRefs.current[key] = el; }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) subirSoporte(cfg, f);
                        }}
                      />
                      <button
                        disabled={busy}
                        onClick={() => fileInputRefs.current[key]?.click()}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {cfg.tiene_soporte ? 'Reemplazar' : 'Adjuntar'}
                      </button>
                      {cfg.tiene_soporte && (
                        <button
                          disabled={busy}
                          onClick={() => quitarSoporte(cfg)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: DETALLE DE RADICACIÓN
      ──────────────────────────────────────────────────────────────────────── */}
      {itemDetalle && (
        <DetalleModal
          item={itemDetalle}
          onClose={() => setItemDetalle(null)}
          onCopiar={copiarRadicado}
          copiados={copiados}
        />
      )}
    </div>
  );
}

// ─── Modal de detalle (drill-down al estilo Power BI) ────────────────────────

function DetalleModal({ item, onClose, onCopiar, copiados }) {
  const conf        = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.pendiente;
  const { Icon }     = conf;
  const cedula       = getCedula(item);
  const nombre       = getNombre(item);
  const fechaInicio  = getFechaInicio(item);
  const dias         = getDias(item);
  const tipo         = getTipo(item);
  const fechaHasta   = calcFechaHasta(fechaInicio, dias);
  const obs          = item.fallo_motivo || item.ultimo_error || '';
  const copiado      = copiados.has(item.id);
  const ocrEntries   = Object.entries(item.datos_ocr || {});
  const manEntries   = Object.entries(item.datos_manuales || {});

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b border-slate-100 ${conf.bg}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/70 ${conf.text}`}>
                <Icon size={13} className={item.estado === 'procesando' ? 'animate-spin' : ''} />
                {conf.label}
              </span>
              <h3 className="text-xl font-bold text-slate-800 mt-2">{cedula || 'Sin cédula'}</h3>
              {nombre && <p className="text-sm text-slate-500">{nombre}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Empresa / EPS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Building2 size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">Empresa</div>
                <div className="text-sm font-medium text-slate-700">{item.empresa || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-400">EPS / ARL</div>
                <div className="text-sm font-medium text-slate-700">
                  {EPS_NOMBRES[item.eps_key] || item.eps_key || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Datos de la incapacidad */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> Fecha inicio</div>
              <div className="text-sm font-medium text-slate-700">{fechaInicio || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> Fecha hasta</div>
              <div className="text-sm font-medium text-slate-700">{fechaHasta || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Días de incapacidad</div>
              <div className="text-sm font-medium text-slate-700">{dias || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Tipo de incapacidad</div>
              <div className="text-sm font-medium text-slate-700">{tipo || '—'}</div>
            </div>
          </div>

          {/* Serial / soporte completo */}
          {item.serial_caso && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Serial / Soporte</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 break-all">
                {item.serial_caso}
              </div>
            </div>
          )}

          {/* Radicado exitoso u observación del fallo */}
          {item.estado === 'exitosa' && item.radicado ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-green-600 font-medium">N° de Radicado</div>
                <div className="text-lg font-bold text-green-800">{item.radicado}</div>
              </div>
              <button
                onClick={() => onCopiar(item.id, item.radicado)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg text-sm text-green-700 hover:bg-green-100 transition-colors flex-shrink-0"
              >
                {copiado ? <Check size={14} /> : <Copy size={14} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          ) : obs ? (
            <div className={`rounded-xl p-4 border ${conf.border} ${conf.bg}`}>
              <div className={`text-xs font-semibold mb-1 ${conf.text}`}>Observación / Motivo</div>
              <div className={`text-sm ${conf.text} leading-relaxed`}>{obs}</div>
            </div>
          ) : null}

          {/* Fechas de proceso + intentos */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">Creado</div>
              <div className="text-slate-600">{fmtLarga(item.creado_en)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Procesado / Radicado</div>
              <div className="text-slate-600">{fmtLarga(item.procesado_en)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Intentos</div>
              <div className="text-slate-600">{item.intentos ?? 0}</div>
            </div>
          </div>

          {/* Datos OCR completos */}
          {ocrEntries.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Datos extraídos (OCR)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ocrEntries.map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-400">{k}</div>
                    <div className="text-sm text-slate-700">{String(v ?? '') || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos manuales */}
          {manEntries.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Datos manuales
              </div>
              <div className="grid grid-cols-2 gap-2">
                {manEntries.map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-400">{k}</div>
                    <div className="text-sm text-slate-700">{String(v ?? '') || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de reintentos */}
          {item.historial_errores?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Historial de reintentos
              </div>
              <div className="space-y-1.5">
                {item.historial_errores.map((h, i) => (
                  <div key={i} className="text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-600">
                    <span className="font-medium">Intento {h.intento}:</span> {h.error}
                    <span className="text-red-400"> — {fmtLarga(h.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
