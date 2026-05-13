/**
 * 📋 Tabla de Resultados de Validación IA - VERSIÓN PROFESIONAL v2.0
 * Componente robusto y escalable para manejar 200-300 validaciones diarias
 * 
 * Características:
 * - Paginación eficiente para grandes volúmenes
 * - Memoización y optimización de rendimiento
 * - Caching de resultados (5 min TTL)
 * - Request deduplication
 * - Manejo robusto de errores
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Download, RefreshCw, 
  AlertCircle, CheckCircle, XCircle, Clock, Filter,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
const ITEMS_PER_PAGE = 25;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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

/**
 * Hook personalizado para gestión de caché con TTL
 */
const useApiCache = () => {
  const cacheRef = useRef(new Map());

  const getCached = useCallback((key) => {
    const cached = cacheRef.current.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, []);

  const setCached = useCallback((key, data) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { getCached, setCached, clear };
};

/**
 * Fila renderizada con memoización para optimizar re-renders
 */
const ValidationRow = React.memo(({
  resultado,
  isExpanded,
  onToggleExpand,
  style
}) => (
  <>
    <tr className={`border-b border-gray-200 hover:bg-gray-50 transition ${style.bg}`}>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleExpand(resultado.id)}
          className="p-1 hover:bg-gray-300 rounded transition"
          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
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
            {resultado.reglas_fallidas.slice(0, 3).map((regla) => (
              <span
                key={regla}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono"
              >
                {regla}
              </span>
            ))}
            {resultado.reglas_fallidas.length > 3 && (
              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                +{resultado.reglas_fallidas.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
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
            <div>
              <h4 className="font-bold text-gray-800 mb-3">📄 Datos Extraídos</h4>
              <div className="space-y-2 text-sm bg-white p-3 rounded border border-gray-200">
                <div className="flex justify-between"><span className="text-gray-600">Nombre:</span><span className="font-semibold">{resultado.datos_extraidos?.nombre_paciente || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Cédula:</span><span className="font-mono font-semibold text-sm">{resultado.datos_extraidos?.cedula || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Diagnóstico CIE-10:</span><span className="font-semibold">{resultado.datos_extraidos?.diagnostico_cie10 || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Fecha Inicio:</span><span className="font-semibold">{resultado.datos_extraidos?.fecha_inicio || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Fecha Fin:</span><span className="font-semibold">{resultado.datos_extraidos?.fecha_fin || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Días:</span><span className="font-semibold text-lg">{resultado.datos_extraidos?.dias || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Médico:</span><span className="font-semibold">{resultado.datos_extraidos?.medico || '-'}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-3">🔍 Análisis de Validación</h4>
              <div className="space-y-2 text-sm bg-white p-3 rounded border border-gray-200">
                <div><p className="text-gray-600 font-semibold mb-2">Decisión:</p><span className={`px-3 py-1 rounded-full text-sm font-semibold ${DECISION_STYLES[resultado.decision].badge}`}>{resultado.decision}</span></div>
                {resultado.reglas_fallidas && resultado.reglas_fallidas.length > 0 && (
                  <div>
                    <p className="text-gray-600 font-semibold mb-2">Reglas que Fallaron:</p>
                    <div className="flex flex-wrap gap-2">
                      {resultado.reglas_fallidas.map((regla) => (
                        <span key={regla} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">{regla}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200"><p className="text-gray-600 font-semibold mb-1">Motivo de Decisión:</p><p className="text-gray-700 italic">{resultado.motivo}</p></div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )}
  </>
));

ValidationRow.displayName = 'ValidationRow';

/**
 * Componente Principal - Tabla de Validaciones Profesional
 */
const ValidationResultsTable = ({ cedula, onRefresh }) => {
  const [validaciones, setValidaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filtroDecision, setFiltroDecision] = useState('TODOS');
  const [resumen, setResumen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { getCached, setCached } = useApiCache();
  const requestAbortRef = useRef(new AbortController());

  /**
   * Cargar validaciones con caché y request deduplication
   */
  const cargarValidaciones = useCallback(async () => {
    if (!cedula) return;

    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      requestAbortRef.current.abort();
      requestAbortRef.current = new AbortController();

      const cacheKey = `validaciones_${cedula}_${filtroDecision}`;
      const cached = getCached(cacheKey);

      if (cached && !isInitialLoad) {
        setValidaciones(cached);
        setLoading(false);
        return;
      }

      const endpoint = filtroDecision === 'TODOS'
        ? `/api/ocr/validaciones/${cedula}`
        : `/api/ocr/validaciones/${cedula}?decision=${filtroDecision}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: requestAbortRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const resultados = data.resultados || [];

      setCached(cacheKey, resultados);
      setValidaciones(resultados);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error al cargar validaciones');
        console.error('Error al cargar validaciones:', err);
      }
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [cedula, filtroDecision, getCached, setCached, isInitialLoad]);

  /**
   * Cargar resumen con caché
   */
  const cargarResumen = useCallback(async () => {
    if (!cedula) return;

    try {
      const cacheKey = `resumen_${cedula}`;
      const cached = getCached(cacheKey);

      if (cached && !isInitialLoad) {
        setResumen(cached);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/ocr/resumen-validaciones/${cedula}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.ok) {
        const data = await response.json();
        setCached(cacheKey, data);
        setResumen(data);
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    }
  }, [cedula, getCached, setCached, isInitialLoad]);

  /**
   * Effect principal - Dependencies correctamente configurado
   */
  useEffect(() => {
    if (cedula) {
      cargarValidaciones();
      cargarResumen();
    }

    return () => {
      requestAbortRef.current.abort();
    };
  }, [cedula, filtroDecision, cargarValidaciones, cargarResumen]);

  /**
   * Exportar a CSV
   */
  const exportarCSV = useCallback(() => {
    try {
      const headers = [
        'ID', 'Decisión', 'Motivo', 'Reglas Fallidas', 'Fecha',
        'Cédula', 'Nombre', 'Diagnóstico CIE-10', 'Días'
      ];

      const rows = validaciones.map(r => [
        r.id,
        r.decision,
        r.motivo.substring(0, 50),
        r.reglas_fallidas?.join('; ') || '',
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

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `validaciones_${cedula}_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      setError('Error al exportar datos');
    }
  }, [validaciones, cedula]);

  /**
   * Paginación
   */
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return validaciones.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [validaciones, currentPage]);

  const totalPages = Math.ceil(validaciones.length / ITEMS_PER_PAGE);

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // Estado de carga inicial
  if (loading && isInitialLoad) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <RefreshCw className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-gray-600">Cargando validaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 Resultados de Validación IA</h2>
          <p className="text-sm text-gray-600 mt-1">
            Cédula: <span className="font-mono font-bold">{cedula}</span> | 
            Total: <span className="font-bold">{validaciones.length}</span> registros
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              cargarValidaciones();
              cargarResumen();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            disabled={validaciones.length === 0}
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
            <p className="text-2xl font-bold text-purple-600">{Math.round((resumen.tasa_aceptacion || 0) * 100)}%</p>
            <p className="text-xs text-gray-600">Tasa Aceptación</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <select
            value={filtroDecision}
            onChange={(e) => setFiltroDecision(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todas las Decisiones</option>
            <option value="ACEPTAR">✅ Aceptadas</option>
            <option value="RECHAZAR">❌ Rechazadas</option>
            <option value="REVISAR">⚠️ Para Revisar</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          Mostrando {paginatedData.length} de {validaciones.length} registros
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla */}
      {validaciones.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg">📭 No hay validaciones registradas</p>
          <p className="text-sm mt-1">Los resultados de validación aparecerán aquí una vez procesados</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                {paginatedData.map((resultado) => (
                  <ValidationRow
                    key={resultado.id}
                    resultado={resultado}
                    isExpanded={expandedId === resultado.id}
                    onToggleExpand={toggleExpand}
                    style={DECISION_STYLES[resultado.decision]}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg transition ${
                      currentPage === page
                        ? 'bg-blue-500 text-white font-semibold'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Página siguiente"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ValidationResultsTable;
