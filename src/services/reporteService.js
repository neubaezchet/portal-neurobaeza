/**
 * SERVICIO DE API PARA REPORTES
 * Centraliza todas las llamadas HTTP
 */

import { API_CONFIG } from '../constants/reportConfig';

class ReporteService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.token = API_CONFIG.ADMIN_TOKEN;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Admin-Token': this.token,
    };
  }

  async getTablaViva(params) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(
        `${this.baseURL}/validador/casos/tabla-viva?${queryParams}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Error cargando tabla viva');
      return await response.json();
    } catch (error) {
      console.error('ReporteService.getTablaViva:', error);
      throw error;
    }
  }

  async getPreview(params) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(
        `${this.baseURL}/validador/casos/preview-exportacion?${queryParams}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Error en preview');
      return await response.json();
    } catch (error) {
      console.error('ReporteService.getPreview:', error);
      throw error;
    }
  }

  async exportar(params, formato) {
    try {
      params.formato = formato;
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(
        `${this.baseURL}/validador/casos/exportar-avanzado?${queryParams}`,
        { headers: this.getHeaders() }
      );
      
      if (!response.ok) throw new Error('Error en exportación');
      return await response.blob();
    } catch (error) {
      console.error('ReporteService.exportar:', error);
      throw error;
    }
  }

  async regenerarTablaViva() {
    try {
      const response = await fetch(
        `${this.baseURL}/validador/casos/regenerar-tabla-viva`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );
      
      if (!response.ok) throw new Error('Error regenerando tabla');
      return await response.json();
    } catch (error) {
      console.error('ReporteService.regenerarTablaViva:', error);
      throw error;
    }
  }
}

export default new ReporteService();
