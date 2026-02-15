import React, { useState, useCallback, useRef } from 'react';
import {
  Search, User, Activity, AlertTriangle, Calendar, TrendingUp,
  Download, ChevronRight, ChevronDown, FileText, Shield, Clock, BarChart3,
  Loader2, X, Zap, Heart, AlertCircle, Eye, Users, Building2, Filter
} from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════════
// POWER BI DASHBOARD v2 — Global + Individual + Multi-Cédula
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  enfermedad_general:  { bg: '#3b82f6', light: '#93c5fd', label: 'Enfermedad General' },
  enfermedad_laboral:  { bg: '#f59e0b', light: '#fcd34d', label: 'Enfermedad Laboral' },
  accidente_transito:  { bg: '#ef4444', light: '#fca5a5', label: 'Accid. Tránsito' },
  maternidad:          { bg: '#ec4899', light: '#f9a8d4', label: 'Maternidad' },
  paternidad:          { bg: '#8b5cf6', light: '#c4b5fd', label: 'Paternidad' },
  prelicencia:         { bg: '#06b6d4', light: '#67e8f9', label: 'Prelicencia' },
  certificado:         { bg: '#10b981', light: '#6ee7b7', label: 'Certificado' },
  especial:            { bg: '#f97316', light: '#fdba74', label: 'Especial' },
  sin_tipo:            { bg: '#6b7280', light: '#d1d5db', label: 'Sin Tipo' },
};

const ESTADO_COLORS = {
  nuevo: '#3b82f6', en_revision: '#f59e0b', completa: '#10b981',
  incompleta: '#ef4444', ilegible: '#f97316', incompleta_ilegible: '#dc2626',
  eps_transcripcion: '#8b5cf6', derivado_tthh: '#06b6d4',
  causa_extra: '#ec4899', en_radicacion: '#14b8a6',
};

const CAT_META = {
  superan_180:       { icon: AlertTriangle, iconColor: 'text-red-400',    ringColor: 'ring-red-500/40',     barColor: '#ef4444' },
  cerca_180:         { icon: AlertCircle,   iconColor: 'text-orange-400', ringColor: 'ring-orange-500/40',  barColor: '#f97316' },
  con_gaps_criticos: { icon: Shield,        iconColor: 'text-yellow-400', ringColor: 'ring-yellow-500/40',  barColor: '#eab308' },
  prorrogas_activas: { icon: Zap,           iconColor: 'text-blue-400',   ringColor: 'ring-blue-500/40',    barColor: '#3b82f6' },
  sin_prorroga:      { icon: Heart,         iconColor: 'text-green-400',  ringColor: 'ring-green-500/40',   barColor: '#10b981' },
};

const fetchAPI = (path) =>
  fetch(`${API_CONFIG.BASE_URL}${path}`, { headers: { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN } })
    .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json(); });

// ══════════════════ REUSABLE MINI COMPONENTS ══════════════════

function KPI({ icon: Icon, label, value, sub, color = 'blue', alert: isAlert }) {
  const colorMap = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/20' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
    green: { text: 'text-green-400', bg: 'bg-green-500/20' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`relative bg-gray-900/80 border rounded-xl p-4 transition-all hover:scale-[1.02] ${
      isAlert ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-gray-700/60'
    }`}>
      {isAlert && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-2xl font-black mt-1 ${isAlert ? 'text-red-400' : c.text}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${isAlert ? 'bg-red-500/20' : c.bg}`}>
          <Icon className={`w-4 h-4 ${isAlert ? 'text-red-400' : c.text}`} />
        </div>
      </div>
    </div>
  );
}

function BarChartCSS({ data, title, icon: Icon, valueKey = 'dias', labelKey = 'label', color = '#3b82f6' }) {
  if (!data || !data.length) return null;
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-400" /> {title}
        </h3>
      </div>
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {data.map((d, i) => (
          <div key={i} className="group">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-gray-400 truncate max-w-[60%]">{d[labelKey]}</span>
              <span className="text-white font-bold">{d[valueKey]}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                style={{ width: `${(d[valueKey] / maxVal) * 100}%`, backgroundColor: d.color || color, minWidth: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data, title }) {
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let accumulated = 0;
  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const start = accumulated;
    accumulated += pct;
    return { ...d, pct, start };
  });
  const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ');
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-4">
      <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-400" /> {title}
      </h3>
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 flex-shrink-0">
          <div className="w-28 h-28 rounded-full" style={{ background: `conic-gradient(${gradientParts})` }} />
          <div className="absolute inset-3 bg-gray-900 rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-black text-white">{total}</div>
              <div className="text-[8px] text-gray-500">TOTAL</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-400 truncate flex-1">{s.label}</span>
              <span className="text-white font-bold">{s.value}</span>
              <span className="text-gray-600">{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════ TIMELINE GANTT ══════════════════

function TimelineGantt({ timeline, gaps, cadenas }) {
  const [tooltip, setTooltip] = useState(null);
  if (!timeline || !timeline.length) return null;

  const allDates = [];
  timeline.forEach(t => {
    if (t.fecha_inicio) allDates.push(new Date(t.fecha_inicio));
    if (t.fecha_fin) allDates.push(new Date(t.fecha_fin));
  });
  (gaps || []).forEach(g => {
    if (g.fecha_inicio) allDates.push(new Date(g.fecha_inicio));
    if (g.fecha_fin) allDates.push(new Date(g.fecha_fin));
  });
  if (!allDates.length) return null;

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = Math.max((maxDate - minDate) / (86400000), 1);
  const getPos = (ds) => ((new Date(ds) - minDate) / 86400000) / totalDays * 100;
  const getW = (s, e) => Math.max(((new Date(e) - new Date(s)) / 86400000) / totalDays * 100, 0.5);

  const cadenaCasos = {};
  (cadenas || []).forEach((cad, ci) => {
    if (cad.caso_inicial && cad.caso_inicial.serial) cadenaCasos[cad.caso_inicial.serial] = ci;
    (cad.prorrogas || []).forEach(p => { if (p.serial) cadenaCasos[p.serial] = ci; });
  });

  const months = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const pos = getPos(cursor.toISOString().slice(0, 10));
    if (pos >= 0 && pos <= 100) months.push({ pos, label: cursor.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" /> Línea de Tiempo
        </h3>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Incapacidad</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Gap (&gt;30d)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-500 inline-block" /> Gap menor</span>
        </div>
      </div>
      <div className="p-4 relative" style={{ minHeight: 80 }}>
        <div className="relative h-5 mb-2 border-b border-gray-800">
          {months.map((m, i) => (
            <div key={i} className="absolute text-[9px] text-gray-500 font-mono" style={{ left: `${m.pos}%` }}>
              <div className="border-l border-gray-700/40 h-64 absolute top-0" style={{ zIndex: 0 }} />
              {m.label}
            </div>
          ))}
        </div>
        <div className="relative h-10 bg-gray-800/50 rounded-lg overflow-visible mt-4">
          {timeline.map((t, i) => {
            if (!t.fecha_inicio || !t.fecha_fin) return null;
            const left = getPos(t.fecha_inicio);
            const width = getW(t.fecha_inicio, t.fecha_fin);
            const col = COLORS[t.tipo] || COLORS.sin_tipo;
            const cadIdx = cadenaCasos[t.serial];
            return (
              <div key={i} className="absolute h-full rounded cursor-pointer transition-all hover:brightness-125 hover:ring-2 hover:ring-white/30 hover:z-20"
                style={{ left: `${left}%`, width: `${width}%`, minWidth: 4, backgroundColor: col.bg,
                  border: cadIdx !== undefined ? `2px solid ${col.light}` : 'none', zIndex: 10 }}
                onMouseEnter={() => setTooltip({ x: left, item: t, type: 'incap', cadena: cadIdx !== undefined ? `Cadena #${cadIdx + 1}` : null })}
                onMouseLeave={() => setTooltip(null)}>
                {width > 3 && <span className="text-[8px] text-white font-bold px-1 truncate block leading-10">{t.dias}d</span>}
              </div>
            );
          })}
          {(gaps || []).map((g, i) => {
            if (!g.fecha_inicio || !g.fecha_fin) return null;
            const left = getPos(g.fecha_inicio);
            const width = getW(g.fecha_inicio, g.fecha_fin);
            return (
              <div key={`g${i}`} className={`absolute h-full rounded cursor-pointer transition-all hover:brightness-125 hover:z-20 ${g.corta_prorroga ? 'animate-pulse' : ''}`}
                style={{ left: `${left}%`, width: `${width}%`, minWidth: 3,
                  backgroundColor: g.corta_prorroga ? '#ef4444' : '#eab308', opacity: 0.7, zIndex: 15,
                  backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.2) 3px,rgba(0,0,0,.2) 6px)' }}
                onMouseEnter={() => setTooltip({ x: left, item: g, type: 'gap' })}
                onMouseLeave={() => setTooltip(null)}>
                {width > 4 && <span className={`text-[8px] font-black px-1 truncate block leading-10 ${g.corta_prorroga ? 'text-white' : 'text-yellow-900'}`}>{g.dias}d</span>}
              </div>
            );
          })}
        </div>
        {tooltip && (
          <div className="absolute top-20 bg-gray-950 border border-gray-600 rounded-lg p-3 shadow-2xl z-50 text-xs max-w-xs" style={{ left: `${Math.min(tooltip.x, 70)}%` }}>
            {tooltip.type === 'incap' ? (<>
              <p className="font-bold text-white">{tooltip.item.serial}</p>
              <p className="text-gray-400">{tooltip.item.fecha_inicio} → {tooltip.item.fecha_fin} ({tooltip.item.dias}d)</p>
              <p className="text-blue-400">{(tooltip.item.tipo || '').replace(/_/g, ' ')}</p>
              {tooltip.item.diagnostico && <p className="text-gray-300 mt-1">{tooltip.item.diagnostico.substring(0, 80)}</p>}
              {tooltip.item.codigo_cie10 && <p className="text-cyan-400 font-mono">{tooltip.item.codigo_cie10} — {tooltip.item.cie10_descripcion}</p>}
              {tooltip.cadena && <p className="text-purple-400 font-bold mt-1">&#128279; {tooltip.cadena}</p>}
            </>) : (<>
              <p className={`font-bold ${tooltip.item.corta_prorroga ? 'text-red-400' : 'text-yellow-400'}`}>
                {tooltip.item.corta_prorroga ? '&#128308; GAP CRÍTICO — CORTA PRÓRROGA' : '&#128993; Hueco'}
              </p>
              <p className="text-gray-400">{tooltip.item.fecha_inicio} → {tooltip.item.fecha_fin}</p>
              <p className="text-white font-bold">{tooltip.item.dias} días sin cobertura</p>
              {tooltip.item.corta_prorroga && <p className="text-red-300 text-[10px] mt-1">Brecha &gt;30d: reinicia conteo</p>}
            </>)}
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-800 flex justify-between text-[9px] text-gray-500 font-mono">
        <span>{minDate.toLocaleDateString('es-CO')}</span>
        <span>{totalDays.toFixed(0)} días</span>
        <span>{maxDate.toLocaleDateString('es-CO')}</span>
      </div>
    </div>
  );
}

// ══════════════════ INCAPACIDADES TABLE ══════════════════

function IncapacidadesTable({ timeline, gaps, onExport }) {
  const [showAll, setShowAll] = useState(false);
  const items = [
    ...(timeline || []).map(t => ({ ...t, _type: 'incap', _sortDate: t.fecha_inicio })),
    ...(gaps || []).map(g => ({ ...g, _type: 'gap', _sortDate: g.fecha_inicio })),
  ].sort((a, b) => (a._sortDate || '').localeCompare(b._sortDate || ''));
  const visible = showAll ? items : items.slice(0, 20);

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" /> Detalle ({(timeline||[]).length} incapacidades + {(gaps||[]).length} gaps)
        </h3>
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-600/30">
            <Download className="w-3 h-3" /> CSV
          </button>
        )}
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-950 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Tipo</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Inicio</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Fin</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Días</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Diagnóstico / CIE-10</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Serial</th>
              <th className="px-3 py-2 text-left text-gray-500 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {visible.map((item, i) => (
              item._type === 'gap' ? (
                <tr key={`g${i}`} className="bg-red-950/30 hover:bg-red-900/40">
                  <td className="px-3 py-2" colSpan={7}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        item.corta_prorroga ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{item.corta_prorroga ? '&#128308; CORTA PRÓRROGA' : '&#128993; HUECO'}</span>
                      <span className="text-red-300 font-bold">{item.dias} días sin cobertura</span>
                      <span className="text-gray-500">{item.fecha_inicio} → {item.fecha_fin}</span>
                      {item.corta_prorroga && <span className="text-red-400 text-[9px] ml-auto">Brecha &gt;30d</span>}
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={`i${i}`} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (COLORS[item.tipo] || COLORS.sin_tipo).bg }} />
                    <span className="text-gray-300 text-[10px]">{(COLORS[item.tipo] || COLORS.sin_tipo).label}</span>
                  </span></td>
                  <td className="px-3 py-2 font-mono text-gray-300">{item.fecha_inicio}</td>
                  <td className="px-3 py-2 font-mono text-gray-300">{item.fecha_fin}</td>
                  <td className="px-3 py-2 font-bold text-white">{item.dias}</td>
                  <td className="px-3 py-2 max-w-xs">
                    {item.codigo_cie10 && <span className="text-cyan-400 font-mono text-[10px] mr-1">[{item.codigo_cie10}]</span>}
                    <span className="text-gray-400 text-[10px]">{(item.diagnostico || item.cie10_descripcion || '').substring(0, 60)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-blue-300 text-[10px]">{item.serial}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                      backgroundColor: `${ESTADO_COLORS[item.estado] || '#6b7280'}20`,
                      color: ESTADO_COLORS[item.estado] || '#9ca3af',
                    }}>{(item.estado || '').replace(/_/g, ' ')}</span>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 20 && (
        <div className="px-4 py-2 border-t border-gray-800 text-center">
          <button onClick={() => setShowAll(!showAll)} className="text-blue-400 text-xs font-bold hover:text-blue-300">
            {showAll ? 'Mostrar menos' : `Ver todos (${items.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════ CADENAS + ALERTAS ══════════════════

function CadenasProrroga({ cadenas }) {
  const activas = (cadenas || []).filter(c => c.es_cadena_prorroga);
  if (!activas.length) return null;
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" /> Cadenas de Prórroga ({activas.length})
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {activas.map((cad, i) => {
          const pct = Math.min((cad.dias_acumulados / 180) * 100, 100);
          const sup = cad.dias_acumulados >= 180;
          const cri = cad.dias_acumulados >= 170;
          const ale = cad.dias_acumulados >= 150;
          return (
            <div key={i} className={`border rounded-xl p-4 ${sup ? 'border-red-500/60 bg-red-950/20' : cri ? 'border-orange-500/60 bg-orange-950/10' : ale ? 'border-yellow-500/50 bg-yellow-950/10' : 'border-gray-700/60 bg-gray-800/30'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Cadena #{cad.id_cadena} — {cad.total_incapacidades_cadena} incap.</span>
                <span className={`text-xs font-black ${sup ? 'text-red-400' : cri ? 'text-orange-400' : ale ? 'text-yellow-400' : 'text-green-400'}`}>{cad.dias_acumulados}d / 180d</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden relative">
                <div className="absolute top-0 h-3 w-px bg-yellow-500/50 z-10" style={{ left: `${(150/180)*100}%` }} />
                <div className="absolute top-0 h-3 w-px bg-red-500/50 z-10" style={{ left: `${(170/180)*100}%` }} />
                <div className={`h-3 rounded-full transition-all duration-1000 ${sup ? 'bg-red-500' : cri ? 'bg-orange-500' : ale ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[9px] text-gray-500">
                <span>{cad.fecha_inicio_cadena ? cad.fecha_inicio_cadena.slice(0, 10) : ''}</span>
                <span>CIE-10: {(cad.codigos_cie10 || []).join(', ') || '—'}</span>
                <span>{cad.fecha_fin_cadena ? cad.fecha_fin_cadena.slice(0, 10) : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertasPanel({ alertas, huecos }) {
  const items = [
    ...(alertas || []).map(a => ({ ...a, _t: 'alerta' })),
    ...(huecos || []).map(h => ({ ...h, _t: 'hueco', severidad: 'critica', mensaje: h.mensaje })),
  ];
  if (!items.length) return null;
  return (
    <div className="bg-gray-900/80 border border-red-500/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-red-500/20 bg-red-950/20">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alertas ({items.length})</h3>
      </div>
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
        {items.map((a, i) => (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
            a.severidad === 'critica' ? 'bg-red-950/30 border-red-500/30 text-red-300' :
            a.severidad === 'alta' ? 'bg-orange-950/30 border-orange-500/30 text-orange-300' :
            'bg-yellow-950/20 border-yellow-500/20 text-yellow-300'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{a.tipo || a._t}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{a.mensaje}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CATEGORY CARDS FOR GLOBAL VIEW — 180d breakdown
// ══════════════════════════════════════════════════════════

function CategorySection({ catKey, cat, onSelectPerson }) {
  const [open, setOpen] = useState(catKey === 'superan_180' || catKey === 'cerca_180');
  const meta = CAT_META[catKey] || CAT_META.sin_prorroga;
  const Icon = meta.icon;
  const count = cat.personas.length;
  if (count === 0) return null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? `${meta.ringColor} ring-1` : 'border-gray-700/60'}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-3 bg-gray-900/80 hover:bg-gray-800/80 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
          <Icon className={`w-4 h-4 ${meta.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{cat.label}</p>
          <p className="text-[10px] text-gray-500">{count} persona{count !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg" style={{ color: cat.color, backgroundColor: `${cat.color}15` }}>
          {count}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-800 max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-950 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500">Nombre</th>
                <th className="px-3 py-2 text-left text-gray-500">Cédula</th>
                <th className="px-3 py-2 text-left text-gray-500">Empresa</th>
                <th className="px-3 py-2 text-left text-gray-500">Incap.</th>
                <th className="px-3 py-2 text-left text-gray-500">Días</th>
                <th className="px-3 py-2 text-left text-gray-500">Max Cadena</th>
                <th className="px-3 py-2 text-left text-gray-500">Gaps</th>
                <th className="px-3 py-2 text-left text-gray-500">180d</th>
                <th className="px-3 py-2 text-left text-gray-500"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {cat.personas.map((p, i) => (
                <tr key={i} className="hover:bg-gray-800/50 cursor-pointer group" onClick={() => onSelectPerson(p.cedula)}>
                  <td className="px-3 py-2 font-bold text-white">{p.nombre}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.cedula}</td>
                  <td className="px-3 py-2 text-gray-400">{p.empresa}</td>
                  <td className="px-3 py-2 text-blue-400 font-bold">{p.total_incapacidades}</td>
                  <td className="px-3 py-2 text-white font-bold">{p.total_dias}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${p.pct_180}%`, backgroundColor: cat.color }} />
                      </div>
                      <span style={{ color: cat.color }} className="font-bold text-[10px]">{p.max_cadena_dias}d</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {p.gaps_criticos > 0 ? (
                      <span className="text-red-400 font-bold">{p.gaps_criticos} &#128308;</span>
                    ) : p.total_gaps > 0 ? (
                      <span className="text-yellow-400">{p.total_gaps}</span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden" style={{ width: 60 }}>
                      <div className={`h-2.5 rounded-full ${p.supera_180 ? 'bg-red-500' : p.cerca_180 ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${p.pct_180}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export default function PowerBIDashboard({ empresas = [] }) {
  const [vista, setVista] = useState('global');
  const [query, setQuery] = useState('');
  const [empresa, setEmpresa] = useState('all');

  // Global state
  const [globalData, setGlobalData] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Individual state
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [personData, setPersonData] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);

  const [error, setError] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ─── GLOBAL LOAD ───
  const loadGlobal = useCallback(async (cedulas) => {
    setGlobalLoading(true);
    setError(null);
    setPersonData(null);
    try {
      const params = new URLSearchParams();
      params.set('empresa', empresa);
      if (cedulas) params.set('cedulas', cedulas);
      const data = await fetchAPI(`/validador/casos/powerbi/global?${params}`);
      setGlobalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGlobalLoading(false);
    }
  }, [empresa]);

  // ─── SEARCH ───
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    setError(null);
    try {
      const data = await fetchAPI(`/validador/casos/powerbi/buscar?q=${encodeURIComponent(q)}&empresa=${empresa}`);
      setSearchResults(data.resultados || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }, [empresa]);

  const handleSearchInput = (val) => {
    setQuery(val);
    if (vista === 'individual') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val), 400);
    }
  };

  // ─── LOAD PERSON ───
  const loadPerson = async (cedula) => {
    setPersonLoading(true);
    setError(null);
    setSearchResults(null);
    setQuery(cedula);
    try {
      const data = await fetchAPI(`/validador/casos/powerbi/persona/${cedula}`);
      setPersonData(data);
      setVista('individual');
    } catch (err) {
      setError(err.message);
      setPersonData(null);
    } finally {
      setPersonLoading(false);
    }
  };

  // ─── HANDLE MAIN SEARCH (supports comma-separated) ───
  const handleMainSearch = () => {
    if (!query.trim()) {
      loadGlobal('');
      return;
    }
    if (query.includes(',')) {
      setVista('global');
      loadGlobal(query.trim());
    } else {
      if (vista === 'global') {
        loadGlobal(query.trim());
      } else {
        doSearch(query);
      }
    }
  };

  // ─── EXPORT CSV INDIVIDUAL ───
  const exportCSV = () => {
    if (!personData) return;
    const rows = [
      ['Serial', 'Fecha Inicio', 'Fecha Fin', 'Dias', 'Tipo', 'Estado', 'Diagnostico', 'CIE-10', 'Desc CIE-10', 'EPS', 'Prorroga', 'Medico', 'Institucion'],
      ...personData.timeline.map(t => [
        t.serial, t.fecha_inicio, t.fecha_fin, t.dias, t.tipo, t.estado,
        '"' + (t.diagnostico || '').replace(/"/g, '""') + '"', t.codigo_cie10, t.cie10_descripcion,
        t.eps, t.es_prorroga ? 'Si' : 'No', t.medico_tratante, t.institucion_origen
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'powerbi_' + personData.empleado.cedula + '_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportGlobalCSV = () => {
    if (!globalData || !globalData.personas) return;
    const rows = [
      ['Cedula', 'Nombre', 'Empresa', 'Area', 'Cargo', 'EPS', 'Incapacidades', 'Dias Total', 'Cadenas Prorroga', 'Max Cadena Dias', 'Gaps Criticos', 'Total Gaps', 'Supera 180', 'Cerca 180', 'Porcentaje 180d'],
      ...globalData.personas.map(p => [
        p.cedula, p.nombre, p.empresa, p.area, p.cargo, p.eps,
        p.total_incapacidades, p.total_dias, p.cadenas_prorroga, p.max_cadena_dias,
        p.gaps_criticos, p.total_gaps, p.supera_180 ? 'Si' : 'No', p.cerca_180 ? 'Si' : 'No', p.pct_180
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'powerbi_global_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const kpis = personData ? personData.kpis : null;
  const emp = personData ? personData.empleado : null;
  const gRes = globalData ? globalData.resumen : null;

  return (
    <div className="space-y-4">
      {/* ═══════ HEADER ═══════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-gray-700/60 rounded-2xl p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          {/* Title + mode toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Power BI Dashboard</h2>
                <p className="text-blue-200/50 text-[10px]">Análisis interactivo de incapacidades, prórrogas y cobertura</p>
              </div>
            </div>
            <div className="flex bg-gray-800/80 rounded-xl p-1 border border-gray-700/60">
              <button onClick={() => { setVista('global'); setPersonData(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  vista === 'global' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white'
                }`}><Users className="w-3.5 h-3.5" /> Vista Global</button>
              <button onClick={() => setVista('individual')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  vista === 'individual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white'
                }`}><User className="w-3.5 h-3.5" /> Individual</button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input ref={searchRef} type="text" value={query}
                onChange={e => handleSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleMainSearch(); }}
                placeholder={vista === 'global'
                  ? 'Cédulas separadas por coma (ej: 108504, 390175) o vacío para ver todos...'
                  : 'Buscar por cédula o nombre del empleado...'}
                className="w-full pl-12 pr-10 py-3.5 bg-gray-900/80 border border-gray-600/60 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              {query && (
                <button onClick={() => { setQuery(''); setSearchResults(null); setPersonData(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              )}
            </div>
            <select value={empresa} onChange={e => setEmpresa(e.target.value)}
              className="px-4 py-3.5 bg-gray-900/80 border border-gray-600/60 rounded-xl text-white text-sm min-w-[180px] focus:ring-2 focus:ring-blue-500">
              <option value="all">Todas las empresas</option>
              {empresas.map((emp2, i) => <option key={i} value={emp2}>{emp2}</option>)}
            </select>
            <button onClick={handleMainSearch}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2">
              <Search className="w-4 h-4" />
              {vista === 'global' ? 'Analizar' : 'Buscar'}
            </button>
          </div>

          {vista === 'global' && (
            <p className="text-[10px] text-blue-200/40 mt-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Escribe cédulas separadas por coma para filtrar personas específicas, o deja vacío y presiona &quot;Analizar&quot; para ver TODAS las personas.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* VISTA GLOBAL                           */}
      {/* ══════════════════════════════════════ */}
      {vista === 'global' && (
        <>
          {globalLoading && (
            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
              <p className="text-gray-400 text-sm mt-3">Analizando todas las personas...</p>
              <p className="text-gray-600 text-xs mt-1">Detectando prórrogas, gaps y alertas de 180 días</p>
            </div>
          )}

          {globalData && !globalLoading && (
            <div className="space-y-4">
              {/* Global KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KPI icon={Users} label="Personas" value={gRes ? gRes.total_personas : 0} color="blue" />
                <KPI icon={FileText} label="Incapacidades" value={gRes ? gRes.total_incapacidades : 0} color="purple" />
                <KPI icon={Calendar} label="Días Total" value={gRes ? gRes.total_dias : 0} color="cyan" />
                <KPI icon={Zap} label="Cadenas Prórroga" value={gRes ? gRes.total_prorrogas : 0} color="indigo" />
                <KPI icon={Shield} label="Gaps Críticos" value={gRes ? gRes.total_gaps_criticos : 0} color="red"
                  alert={gRes && gRes.total_gaps_criticos > 0} sub="Cortan prórroga (&gt;30d)" />
              </div>

              {/* 180-day category breakdown */}
              <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-400" /> Clasificación por Estado de Prórroga y 180 Días
                </h3>
                <p className="text-[10px] text-gray-500 mb-4">
                  Cada persona se clasifica según su cadena de prórroga más larga. Haz clic en una persona para ver su análisis individual completo.
                </p>

                {/* Donut summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <DonutChart
                    title="Distribución 180 Días"
                    data={Object.entries(globalData.categorias || {}).map(function(entry) {
                      var cat = entry[1];
                      return { label: cat.label, value: cat.personas.length, color: cat.color };
                    }).filter(function(d) { return d.value > 0; })}
                  />

                  {/* Top por días */}
                  <BarChartCSS
                    title="Top 10 — Más Días Acumulados"
                    icon={TrendingUp}
                    data={(globalData.top_dias || []).map(function(p) {
                      return {
                        label: p.nombre + ' (' + p.cedula + ')',
                        dias: p.total_dias,
                        color: p.supera_180 ? '#ef4444' : p.cerca_180 ? '#f97316' : '#3b82f6'
                      };
                    })}
                  />

                  {/* Top frecuencia */}
                  <BarChartCSS
                    title="Top 10 — Más Incapacidades"
                    icon={BarChart3}
                    data={(globalData.top_frecuencia || []).map(function(p) {
                      return {
                        label: p.nombre + ' (' + p.cedula + ')',
                        dias: p.total_incapacidades,
                        color: p.gaps_criticos > 0 ? '#eab308' : '#8b5cf6'
                      };
                    })}
                  />
                </div>

                {/* By empresa */}
                {(globalData.por_empresa || []).length > 1 && (
                  <div className="mb-4">
                    <BarChartCSS
                      title="Distribución por Empresa"
                      icon={Building2}
                      data={(globalData.por_empresa || []).map(function(e) {
                        return {
                          label: e.empresa + ' (' + e.personas + ' pers.)',
                          dias: e.dias,
                          color: '#6366f1'
                        };
                      })}
                    />
                  </div>
                )}

                {/* Category expandable sections */}
                <div className="space-y-2">
                  {Object.entries(globalData.categorias || {}).map(function(entry) {
                    var key = entry[0];
                    var cat = entry[1];
                    return <CategorySection key={key} catKey={key} cat={cat} onSelectPerson={loadPerson} />;
                  })}
                </div>
              </div>

              {/* Export */}
              <div className="flex justify-end">
                <button onClick={exportGlobalCSV}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600/30">
                  <Download className="w-4 h-4" /> Exportar Análisis Global (CSV)
                </button>
              </div>
            </div>
          )}

          {/* Empty global */}
          {!globalData && !globalLoading && (
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-blue-400/60" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Vista Global — Todas las Personas</h3>
              <p className="text-gray-600 text-sm mt-2 max-w-lg mx-auto">
                Presiona <strong className="text-blue-400">&quot;Analizar&quot;</strong> para cargar el análisis de prórroga y 180 días de todas las personas.
                También puedes escribir cédulas separadas por coma para analizar un grupo específico.
              </p>
              <button onClick={() => loadGlobal('')}
                className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 inline-flex items-center gap-2">
                <Users className="w-4 h-4" /> Cargar Todas las Personas
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════ */}
      {/* VISTA INDIVIDUAL                       */}
      {/* ══════════════════════════════════════ */}
      {vista === 'individual' && (
        <>
          {/* Search results list */}
          {searchResults && !personData && (
            searchLoading ? (
              <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-6 text-center">
                <User className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-gray-500 text-sm mt-2">Sin resultados</p>
              </div>
            ) : (
              <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700/60 bg-gray-800/50">
                  <span className="text-[10px] text-gray-400 font-semibold">{searchResults.length} empleados — selecciona uno</span>
                </div>
                <div className="divide-y divide-gray-800 max-h-72 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => loadPerson(r.cedula)}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-blue-600/10 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(r.nombre || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{r.nombre}</p>
                        <p className="text-[10px] text-gray-500">CC {r.cedula} - {r.empresa} - {r.cargo || r.area || ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-blue-400">{r.total_incapacidades}</p>
                        <p className="text-[9px] text-gray-500">{r.total_dias}d</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {personLoading && (
            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
              <p className="text-gray-400 text-sm mt-3">Analizando historial...</p>
            </div>
          )}

          {/* Person dashboard */}
          {personData && !personLoading && (
            <div className="space-y-4">
              {/* Profile */}
              <div className="bg-gradient-to-r from-gray-900 via-gray-800/80 to-gray-900 border border-gray-700/60 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20">
                    {emp ? (emp.nombre || '?')[0] : '?'}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white">{emp ? emp.nombre : ''}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                      <span className="font-mono">CC {emp ? emp.cedula : ''}</span>
                      {emp && emp.empresa && <span>&#127970; {emp.empresa}</span>}
                      {emp && emp.area && <span>&#128205; {emp.area}</span>}
                      {emp && emp.cargo && <span>&#128188; {emp.cargo}</span>}
                      {emp && emp.eps && <span>&#127973; {emp.eps}</span>}
                    </div>
                  </div>
                  <button onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600/30">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button onClick={() => { setPersonData(null); setQuery(''); if (searchRef.current) searchRef.current.focus(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-600/50">
                    <X className="w-3.5 h-3.5" /> Otra persona
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <KPI icon={FileText} label="Incapacidades" value={kpis ? kpis.total_incapacidades : 0} color="blue" />
                <KPI icon={Calendar} label="Días Total" value={kpis ? kpis.total_dias_incapacidad : 0} color="purple" />
                <KPI icon={TrendingUp} label="Promedio" value={kpis ? kpis.promedio_dias + 'd' : '0d'} color="cyan" />
                <KPI icon={Zap} label="Cadenas" value={kpis ? kpis.cadenas_prorroga : 0} color="indigo" />
                <KPI icon={Activity} label="Max Cadena" value={kpis ? kpis.dias_prorroga_max : 0} color="yellow"
                  alert={kpis && kpis.dias_prorroga_max >= 150}
                  sub={kpis && kpis.dias_prorroga_max >= 180 ? 'SUPERA 180d!' : kpis && kpis.dias_prorroga_max >= 150 ? 'CERCA LIMITE' : ''} />
                <KPI icon={AlertTriangle} label="Gaps" value={kpis ? kpis.total_gaps : 0} color="yellow" alert={kpis && kpis.gaps_criticos > 0} />
                <KPI icon={Shield} label="Gaps Críticos" value={kpis ? kpis.gaps_criticos : 0} color="red" alert={kpis && kpis.gaps_criticos > 0}
                  sub={kpis && kpis.gaps_criticos > 0 ? 'Cortan prórroga' : ''} />
                <KPI icon={Clock} label="Días sin Cubrir" value={kpis ? kpis.total_dias_gap : 0} color="orange" alert={kpis && kpis.total_dias_gap > 30} />
              </div>

              <TimelineGantt timeline={personData.timeline} gaps={personData.gaps} cadenas={personData.cadenas} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DonutChart title="Distribución por Tipo"
                  data={Object.entries(personData.por_tipo || {}).map(function(entry) {
                    var k = entry[0];
                    var v = entry[1];
                    return { label: (COLORS[k] || COLORS.sin_tipo).label, value: v.cantidad, color: (COLORS[k] || COLORS.sin_tipo).bg };
                  })} />
                <BarChartCSS title="Días por Mes" icon={BarChart3}
                  data={(personData.por_mes || []).map(function(m) {
                    return { label: m.mes, dias: m.dias, color: '#3b82f6' };
                  })} />
                <BarChartCSS title="Frecuencia CIE-10" icon={Heart} color="#06b6d4"
                  data={(personData.cie10_frecuencia || []).slice(0, 8).map(function(c) {
                    return { label: c.codigo + ' — ' + (c.descripcion || '').substring(0, 30), dias: c.dias_total, color: '#06b6d4' };
                  })} />
              </div>

              {Object.keys(personData.por_anio || {}).length > 1 && (
                <BarChartCSS title="Evolución por Año" icon={TrendingUp} color="#8b5cf6"
                  data={Object.entries(personData.por_anio).map(function(entry) {
                    return { label: entry[0], dias: entry[1].dias, color: '#8b5cf6' };
                  })} />
              )}

              <CadenasProrroga cadenas={personData.cadenas} />
              <AlertasPanel alertas={personData.alertas_180} huecos={personData.huecos_prorroga} />
              <IncapacidadesTable timeline={personData.timeline} gaps={personData.gaps} onExport={exportCSV} />
            </div>
          )}

          {/* Empty individual */}
          {!personData && !searchResults && !searchLoading && !personLoading && (
            <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-blue-400/60" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Análisis Individual</h3>
              <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
                Busca por <strong className="text-gray-400">cédula</strong> o <strong className="text-gray-400">nombre</strong> para ver
                timeline, cadenas de prórroga, gaps y alertas 180 días.
              </p>
              <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Timeline</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500/50" /> Gaps en rojo</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-500/50" /> Prórrogas</span>
                <span className="flex items-center gap-1"><Download className="w-3 h-3" /> CSV</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
