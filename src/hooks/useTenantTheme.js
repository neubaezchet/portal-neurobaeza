/**
 * useTenantTheme — Hook de branding multi-tenant
 * ===============================================
 * Lee `localStorage("tenant_config")` y:
 *   1. Inyecta CSS custom properties en :root (--tenant-primary, etc.)
 *   2. Devuelve los valores de tema para usarlos en JSX
 *
 * El objeto `tenant_config` se almacena en localStorage al iniciar sesión
 * si el usuario pertenece a un tenant.  Formato esperado:
 * {
 *   paleta_colores:  { primary, secondary, accent },
 *   logo_url:        string,
 *   nombre:          string,   ← nombre de la empresa
 *   nit:             string,
 *   ciclo_reporte:   "mensual" | "quincenal",
 *   estilo_ui:       "default" | "minimal" | "classic" | "rounded",
 * }
 *
 * Si no hay tenant_config (usuario superadmin / admin global) devuelve
 * { loaded: false } y los CSS vars permanecen sin definir → Tailwind
 * usa sus colores por defecto.
 */

import { useState, useEffect } from 'react';

// Paleta por defecto (misma que usa TenantOnboarding step 5)
const DEFAULTS = {
  primary:   '#3B82F6',
  secondary: '#60A5FA',
  accent:    '#1D4ED8',
};

/**
 * Inyecta (o limpia) las CSS custom properties en document.documentElement.
 * Seguro de llamar múltiples veces — solo actualiza si cambia el valor.
 */
function injectCSSVars(paleta, remove = false) {
  const root = document.documentElement;
  if (remove) {
    root.style.removeProperty('--tenant-primary');
    root.style.removeProperty('--tenant-secondary');
    root.style.removeProperty('--tenant-accent');
    return;
  }
  root.style.setProperty('--tenant-primary',   paleta.primary   || DEFAULTS.primary);
  root.style.setProperty('--tenant-secondary', paleta.secondary || DEFAULTS.secondary);
  root.style.setProperty('--tenant-accent',    paleta.accent    || DEFAULTS.accent);
}

export function useTenantTheme() {
  const [theme, setTheme] = useState({ loaded: false });

  useEffect(() => {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem('tenant_config'));
    } catch {
      raw = null;
    }

    if (!raw) {
      // Sin tenant_config → limpiar vars y salir
      injectCSSVars(null, true);
      setTheme({ loaded: false });
      return;
    }

    const paleta   = raw.paleta_colores  || {};
    const primary  = paleta.primary   || DEFAULTS.primary;
    const secondary= paleta.secondary || DEFAULTS.secondary;
    const accent   = paleta.accent    || DEFAULTS.accent;

    injectCSSVars({ primary, secondary, accent });

    setTheme({
      loaded:         true,
      primary,
      secondary,
      accent,
      logoUrl:        raw.logo_url       || null,
      nombreEmpresa:  raw.nombre         || null,
      nit:            raw.nit            || null,
      cicloReporte:   raw.ciclo_reporte  || 'mensual',
      estiloUI:       raw.estilo_ui      || 'default',
    });

    // Limpiar al desmontar (por si el usuario cierra sesión)
    return () => {
      injectCSSVars(null, true);
    };
  }, []); // Solo se ejecuta una vez al montar

  return theme;
}

export default useTenantTheme;
