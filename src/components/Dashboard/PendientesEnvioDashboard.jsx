import React, { useEffect, useState } from 'react';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';
const ADMIN_TOKEN = '0b9685e9a9ff3c24652acaad881ec7b2b4c17f6082ad164d10a6e67589f3f67c';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Token': ADMIN_TOKEN,
});

function PendientesEnvioDashboard() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/pendientes-envio`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Error al obtener pendientes');
      const data = await response.json();
      setPendientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
    const interval = setInterval(fetchPendientes, 5000); // Actualiza cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📦 Cola de Envíos Pendientes (Notificaciones / Drive)
            </h2>
            <p className="text-sm text-orange-100 mt-1">
              Monitoreo del sistema de auto-recuperación ante fallas de envío
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPendientes()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors bg-white/10"
              title="Refrescar Cola"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-red-800">
          <p className="font-bold">❌ Error cargando cola</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading && pendientes.length === 0 && (
         <div className="flex items-center justify-center py-12">
            <span className="ml-2 text-slate-500 animate-pulse">Cargando cola resiliente...</span>
         </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">
            📋 Registros Pendientes ({pendientes.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">ID</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Sistema</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Destino / Archivo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 text-center">Intentos</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Último Error</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600">Fecha Creación</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.length === 0 && !loading && !error && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">✅ No hay envíos pendientes en la cola</td></tr>
              )}
              {pendientes.map(p => {
                const destino = p.tipo === 'notificacion' ? 
                  (p.payload?.email || p.payload?.whatsapp || p.payload?.tipo_notificacion || 'Notificación pendiente') : 
                  (p.payload?.nombre_archivo || 'Google Drive Upload');
                
                const statusColor = p.procesado ? 'text-green-700 bg-green-50' :
                                   (p.intentos >= 10 ? 'text-red-700 bg-red-50' : 'text-yellow-700 bg-yellow-50');
                
                const statusLabel = p.procesado ? 'Completado' : 
                                   (p.intentos >= 10 ? 'Fallido (Límite)' : 'Pendiente Reintento');

                return (
                  <tr key={p.id} className="border-t border-slate-200 hover:bg-slate-100 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">#{p.id}</td>
                    <td className="px-6 py-3 text-sm text-slate-700 uppercase font-bold">{p.tipo}</td>
                    <td className="px-6 py-3 text-sm text-slate-700 max-w-[200px] truncate" title={destino}>{destino}</td>
                    <td className="px-6 py-3 text-sm font-mono text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.intentos > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.intentos}/10
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-red-600 max-w-[250px] truncate" title={p.ultimo_error}>{p.ultimo_error || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {p.creado_en ? new Date(p.creado_en).toLocaleString('es-CO') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PendientesEnvioDashboard;
