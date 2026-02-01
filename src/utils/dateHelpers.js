/**
 * UTILIDADES DE FECHAS
 * Funciones para cálculos de períodos
 */

export const calcularPeriodo = (tipo) => {
  const hoy = new Date();
  
  switch (tipo) {
    case 'mes_actual':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
      };
    
    case 'mes_anterior':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), 0),
      };
    
    case 'quincena_1':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), 15),
      };
    
    case 'quincena_2':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 16),
        fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
      };
    
    case 'año_actual':
      return {
        inicio: new Date(hoy.getFullYear(), 0, 1),
        fin: new Date(hoy.getFullYear(), 11, 31),
      };
    
    default:
      return { inicio: null, fin: null };
  }
};

export const formatearFecha = (fecha, formato = 'es-CO') => {
  if (!fecha) return 'N/A';
  return new Date(fecha).toLocaleDateString(formato);
};

export const tiempoDesdeActualizacion = (fecha) => {
  const ahora = new Date();
  const diferencia = Math.floor((ahora - fecha) / 1000);
  
  if (diferencia < 60) return `Hace ${diferencia}s`;
  if (diferencia < 3600) return `Hace ${Math.floor(diferencia / 60)}m`;
  if (diferencia < 86400) return `Hace ${Math.floor(diferencia / 3600)}h`;
  return `Hace ${Math.floor(diferencia / 86400)}d`;
};

export const generarNombreArchivo = (empresa, formato) => {
  const fecha = new Date().toISOString().split('T')[0];
  const empresaNombre = empresa === 'all' ? 'todas-empresas' : empresa.toLowerCase();
  return `reporte_incapacidades_${empresaNombre}_${fecha}.${formato}`;
};
