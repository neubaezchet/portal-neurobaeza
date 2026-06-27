/* Reportes y Tablas Vivas tab */

function ReportesTab({ casos }) {
  const [subTab, setSubTab] = useState("resumen");
  const [periodo, setPeriodo] = useState("mes_actual");
  const [empresa, setEmpresa] = useState("all");
  useLucide();

  const subTabs = [
    { id: "resumen", label: "📊 Resumen" },
    { id: "th",      label: "👔 Talento Humano" },
    { id: "sst",     label: "🛡️ Seg. y Salud" },
    { id: "nomina",  label: "💰 Nómina" },
    { id: "ind",     label: "📈 Indicadores" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filter bar */}
      <GlassPanel radius={20} padding="16px">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SubTabs tabs={subTabs} active={subTab} onChange={setSubTab} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Select value={empresa} onChange={e => setEmpresa(e.target.value)} style={{ width: 220 }}>
              <option value="all">Todas las empresas</option>
              {window.EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
            </Select>
            <Select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ width: 180 }}>
              <option value="mes_actual">Mes Actual</option>
              <option value="mes_anterior">Mes Anterior</option>
              <option value="año_actual">Año Actual</option>
              <option value="todo">Todo (histórico)</option>
              <option value="personalizado">📅 Personalizado…</option>
            </Select>
            <Button variant="primary" icon="refresh-cw" size="sm">Actualizar</Button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 11, color: "#94A3B8" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E" }} />
            Auto-refresh activo · cada 30s
          </span>
          <span>· última actualización hace 14s</span>
        </div>
      </GlassPanel>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPICard label="Total casos"            value="635"  emoji="📊" tint="blue"   sub="periodo actual" />
        <KPICard label="Días promedio"          value="4.8"  emoji="⏱️" tint="cyan"   sub="por incapacidad" />
        <KPICard label="≥ 180 días"             value="12"   emoji="🚨" tint="rose"   sub="requieren alerta" />
        <KPICard label="Tasa validación"        value="97%"  emoji="✅" tint="green"  sub="en menos de 24h" />
      </div>

      {/* Sortable table */}
      <GlassPanel radius={20} padding="0">
        <div style={{
          background: "rgba(255,255,255,0.7)", padding: "12px 18px",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>Incapacidades en vivo · Talento Humano</h3>
            <span style={{
              background: "rgba(15,23,42,0.06)", color: "#334155",
              padding: "2px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 600,
            }}>{casos.length} registros</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 9, color: "#94A3B8" }} />
              <input
                placeholder="Buscar..."
                style={{
                  background: "#F1F5F9", color: "#0F172A",
                  fontSize: 12, padding: "6px 10px 6px 30px",
                  border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10, outline: "none", width: 200,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
            </div>
            <Button variant="success" icon="download" size="sm">Excel</Button>
          </div>
        </div>

        <div style={{ overflow: "auto", maxHeight: 460 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <thead style={{ background: "rgba(255,255,255,0.85)", position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                {["LLAVE", "CÉDULA", "NOMBRES Y APELLIDOS", "EMPRESA", "F. INICIO", "F. FIN", "DÍAS", "ESTADO"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: 10, color: "#94A3B8",
                    letterSpacing: "0.10em", fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {h} <Icon name="arrow-up-down" size={10} style={{ color: "#CBD5E1" }} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {casos.map(c => (
                <tr key={c.id} style={{
                  borderTop: "1px solid rgba(15,23,42,0.04)",
                  background: c.dias >= 180 ? "rgba(220,38,38,0.10)" : "transparent",
                }}>
                  <td style={{ padding: "8px 14px" }}><Serial>{c.serial}</Serial></td>
                  <td style={{ padding: "8px 14px", fontFamily: "'JetBrains Mono', monospace", color: "#1D4ED8", fontSize: 11 }}>{c.cedula}</td>
                  <td style={{ padding: "8px 14px", color: "#0F172A", textTransform: "uppercase", fontSize: 11 }}>{c.nombre}</td>
                  <td style={{ padding: "8px 14px", color: "#334155", textTransform: "uppercase", fontSize: 11 }}>{c.empresa}</td>
                  <td style={{ padding: "8px 14px", color: "#94A3B8" }}>{c.fecha_inicio}</td>
                  <td style={{ padding: "8px 14px", color: "#94A3B8" }}>{c.fecha_fin}</td>
                  <td style={{ padding: "8px 14px", color: "#0F172A", fontWeight: 700 }}>{c.dias}</td>
                  <td style={{ padding: "8px 14px" }}><StatusBadge status={c.estado} mini /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}

function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "rgba(255,255,255,0.6)", padding: 4, borderRadius: 10,
      border: "1px solid rgba(15,23,42,0.05)",
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: active === t.id ? "#2563EB" : "transparent",
            color: active === t.id ? "white" : "#94A3B8",
            fontWeight: 700, fontSize: 11,
            padding: "6px 12px", border: "none", borderRadius: 6, cursor: "pointer",
            boxShadow: active === t.id ? "0 4px 12px rgba(79,70,229,0.4)" : "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: "all 200ms",
            whiteSpace: "nowrap",
          }}
        >{t.label}</button>
      ))}
    </div>
  );
}

window.ReportesTab = ReportesTab;
