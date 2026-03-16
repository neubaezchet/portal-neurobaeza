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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cola de envíos pendientes</h2>
      {loading && <div>Cargando...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Tipo</th>
            <th className="border px-2 py-1">Destino</th>
            <th className="border px-2 py-1">Intentos</th>
            <th className="border px-2 py-1">Último intento</th>
            <th className="border px-2 py-1">Estado</th>
          </tr>
        </thead>
        <tbody>
          {pendientes.length === 0 && !loading && (
            <tr><td colSpan={6} className="text-center">Sin pendientes</td></tr>
          )}
          {pendientes.map(p => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.id}</td>
              <td className="border px-2 py-1">{p.tipo}</td>
              <td className="border px-2 py-1">{p.destino}</td>
              <td className="border px-2 py-1">{p.intentos}</td>
              <td className="border px-2 py-1">{p.ultimo_intento}</td>
              <td className="border px-2 py-1">{p.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PendientesEnvioDashboard;
