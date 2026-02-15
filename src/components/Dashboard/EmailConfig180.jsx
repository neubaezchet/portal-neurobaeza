import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Mail, Building2, Save, Bell, BellRing } from 'lucide-react';
import { API_CONFIG } from '../../constants/reportConfig';

/**
 * Panel de configuración de emails para alertas 180 días
 * + Indicador de notificación en el dashboard
 */

// ═══════════════════════════════════════════════════════════
// BADGE DE NOTIFICACIÓN (para usar en el dashboard header)
// ═══════════════════════════════════════════════════════════
export function AlertaBadge180({ alertas = [], onClick }) {
  if (!alertas || alertas.length === 0) return null;
  
  const criticas = alertas.filter(a => a.severidad === 'critica').length;
  const altas = alertas.filter(a => a.severidad === 'alta').length;
  
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-all group"
      title={`${alertas.length} alertas de 180 días activas`}
    >
      <BellRing className="w-4 h-4 text-red-400 animate-pulse" />
      <span className="text-red-400 text-xs font-bold">{alertas.length}</span>
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
      
      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <p className="text-white text-xs font-bold mb-1">⛔ Alertas Ley 776/2002</p>
        {criticas > 0 && <p className="text-red-400 text-[10px]">⛔ {criticas} superaron 180 días</p>}
        {altas > 0 && <p className="text-orange-400 text-[10px]">🔴 {altas} alertas críticas</p>}
        <p className="text-gray-500 text-[9px] mt-1">Click para ver detalles</p>
      </div>
    </button>
  );
}


// ═══════════════════════════════════════════════════════════
// PANEL DE CONFIGURACIÓN DE EMAILS
// ═══════════════════════════════════════════════════════════
export function EmailConfig180({ isOpen, onClose }) {
  const [emails, setEmails] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('emails'); // emails | historial
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newTipo, setNewTipo] = useState('talento_humano');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN };
      const [emailsRes, empresasRes, histRes] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/alertas-180/emails?empresa=all`, { headers }),
        fetch(`${API_CONFIG.BASE_URL}/alertas-180/empresas`, { headers }),
        fetch(`${API_CONFIG.BASE_URL}/alertas-180/historial?limit=30`, { headers }),
      ]);
      
      const emailsData = await emailsRes.json();
      const empresasData = await empresasRes.json();
      const histData = await histRes.json();
      
      setEmails(emailsData.emails || []);
      setEmpresas(empresasData.empresas || []);
      setHistorial(histData.historial || []);
    } catch (err) {
      console.error('Error cargando config alertas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const handleAdd = async () => {
    if (!newEmail || !newEmail.includes('@')) return;
    setSaving(true);
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/alertas-180/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
        body: JSON.stringify({
          email: newEmail,
          nombre_contacto: newNombre || null,
          company_id: newCompanyId ? parseInt(newCompanyId) : null,
          tipo: newTipo,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert(err.detail || 'Error agregando email');
        return;
      }
      setNewEmail('');
      setNewNombre('');
      setNewCompanyId('');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este correo de alertas?')) return;
    try {
      await fetch(`${API_CONFIG.BASE_URL}/alertas-180/emails/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
      });
      fetchData();
    } catch (err) {
      alert('Error eliminando: ' + err.message);
    }
  };

  const handleToggle = async (id, activo) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/alertas-180/emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
        body: JSON.stringify({ activo: !activo }),
      });
      fetchData();
    } catch (err) {
      alert('Error actualizando: ' + err.message);
    }
  };

  const handleRevisarAhora = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/alertas-180/revisar?empresa=all`, {
        method: 'POST',
        headers: { 'X-Admin-Token': API_CONFIG.ADMIN_TOKEN },
      });
      const data = await resp.json();
      alert(`Revisión completada:\n• ${data.alertas_enviadas || 0} alertas enviadas\n• ${data.alertas_omitidas || 0} omitidas (ya enviadas)\n• ${data.errores || 0} errores`);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-400" />
              Configuración de Alertas 180 Días
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Correos de Talento Humano que recibirán alertas cuando un empleado se acerque a 180 días</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-800">
          <button onClick={() => setTab('emails')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'emails' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
            📧 Correos Configurados
          </button>
          <button onClick={() => setTab('historial')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'historial' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
            📜 Historial de Envíos
          </button>
          <div className="flex-1" />
          <button
            onClick={handleRevisarAhora}
            disabled={saving}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <BellRing className="w-3.5 h-3.5" />
            {saving ? 'Revisando...' : 'Revisar Alertas Ahora'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : tab === 'emails' ? (
            <div className="space-y-4">
              {/* Add new email form */}
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-400" />
                  Agregar Correo de Alerta
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-[10px] block mb-1">Email *</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="talento.humano@empresa.com"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-[10px] block mb-1">Nombre contacto</label>
                    <input
                      type="text"
                      value={newNombre}
                      onChange={e => setNewNombre(e.target.value)}
                      placeholder="María García"
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-[10px] block mb-1">Empresa</label>
                    <select
                      value={newCompanyId}
                      onChange={e => setNewCompanyId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
                    >
                      <option value="">🌐 Todas (Global)</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-[10px] block mb-1">Tipo</label>
                    <select
                      value={newTipo}
                      onChange={e => setNewTipo(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none"
                    >
                      <option value="talento_humano">👥 Talento Humano</option>
                      <option value="adicional">📧 Adicional</option>
                      <option value="admin">🔐 Administrador</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={saving || !newEmail}
                  className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Guardando...' : 'Agregar Correo'}
                </button>
              </div>

              {/* Emails list */}
              <div className="space-y-2">
                <h3 className="text-gray-400 text-xs font-bold">📋 Correos activos ({emails.length})</h3>
                {emails.length === 0 ? (
                  <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 text-center">
                    <Mail className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Sin correos configurados</p>
                    <p className="text-gray-500 text-xs">Agregue al menos un correo de Talento Humano arriba</p>
                  </div>
                ) : (
                  emails.map(em => (
                    <div key={em.id} className={`flex items-center gap-3 bg-gray-800/40 border rounded-xl p-3 transition ${em.activo ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">{em.email}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            em.tipo === 'talento_humano' ? 'bg-blue-500/20 text-blue-400' :
                            em.tipo === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {em.tipo === 'talento_humano' ? '👥 TH' : em.tipo === 'admin' ? '🔐 Admin' : '📧 Extra'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {em.nombre_contacto && <span className="text-gray-500 text-[10px]">{em.nombre_contacto}</span>}
                          <span className="text-gray-600 text-[10px]">•</span>
                          <span className="text-gray-500 text-[10px] flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {em.empresa}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(em.id, em.activo)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition ${em.activo ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}`}
                      >
                        {em.activo ? '✅ Activo' : '⏸ Pausado'}
                      </button>
                      <button
                        onClick={() => handleDelete(em.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3">
                <p className="text-blue-400 text-xs font-bold mb-1">💡 ¿Cómo funciona?</p>
                <ul className="text-blue-300/80 text-[10px] space-y-0.5 list-disc pl-4">
                  <li>El sistema revisa <strong>automáticamente cada día a las 7:00 AM</strong> las cadenas de incapacidad</li>
                  <li>Si un empleado acumula <strong>150+ días</strong>, envía alerta temprana (🟡)</li>
                  <li>Si acumula <strong>170+ días</strong>, envía alerta crítica (🔴)</li>
                  <li>Si <strong>supera 180 días</strong>, envía alerta urgente (⛔) con normativa Ley 776/2002</li>
                  <li>No repite la misma alerta en 7 días para evitar spam</li>
                  <li>Los correos <strong>Globales</strong> reciben alertas de todas las empresas</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Historial tab */
            <div className="space-y-2">
              <h3 className="text-gray-400 text-xs font-bold mb-2">📜 Últimas alertas enviadas</h3>
              {historial.length === 0 ? (
                <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 text-center">
                  <p className="text-gray-400 text-sm">Sin alertas enviadas aún</p>
                  <p className="text-gray-500 text-xs">Las alertas se enviarán cuando un empleado acumule 150+ días de incapacidad</p>
                </div>
              ) : (
                historial.map(h => {
                  const colors = {
                    LIMITE_180_SUPERADO: 'border-red-800/50 bg-red-900/20',
                    ALERTA_CRITICA: 'border-orange-800/50 bg-orange-900/20',
                    ALERTA_TEMPRANA: 'border-yellow-800/50 bg-yellow-900/20',
                  };
                  const icons = { LIMITE_180_SUPERADO: '⛔', ALERTA_CRITICA: '🔴', ALERTA_TEMPRANA: '🟡' };
                  return (
                    <div key={h.id} className={`border rounded-xl p-3 ${colors[h.tipo_alerta] || 'border-gray-700 bg-gray-800/40'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icons[h.tipo_alerta] || '📧'}</span>
                          <div>
                            <p className="text-white text-xs font-bold">
                              {h.cedula} — {h.dias_acumulados}d acumulados
                            </p>
                            <p className="text-gray-400 text-[10px]">
                              {h.tipo_alerta?.replace(/_/g, ' ')} • CIE-10: {h.codigos_cie10 || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-bold ${h.enviado_ok ? 'text-green-400' : 'text-red-400'}`}>
                            {h.enviado_ok ? '✅ Enviado' : '❌ Falló'}
                          </p>
                          <p className="text-gray-500 text-[9px]">{h.fecha ? new Date(h.fecha).toLocaleString('es-CO') : ''}</p>
                        </div>
                      </div>
                      {h.emails_enviados && (
                        <p className="text-gray-500 text-[9px] mt-1 truncate" title={h.emails_enviados}>
                          📧 {h.emails_enviados}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmailConfig180;
