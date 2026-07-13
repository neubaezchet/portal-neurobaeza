/**
 * cicloPeriodos — Períodos de reportes según el ciclo de la empresa
 * ==================================================================
 * Cada empresa elige en el wizard si maneja tiempos QUINCENALES o MENSUALES
 * (tenant_config.ciclo_reporte). Todo lo relacionado con tiempo se adapta:
 *  - mensual   → se ocultan las opciones de quincena; default "Mes Actual".
 *  - quincenal → las quincenas van primero; default = la quincena en curso.
 *  - admin global (sin tenant_config) → todas las opciones, default mes.
 */

export function getCicloReporte() {
  try {
    const cfg = JSON.parse(localStorage.getItem('tenant_config'));
    return (cfg && cfg.ciclo_reporte) || null;
  } catch {
    return null;
  }
}

/** Filtra/ordena la lista de períodos según el ciclo de la empresa. */
export function periodosPorCiclo(periodos) {
  const ciclo = getCicloReporte();
  if (ciclo === 'mensual') {
    return periodos.filter(p => !String(p.value).startsWith('quincena'));
  }
  if (ciclo === 'quincenal') {
    const quincenas = periodos.filter(p => String(p.value).startsWith('quincena'));
    const resto = periodos.filter(p => !String(p.value).startsWith('quincena'));
    return [...quincenas, ...resto];
  }
  return periodos;
}

/** Período inicial según el ciclo (quincenal → la quincena en curso). */
export function periodoDefault() {
  if (getCicloReporte() === 'quincenal') {
    return new Date().getDate() <= 15 ? 'quincena_1' : 'quincena_2';
  }
  return 'mes_actual';
}
