/**
 * TABLE VIVA - Dashboard en Tiempo Real
 * Auto-refresh cada 30 segundos
 * Gráficos y estadísticas en vivo
 */

import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Pause, Play } from 'lucide-react';
import { useTableViva } from '../../hooks/useTableViva';
import { tiempoDesdeActualizacion } from '../../utils/dateHelpers';
import { ESTADOS_MAP } from '../../constants/reportConfig';

export function TableViva({ empresa = 'all', periodo = 'mes_actual' }) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { datos, cargando, error, actualizando, ultimaActualizacion, refetch } = useTableViva(
    empresa,
    periodo,
    autoRefresh
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-red-800">
        <p className="font-bold">❌ Error cargando tabla viva</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  if (cargando && !datos) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Cargando tabla viva...</span>
      </div>
    );
  }

  if (!datos) return null;

  const total = datos.total || 0;
  const calcularPorcentaje = (cantidad) => total > 0 ? Math.round((cantidad / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📊 Tabla Viva - Período: {periodo === 'mes_actual' && `${new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Actualización automática cada 30 segundos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-blue-100">{tiempoDesdeActualizacion(ultimaActualizacion)}</div>
              <div className={`w-2 h-2 rounded-full mt-1 ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            </div>
            
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Actualizar ahora"
            >
              <RefreshCw className={`w-5 h-5 ${actualizando ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70'
              }`}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-400 mt-1">📊 Total</div>
        </div>

        {Object.entries(datos.estadisticas || {}).map(([estado, cantidad]) => {
          const info = ESTADOS_MAP[estado];
          if (!info || cantidad === 0) return null;
          
          const porcentaje = calcularPorcentaje(cantidad);
          
          return (
            <div
              key={estado}
              className="bg-gray-800/50 rounded-lg p-4 border"
              style={{ borderColor: info.color + '50' }}
            >
              <div className="text-lg font-bold" style={{ color: info.color }}>
                {cantidad}
              </div>
              <div className="text-xs text-gray-400 mt-1">{info.label}</div>
              <div className="text-xs mt-1 font-semibold" style={{ color: info.color + '99' }}>
                {porcentaje}%
              </div>
            </div>
          );
        })}
      </div>

      {/* GRÁFICO DE BARRAS */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          📈 Distribución de Estados
        </h3>
        
        <div className="space-y-3">
          {Object.entries(datos.estadisticas || {}).map(([estado, cantidad]) => {
            const info = ESTADOS_MAP[estado];
            if (!info) return null;
            
            const porcentaje = calcularPorcentaje(cantidad);
            
            return (
              <div key={estado}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{info.label}</span>
                  <span className="text-sm font-bold text-gray-400">
                    {cantidad} ({porcentaje}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${porcentaje}%`,
                      backgroundColor: info.color
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABLA DE ÚLTIMOS CASOS */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700">
          <h3 className="font-bold text-white">
            📋 Últimos Casos ({datos.casos?.length || 0})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Cédula</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Empresa</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">F. Inicio</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">F. Fin</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">F. Envío</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Hora Envío</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-300 uppercase">Días</th>
              </tr>
            </thead>
            <tbody>
              {(datos.ultimos_casos || []).slice(0, 20).map((caso, idx) => {
                const info = ESTADOS_MAP[caso.estado] || { color: '#9ca3af', label: caso.estado };
                return (
                  <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-yellow-300">{caso.cedula}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{caso.empleado}</td>
                    <td className="px-6 py-3 text-sm text-gray-400">{caso.empresa}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{caso.tipo}</td>
                    <td className="px-6 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: info.color + '20', color: info.color }}
                      >
                        {info.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{caso.fecha_inicio}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{caso.fecha_fin}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{caso.fecha_envio}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{caso.hora_envio}</td>
                    <td className="px-6 py-3 text-xs text-gray-500 font-bold">{caso.dias}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(datos.casos?.length || 0) > 20 && (
          <div className="bg-gray-900/30 px-6 py-3 text-center text-xs text-gray-500">
            Mostrando 20 de {datos.casos.length} registros
          </div>
        )}
      </div>

      {/* INFO DEL PERÍODO */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
        <div className="text-sm text-blue-900 dark:text-blue-300">
          <strong>📅 Período:</strong> {new Date(datos.fecha_inicio).toLocaleDateString('es-CO')} a{' '}
          {new Date(datos.fecha_fin).toLocaleDateString('es-CO')}
          <br />
          <strong>🔄 Auto-refresh:</strong> {autoRefresh ? 'Activo (cada 30s)' : 'Pausado'}
          <br />
          <strong>💾 Datos:</strong> Se renuevan automáticamente al cambiar de mes/quincena
        </div>
      </div>
    </div>
  );
}

export default TableViva;
