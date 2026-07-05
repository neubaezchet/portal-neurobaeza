/**
 * useTenantTheme — Hook de branding multi-tenant (paleta COMPLETA)
 * =================================================================
 * 1. Si hay sesión de tenant: carga el tema desde el backend
 *    (`GET /tenants/me/theme?portal=portal`) — respeta la paleta específica
 *    del portal de validación si la empresa configuró una con la tuerquita.
 * 2. Fallback: localStorage("tenant_config") (lo guarda el login).
 * 3. Pre-login: `applyPublicBranding()` pinta con ?empresa={slug} de la URL.
 *
 * Sobrescribe TODAS las variables del design system (no solo --tenant-*):
 * --accent-primary, --accent-primary-hover, --border-focus, --bg-hover…
 * para que la paleta cambie el portal entero, incluido el login.
 */

import { useState, useEffect } from 'react';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';

// Paleta por defecto = la paleta actual del portal (indigo)
const DEFAULTS = {
  primary:   '#4F46E5',
  secondary: '#4338CA',
  accent:    '#312E81',
};

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(79, 70, 229, ${alpha})`;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

/**
 * Aplica la paleta a TODO el design system del portal.
 * Seguro de llamar múltiples veces. `remove=true` restaura los defaults del CSS.
 */
export function applyPaletteVars(paleta, remove = false) {
  const root = document.documentElement;
  const PROPS = [
    '--tenant-primary', '--tenant-secondary', '--tenant-accent',
    '--accent-primary', '--accent-primary-hover',
    '--border-focus', '--bg-hover',
  ];
  if (remove || !paleta || !paleta.primary) {
    PROPS.forEach(p => root.style.removeProperty(p));
    return;
  }
  const primary   = paleta.primary   || DEFAULTS.primary;
  const secondary = paleta.secondary || DEFAULTS.secondary;

  root.style.setProperty('--tenant-primary',       primary);
  root.style.setProperty('--tenant-secondary',     secondary);
  root.style.setProperty('--tenant-accent',        paleta.accent || DEFAULTS.accent);
  root.style.setProperty('--accent-primary',       primary);
  root.style.setProperty('--accent-primary-hover', secondary);
  root.style.setProperty('--border-focus',         primary);
  root.style.setProperty('--bg-hover',             hexToRgba(primary, 0.06));
}

/**
 * Branding PRE-LOGIN por slug (?empresa=mi-empresa en la URL).
 * Devuelve el branding público o null. Pinta la paleta al resolver.
 */
export async function applyPublicBranding(portal = 'portal') {
  try {
    const slug = new URLSearchParams(window.location.search).get('empresa');
    if (!slug) return null;
    const res = await fetch(`${API_BASE_URL}/public/portal/${encodeURIComponent(slug)}?portal=${portal}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.ok) {
      applyPaletteVars(data.paleta_colores);
      return data;
    }
  } catch { /* branding por defecto */ }
  return null;
}

/**
 * Guarda una paleta desde la tuerquita ⚙️.
 * portal: 'todos' | 'admin' | 'portal' | 'repogemin'
 */
export async function updateMyTheme({ paleta_id, paleta_colores, portal = 'todos' }) {
  const token = localStorage.getItem('portal_token') || '';
  const res = await fetch(`${API_BASE_URL}/tenants/me/theme`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paleta_id, paleta_colores, portal }),
  });
  if (!res.ok) throw new Error('No se pudo guardar la paleta');
  return res.json();
}

export function useTenantTheme() {
  const [theme, setTheme] = useState({ loaded: false });

  useEffect(() => {
    // 1) Fallback inmediato desde localStorage (sin parpadeo)
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem('tenant_config')); } catch { raw = null; }
    if (raw?.paleta_colores?.primary) {
      applyPaletteVars(raw.paleta_colores);
      setTheme({
        loaded: true,
        ...raw.paleta_colores,
        logoUrl: raw.logo_url || null,
        nombreEmpresa: raw.nombre || null,
        nit: raw.nit || null,
        cicloReporte: raw.ciclo_reporte || 'mensual',
        estiloUI: raw.estilo_ui || 'default',
      });
    }

    // 2) Refrescar desde el backend (paleta específica del portal de validación)
    const token = localStorage.getItem('portal_token');
    if (!token) {
      if (!raw) { applyPaletteVars(null, true); setTheme({ loaded: false }); }
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/tenants/me/theme?portal=portal`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.ok) return;
        applyPaletteVars(data.paleta_colores);
        setTheme({
          loaded: true,
          ...(data.paleta_colores || {}),
          logoUrl: data.logo_url || null,
          nombreEmpresa: data.empresa || null,
          slug: data.slug || null,
          paletaId: data.paleta_id || null,
          paletasPortales: data.paletas_portales || {},
          cicloReporte: data.ciclo_reporte || 'mensual',
          estiloUI: data.estilo_ui || 'default',
        });
        // Actualizar el cache local con lo fresco
        try {
          localStorage.setItem('tenant_config', JSON.stringify({
            nombre: data.empresa,
            logo_url: data.logo_url,
            paleta_colores: data.paleta_colores,
            estilo_ui: data.estilo_ui,
            ciclo_reporte: data.ciclo_reporte,
          }));
        } catch { /* storage lleno */ }
      })
      .catch(() => { /* red caída → seguimos con el cache */ });

    return () => { cancelled = true; };
  }, []);

  return theme;
}

export default useTenantTheme;
