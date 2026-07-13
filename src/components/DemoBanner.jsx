/**
 * DemoBanner.jsx — Banner + modal de demo para el portal
 *
 * Muestra un banner de cuenta regresiva mientras el demo está activo.
 * Cuando vence, bloquea el portal con un modal de feedback.
 *
 * Uso: <DemoBanner companyId={authUser.company_id} />
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Timer, Star, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

const API_BASE = 'https://web-production-95ed.up.railway.app'

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

async function apiPost(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}

// ─── Formatea segundos → HH:MM:SS ─────────────────────────
function formatTime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Estrellas interactivas ────────────────────────────────
function Estrellas({ valor, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            transform: (hover || valor) >= i ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.15s',
          }}
        >
          <Star
            size={28}
            fill={(hover || valor) >= i ? '#FBBF24' : 'none'}
            color={(hover || valor) >= i ? '#FBBF24' : 'rgba(255,255,255,0.2)'}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Modal de feedback (aparece al vencer el demo) ─────────
function ModalFeedback({ companyId, onLogout }) {
  const [calificacion, setCalificacion] = useState(0)
  const [mejoras, setMejoras] = useState('')
  const [quiere, setQuiere] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleEnviar = async () => {
    if (!calificacion) { setError('Por favor califica tu experiencia'); return }
    setLoading(true); setError('')
    try {
      await apiPost('/demo/feedback', {
        company_id: companyId,
        calificacion,
        mejoras: mejoras.trim() || undefined,
        quiere_contratar: quiere || undefined,
      })
      setEnviado(true)
    } catch {
      setError('No se pudo enviar el feedback. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: 'linear-gradient(135deg, #0a0f1e, #0d1529)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '36px 36px 32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={30} color="#10B981" />
            </div>
            <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 20, fontWeight: 800 }}>
              ¡Gracias por tu feedback!
            </h3>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>
              Tu opinión nos ayuda a mejorar. Si quieres contratar el servicio,{' '}
              contáctanos y te ayudaremos a continuar.
            </p>
            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
              fontSize: 13, color: 'rgba(255,255,255,0.6)',
            }}>
              📧 <strong style={{ color: '#38BDF8' }}>gestiondeincapacidades@incapacidade.com</strong>
            </div>
            <button
              onClick={onLogout}
              style={{
                width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, cursor: 'pointer',
                background: 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={26} color="#FBBF24" />
              </div>
              <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 20, fontWeight: 800 }}>
                El demo ha alcanzado el límite de tiempo
              </h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                Tu sesión de prueba ha expirado. Antes de salir, cuéntanos qué te pareció.
              </p>
            </div>

            {/* Calificación */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ¿Te gustó el sistema?
              </label>
              <Estrellas valor={calificacion} onChange={setCalificacion} />
              {calificacion > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#FBBF24' }}>
                  {['', '😕 Muy malo', '😐 Regular', '🙂 Bien', '😊 Muy bien', '🤩 ¡Excelente!'][calificacion]}
                </p>
              )}
            </div>

            {/* Texto libre */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ¿Qué mejorarías?
              </label>
              <textarea
                value={mejoras}
                onChange={e => setMejoras(e.target.value)}
                placeholder="Cuéntanos qué podrías mejorar o qué faltó..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, fontSize: 13, color: '#fff', resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* ¿Quiere contratar? */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ¿Te gustaría contratar el servicio?
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'si',      label: '✅ Sí', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
                  { value: 'despues', label: '⏳ Después', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
                  { value: 'no',      label: '❌ No', color: '#F87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setQuiere(opt.value)}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      border: quiere === opt.value ? `2px solid ${opt.border}` : '1px solid rgba(255,255,255,0.1)',
                      background: quiere === opt.value ? opt.bg : 'rgba(255,255,255,0.03)',
                      color: quiere === opt.value ? opt.color : 'rgba(255,255,255,0.4)',
                      fontWeight: quiere === opt.value ? 700 : 500, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#F87171', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleEnviar}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(14,165,233,0.3)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                : <><Send size={16} /> Enviar feedback</>
              }
            </button>
            <button
              onClick={onLogout}
              style={{
                width: '100%', marginTop: 10, padding: '10px', borderRadius: 12, cursor: 'pointer',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13,
              }}
            >
              Omitir e iniciar sesión
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

export default function DemoBanner({ companyId, onLogout }) {
  const [demoState, setDemoState] = useState(null) // null = cargando, false = no es demo, { activo, segundos } = demo
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const [expirado, setExpirado] = useState(false)
  const intervalRef = useRef(null)

  const checkStatus = useCallback(async () => {
    if (!companyId) return
    try {
      const data = await apiGet(`/demo/status/${companyId}`)
      if (!data.es_demo) {
        setDemoState(false)
        return
      }
      if (data.expirado || !data.activo) {
        setDemoState({ activo: false })
        setExpirado(true)
        return
      }
      setDemoState({ activo: true })
      setSegundosRestantes(data.segundos_restantes || 0)
    } catch {
      setDemoState(false) // si falla, no interrumpir la experiencia
    }
  }, [companyId])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Countdown tick
  useEffect(() => {
    if (demoState?.activo && segundosRestantes > 0) {
      intervalRef.current = setInterval(() => {
        setSegundosRestantes(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setExpirado(true)
            setDemoState({ activo: false })
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [demoState?.activo, segundosRestantes])

  // Re-check status cada 5 minutos
  useEffect(() => {
    const id = setInterval(checkStatus, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [checkStatus])

  // No mostrar nada si no es demo
  if (demoState === null || demoState === false) return null

  const urgente = segundosRestantes < 1800 // < 30 min

  return (
    <>
      {/* Banner superior */}
      {demoState?.activo && !expirado && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000,
          background: urgente
            ? 'linear-gradient(90deg, #7F1D1D, #DC2626, #7F1D1D)'
            : 'linear-gradient(90deg, #0c4a6e, #0369a1, #0c4a6e)',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          animation: urgente ? 'demoPulse 2s ease-in-out infinite' : 'none',
        }}>
          <Timer size={15} color={urgente ? '#FCA5A5' : '#BAE6FD'} />
          <span style={{
            fontSize: 13, fontWeight: 700, color: urgente ? '#FECACA' : '#E0F2FE',
            letterSpacing: '0.02em',
          }}>
            MODO DEMO — Tiempo restante:{' '}
            <span style={{
              fontFamily: 'monospace', fontSize: 14,
              color: urgente ? '#FEF2F2' : '#fff',
            }}>
              {formatTime(segundosRestantes)}
            </span>
          </span>
          <span style={{ fontSize: 11, color: urgente ? '#FCA5A5' : '#BAE6FD', opacity: 0.8 }}>
            {urgente ? '⚠️ El demo está por expirar' : 'Los datos se eliminarán al vencer'}
          </span>
        </div>
      )}

      {/* Modal de feedback al expirar */}
      {expirado && <ModalFeedback companyId={companyId} onLogout={onLogout} />}

      <style>{`
        @keyframes demoPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </>
  )
}
