/* App shell — gradient header + permission-filtered tab bar */

function AppShell({ user, onLogout, activeTab, setActiveTab, children }) {
  useLucide();

  const tabs = [
    { id: "validacion",    label: "✅ Validación de Casos" },
    { id: "reportes",      label: "📊 Reportes y Tablas Vivas" },
    { id: "ia",            label: "🤖 Validaciones IA" },
    { id: "exportaciones", label: "📦 Exportaciones PDF" },
    { id: "powerbi",       label: "📈 Power BI" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFFFF",
      color: "#0F172A",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <header style={{
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A78BFA 100%)",
          borderRadius: 20,
          padding: "22px 28px",
          boxShadow: "0 16px 48px rgba(79, 70, 229, 0.25)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 800, fontSize: 26, color: "white",
                margin: 0, display: "flex", alignItems: "center", gap: 12,
                letterSpacing: "-0.02em",
              }}>
                <Icon name="user" size={28} />
                Portal de Validadores
              </h1>
              <p style={{ color: "#DBEAFE", margin: "6px 0 0", fontSize: 13 }}>
                Sistema de gestión de incapacidades médicas
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                background: "rgba(15,23,42,0.08)",
                padding: "8px 14px",
                borderRadius: 10,
                textAlign: "right",
              }}>
                <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{user.nombre}</div>
                <div style={{ color: "rgba(219,234,254,0.7)", fontSize: 10, marginTop: 2 }}>
                  {window.ROLE_LABELS[user.rol]}
                </div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: "rgba(15,23,42,0.08)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 200ms",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(15,23,42,0.08)"}
              ><Icon name="log-out" size={16} />Salir</button>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <nav style={{ display: "flex", gap: 2, borderBottom: "2px solid #E2E8F0" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: activeTab === t.id ? "#818CF8" : "#94A3B8",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: activeTab === t.id ? 700 : 600,
                fontSize: 13,
                padding: "14px 18px",
                cursor: "pointer",
                borderBottom: activeTab === t.id ? "2px solid #4F46E5" : "2px solid transparent",
                marginBottom: -2,
                transition: "color 200ms",
              }}
            >{t.label}</button>
          ))}
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
