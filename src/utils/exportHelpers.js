/**
 * UTILIDADES DE EXPORTACIÓN
 * Funciones para manejo de descargas
 */

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const buildExportParams = (filtros) => {
  const params = new URLSearchParams();
  
  Object.keys(filtros).forEach(key => {
    const valor = filtros[key];
    
    if (valor === null || valor === undefined || valor === '') return;
    
    if (Array.isArray(valor)) {
      params.append(key, valor.join(','));
    } else if (valor instanceof Date) {
      params.append(key, valor.toISOString().split('T')[0]);
    } else {
      params.append(key, valor);
    }
  });
  
  return params;
};

export const validateExportFilters = (filtros) => {
  const errors = [];
  
  if (!filtros.periodo) {
    errors.push('Debe seleccionar un período');
  }
  
  if (filtros.periodo === 'custom') {
    if (!filtros.fechaInicio) errors.push('Fecha inicio requerida');
    if (!filtros.fechaFin) errors.push('Fecha fin requerida');
    if (filtros.fechaInicio && filtros.fechaFin && filtros.fechaInicio > filtros.fechaFin) {
      errors.push('La fecha inicio debe ser menor que fecha fin');
    }
  }
  
  return errors;
};
