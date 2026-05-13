/**
 * 📋 Tabla de Resultados de Validación IA
 * Muestra validaciones de incapacidades con decisiones y reglas fallidas
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Download, RefreshCw, 
  AlertCircle, CheckCircle, XCircle, Clock, Filter
} from 'lucide-react';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';

const DECISION_STYLES = {
  'ACEPTAR': {
    bg: 'bg-green-50',
    border: 'border-green-300',
    badge: 'bg-green-200 text-green-800',
    icon: CheckCircle,
    color: '#16a34a'
  },
  'RECHAZAR': {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-200 text-red-800',
    icon: XCircle,
    color: '#dc2626'
  },
  'REVISAR': {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    badge: 'bg-yellow-200 text-yellow-800',
    icon: Clock,
    color: '#f59e0b'
  }
};

const ValidationResultsTable = ({ cedula, onRefresh }) => {
  const [validaciones, setValidaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filtroDecision, setFiltroDecision] = useState('TODOS');
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    if (cedula) {
      cargarValidaciones();
      cargarResumen();
    }
  }, [cedula, filtroDecision]);

  const cargarValidaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = filtroDecision === 'TODOS'
        ? `/api/ocr/validaciones/${cedula}`
        : `/api/ocr/validaciones/${cedula}?decision=${filtroDecision}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Error al cargar validaciones');

      const data = await response.json();
      setValidaciones(data.resultados || []);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ocr/resumen-validaciones/${cedula}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        setResumen(data);
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    }
  };

  const exportarCSV = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ocr/validaciones/${cedula}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = await response.json();

      // Crear CSV
      const headers = [
        'ID', 'Decisión', 'Motivo', 'Reglas Fallidas', 'Fecha',
        'Cédula', 'Nombre', 'Diagnóstico CIE-10', 'Días'
      ];

      const rows = data.resultados.map(r => [
        r.id,
        r.decision,
        r.motivo.substring(0, 50),
        r.reglas_fallidas.join('; '),
        new Date(r.creado_en).toLocaleDateString('es-CO'),
        r.datos_extraidos?.cedula || '',
        r.datos_extraidos?.nombre_paciente || '',
        r.datos_extraidos?.diagnostico_cie10 || '',
        r.datos_extraidos?.dias || ''
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      // Descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `validaciones_${cedula}.csv`);
      link.click();
    } catch (err) {
      console.error('Error al exportar:', err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading && validaciones.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin">
          <RefreshCw className="w-6 h-6 text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 Resultados de Validación</h2>
          <p className="text-sm text-gray-600 mt-1">Cédula: <span className="font-mono font-bold">{cedula}</span></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { cargarValidaciones(); cargarResumen(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{resumen.total_validaciones}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{resumen.por_decision?.ACEPTAR || 0}</p>
            <p className="text-xs text-gray-600">Aceptadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{resumen.por_decision?.RECHAZAR || 0}</p>
            <p className="text-xs text-gray-600">Rechazadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{resumen.por_decision?.REVISAR || 0}</p>
            <p className="text-xs text-gray-600">Para Revisar</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{Math.round(resumen.tasa_aceptacion * 100)}%</p>
            <p className="text-xs text-gray-600">Tasa Aceptación</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-600" />
        <select
          value={filtroDecision}
          onChange={(e) => setFiltroDecision(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODOS">TODOS</option>
          <option value="ACEPTAR">ACEPTAR</option>
          <option value="RECHAZAR">RECHAZAR</option>
          <option value="REVISAR">REVISAR</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Tabla */}
      {validaciones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay validaciones registradas</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Decisión</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Motivo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reglas Fallidas</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {validaciones.map((resultado) => {
                const style = DECISION_STYLES[resultado.decision];
                const isExpanded = expandedId === resultado.id;

                return (
                  <React.Fragment key={resultado.id}>
                    <tr className={`border-b border-gray-200 hover:bg-gray-50 transition ${style.bg}`}>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpand(resultado.id)}
                          className="p-1 hover:bg-gray-300 rounded transition"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style.badge}`}>
                          {resultado.decision}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {resultado.motivo}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {resultado.reglas_fallidas && resultado.reglas_fallidas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {resultado.reglas_fallidas.map((regla) => (
                              <span
                                key={regla}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono"
                              >
                                {regla}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(resultado.creado_en).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>

                    {/* Fila Expandida */}
                    {isExpanded && (
                      <tr className="border-b-2 border-gray-300">
                        <td colSpan="5" className="px-4 py-6 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Datos Extraídos */}
                            <div>
                              <h4 className="font-bold text-gray-800 mb-3">📄 Datos Extraídos</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Nombre:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.nombre_paciente || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Cédula:</span>
                                  <span className="font-mono font-semibold">
                                    {resultado.datos_extraidos?.cedula || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Diagnóstico CIE-10:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.diagnostico_cie10 || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Fecha Inicio:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.fecha_inicio || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Fecha Fin:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.fecha_fin || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Días:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.dias || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Médico:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.medico || '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Origen:</span>
                                  <span className="font-semibold">
                                    {resultado.datos_extraidos?.origen || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Detalles de Validación */}
                            <div>
                              <h4 className="font-bold text-gray-800 mb-3">🤖 Detalles de Validación</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Decisión:</span>
                                  <span className={`px-2 py-1 rounded font-semibold ${DECISION_STYLES[resultado.decision].badge}`}>
                                    {resultado.decision}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Modelo IA:</span>
                                  <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                                    {resultado.modelo_ia}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Reglas:</span>
                                  <span className="font-semibold">
                                    {resultado.reglas_procesadas || 'N/A'}
                                  </span>
                                </div>
                                <div className="mt-4">
                                  <p className="text-gray-600 font-semibold mb-2">Motivo:</p>
                                  <p className="text-gray-700 bg-white p-2 rounded border border-gray-200">
                                    {resultado.motivo}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-600 text-center">
        Mostrando {validaciones.length} validaciones
      </div>
    </div>
  );
};

export default ValidationResultsTable;
