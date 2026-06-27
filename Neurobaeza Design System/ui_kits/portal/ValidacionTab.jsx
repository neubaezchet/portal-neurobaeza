/* Validación tab — stats, filters, paginated case table */

function ValidacionTab({ casos, onOpenCaso, onExport }) {
  const [filtros, setFiltros] = useState({ empresa: "all", estado: "all", q: "" });
  useLucide();

  const filtrados = useMemo(() => {
    return casos.filter(c => {
      if (filtros.empresa !== "all" && c.empresa !== filtros.empresa) return false;
      if (filtros.estado !== "all" && c.estado !== filtros.estado) return false;
      if (filtros.q) {
        const q = filtros.q.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) &&
            !c.serial.toLowerCase().includes(q) &&
            !c.cedula.includes(q)) return false;
      }
      return true;
    });
  }, [casos, filtros]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <KPICard label="Nuevos"           value={window.STATS.nuevos}          emoji="📥" tint="blue"   sub="esta semana" />
        <KPICard label="En revisión"      value={window.STATS.en_revision}     emoji="🔍" tint="cyan"   sub="con el equipo" />
        <KPICard label="Incompletas"      value={window.STATS.incompletas}     emoji="⚠️" tint="red"    sub="requieren docs" />
        <KPICard label="Ilegibles"        value={window.STATS.ilegibles}       emoji="📄" tint="orange" sub="calidad baja" />
        <KPICard label="Posible fraude"   value={window.STATS.posible_fraude}  emoji="🚨" tint="rose"   sub="derivado a TTHH" />
        <KPICard label="Validadas"        value={window.STATS.validadas}       emoji="✅" tint="green"  sub="+18% MoM" />
      </div>

      {/* Filters */}
      <GlassPanel radius={20} padding="16px">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 12 }}>
          <Select
            value={filtros.empresa}
            onChange={e => setFiltros(f => ({ ...f, empresa: e.target.value }))}
          >
            <option value="all">Todas las empresas</option>
            {window.EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>

          <Select
            value={filtros.estado}
            onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(window.STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>

          <div style={{ position: "relative" }}>
            <Icon name="search" size={16} style={{ position: "absolute", left: 14, top: 12, color: "#94A3B8" }} />
            <input
              value={filtros.q}
              onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))}
              placeholder="Buscar serial, cédula o nombre..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#F1F5F9", color: "#0F172A",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                padding: "10px 14px 10px 38px",
                border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, outline: "none",
              }}
            />
          </div>

          <Button variant="success" icon="download" size="md" onClick={onExport}>
            Exportar Excel
          </Button>
        </div>
      </GlassPanel>

      {/* Table */}
      <GlassPanel radius={20} padding="0">
        <div style={{ overflow: "hidden", borderRadius: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }}>
            <thead style={{ background: "rgba(255,255,255,0.85)" }}>
              <tr>
                {["Serial", "Nombre", "Empresa", "Tipo", "Estado", "Fecha", ""].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontSize: 10, color: "#94A3B8",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontWeight: 700, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <CasoRow key={c.id} caso={c} onOpen={() => onOpenCaso(c)} />
              ))}
              {filtrados.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                  Sin resultados con los filtros actuales
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          background: "rgba(255,255,255,0.5)",
          borderTop: "1px solid rgba(15,23,42,0.06)",
          padding: "10px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 13, color: "#94A3B8",
        }}>
          <Button variant="ghost" size="sm">Anterior</Button>
          <span>Página <strong style={{ color: "#0F172A" }}>1</strong> de <strong style={{ color: "#0F172A" }}>23</strong> · {filtrados.length} mostrados</span>
          <Button variant="ghost" size="sm">Siguiente</Button>
        </div>
      </GlassPanel>
    </div>
  );
}

function CasoRow({ caso, onOpen }) {
  const [hover, setHover] = useState(false);
  const tieneReenvios = caso.reenvios > 0;
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: "1px solid rgba(15,23,42,0.05)",
        background: hover
          ? "rgba(129,140,248,0.05)"
          : tieneReenvios ? "rgba(244,63,94,0.05)" : "transparent",
        transition: "background 200ms",
      }}
    >
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Serial>{caso.serial}</Serial>
          {tieneReenvios ? (
            <span style={{
              background: "rgba(244,63,94,0.7)", color: "white",
              padding: "1px 7px", borderRadius: 9999,
              fontSize: 9, fontWeight: 700,
            }}>{caso.reenvios}</span>
          ) : null}
          {caso.bloquea ? <span title="Bloqueado">🔒</span> : null}
        </div>
      </td>
      <td style={{ padding: "12px 16px", color: "#0F172A", fontWeight: 500 }}>{caso.nombre}</td>
      <td style={{ padding: "12px 16px", color: "#94A3B8" }}>{caso.empresa}</td>
      <td style={{ padding: "12px 16px", color: "#334155" }}>{window.TIPO_MAP[caso.tipo]}</td>
      <td style={{ padding: "12px 16px" }}><StatusBadge status={caso.estado} /></td>
      <td style={{ padding: "12px 16px", color: "#94A3B8" }}>{caso.fecha_inicio}</td>
      <td style={{ padding: "10px 16px" }}>
        <Button size="sm" variant="primary" onClick={onOpen} icon="file-text">Ver</Button>
      </td>
    </tr>
  );
}

window.ValidacionTab = ValidacionTab;
