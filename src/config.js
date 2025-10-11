/**
 * Configuración del Portal de Validadores
 * Se conecta al backend de IncaNeurobaeza
 */

// URL del backend (cambiar en producción)
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Token de administrador (desde variables de entorno)
export const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN || '';

// Configuración de headers para todas las peticiones
export const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Token': ADMIN_TOKEN,
});

// Helper para hacer fetch con headers automáticos
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: getHeaders(),
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// API Functions
export const api = {
  // Listar casos con filtros
  getCasos: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiFetch(`/validador/casos?${queryParams}`);
  },

  // Detalle de un caso
  getCasoDetalle: (serial) => {
    return apiFetch(`/validador/casos/${serial}`);
  },

  // Cambiar estado de un caso
  cambiarEstado: (serial, data) => {
    return apiFetch(`/validador/casos/${serial}/estado`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Autorizar nueva incapacidad
  autorizarNueva: (serial) => {
    return apiFetch(`/validador/casos/${serial}/autorizar-nueva`, {
      method: 'POST',
    });
  },

  // Agregar nota rápida
  agregarNota: (serial, contenido, esImportante = false) => {
    return apiFetch(`/validador/casos/${serial}/nota`, {
      method: 'POST',
      body: JSON.stringify({ contenido, es_importante: esImportante }),
    });
  },

  // Obtener estadísticas
  getStats: (empresa = 'all') => {
    return apiFetch(`/validador/stats?empresa=${empresa}`);
  },

  // Exportar casos
  exportarCasos: async (formato = 'xlsx', filtros = {}) => {
    const params = new URLSearchParams({ formato, ...filtros }).toString();
    const url = `${API_BASE_URL}/validador/exportar/casos?${params}`;
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Error al exportar');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `casos_export_${new Date().toISOString().split('T')[0]}.${formato}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Forzar sincronización
  forzarSync: () => {
    return apiFetch('/admin/sync-now', { method: 'POST' });
  },

  // Health check
  health: () => {
    return fetch(`${API_BASE_URL}/health`).then(r => r.json());
  },
};