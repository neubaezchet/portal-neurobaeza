/* Login screen — sapphire glass card on animated obsidian fog background */

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // login | forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useLucide();

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = (window.MOCK_USERS || []).find(u => u.username === username && u.password === password);
      if (!user) {
        setError("Credenciales incorrectas");
        setLoading(false);
      } else {
        onLogin(user);
      }
    }, 700);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFFFF",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Fog approximation — animated radial gradients */}
      <div className="fog-layer fog-1" />
      <div className="fog-layer fog-2" />
      <div className="fog-layer fog-3" />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 440 }}>
        {/* Logo / header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64, height: 64,
            background: "rgba(79,70,229,0.18)",
            border: "1px solid rgba(129,140,248,0.4)",
            borderRadius: 20,
            marginBottom: 16,
            boxShadow: "0 0 32px rgba(79,70,229,0.35)",
          }}>
            <Icon name="lock" size={32} style={{ color: "#818CF8" }} />
          </div>
          <h1 style={{
            fontFamily: "Outfit, sans-serif",
            fontWeight: 800,
            fontSize: 26,
            color: "#0F172A",
            letterSpacing: "-0.02em",
            margin: 0,
          }}>Portal Incapacidades</h1>
          <p style={{ color: "#94A3B8", fontSize: 13, margin: "6px 0 0", fontWeight: 500 }}>
            Sistema de Validación · Neurobaeza
          </p>
        </div>

        <GlassPanel radius={28} padding="32px">
          {mode === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: 18, color: "#0F172A", margin: 0,
              }}>Iniciar Sesión</h2>

              <Field label="Usuario">
                <TextInput
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  autoFocus
                />
              </Field>

              <Field label="Contraseña">
                <div style={{ position: "relative" }}>
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer",
                      padding: 4,
                    }}
                  ><Icon name={showPassword ? "eye-off" : "eye"} size={18} /></button>
                </div>
              </Field>

              {error ? (
                <div style={{
                  background: "rgba(220,38,38,0.10)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  color: "#B91C1C",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8,
                }}><Icon name="alert-circle" size={16} />{error}</div>
              ) : null}

              <Button type="submit" size="lg" variant="primary" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? <Icon name="loader-2" size={18} className="spin" /> : null}
                {loading ? "Ingresando..." : "Iniciar Sesión"}
              </Button>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); }}
                  style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                >¿Olvidaste tu contraseña?</button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button onClick={() => { setMode("login"); setForgotSuccess(false); }} style={{
                background: "transparent", border: "none", color: "#94A3B8",
                cursor: "pointer", fontSize: 13, display: "inline-flex",
                alignItems: "center", gap: 6, padding: 0, width: "fit-content",
              }}><Icon name="arrow-left" size={14} /> Volver al login</button>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 18, color: "#0F172A", margin: 0 }}>
                Recuperar Contraseña
              </h2>
              <p style={{ color: "#94A3B8", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <Field label="Correo electrónico">
                <TextInput
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="tu@correo.com"
                />
              </Field>
              {forgotSuccess ? (
                <div style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  color: "#065F46", padding: "10px 14px", borderRadius: 10,
                  fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                }}><Icon name="check-circle" size={16} />Si el correo está registrado, recibirás un enlace.</div>
              ) : null}
              <Button
                size="lg"
                variant="primary"
                icon="mail"
                onClick={() => setForgotSuccess(true)}
                disabled={!forgotEmail || forgotSuccess}
              >Enviar enlace de recuperación</Button>
            </div>
          )}
        </GlassPanel>

        <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 24 }}>
          © 2026 Portal Incapacidades · Todos los derechos reservados
        </p>

        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.18)",
          borderRadius: 12, fontSize: 12, color: "#94A3B8", textAlign: "center",
        }}>
          💡 Demo · usuario <code style={{ color: "#B45309", fontFamily: "'JetBrains Mono', monospace" }}>demo</code> · contraseña <code style={{ color: "#B45309", fontFamily: "'JetBrains Mono', monospace" }}>demo</code>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
