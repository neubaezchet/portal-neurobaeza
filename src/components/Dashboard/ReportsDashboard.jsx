import React, { useState } from 'react';
import TableViva from './TableViva';

/**
 * DASHBOARD DE REPORTES
 * Componente principal para visualización de tabla viva y exportaciones
 */
const ReportsDashboard = ({ empresas = [] }) => {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('all');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes_actual');

  return (
    <div className="reports-dashboard">
      {/* Encabezado */}
      <div className="dashboard-header mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📊 Dashboard de Reportes
        </h2>
        <p className="text-gray-600 mt-2">
          Visualización en tiempo real y exportación de datos
        </p>
      </div>

      {/* Filtros */}
      <div className="filters-section bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filtro Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏢 Empresa
            </label>
            <select
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map((empresa, index) => (
                <option key={index} value={empresa}>
                  {empresa}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Período
            </label>
            <select
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mes_actual">Mes Actual</option>
              <option value="mes_anterior">Mes Anterior</option>
              <option value="quincena_1">Primera Quincena</option>
              <option value="quincena_2">Segunda Quincena</option>
              <option value="año_actual">Año Actual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Viva */}
      <TableViva 
        empresa={empresaSeleccionada} 
        periodo={periodoSeleccionado} 
      />
    </div>
  );
};

export default ReportsDashboard;
