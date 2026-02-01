/**
 * DASHBOARD PRINCIPAL
 * Integra TableViva + ExportModal
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { PERIODOS } from '../../constants/reportConfig';
import TableViva from './TableViva';
import ExportModal from '../Modals/ExportModal';

export function ReportsDashboard({ empresas = [] }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [periodo, setPeriodo] = useState('mes_actual');
  const [empresa, setEmpresa] = useState('all');

  return (
    <div className="space-y-6 p-4">
      {/* TOOLBAR */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 text-white"
          >
            <option value="all">✅ Todas las Empresas</option>
            {empresas.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>

          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 text-white"
          >
            {Object.entries(PERIODOS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-green-600 hover:bg-green-700 rounded-lg px-6 py-2 font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Download className="w-5 h-5" />
            📊 Exportar
          </button>
        </div>
      </div>

      {/* TABLA VIVA */}
      <TableViva empresa={empresa} periodo={periodo} />

      {/* MODAL EXPORTACIÓN */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        empresas={empresas}
      />
    </div>
  );
}

export default ReportsDashboard;
