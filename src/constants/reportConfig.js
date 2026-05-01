/**
 * CONFIGURACIÓN GLOBAL DE REPORTES
 * Constantes, mapeos, configuraciones
 */

// Estados y sus colores/iconos
export const ESTADOS_MAP = {
  'NUEVO': { 
    label: '🔵 NUEVO',
    color: '#3b82f6',
    bg: '#dbeafe',
    border: '#93c5fd'
  },
  'INCOMPLETA': { 
    label: '🔴 INCOMPLETA',
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fca5a5'
  },
  'ILEGIBLE': { 
    label: '🟠 ILEGIBLE',
    color: '#f59e0b',
    bg: '#fef3c7',
    border: '#fcd34d'
  },
  'COMPLETA': { 
    label: '🟢 VALIDADA',
    color: '#16a34a',
    bg: '#dcfce7',
    border: '#86efac'
  },
  'EPS_TRANSCRIPCION': { 
    label: '🟡 EPS',
    color: '#ca8a04',
    bg: '#fef08a',
    border: '#facc15'
  },
  'DERIVADO_TTHH': { 
    label: '🔵 ES POSIBLE FRAUDE',
    color: '#2563eb',
    bg: '#dbeafe',
    border: '#93c5fd'
  },
};

// Tipos de incapacidad
export const TIPOS_INCAPACIDAD = [
  { key: 'general', label: '🏥 Enfermedad General' },
  { key: 'maternity', label: '👶 Maternidad' },
  { key: 'paternity', label: '👨‍👦 Paternidad' },
  { key: 'traffic', label: '🚗 Accidente Tránsito' },
  { key: 'labor', label: '🏭 Accidente Laboral' },
  { key: 'certificado_hospitalizacion', label: '🏥 Cert. Hospitalización' },
  { key: 'prelicencia', label: '📋 Prelicencia' },
];

// Períodos disponibles
export const PERIODOS = {
  'mes_actual': { label: '📆 Mes Actual', order: 1 },
  'mes_anterior': { label: '📆 Mes Anterior', order: 2 },
  'quincena_1': { label: '📅 Quincena 1 (1-15)', order: 3 },
  'quincena_2': { label: '📅 Quincena 2 (16-Fin)', order: 4 },
  'año_actual': { label: '📊 Año Actual', order: 5 },
  'custom': { label: '📋 Rango Custom', order: 6 },
};

// Presets de exportación
export const EXPORT_PRESETS = [
  {
    id: 'completas_mes',
    label: '✅ Completadas Este Mes',
    icon: '✅',
    defaults: { estados: ['COMPLETA'], periodo: 'mes_actual' },
    description: 'Solo casos validados correctamente'
  },
  {
    id: 'incompletas_mes',
    label: '❌ Incompletas Este Mes',
    icon: '❌',
    defaults: { estados: ['INCOMPLETA', 'ILEGIBLE', 'INCOMPLETA_ILEGIBLE'], periodo: 'mes_actual' },
    description: 'Casos que necesitan corrección'
  },
  {
    id: 'todas_mes',
    label: '📊 Todas Este Mes',
    icon: '📊',
    defaults: { estados: [], periodo: 'mes_actual' },
    description: 'Todos los casos del período'
  },
  {
    id: 'pendientes_año',
    label: '⏳ Pendientes Este Año',
    icon: '⏳',
    defaults: { estados: ['NUEVO', 'INCOMPLETA', 'ILEGIBLE'], periodo: 'año_actual' },
    description: 'Casos aún sin procesar completamente'
  },
  {
    id: 'derivadas_tthh',
    label: '🚨 Posibles Fraudes',
    icon: '🚨',
    defaults: { estados: ['DERIVADO_TTHH'], periodo: 'mes_actual' },
    description: 'Casos con posible fraude'
  },
  {
    id: 'eps_transcripcion',
    label: '📋 Enviadas EPS',
    icon: '📋',
    defaults: { estados: ['EPS_TRANSCRIPCION'], periodo: 'mes_actual' },
    description: 'Casos en proceso de transcripción'
  },
];

// Configuración API
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://web-production-95ed.up.railway.app',
  ADMIN_TOKEN: process.env.REACT_APP_ADMIN_TOKEN || '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c',
  REFRESH_INTERVAL: 30000, // 30 segundos
  TIMEOUT: 30000,
};

// Formatos de exportación
export const EXPORT_FORMATS = [
  { key: 'xlsx', label: 'Excel', ext: '.xlsx', icon: '📊' },
  { key: 'csv', label: 'CSV', ext: '.csv', icon: '📄' },
  { key: 'json', label: 'JSON', ext: '.json', icon: '{ }' },
];

const reportConfig = {
  ESTADOS_MAP,
  TIPOS_INCAPACIDAD,
  PERIODOS,
  EXPORT_PRESETS,
  API_CONFIG,
  EXPORT_FORMATS,
};

export default reportConfig;
