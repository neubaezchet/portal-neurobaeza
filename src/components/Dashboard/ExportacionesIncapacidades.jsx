import React, { useState, useEffect, useCallback } from 'react';
import { Download, Filter, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExportacionesIncapacidades = ({ empresas }) => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    empresa: 'all',
    estado: 'all',
  });

  const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
  const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Token': ADMIN_TOKEN,
  });

  // 📥 Cargar datos desde el backend
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: filtros.fecha_inicio || '',
        fecha_fin: filtros.fecha_fin || '',
        empresa: filtros.empresa,
        estado: filtros.estado,
      }).toString();

      const response = await fetch(
        `${API_BASE_URL}/validador/exportar/incapacidades?${params}`,
        { headers: getHeaders() }
      );

      if (!response.ok) throw new Error('Error al cargar datos');
      
      const resultado = await response.json();
      setDatos(resultado.datos || []);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Cargar datos al cambiar filtros
  useEffect(() => {
    if (filtros.fecha_inicio && filtros.fecha_fin) {
      cargarDatos();
    }
  }, [filtros, cargarDatos]);

  // 📊 Exportar a Excel
  const exportarExcel = () => {
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosFormateados = datos.map(d => ({
      'Serial': d.serial || '',
      'Fecha Radicación': d.fecha_radicacion ? new Date(d.fecha_radicacion).toLocaleDateString('es-CO') : '',
      
      // EMPRESA
      'Empresa': d.empresa || '',
      'NIT Empresa': d.nit_empresa || '',
      
      // TRABAJADOR
      'Tipo Documento': d.tipo_documento || '',
      'Número Documento': d.numero_documento || '',
      'Nombre Trabajador': d.nombre_trabajador || '',
      
      // INCAPACIDAD
      'Fecha Inicio': d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleDateString('es-CO') : '',
      'Fecha Fin': d.fecha_fin ? new Date(d.fecha_fin).toLocaleDateString('es-CO') : '',
      'Días': d.dias_incapacidad || 0,
      'Diagnóstico': d.diagnostico || '',
      'Número Incapacidad': d.numero_incapacidad || '',
      
      // ENTIDAD QUE EXPIDE
      'Centro/Clínica': d.entidad_expide || '',
      'NIT Centro': d.nit_entidad_expide || '',
      'Fecha Expedición': d.fecha_expedicion ? new Date(d.fecha_expedicion).toLocaleDateString('es-CO') : '',
      
      // MÉDICO
      'Doctor/Médico': d.nombre_medico || '',
      'Cédula Médico': d.cedula_medico || '',
      'Especialidad': d.especialidad_medico || '',
      
      // CLASIFICACIÓN
      'Tipo de Incapacidad': d.tipo_incapacidad || '',
      'Origen': d.origen || '',
      'Entidad Responsable': d.entidad_responsable || '',
      'OCEA': d.ocea || '',
      
      // ESTADO
      'Estado Validación': d.estado || '',
      'Observaciones': d.observaciones || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosFormateados);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Serial
      { wch: 14 }, // Fecha Radicación
      { wch: 20 }, // Empresa
      { wch: 15 }, // NIT Empresa
      { wch: 18 }, // Tipo Documento
      { wch: 18 }, // Número Documento
      { wch: 25 }, // Nombre
      { wch: 14 }, // Fecha Inicio
      { wch: 14 }, // Fecha Fin
      { wch: 8 },  // Días
      { wch: 25 }, // Diagnóstico
      { wch: 18 }, // Número Incapacidad
      { wch: 25 }, // Centro
      { wch: 15 }, // NIT Centro
      { wch: 14 }, // Fecha Expedición
      { wch: 25 }, // Doctor
      { wch: 15 }, // Cédula Médico
      { wch: 20 }, // Especialidad
      { wch: 25 }, // Tipo Incapacidad
      { wch: 20 }, // Origen
      { wch: 25 }, // Entidad Responsable
      { wch: 20 }, // OCEA
      { wch: 20 }, // Estado
      { wch: 30 }, // Observaciones
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Incapacidades');

    // Descargar archivo
    const nombreArchivo = `Incapacidades_${filtros.fecha_inicio}_a_${filtros.fecha_fin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // 📄 Mostrar preview de datos
  const renderTabla = () => {
    if (datos.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          {loading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Cargando datos...
            </>
          ) : (
            'Selecciona rango de fechas para ver datos'
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">Serial</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-left">Trabajador</th>
              <th className="px-4 py-2 text-left">Documento</th>
              <th className="px-4 py-2 text-left">Fecha Inicio</th>
              <th className="px-4 py-2 text-left">Fecha Fin</th>
              <th className="px-4 py-2 text-left">Días</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Entidad</th>
              <th className="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d, idx) => (
              <tr key={idx} className="border-t border-gray-700 hover:bg-gray-800/50">
                <td className="px-4 py-2 font-mono text-yellow-300">{d.serial}</td>
                <td className="px-4 py-2">{d.empresa}</td>
                <td className="px-4 py-2">{d.nombre_trabajador}</td>
                <td className="px-4 py-2">{d.numero_documento}</td>
                <td className="px-4 py-2">{d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleDateString('es-CO') : '-'}</td>
                <td className="px-4 py-2">{d.fecha_fin ? new Date(d.fecha_fin).toLocaleDateString('es-CO') : '-'}</td>
                <td className="px-4 py-2 text-center">{d.dias_incapacidad}</td>
                <td className="px-4 py-2 text-xs">{d.tipo_incapacidad}</td>
                <td className="px-4 py-2 text-xs">{d.entidad_responsable}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    d.estado === 'COMPLETA' ? 'bg-green-500/20 text-green-400' :
                    d.estado === 'INCOMPLETA' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {d.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FILTROS */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-400" />
          Filtros de Búsqueda
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filtros.fecha_inicio}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={filtros.fecha_fin}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_fin: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
            <select
              value={filtros.empresa}
              onChange={(e) => setFiltros(prev => ({ ...prev, empresa: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="COMPLETA">Validadas</option>
              <option value="INCOMPLETA">Incompletas</option>
              <option value="ILEGIBLE">Ilegibles</option>
              <option value="NUEVA">Nuevas</option>
            </select>
          </div>
        </div>

        {/* BOTÓN EXPORTAR */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={cargarDatos}
            disabled={!filtros.fecha_inicio || !filtros.fecha_fin || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Actualizar Datos
          </button>

          <button
            onClick={exportarExcel}
            disabled={datos.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Descargar Excel ({datos.length} registros)
          </button>
        </div>
      </div>

      {/* PREVIEW TABLA */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {renderTabla()}
        </div>
      </div>

      {/* INFO */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-200 text-sm">
        <p className="font-semibold mb-2">📊 Campos incluidos en la exportación:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div>✅ Serial</div>
          <div>✅ Empresa y NIT</div>
          <div>✅ Tipo y Número Documento</div>
          <div>✅ Fechas Incapacidad</div>
          <div>✅ Diagnóstico</div>
          <div>✅ Centro/Clínica</div>
          <div>✅ Médico y Datos</div>
          <div>✅ Entidad Responsable</div>
          <div>✅ Origen y OCEA</div>
        </div>
      </div>
    </div>
  );
};

export default ExportacionesIncapacidades;
