import React, { useState, useEffect, useCallback } from 'react';
import { Download, Filter, Calendar, Loader2, Settings2, Eye, EyeOff, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExportacionesIncapacidades = ({ empresas }) => {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnasDisponibles] = useState([
    { id: 'serial', label: 'Serial' },
    { id: 'fecha_radicacion', label: 'Fecha Radicación' },
    { id: 'empresa', label: 'Empresa' },
    { id: 'nit_empresa', label: 'NIT Empresa' },
    { id: 'tipo_documento', label: 'Tipo Documento' },
    { id: 'numero_documento', label: 'Número Documento' },
    { id: 'nombre_trabajador', label: 'Nombre Trabajador' },
    { id: 'fecha_inicio', label: 'Fecha Inicio' },
    { id: 'fecha_fin', label: 'Fecha Fin' },
    { id: 'dias_incapacidad', label: 'Días' },
    { id: 'diagnostico', label: 'Diagnóstico' },
    { id: 'numero_incapacidad', label: 'Número Incapacidad' },
    { id: 'entidad_expide', label: 'Centro/Clínica' },
    { id: 'nit_entidad_expide', label: 'NIT Centro' },
    { id: 'fecha_expedicion', label: 'Fecha Expedición' },
    { id: 'nombre_medico', label: 'Doctor/Médico' },
    { id: 'cedula_medico', label: 'Cédula Médico' },
    { id: 'especialidad_medico', label: 'Especialidad' },
    { id: 'tipo_incapacidad', label: 'Tipo de Incapacidad' },
    { id: 'origen', label: 'Origen' },
    { id: 'entidad_responsable', label: 'Entidad Responsable' },
    { id: 'estado', label: 'Estado Validación' },
    { id: 'observaciones', label: 'Observaciones' },
    { id: 'texto_plano', label: 'Texto Plano Enviado' },
  ]);

  const [columnasActivas, setColumnasActivas] = useState(() => {
    const saved = localStorage.getItem('columnasIncapacidades');
    if (saved) return JSON.parse(saved);
    return columnasDisponibles.map(c => c.id);
  });

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

  // 📊 Exportar a Excel (solo columnas activas)
  const exportarExcel = () => {
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosFormateados = datos.map(d => {
      const fila = {};
      columnasActivas.forEach(colId => {
        const columna = columnasDisponibles.find(c => c.id === colId);
        if (!columna) return;

        switch (colId) {
          case 'fecha_radicacion':
            fila[columna.label] = d.fecha_radicacion ? new Date(d.fecha_radicacion).toLocaleDateString('es-CO') : '';
            break;
          case 'fecha_inicio':
            fila[columna.label] = d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleDateString('es-CO') : '';
            break;
          case 'fecha_fin':
            fila[columna.label] = d.fecha_fin ? new Date(d.fecha_fin).toLocaleDateString('es-CO') : '';
            break;
          case 'fecha_expedicion':
            fila[columna.label] = d.fecha_expedicion ? new Date(d.fecha_expedicion).toLocaleDateString('es-CO') : '';
            break;
          case 'dias_incapacidad':
            fila[columna.label] = d.dias_incapacidad || 0;
            break;
          case 'texto_plano':
            fila[columna.label] = d.texto_plano || '';
            break;
          default:
            fila[columna.label] = d[colId] || '';
        }
      });
      return fila;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosFormateados);

    // Ajustar anchos automáticamente
    ws['!cols'] = columnasActivas.map(() => ({ wch: 18 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Incapacidades');

    const nombreArchivo = `Incapacidades_${filtros.fecha_inicio}_a_${filtros.fecha_fin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // 📌 Guardar configuración de columnas
  const guardarConfiguracionColumnas = () => {
    localStorage.setItem('columnasIncapacidades', JSON.stringify(columnasActivas));
    alert('✅ Configuración guardada como predeterminada');
    setShowColumnSettings(false);
  };

  // 🔄 Mover columna arriba
  const moverColumnaArriba = (index) => {
    if (index <= 0) return;
    const nueva = [...columnasActivas];
    [nueva[index], nueva[index - 1]] = [nueva[index - 1], nueva[index]];
    setColumnasActivas(nueva);
  };

  // 🔄 Mover columna abajo
  const moverColumnaAbajo = (index) => {
    if (index >= columnasActivas.length - 1) return;
    const nueva = [...columnasActivas];
    [nueva[index], nueva[index + 1]] = [nueva[index + 1], nueva[index]];
    setColumnasActivas(nueva);
  };

  // ➕ Agregar columna
  const agregarColumna = (colId) => {
    if (!columnasActivas.includes(colId)) {
      setColumnasActivas([...columnasActivas, colId]);
    }
  };

  // ➖ Quitar columna
  const quitarColumna = (colId) => {
    setColumnasActivas(columnasActivas.filter(id => id !== colId));
  };

  // 📄 Mostrar preview de datos (solo columnas activas)
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

    const columnasVisibles = columnasDisponibles.filter(c => columnasActivas.includes(c.id));

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              {columnasVisibles.map(col => (
                <th key={col.id} className="px-4 py-2 text-left whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((d, idx) => (
              <tr key={idx} className="border-t border-gray-700 hover:bg-gray-800/50">
                {columnasVisibles.map(col => (
                  <td key={col.id} className="px-4 py-2 text-xs">
                    {col.id === 'fecha_radicacion' ? (d.fecha_radicacion ? new Date(d.fecha_radicacion).toLocaleDateString('es-CO') : '-') :
                     col.id === 'fecha_inicio' ? (d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleDateString('es-CO') : '-') :
                     col.id === 'fecha_fin' ? (d.fecha_fin ? new Date(d.fecha_fin).toLocaleDateString('es-CO') : '-') :
                     col.id === 'fecha_expedicion' ? (d.fecha_expedicion ? new Date(d.fecha_expedicion).toLocaleDateString('es-CO') : '-') :
                     col.id === 'texto_plano' ? <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-900 p-2 rounded">{d.texto_plano || ''}</pre> :
                     d[col.id] || '-'}
                  </td>
                ))}
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

        {/* BOTONES */}
        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={cargarDatos}
            disabled={!filtros.fecha_inicio || !filtros.fecha_fin || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Actualizar Datos
          </button>

          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            <Settings2 className="w-4 h-4" />
            Configurar Columnas
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

      {/* MODAL DE CONFIGURACIÓN DE COLUMNAS */}
      {showColumnSettings && (
        <div className="bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-purple-500/50">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-400" />
            Personalizar Columnas
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* COLUMNAS ACTIVAS */}
            <div>
              <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Columnas Visibles ({columnasActivas.length})
              </h4>
              <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg max-h-80 overflow-y-auto">
                {columnasActivas.map((colId, idx) => {
                  const col = columnasDisponibles.find(c => c.id === colId);
                  return (
                    <div key={colId} className="flex items-center gap-2 bg-gray-800 p-2 rounded hover:bg-gray-700 transition group">
                      <span className="text-gray-500 text-sm">::</span>
                      <span className="flex-1 text-sm">{col?.label}</span>
                      <button
                        onClick={() => moverColumnaArriba(idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-xs bg-blue-600 rounded"
                        title="Mover arriba"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moverColumnaAbajo(idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-xs bg-blue-600 rounded"
                        title="Mover abajo"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => quitarColumna(colId)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-xs bg-red-600 rounded"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNAS DISPONIBLES */}
            <div>
              <h4 className="font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Columnas No Mostradas
              </h4>
              <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg max-h-80 overflow-y-auto">
                {columnasDisponibles
                  .filter(c => !columnasActivas.includes(c.id))
                  .map(col => (
                    <div key={col.id} className="flex items-center gap-2 bg-gray-800 p-2 rounded hover:bg-gray-700 transition">
                      <span className="flex-1 text-sm">{col.label}</span>
                      <button
                        onClick={() => agregarColumna(col.id)}
                        className="p-1 text-xs bg-green-600 rounded hover:bg-green-700"
                        title="Agregar"
                      >
                        ✓
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* BOTONES DE CONFIGURACIÓN */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowColumnSettings(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={guardarConfiguracionColumnas}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
            >
              <Check className="w-4 h-4" />
              Guardar como Predeterminado
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW TABLA */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {renderTabla()}
        </div>
      </div>

      {/* INFO */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-200 text-sm">
        <p className="font-semibold mb-2">📊 Columnas actualmente visibles: {columnasActivas.length}</p>
        <p className="text-xs text-gray-400">
          🎨 Usa la tuerca ⚙️ para arrastar columnas, agregar/quitar campos, y guardar tu configuración personalizada.
        </p>
      </div>
    </div>
  );
};

export default ExportacionesIncapacidades;
