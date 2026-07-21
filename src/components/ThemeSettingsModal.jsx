/**
 * ThemeSettingsModal — Tuerquita ⚙️ de personalización de paleta
 * ===============================================================
 * Permite al tenant admin cambiar la paleta de colores de sus portales:
 *  - "Todos los portales" → paleta general (los 3 frontends iguales)
 *  - O una paleta DISTINTA para cada portal (validación / recepción / admin)
 *  - "↺ Predeterminado" → vuelve ese portal (o los 3) a la paleta de fábrica
 * Guarda vía PUT /tenants/me/theme y aplica en vivo la del portal actual.
 */

import { useState, useEffect } from 'react';
import { applyPaletteVars, updateMyTheme, getMyTheme } from '../hooks/useTenantTheme';

const PREDETERMINADO = { primary: '#4F46E5', secondary: '#4338CA', accent: '#312E81' };

// Paletas profesionales. 'indigo' = la paleta original del portal (= predeterminado de fábrica).
export const PALETAS = [
  { id: 'indigo',    label: 'Índigo (clásica)', primary: '#4F46E5', secondary: '#4338CA', accent: '#312E81' },
  { id: 'ocean',     label: 'Océano',           primary: '#0EA5E9', secondary: '#38BDF8', accent: '#7C3AED' },
  { id: 'terracota', label: 'Terracota',        primary: '#C2603C', secondary: '#E8956D', accent: '#7B4F35' },
  { id: 'bosque',    label: 'Bosque',           primary: '#16A34A', secondary: '#4ADE80', accent: '#854D0E' },
  { id: 'lavanda',   label: 'Lavanda',          primary: '#7C3AED', secondary: '#A78BFA', accent: '#DB2777' },
  { id: 'carbon',    label: 'Carbón',           primary: '#374151', secondary: '#6B7280', accent: '#F59E0B' },
  { id: 'aurora',    label: 'Aurora',           primary: '#BE185D', secondary: '#F472B6', accent: '#0891B2' },
];

const DESTINOS = [
  { id: 'todos',     label: '🎨 Todos los portales' },
  { id: 'portal',    label: '🟢 Solo Validación (este portal)' },
  { id: 'repogemin', label: '🟡 Solo Recepción' },
  { id: 'admin',     label: '🔵 Solo Administración' },
];

// ─── Vista previa en vivo: 4 mini-pantallas recoloreadas con la paleta elegida ───
function VistaPrevia({ colores }) {
  const c = colores || PREDETERMINADO;
  const PANTALLAS = [
    { label: 'Inicio de sesión' },
    { label: 'Recepción' },
    { label: 'Validación' },
    { label: 'Administración' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
      {PANTALLAS.map(p => (
        <div key={p.label} style={{ textAlign: 'center' }}>
          <div style={{
            height: 62, borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--border-primary, rgba(15,23,42,0.12))',
            background: 'var(--bg-card-solid, #fff)',
          }}>
            <div style={{ height: 16, background: c.primary }} />
            <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 5, width: '70%', borderRadius: 3, background: 'rgba(100,116,139,0.25)' }} />
              <div style={{ height: 5, width: '45%', borderRadius: 3, background: 'rgba(100,116,139,0.25)' }} />
              <div style={{ height: 9, width: '55%', borderRadius: 5, background: c.accent, marginTop: 2 }} />
            </div>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 9.5, fontWeight: 600, color: 'var(--text-tertiary, #64748B)' }}>{p.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ThemeSettingsModal({ onClose }) {
  const [destino, setDestino] = useState('todos');
  const [paletaSel, setPaletaSel] = useState(null);
  const [esPredeterminado, setEsPredeterminado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [temaActual, setTemaActual] = useState(null); // { paleta_id, paleta_colores, paletas_portales }
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getMyTheme()
      .then(data => { if (data?.ok) setTemaActual(data); })
      .catch(() => { /* seguimos sin precarga */ })
      .finally(() => setCargando(false));
  }, []);

  // Colores que están ACTIVOS en el backend para el destino seleccionado ahora mismo
  const colorActivoDestino = () => {
    if (!temaActual) return null;
    if (destino !== 'todos') {
      const ov = temaActual.paletas_portales?.[destino];
      if (ov?.colores?.primary) return { id: ov.paleta_id, ...ov.colores };
    }
    return temaActual.paleta_colores?.primary
      ? { id: temaActual.paleta_id, ...temaActual.paleta_colores }
      : null;
  };

  // Al cambiar de destino (o al cargar), preseleccionar lo que ya está activo ahí
  useEffect(() => {
    if (!temaActual) return;
    const activo = colorActivoDestino();
    setEsPredeterminado(false);
    if (activo) {
      const match = PALETAS.find(p => p.id === activo.id);
      setPaletaSel(match || { id: activo.id || 'custom', label: 'Personalizado', ...activo });
    } else {
      setPaletaSel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino, temaActual]);

  const tieneOverride = id => Boolean(temaActual?.paletas_portales?.[id]?.colores?.primary);

  const coloresPreview = esPredeterminado ? PREDETERMINADO : (paletaSel || PREDETERMINADO);

  const handleGuardar = async () => {
    if (!paletaSel && !esPredeterminado) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = esPredeterminado
        ? { portal: destino, quitar_override: true }
        : {
            paleta_id: paletaSel.id,
            paleta_colores: { primary: paletaSel.primary, secondary: paletaSel.secondary, accent: paletaSel.accent },
            portal: destino,
          };
      const resultado = await updateMyTheme(payload);

      // Aplicar en vivo si el cambio afecta a ESTE portal (validación)
      if (destino === 'todos' || destino === 'portal') {
        const colores = esPredeterminado ? PREDETERMINADO : payload.paleta_colores;
        applyPaletteVars(colores);
        try {
          const raw = JSON.parse(localStorage.getItem('tenant_config')) || {};
          raw.paleta_colores = colores;
          localStorage.setItem('tenant_config', JSON.stringify(raw));
        } catch { /* sin cache */ }
      }

      setTemaActual(resultado);
      setMensaje({
        ok: true,
        texto: esPredeterminado
          ? 'Restablecido al predeterminado ✓'
          : destino === 'todos' ? 'Paleta aplicada a los 3 portales ✓' : 'Paleta guardada para ese portal ✓',
      });
    } catch (e) {
      setMensaje({ ok: false, texto: e.message || 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card-solid, #fff)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560,
        border: '1px solid var(--border-primary, rgba(15,23,42,0.08))', boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary, #0F172A)' }}>
            ⚙️ Personalizar colores
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--text-tertiary, #64748B)' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-tertiary, #64748B)', lineHeight: 1.5 }}>
          Cambia la paleta de tus portales. Puedes usar la misma en los tres o una distinta para cada uno.
        </p>

        {/* Destino */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary, #64748B)' }}>
          Aplicar a
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {DESTINOS.map(d => (
            <button
              key={d.id}
              onClick={() => setDestino(d.id)}
              style={{
                position: 'relative',
                padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: destino === d.id ? '2px solid var(--accent-primary, #4F46E5)' : '1px solid var(--border-primary, rgba(15,23,42,0.12))',
                background: destino === d.id ? 'var(--bg-hover, rgba(79,70,229,0.06))' : 'transparent',
                color: 'var(--text-primary, #0F172A)',
              }}
            >
              {d.label}
              {d.id !== 'todos' && tieneOverride(d.id) && (
                <span title="Tiene paleta propia" style={{
                  position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%',
                  background: '#F59E0B', border: '1.5px solid var(--bg-card-solid, #fff)',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Vista previa en vivo */}
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary, #64748B)' }}>
          Así se vería
        </p>
        <VistaPrevia colores={coloresPreview} />

        {/* Paletas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary, #64748B)' }}>
            Paleta
          </p>
          <button
            onClick={() => { setEsPredeterminado(true); setPaletaSel(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
              fontSize: 11.5, fontWeight: 700,
              border: esPredeterminado ? '2px solid #4F46E5' : '1px solid var(--border-primary, rgba(15,23,42,0.12))',
              background: esPredeterminado ? 'rgba(79,70,229,0.08)' : 'transparent',
              color: esPredeterminado ? '#4F46E5' : 'var(--text-tertiary, #64748B)',
            }}
          >
            ↺ Predeterminado
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {PALETAS.map(p => (
            <button
              key={p.id}
              onClick={() => { setPaletaSel(p); setEsPredeterminado(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                border: !esPredeterminado && paletaSel?.id === p.id ? `2px solid ${p.primary}` : '1px solid var(--border-primary, rgba(15,23,42,0.12))',
                background: !esPredeterminado && paletaSel?.id === p.id ? `${p.primary}14` : 'transparent',
              }}
            >
              <span style={{ display: 'flex' }}>
                {[p.primary, p.secondary, p.accent].map((c, i) => (
                  <span key={i} style={{
                    width: 18, height: 18, borderRadius: '50%', background: c,
                    marginLeft: i > 0 ? -6 : 0, border: '2px solid var(--bg-card-solid, #fff)',
                  }} />
                ))}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary, #0F172A)' }}>{p.label}</span>
            </button>
          ))}
        </div>

        {mensaje && (
          <p style={{
            margin: '0 0 14px', fontSize: 13, fontWeight: 600,
            color: mensaje.ok ? '#059669' : '#DC2626',
          }}>
            {mensaje.texto}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border-primary, rgba(15,23,42,0.12))',
            color: 'var(--text-tertiary, #64748B)',
          }}>
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={(!paletaSel && !esPredeterminado) || guardando || cargando}
            style={{
              flex: 2, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none',
              cursor: (!paletaSel && !esPredeterminado) || guardando ? 'not-allowed' : 'pointer',
              background: (!paletaSel && !esPredeterminado) ? 'rgba(100,116,139,0.3)' : 'var(--accent-primary, #4F46E5)',
              color: '#fff',
            }}
          >
            {guardando ? 'Guardando…' : 'Guardar paleta'}
          </button>
        </div>
      </div>
    </div>
  );
}
