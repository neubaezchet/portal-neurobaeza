import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, User, Activity, AlertTriangle, Calendar, TrendingUp,
  Download, ChevronRight, FileText, Shield, Clock, BarChart3, 
  Loader2, X, ArrowRight, Zap, Heart, AlertCircle, Eye
} from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

// ═══════════════════════════════════════════════════════════════
// POWER BI DASHBOARD — Análisis de Persona + Timeline + Gaps
// Diseño profesional inspirado en Microsoft Power BI
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

// ═══════ MINI COMPONENTS ═══════

function KPI({ icon: Icon, label, value, sub, color = 'blue', alert }) {
  return (
    <div className={`relative bg-gray-900/80 border rounded-xl p-4 transition-all hover:scale-[1.02] ${
      alert ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-gray-700/60'
    }`}>
      {alert && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-2xl font-black mt-1 ${
            alert ? 'text-red-400' : `text-${color}-400`
          }`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${alert ? 'bg-red-500/20' : `bg-${color}-500/20`}`}>
          <Icon className={`w-4 h-4 ${alert ? 'text-red-400' : `text-${color}-400`}`} />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ data, maxVal, color }) {
  const pct = maxVal > 0 ? (data / maxVal) * 100 : 0;
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-700" style={{
        width: `${Math.max(pct, 2)}%`, backgroundColor: color
      }} />
    </div>
  );
}

// ═══════ TIMELINE VISUAL ═══════

function TimelineGantt({ timeline, gaps, cadenas }) {
  if (!timeline.length) return null;

  // Calculate date range
  const allDates = [];
  timeline.forEach(t => {
    if (t.fecha_inicio) allDates.push(new Date(t.fecha_inicio));
    if (t.fecha_fin) allDates.push(new Date(t.fecha_fin));
  });
  gaps.forEach(g => {
    allDates.push(new Date(g.fecha_inicio));
    allDates.push(new Date(g.fecha_fin));
  });

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = Math.max((maxDate - minDate) / (1000*60*60*24), 1);

  const getPos = (dateStr) => {
    const d = new Date(dateStr);
    return ((d - minDate) / (1000*60*60*24)) / totalDays * 100;
  };
  const getWidth = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(((e - s) / (1000*60*60*24)) / totalDays * 100, 0.5);
  };

  // Build cadena lookup
  const cadenaCasos = {};
  (cadenas || []).forEach((cad, ci) => {
    if (cad.caso_inicial?.serial) cadenaCasos[cad.caso_inicial.serial] = ci;
    (cad.prorrogas || []).forEach(p => { if (p.serial) cadenaCasos[p.serial] = ci; });
  });

  // Month markers
  const months = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const pos = getPos(cursor.toISOString().slice(0, 10));
    if (pos >= 0 && pos <= 100) {
      months.push({
        pos,
        label: cursor.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" /> Línea de Tiempo — Cobertura de Incapacidades
        </h3>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-500 inline-block" /> Incapacidad</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Gap (corta prórroga)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-500 inline-block" /> Gap menor</span>
        </div>
      </div>

      <div className="p-4 relative" style={{ minHeight: 80 }}>
        {/* Month markers */}
        <div className="relative h-5 mb-2 border-b border-gray-800">
          {months.map((m, i) => (
            <div key={i} className="absolute text-[9px] text-gray-500 font-mono" style={{ left: `${m.pos}%` }}>
              <div className="border-l border-gray-700/40 h-64 absolute top-0" style={{ zIndex: 0 }} />
              {m.label}
            </div>
          ))}
        </div>

        {/* Main bar track */}
        <div className="relative h-10 bg-gray-800/50 rounded-lg overflow-visible mt-4">
          {/* Incapacidades */}
          {timeline.map((t, i) => {
            if (!t.fecha_inicio || !t.fecha_fin) return null;
            const left = getPos(t.fecha_inicio);
            const width = getWidth(t.fecha_inicio, t.fecha_fin);
            const tipo = t.tipo || 'sin_tipo';
            const col = COLORS[tipo] || COLORS.sin_tipo;
            const cadIdx = cadenaCasos[t.serial];

            return (
              <div
                key={i}
                className="absolute h-full rounded cursor-pointer transition-all hover:brightness-125 hover:ring-2 hover:ring-white/30 hover:z-20"
                style={{
                  left: `${left}%`, width: `${width}%`, minWidth: 4,
                  backgroundColor: col.bg,
                  border: cadIdx !== undefined ? `2px solid ${col.light}` : 'none',
                  zIndex: 10,
                }}
                onMouseEnter={() => setTooltip({
                  x: left, item: t, type: 'incap',
                  cadena: cadIdx !== undefined ? `Cadena #${cadIdx + 1}` : null
                })}
                onMouseLeave={() => setTooltip(null)}
              >
                {width > 3 && (
                  <span className="text-[8px] text-white font-bold px-1 truncate block leading-10">
                    {t.dias}d
                  </span>
                )}
              </div>
            );
          })}

          {/* Gaps (RED!) */}
          {gaps.map((g, i) => {
            const left = getPos(g.fecha_inicio);
            const width = getWidth(g.fecha_inicio, g.fecha_fin);
            const isCritical = g.corta_prorroga;

            return (
              <div
                key={`gap-${i}`}
                className={`absolute h-full rounded cursor-pointer transition-all hover:brightness-125 hover:z-20 ${
                  isCritical ? 'animate-pulse' : ''
                }`}
                style={{
                  left: `${left}%`, width: `${width}%`, minWidth: 3,
                  backgroundColor: isCritical ? '#ef4444' : '#eab308',
                  opacity: 0.7,
                  zIndex: 15,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px)',
                }}
                onMouseEnter={() => setTooltip({ x: left, item: g, type: 'gap' })}
                onMouseLeave={() => setTooltip(null)}
              >
                {width > 4 && (
                  <span className={`text-[8px] font-black px-1 truncate block leading-10 ${
                    isCritical ? 'text-white' : 'text-yellow-900'
                  }`}>
                    {g.dias}d
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute top-20 bg-gray-950 border border-gray-600 rounded-lg p-3 shadow-2xl z-50 text-xs max-w-xs"
            style={{ left: `${Math.min(tooltip.x, 70)}%` }}>
            {tooltip.type === 'incap' ? (
              <>
                <p className="font-bold text-white">{tooltip.item.serial}</p>
                <p className="text-gray-400">{tooltip.item.fecha_inicio} → {tooltip.item.fecha_fin} ({tooltip.item.dias}d)</p>
                <p className="text-blue-400">{(tooltip.item.tipo || '').replace(/_/g, ' ')}</p>
                {tooltip.item.diagnostico && <p className="text-gray-300 mt-1">{tooltip.item.diagnostico.substring(0, 80)}</p>}
                {tooltip.item.codigo_cie10 && <p className="text-cyan-400 font-mono">{tooltip.item.codigo_cie10} — {tooltip.item.cie10_descripcion}</p>}
                {tooltip.cadena && <p className="text-purple-400 font-bold mt-1">🔗 {tooltip.cadena}</p>}
              </>
            ) : (
              <>
                <p className={`font-bold ${tooltip.item.corta_prorroga ? 'text-red-400' : 'text-yellow-400'}`}>
                  {tooltip.item.corta_prorroga ? '🔴 GAP CRÍTICO — CORTA PRÓRROGA' : '🟡 Hueco entre incapacidades'}
                </p>
                <p className="text-gray-400">{tooltip.item.fecha_inicio} → {tooltip.item.fecha_fin}</p>
                <p className="text-white font-bold">{tooltip.item.dias} días sin cobertura</p>
                {tooltip.item.corta_prorroga && (
                  <p className="text-red-300 text-[10px] mt-1">Brecha mayor a 30 días: reinicia el conteo de prórroga</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Date range footer */}
      <div className="px-4 py-2 border-t border-gray-800 flex justify-between text-[9px] text-gray-500 font-mono">
        <span>{minDate.toLocaleDateString('es-CO')}</span>
        <span>{totalDays.toFixed(0)} días de cobertura total</span>
        <span>{maxDate.toLocaleDateString('es-CO')}</span>
      </div>
    </div>
  );
}

// ═══════ CSS BAR CHART ═══════

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
              <div
                className="h-3 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                style={{
                  width: `${(d[valueKey] / maxVal) * 100}%`,
                  backgroundColor: d.color || color,
                  minWidth: 4,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════ DONUT CHART (CSS ONLY) ═══════

function DonutChart({ data, title }) {
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  let accumulated = 0;

  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const start = accumulated;
    accumulated += pct;
    return { ...d, pct, start };
  });

  // Build conic-gradient
  const gradientParts = segments.map(s =>
    `${s.color} ${s.start}% ${s.start + s.pct}%`
  ).join(', ');

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-4">
      <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-400" /> {title}
      </h3>
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 flex-shrink-0">
          <div className="w-28 h-28 rounded-full" style={{
            background: `conic-gradient(${gradientParts})`,
          }} />
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

// ═══════ SEARCH RESULTS LIST ═══════

function SearchResults({ results, onSelect, loading }) {
  if (loading) return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-6 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
      <p className="text-gray-500 text-xs mt-2">Buscando empleados...</p>
    </div>
  );

  if (!results) return null;
  if (results.length === 0) return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-6 text-center">
      <User className="w-8 h-8 text-gray-600 mx-auto" />
      <p className="text-gray-500 text-sm mt-2">No se encontraron resultados</p>
    </div>
  );

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700/60 bg-gray-800/50">
        <span className="text-[10px] text-gray-400 font-semibold">{results.length} empleados encontrados — selecciona uno para ver su análisis</span>
      </div>
      <div className="divide-y divide-gray-800 max-h-72 overflow-y-auto">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(r.cedula)}
            className="w-full px-4 py-3 flex items-center gap-4 hover:bg-blue-600/10 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(r.nombre || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{r.nombre}</p>
              <p className="text-[10px] text-gray-500">CC {r.cedula} • {r.empresa} • {r.cargo || r.area || ''}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-blue-400">{r.total_incapacidades}</p>
              <p className="text-[9px] text-gray-500">{r.total_dias}d total</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════ INCAPACIDADES TABLE ═══════

function IncapacidadesTable({ timeline, gaps, onExport }) {
  const [showAll, setShowAll] = useState(false);
  
  // Merge and sort
  const items = [
    ...timeline.map(t => ({ ...t, _type: 'incap', _sortDate: t.fecha_inicio })),
    ...gaps.map(g => ({ ...g, _type: 'gap', _sortDate: g.fecha_inicio })),
  ].sort((a, b) => (a._sortDate || '').localeCompare(b._sortDate || ''));

  const visible = showAll ? items : items.slice(0, 20);

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" /> Detalle Completo ({timeline.length} incapacidades + {gaps.length} gaps)
        </h3>
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-600/30">
            <Download className="w-3 h-3" /> Exportar CSV
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
                <tr key={`gap-${i}`} className="bg-red-950/30 hover:bg-red-900/40">
                  <td className="px-3 py-2" colSpan={7}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        item.corta_prorroga
                          ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/50'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.corta_prorroga ? '🔴 CORTA PRÓRROGA' : '🟡 HUECO'}
                      </span>
                      <span className="text-red-300 font-bold">{item.dias} días sin cobertura</span>
                      <span className="text-gray-500">{item.fecha_inicio} → {item.fecha_fin}</span>
                      {item.corta_prorroga && (
                        <span className="text-red-400 text-[9px] ml-auto">Brecha &gt;30d: reinicia conteo de prórroga</span>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={`inc-${i}`} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{
                        backgroundColor: (COLORS[item.tipo] || COLORS.sin_tipo).bg
                      }} />
                      <span className="text-gray-300 text-[10px]">{(COLORS[item.tipo] || COLORS.sin_tipo).label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-300">{item.fecha_inicio}</td>
                  <td className="px-3 py-2 font-mono text-gray-300">{item.fecha_fin}</td>
                  <td className="px-3 py-2 font-bold text-white">{item.dias}</td>
                  <td className="px-3 py-2 max-w-xs">
                    {item.codigo_cie10 && (
                      <span className="text-cyan-400 font-mono text-[10px] mr-1">[{item.codigo_cie10}]</span>
                    )}
                    <span className="text-gray-400 text-[10px]">{(item.diagnostico || item.cie10_descripcion || '').substring(0, 60)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-blue-300 text-[10px]">{item.serial}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                      backgroundColor: `${ESTADO_COLORS[item.estado] || '#6b7280'}20`,
                      color: ESTADO_COLORS[item.estado] || '#9ca3af',
                    }}>
                      {(item.estado || '').replace(/_/g, ' ')}
                    </span>
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

// ═══════ CADENAS DE PRÓRROGA ═══════

function CadenasProrroga({ cadenas }) {
  const activas = (cadenas || []).filter(c => c.es_cadena_prorroga);
  if (!activas.length) return null;

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/60">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" /> Cadenas de Prórroga Detectadas ({activas.length})
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {activas.map((cad, i) => {
          const pct180 = Math.min((cad.dias_acumulados / 180) * 100, 100);
          const isAlerta = cad.dias_acumulados >= 150;
          const isCritico = cad.dias_acumulados >= 170;
          const superado = cad.dias_acumulados >= 180;

          return (
            <div key={i} className={`border rounded-xl p-4 ${
              superado ? 'border-red-500/60 bg-red-950/20' :
              isCritico ? 'border-orange-500/60 bg-orange-950/10' :
              isAlerta ? 'border-yellow-500/50 bg-yellow-950/10' :
              'border-gray-700/60 bg-gray-800/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">
                  Cadena #{cad.id_cadena} — {cad.total_incapacidades_cadena} incapacidades
                </span>
                <span className={`text-xs font-black ${
                  superado ? 'text-red-400' : isCritico ? 'text-orange-400' : isAlerta ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {cad.dias_acumulados}d / 180d
                </span>
              </div>

              {/* Progress bar to 180 */}
              <div className="w-full bg-gray-800 rounded-full h-3 mb-2 overflow-hidden relative">
                <div className="absolute right-0 top-0 h-3 w-px bg-white/30 z-10" style={{ right: '0%' }} />
                <div className="absolute top-0 h-3 w-px bg-yellow-500/50 z-10" style={{ left: `${(150/180)*100}%` }} />
                <div className="absolute top-0 h-3 w-px bg-red-500/50 z-10" style={{ left: `${(170/180)*100}%` }} />
                <div className={`h-3 rounded-full transition-all duration-1000 ${
                  superado ? 'bg-red-500' : isCritico ? 'bg-orange-500' : isAlerta ? 'bg-yellow-500' : 'bg-green-500'
                }`} style={{ width: `${pct180}%` }} />
              </div>

              <div className="flex items-center justify-between text-[9px] text-gray-500">
                <span>{cad.fecha_inicio_cadena?.slice(0, 10)}</span>
                <div className="flex gap-3">
                  <span>CIE-10: {(cad.codigos_cie10 || []).join(', ') || '—'}</span>
                </div>
                <span>{cad.fecha_fin_cadena?.slice(0, 10)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════ ALERTAS ═══════

function AlertasPanel({ alertas, huecos }) {
  const items = [
    ...(alertas || []).map(a => ({ ...a, _tipo: 'alerta' })),
    ...(huecos || []).map(h => ({ ...h, _tipo: 'hueco', severidad: 'critica', mensaje: h.mensaje })),
  ];
  if (!items.length) return null;

  return (
    <div className="bg-gray-900/80 border border-red-500/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-red-500/20 bg-red-950/20">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Alertas y Hallazgos ({items.length})
        </h3>
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
              <p className="font-bold">{a.tipo || a._tipo}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{a.mensaje}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PowerBIDashboard({ empresas = [] }) {
  const [query, setQuery] = useState('');
  const [empresa, setEmpresa] = useState('all');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [personData, setPersonData] = useState(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const headers = { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN };

  // Search employees
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${API_CONFIG.BASE_URL}/validador/casos/powerbi/buscar?q=${encodeURIComponent(q)}&empresa=${empresa}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      setSearchResults(data.resultados || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }, [empresa]);

  // Debounced search
  const handleSearchInput = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  // Load person analysis
  const loadPerson = async (cedula) => {
    setPersonLoading(true);
    setError(null);
    setSearchResults(null);
    setQuery(cedula);
    try {
      const resp = await fetch(
        `${API_CONFIG.BASE_URL}/validador/casos/powerbi/persona/${cedula}`,
        { headers }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setPersonData(data);
    } catch (err) {
      setError(err.message);
      setPersonData(null);
    } finally {
      setPersonLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!personData) return;
    const rows = [
      ['Serial', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Tipo', 'Estado', 'Diagnóstico', 'CIE-10', 'Desc CIE-10', 'EPS', 'Prorroga', 'Médico', 'Institución'],
      ...personData.timeline.map(t => [
        t.serial, t.fecha_inicio, t.fecha_fin, t.dias, t.tipo, t.estado,
        `"${(t.diagnostico || '').replace(/"/g, '""')}"`, t.codigo_cie10, t.cie10_descripcion,
        t.eps, t.es_prorroga ? 'Sí' : 'No', t.medico_tratante, t.institucion_origen
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `powerbi_${personData.empleado.cedula}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const kpis = personData?.kpis;
  const emp = personData?.empleado;

  return (
    <div className="space-y-4">
      {/* ═══ HEADER POWER BI ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-gray-700/60 rounded-2xl p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              Power BI — Análisis Individual
            </h2>
            <p className="text-blue-200/60 text-xs mt-1">
              Busca por cédula o nombre para ver el historial completo, cadenas de prórroga y periodos sin cobertura
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-gray-400">Powered by</div>
            <div className="text-xs font-black text-yellow-400">IncaBaeza Analytics</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-5 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch(query); }}
              placeholder="Buscar por cédula o nombre del empleado..."
              className="w-full pl-12 pr-10 py-3.5 bg-gray-900/80 border border-gray-600/60 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchResults(null); setPersonData(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={empresa}
            onChange={e => setEmpresa(e.target.value)}
            className="px-4 py-3.5 bg-gray-900/80 border border-gray-600/60 rounded-xl text-white text-sm min-w-[180px] focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las empresas</option>
            {empresas.map((e, i) => <option key={i} value={e}>{e}</option>)}
          </select>
          <button
            onClick={() => doSearch(query)}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            <Search className="w-4 h-4" />
          </button>
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

      {/* Search results */}
      {searchResults && !personData && (
        <SearchResults results={searchResults} onSelect={loadPerson} loading={searchLoading} />
      )}

      {/* Loading */}
      {personLoading && (
        <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-400 text-sm mt-3">Analizando historial completo...</p>
          <p className="text-gray-600 text-xs mt-1">Detectando cadenas de prórroga y periodos sin cobertura</p>
        </div>
      )}

      {/* ═══ PERSON DASHBOARD ═══ */}
      {personData && !personLoading && (
        <div className="space-y-4 animate-in fade-in">
          {/* Profile card */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800/80 to-gray-900 border border-gray-700/60 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20">
                {(emp?.nombre || '?')[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-white">{emp?.nombre}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                  <span className="font-mono">CC {emp?.cedula}</span>
                  {emp?.empresa && <span>🏢 {emp.empresa}</span>}
                  {emp?.area && <span>📍 {emp.area}</span>}
                  {emp?.cargo && <span>💼 {emp.cargo}</span>}
                  {emp?.eps && <span>🏥 {emp.eps}</span>}
                  {emp?.ciudad && <span>📌 {emp.ciudad}</span>}
                </div>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-600/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Descargar CSV
              </button>
              <button
                onClick={() => { setPersonData(null); setQuery(''); searchRef.current?.focus(); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-600/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Otra persona
              </button>
            </div>
          </div>

          {/* KPIs row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPI icon={FileText} label="Incapacidades" value={kpis?.total_incapacidades} color="blue" />
            <KPI icon={Calendar} label="Días Total" value={kpis?.total_dias_incapacidad} color="purple" />
            <KPI icon={TrendingUp} label="Promedio" value={`${kpis?.promedio_dias}d`} color="cyan" />
            <KPI icon={Zap} label="Cadenas Prórroga" value={kpis?.cadenas_prorroga} color="indigo" />
            <KPI icon={Activity} label="Max Días Cadena" value={kpis?.dias_prorroga_max}
              color="yellow" alert={kpis?.dias_prorroga_max >= 150}
              sub={kpis?.dias_prorroga_max >= 180 ? '¡SUPERA 180d!' : kpis?.dias_prorroga_max >= 150 ? 'CERCA LÍMITE' : ''}
            />
            <KPI icon={AlertTriangle} label="Gaps Total" value={kpis?.total_gaps}
              color="yellow" alert={kpis?.gaps_criticos > 0} />
            <KPI icon={Shield} label="Gaps Críticos" value={kpis?.gaps_criticos}
              color="red" alert={kpis?.gaps_criticos > 0}
              sub={kpis?.gaps_criticos > 0 ? 'Cortan prórroga' : ''} />
            <KPI icon={Clock} label="Días sin Cubrir" value={kpis?.total_dias_gap}
              color="orange" alert={kpis?.total_dias_gap > 30} />
          </div>

          {/* Timeline */}
          <TimelineGantt
            timeline={personData.timeline}
            gaps={personData.gaps}
            cadenas={personData.cadenas}
          />

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Donut by tipo */}
            <DonutChart
              title="Distribución por Tipo"
              data={Object.entries(personData.por_tipo || {}).map(([k, v]) => ({
                label: (COLORS[k] || COLORS.sin_tipo).label,
                value: v.cantidad,
                color: (COLORS[k] || COLORS.sin_tipo).bg,
              }))}
            />

            {/* Bar: by month */}
            <BarChartCSS
              title="Incapacidades por Mes"
              icon={BarChart3}
              data={(personData.por_mes || []).map(m => ({
                label: m.mes,
                dias: m.dias,
                cantidad: m.cantidad,
                color: '#3b82f6',
              }))}
              valueKey="dias"
              labelKey="label"
            />

            {/* Bar: CIE-10 frequency */}
            <BarChartCSS
              title="Frecuencia CIE-10"
              icon={Heart}
              data={(personData.cie10_frecuencia || []).slice(0, 8).map(c => ({
                label: `${c.codigo} — ${c.descripcion.substring(0, 30)}`,
                dias: c.dias_total,
                color: '#06b6d4',
              }))}
              valueKey="dias"
              labelKey="label"
              color="#06b6d4"
            />
          </div>

          {/* By year summary */}
          {Object.keys(personData.por_anio || {}).length > 1 && (
            <BarChartCSS
              title="Evolución por Año"
              icon={TrendingUp}
              data={Object.entries(personData.por_anio).map(([anio, v]) => ({
                label: anio,
                dias: v.dias,
                color: '#8b5cf6',
              }))}
              valueKey="dias"
              labelKey="label"
              color="#8b5cf6"
            />
          )}

          {/* Cadenas de prórroga */}
          <CadenasProrroga cadenas={personData.cadenas} />

          {/* Alertas */}
          <AlertasPanel alertas={personData.alertas_180} huecos={personData.huecos_prorroga} />

          {/* Full table */}
          <IncapacidadesTable
            timeline={personData.timeline}
            gaps={personData.gaps}
            onExport={exportCSV}
          />
        </div>
      )}

      {/* Empty state */}
      {!personData && !searchResults && !searchLoading && !personLoading && (
        <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-10 h-10 text-blue-400/60" />
          </div>
          <h3 className="text-lg font-bold text-gray-400">Análisis Individual Power BI</h3>
          <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
            Busca un empleado por <strong className="text-gray-400">cédula</strong> o <strong className="text-gray-400">nombre</strong> para ver
            su historial completo de incapacidades, cadenas de prórroga, periodos sin cobertura
            y alertas de 180 días.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Timeline visual</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500/50" /> Gaps en rojo</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-500/50" /> Cadenas prórroga</span>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Exportar CSV</span>
          </div>
        </div>
      )}
    </div>
  );
}
