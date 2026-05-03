import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://web-production-95ed.up.railway.app';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  // Vanta.js FOG effect - Obsidian 2026
  useEffect(() => {
    if (!vantaEffect.current && window.VANTA) {
      vantaEffect.current = window.VANTA.FOG({
        el: vantaRef.current,
        THREE: window.THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        highlightColor: 0x0ea5e9, /* Sapphire 500 */
        midtoneColor: 0x050507,   /* Obsidian 900 */
        lowlightColor: 0x0B0B10,  /* Obsidian 800 */
        baseColor: 0x000000,
        blurFactor: 0.90,
        speed: 2.50,
      });
    }
    return () => { if (vantaEffect.current) vantaEffect.current.destroy(); };
  }, []);

  // Check URL for reset_token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setMode('reset');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Credenciales incorrectas');
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al enviar');
      setSuccess('Si el correo está registrado, recibirás un enlace de recuperación. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al restablecer');
      setSuccess('Contraseña actualizada. Ahora puedes iniciar sesión.');
      setTimeout(() => { setMode('login'); setSuccess(''); }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center px-4" style={{ position: 'relative' }}>
      {/* Content above Vanta */}
      <div className="relative w-full max-w-md" style={{ zIndex: 1 }}>
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4 border border-blue-500/30">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Incapacidades</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Validación</p>
        </div>

        {/* Card */}
        <div className="glass-panel-2026 rounded-2026-xl p-8 shadow-glass-lg animate-fade-in">

          {/* === LOGIN MODE === */}
          {mode === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-6">Iniciar Sesión</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-2026 w-full px-5 py-4 rounded-2026 text-white placeholder-slate-400 focus:outline-none transition-all"
                    placeholder="Tu nombre de usuario"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-2026 w-full px-5 py-4 rounded-2026 text-white placeholder-slate-400 focus:outline-none transition-all pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-sapphire-600 hover:bg-sapphire-500 disabled:bg-sapphire-600/50 text-white font-bold rounded-2026 transition-all duration-300 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] border border-sapphire-400/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}

          {/* === FORGOT PASSWORD MODE === */}
          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
              >
                <ArrowLeft size={16} /> Volver al login
              </button>
              <h2 className="text-lg font-semibold text-white mb-2">Recuperar Contraseña</h2>
              <p className="text-sm text-slate-400 mb-6">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-2026 w-full pl-12 pr-5 py-4 rounded-2026 text-white placeholder-slate-400 focus:outline-none transition-all"
                      placeholder="tu@correo.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <CheckCircle size={16} />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-4 bg-sapphire-600 hover:bg-sapphire-500 disabled:bg-sapphire-600/50 text-white font-bold rounded-2026 transition-all duration-300 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] border border-sapphire-400/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          {/* === RESET PASSWORD MODE === */}
          {mode === 'reset' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Nueva Contraseña</h2>
              <p className="text-sm text-slate-400 mb-6">Escribe tu nueva contraseña.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-2026 w-full px-5 py-4 rounded-2026 text-white placeholder-slate-400 focus:outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-2026 w-full px-5 py-4 rounded-2026 text-white placeholder-slate-400 focus:outline-none transition-all"
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <CheckCircle size={16} />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-4 bg-sapphire-600 hover:bg-sapphire-500 disabled:bg-sapphire-600/50 text-white font-bold rounded-2026 transition-all duration-300 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] border border-sapphire-400/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 Portal Incapacidades · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
