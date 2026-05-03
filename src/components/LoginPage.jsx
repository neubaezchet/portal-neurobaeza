import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';

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

  // Vanta.js FOG effect - Indigo Enterprise 2026
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
        highlightColor: 0x6366F1, /* Indigo 500 */
        midtoneColor: 0x030305,   /* Obsidian 950 */
        lowlightColor: 0x08080D,  /* Obsidian 800 */
        baseColor: 0x000002,
        blurFactor: 0.85,
        speed: 1.80,
        zoom: 1.20,
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

  // Shared input classes
  const inputClass = "input-2026 w-full px-5 py-4 rounded-2026 text-white placeholder-slate-500 focus:outline-none transition-all duration-300 text-[0.938rem]";
  const btnPrimaryClass = "w-full py-4 btn-2026-primary rounded-2026 font-semibold text-[0.938rem] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none";

  return (
    <div ref={vantaRef} className="min-h-screen flex items-center justify-center px-4" style={{ position: 'relative' }}>
      {/* Content above Vanta */}
      <div className="relative w-full max-w-[440px] animate-fade-up" style={{ zIndex: 1 }}>
        
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] mb-5 relative">
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-2026 border border-indigo-450/20 animate-pulse-glow" />
            <div className="absolute inset-0 rounded-2026 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 backdrop-blur-sm border border-white/[0.06]" />
            <Shield className="w-8 h-8 text-indigo-400 relative z-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-[1.75rem] font-bold font-display gradient-text-aurora tracking-tight">
            Portal Incapacidades
          </h1>
          <p className="text-slate-500 text-sm mt-2 tracking-wide font-light">
            Sistema de Validación Empresarial
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel-2026 rounded-2026-xl p-8 animate-scale-in" style={{ animationDelay: '100ms' }}>

          {/* === LOGIN MODE === */}
          {mode === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-white/90 mb-6 font-display tracking-tight">Iniciar Sesión</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                    placeholder="Tu nombre de usuario"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/[0.06] border border-red-500/15 rounded-2026 px-4 py-3 animate-fade-in">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className={btnPrimaryClass}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="text-sm text-indigo-400/70 hover:text-indigo-300 transition-colors duration-200"
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
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-400 transition-colors duration-200 mb-5"
              >
                <ArrowLeft size={16} /> Volver al login
              </button>
              <h2 className="text-lg font-semibold text-white/90 mb-2 font-display tracking-tight">Recuperar Contraseña</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${inputClass} pl-12`}
                      placeholder="tu@correo.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/[0.06] border border-red-500/15 rounded-2026 px-4 py-3 animate-fade-in">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2.5 text-emerald-400 text-sm bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2026 px-4 py-3 animate-fade-in">
                    <CheckCircle size={16} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <button type="submit" disabled={loading || success} className={btnPrimaryClass}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          {/* === RESET PASSWORD MODE === */}
          {mode === 'reset' && (
            <>
              <h2 className="text-lg font-semibold text-white/90 mb-2 font-display tracking-tight">Nueva Contraseña</h2>
              <p className="text-sm text-slate-500 mb-6">Escribe tu nueva contraseña.</p>
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 text-red-400 text-sm bg-red-500/[0.06] border border-red-500/15 rounded-2026 px-4 py-3 animate-fade-in">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2.5 text-emerald-400 text-sm bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2026 px-4 py-3 animate-fade-in">
                    <CheckCircle size={16} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <button type="submit" disabled={loading || success} className={btnPrimaryClass}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-[11px] mt-8 tracking-wider uppercase">
          © 2026 Portal Incapacidades · NeuroBaeza Enterprise
        </p>
      </div>
    </div>
  );
}
