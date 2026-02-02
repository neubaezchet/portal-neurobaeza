/**
 * EXPORT MODAL - Modal Avanzado de Exportación
 * Presets, filtros, preview y descarga
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Eye, Zap } from 'lucide-react';
import { useExportData } from '../../hooks/useExportData';
import { calcularPeriodo } from '../../utils/dateHelpers';
import {
  EXPORT_PRESETS,
  ESTADOS_MAP,
  TIPOS_INCAPACIDAD,
  EXPORT_FORMATS,
  PERIODOS,
} from '../../constants/reportConfig';

export function ExportModal({ isOpen, onClose, empresas = [] }) {
  const [filtros, setFiltros] = useState({
    periodo: 'mes_actual',
    fechaInicio: null,
    fechaFin: null,
    empresa: 'all',
    estados: [],
    tipos: [],
    incluirHistorial: false,
  });

  const [exportFormat, setExportFormat] = useState('xlsx');
  const { cargarPreview, exportar, previewDatos, mostrarPreview, cargandoPreview, cargandoExport } = useExportData();

  // Calcular fechas automáticas según período
  useEffect(() => {
    const periodo = calcularPeriodo(filtros.periodo);
    setFiltros(prev => ({
      ...prev,
      fechaInicio: periodo.inicio,
      fechaFin: periodo.fin,
    }));
  }, [filtros.periodo]);

  if (!isOpen) return null;

  const aplicarPreset = (preset) => {
    setFiltros(prev => ({
      ...prev,
      periodo: preset.defaults.periodo,
      estados: preset.defaults.estados || [],
      tipos: preset.defaults.tipos || [],
    }));
    setTimeout(() => {
      const periodo = calcularPeriodo(preset.defaults.periodo);
      setFiltros(prev => ({
        ...prev,
        fechaInicio: periodo.inicio,
        fechaFin: periodo.fin,
      }));
    }, 0);
  };

  const toggleEstado = (estado) => {
    setFiltros(prev => ({
      ...prev,
      estados: prev.estados.includes(estado)
        ? prev.estados.filter(e => e !== estado)
        : [...prev.estados, estado]
    }));
  };

  const toggleTipo = (tipo) => {
    setFiltros(prev => ({
      ...prev,
      tipos: prev.tipos.includes(tipo)
        ? prev.tipos.filter(t => t !== tipo)
        : [...prev.tipos, tipo]
    }));
  };

  const handleCargarPreview = () => {
    cargarPreview({
      empresa: filtros.empresa,
      fecha_inicio: filtros.fechaInicio?.toISOString().split('T')[0],
      fecha_fin: filtros.fechaFin?.toISOString().split('T')[0],
      estados: filtros.estados.join(','),
      tipos: filtros.tipos.join(','),
    });
  };

  const handleExportar = async () => {
    exportar(
      {
        empresa: filtros.empresa,
        fecha_inicio: filtros.fechaInicio?.toISOString().split('T')[0],
        fecha_fin: filtros.fechaFin?.toISOString().split('T')[0],
        estados: filtros.estados.join(','),
        tipos: filtros.tipos.join(','),
        incluir_historial: filtros.incluirHistorial,
      },
      exportFormat
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between border-b-4 border-blue-700">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Download className="w-6 h-6" />
              📊 Exportar Reportes
            </h2>
            <p className="text-sm text-blue-100 mt-1">Descarga personalizados en tiempo real</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* PRESETS */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              ⚡ Reportes Rápidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EXPORT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => aplicarPreset(preset)}
                  className="px-3 py-2 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg text-sm font-medium text-gray-700 transition-colors text-left"
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FILTROS */}
            <div className="space-y-4">
              {/* Período */}
              <div className="border-b-2 border-gray-200 pb-4">
                <h3 className="font-bold text-gray-800 mb-3">📅 Período</h3>
                <select
                  value={filtros.periodo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(PERIODOS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {/* Empresa */}
              <div className="border-b-2 border-gray-200 pb-4">
                <h3 className="font-bold text-gray-800 mb-3">🏢 Empresa</h3>
                <select
                  value={filtros.empresa}
                  onChange={(e) => setFiltros(prev => ({ ...prev, empresa: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">✅ Todas</option>
                  {empresas.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Estados */}
              <div className="border-b-2 border-gray-200 pb-4">
                <h3 className="font-bold text-gray-800 mb-2">Estados</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(ESTADOS_MAP).map(([key, info]) => (
                    <label key={key} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtros.estados.includes(key)}
                        onChange={() => toggleEstado(key)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tipos */}
              <div>
                <h3 className="font-bold text-gray-800 mb-2">🏥 Tipo Incapacidad</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {TIPOS_INCAPACIDAD.map(tipo => (
                    <label key={tipo.key} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtros.tipos.includes(tipo.key)}
                        onChange={() => toggleTipo(tipo.key)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{tipo.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* FORMATO Y OPCIONES */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                <h3 className="font-bold text-gray-800 mb-3">💾 Formato</h3>
                <div className="flex gap-2">
                  {EXPORT_FORMATS.map(fmt => (
                    <button
                      key={fmt.key}
                      onClick={() => setExportFormat(fmt.key)}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                        exportFormat === fmt.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500'
                      }`}
                    >
                      {fmt.icon} {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox historial */}
              <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filtros.incluirHistorial}
                  onChange={(e) => setFiltros(prev => ({ ...prev, incluirHistorial: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">📜 Incluir Historial</span>
              </label>

              {/* Preview */}
              <button
                onClick={handleCargarPreview}
                disabled={cargandoPreview}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Eye className="w-5 h-5" />
                {cargandoPreview ? 'Cargando...' : 'Ver Preview'}
              </button>

              {/* Preview Data */}
              {mostrarPreview && previewDatos && (
                <div className="bg-white rounded-lg border border-gray-300 p-3 max-h-48 overflow-y-auto">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">
                    📊 Preview: {previewDatos.total} registros
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Cédula</th>
                        <th className="px-2 py-1 text-left">Nombre</th>
                        <th className="px-2 py-1 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewDatos.casos || []).slice(0, 10).map((caso, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="px-2 py-1 text-yellow-600 font-mono">{caso.cedula}</td>
                          <td className="px-2 py-1">{caso.nombre}</td>
                          <td className="px-2 py-1 text-xs">{caso.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              onClick={handleExportar}
              disabled={cargandoExport || !previewDatos}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cargandoExport ? '⏳' : <Download className="w-5 h-5" />}
              {cargandoExport ? 'Procesando...' : `Descargar ${exportFormat.toUpperCase()}`}
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;
