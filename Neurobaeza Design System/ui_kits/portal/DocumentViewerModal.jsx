/* Document Viewer Modal — full-screen, PDF placeholder, action panel */

function DocumentViewerModal({ caso, onClose, onValidate }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [actionView, setActionView] = useState(null); // null | 'incompleta' | 'fraude'
  const [checks, setChecks] = useState([]);
  useLucide();

  const pageCount = 5; // mock
  const tipoLabel = window.TIPO_MAP[caso.tipo];

  const checksOptions = {
    enfermedad_general: [
      { key: "incapacidad_faltante", label: "Falta soporte de incapacidad", desc: "No se adjuntó el documento oficial de la EPS" },
      { key: "epicrisis_faltante",   label: "Falta epicrisis/resumen",       desc: "Requerido para 3+ días" },
      { key: "ilegible_recortada",   label: "Documento recortado",            desc: "Bordes no visibles" },
      { key: "ilegible_borrosa",     label: "Documento borroso",              desc: "Mala calidad de imagen" },
    ],
    maternidad: [
      { key: "incapacidad_faltante", label: "Falta licencia de maternidad", desc: "Documento oficial de la EPS" },
      { key: "epicrisis_faltante",   label: "Falta epicrisis",              desc: "Resumen clínico completo" },
      { key: "registro_civil_faltante", label: "Falta registro civil",      desc: "Del bebé" },
      { key: "nacido_vivo_faltante", label: "Falta certificado nacido vivo", desc: "Original legible" },
    ],
    accidente_transito: [
      { key: "incapacidad_faltante", label: "Falta incapacidad médica", desc: "Documento oficial" },
      { key: "furips_faltante",      label: "Falta FURIPS",             desc: "Formato Único de Reporte" },
      { key: "soat_faltante",        label: "Falta SOAT",                desc: "✅ Se enviará imagen automática" },
    ],
    paternidad: [
      { key: "cedula_padre_faltante", label: "Falta cédula del padre", desc: "Ambas caras" },
      { key: "registro_civil_faltante", label: "Falta registro civil", desc: "Del bebé" },
    ],
    enfermedad_laboral: [
      { key: "incapacidad_faltante", label: "Falta incapacidad médica", desc: "Documento oficial de ARL" },
      { key: "epicrisis_faltante",   label: "Falta epicrisis",         desc: "Resumen clínico completo" },
    ],
  }[caso.tipo] || [];

  const toggleCheck = (k) => setChecks(c => c.includes(k) ? c.filter(x => x !== k) : [...c, k]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.8)",
      backdropFilter: "blur(8px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadeUp2026 0.35s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      <div style={{
        width: "100%", maxWidth: 1400, height: "100%", maxHeight: 880,
        background: "#F1F5F9",
        border: "1px solid rgba(15,23,42,0.07)",
        borderRadius: 24, display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(15,23,42,0.7)", overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)",
        }} />

        {/* Top bar */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
          background: "rgba(255,255,255,0.85)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <button onClick={onClose} style={{
              background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.07)",
              color: "#334155", borderRadius: 12, padding: "8px 12px",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
            }}><Icon name="chevron-left" size={16} />Volver</button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <Serial>{caso.serial}</Serial>
                <StatusBadge status={caso.estado} />
                {caso.bloquea ? <span style={{ fontSize: 14 }} title="Bloqueado">🔒</span> : null}
              </div>
              <div style={{
                fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 18, color: "#0F172A",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{caso.nombre}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>
                CC {caso.cedula} · {caso.empresa} · {tipoLabel} · {caso.dias} día{caso.dias === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="ghost" size="sm" icon="undo-2">Deshacer</Button>
            <Button variant="ghost" size="sm" icon="save">Guardar en Drive</Button>
          </div>
        </div>

        {/* Body: thumbnails · pdf · action panel */}
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 360px", flex: 1, minHeight: 0 }}>
          {/* Thumbnails */}
          <div style={{
            background: "#FFFFFF", borderRight: "1px solid rgba(15,23,42,0.05)",
            padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <Eyebrow style={{ fontSize: 9, marginBottom: 4, textAlign: "center" }}>Páginas</Eyebrow>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                style={{
                  position: "relative",
                  background: "white", padding: 0, border: i === currentPage ? "2px solid #4F46E5" : "1px solid rgba(15,23,42,0.07)",
                  borderRadius: 8, cursor: "pointer", height: 120,
                  boxShadow: i === currentPage ? "0 0 16px rgba(79,70,229,0.4)" : "0 2px 8px rgba(15,23,42,0.3)",
                  transition: "all 200ms",
                }}
              >
                <PagePlaceholder mini />
                <div style={{
                  position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                  background: i === currentPage ? "#4F46E5" : "rgba(15,23,42,0.65)",
                  color: "white", padding: "1px 8px", borderRadius: 9999,
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                }}>{i + 1}</div>
              </button>
            ))}
          </div>

          {/* PDF area */}
          <div style={{
            background: "#FFFFFF", overflow: "auto", position: "relative",
            display: "flex", flexDirection: "column", alignItems: "center", padding: "24px",
          }}>
            <div style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center top",
              transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
              width: 560, height: 720,
              background: "white", borderRadius: 6,
              boxShadow: "0 24px 64px rgba(15,23,42,0.6)",
              position: "relative", overflow: "hidden",
            }}>
              <PagePlaceholder caso={caso} page={currentPage + 1} />
            </div>

            {/* Zoom + rotate toolbar */}
            <div style={{
              position: "sticky", bottom: 0, marginTop: 16,
              background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(15,23,42,0.07)", borderRadius: 12,
              padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4,
              boxShadow: "0 8px 24px rgba(15,23,42,0.5)",
            }}>
              <IconBtn name="chevron-left" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} title="Anterior" />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#334155", padding: "0 8px" }}>
                {currentPage + 1} / {pageCount}
              </span>
              <IconBtn name="chevron-right" onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))} title="Siguiente" />
              <Divider />
              <IconBtn name="zoom-out" onClick={() => setZoom(z => Math.max(50, z - 10))} />
              <span style={{ fontSize: 11, color: "#94A3B8", padding: "0 6px", minWidth: 36, textAlign: "center" }}>{zoom}%</span>
              <IconBtn name="zoom-in" onClick={() => setZoom(z => Math.min(200, z + 10))} />
              <Divider />
              <IconBtn name="rotate-ccw" onClick={() => setRotation(r => r - 90)} title="Rotar" />
              <IconBtn name="rotate-cw" onClick={() => setRotation(r => r + 90)} />
              <Divider />
              <IconBtn name="sliders" title="Mejorar calidad" />
              <IconBtn name="image" title="Recortar" />
            </div>
          </div>

          {/* Action panel */}
          <div style={{
            background: "rgba(255,255,255,0.6)", borderLeft: "1px solid rgba(15,23,42,0.06)",
            padding: 20, display: "flex", flexDirection: "column", gap: 16, overflow: "auto",
          }}>
            <div>
              <Eyebrow>Acciones del validador</Eyebrow>
              <p style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.6, margin: "8px 0 0" }}>
                Selecciona el resultado de la validación. Se enviarán las notificaciones por email y WhatsApp.
              </p>
            </div>

            {actionView === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button variant="success" size="lg" icon="check-circle" onClick={() => onValidate("completa", caso)}>
                  ✅ Completa
                </Button>
                <Button variant="danger" size="lg" icon="x-circle" onClick={() => setActionView("incompleta")}>
                  ❌ Incompleta / Ilegible
                </Button>
                <Button variant="warning" size="lg" icon="alert-circle" onClick={() => setActionView("fraude")}>
                  🚨 Posible Fraude
                </Button>
                <Button variant="ghost" size="md" icon="edit-3" onClick={() => onValidate("extra", caso)}>
                  📝 Notificación personalizada
                </Button>
              </div>
            ) : actionView === "incompleta" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>
                    Selecciona los problemas detectados
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>
                    Tipo: <strong style={{ color: "#334155" }}>{tipoLabel}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                  {checksOptions.map(opt => (
                    <label key={opt.key} style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "10px 12px",
                      background: checks.includes(opt.key) ? "rgba(220,38,38,0.10)" : "rgba(15,23,42,0.02)",
                      border: `1px solid ${checks.includes(opt.key) ? "rgba(220,38,38,0.35)" : "rgba(15,23,42,0.06)"}`,
                      borderRadius: 10, cursor: "pointer",
                      transition: "all 200ms",
                    }}>
                      <input
                        type="checkbox"
                        checked={checks.includes(opt.key)}
                        onChange={() => toggleCheck(opt.key)}
                        style={{ marginTop: 3, accentColor: "#DC2626" }}
                      />
                      <div>
                        <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Button variant="ghost" size="md" onClick={() => { setActionView(null); setChecks([]); }} style={{ flex: 1 }}>
                    Cancelar
                  </Button>
                  <Button
                    variant="danger" size="md" icon="send"
                    disabled={checks.length === 0}
                    onClick={() => { onValidate("incompleta", caso, checks); setActionView(null); setChecks([]); }}
                    style={{ flex: 2 }}
                  >
                    Confirmar ({checks.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 10, padding: 12, color: "#B91C1C", fontSize: 13, lineHeight: 1.5,
                }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>🚨 Posible Fraude</strong>
                  Caso con posibles inconsistencias. Seleccione la acción.
                </div>
                <Button variant="primary" size="md" icon="file-text"
                  onClick={() => { onValidate("solicitar_epicrisis", caso); setActionView(null); }}>
                  📋 Solicitar Epicrisis
                </Button>
                <Button variant="warning" size="md" icon="send"
                  onClick={() => { onValidate("enviar_validar", caso); setActionView(null); }}>
                  🔍 Enviar a Validar
                </Button>
                <Button variant="ghost" size="md" onClick={() => setActionView(null)}>
                  Cancelar
                </Button>
              </div>
            )}

            {/* Metadata pile */}
            <div style={{ marginTop: 8, padding: "12px 14px", background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.06)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <MetaRow label="Fecha inicio"   value={caso.fecha_inicio} />
              <MetaRow label="Fecha fin"      value={caso.fecha_fin} />
              <MetaRow label="Días"           value={`${caso.dias}`} />
              <MetaRow label="Reenvíos"       value={caso.reenvios > 0 ? `${caso.reenvios} ⚠️` : "—"} />
              <MetaRow label="Bloquea nuevas" value={caso.bloquea ? "🔒 Sí" : "No"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "#94A3B8" }}>{label}</span>
      <span style={{ color: "#0F172A", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function IconBtn({ name, onClick, title }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(15,23,42,0.07)" : "transparent",
        border: "none", color: "#334155", cursor: "pointer",
        padding: 8, borderRadius: 8, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        transition: "background 200ms",
      }}
    ><Icon name={name} size={16} /></button>
  );
}
function Divider() {
  return <span style={{ width: 1, height: 20, background: "rgba(15,23,42,0.07)", margin: "0 2px" }} />;
}

/* Faux PDF page — mimics the look of an EPS incapacidad scan */
function PagePlaceholder({ caso, page, mini }) {
  if (mini) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(180deg, #fff 0%, #f4f4f5 100%)",
        padding: 8, fontFamily: "Times, serif", color: "#4a4a52",
        display: "flex", flexDirection: "column", gap: 4, overflow: "hidden",
      }}>
        <div style={{ height: 14, background: "#cbd5e1", borderRadius: 2, width: "80%" }} />
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 1, width: "60%" }} />
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 1, width: "90%" }} />
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 1, width: "75%" }} />
        <div style={{ height: 30, background: "#f1f5f9", borderRadius: 2, marginTop: 6 }} />
        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 1, width: "85%" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: "100%", height: "100%", padding: "48px 56px",
      background: "white", color: "#1f2937",
      fontFamily: "'Times New Roman', serif", fontSize: 12, lineHeight: 1.5,
      position: "relative",
    }}>
      {/* Letterhead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1e3a8a", paddingBottom: 10, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, color: "#1e3a8a", fontSize: 16, letterSpacing: 0.5 }}>EPS SANITAS</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>NIT 800.251.440-6 · Sucursal Bogotá</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#6b7280" }}>
          Página {page} de 5<br/>
          Folio: <strong style={{ color: "#1e3a8a" }}>2026-{(caso ? caso.id : 1) * 10417}</strong>
        </div>
      </div>

      <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: 14, color: "#111", marginBottom: 18, textTransform: "uppercase", letterSpacing: 1 }}>
        Certificado de Incapacidad Médica
      </div>

      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginBottom: 14 }}>
        <tbody>
          <PdfRow label="Paciente"           value={caso ? caso.nombre : "—"} />
          <PdfRow label="Cédula"             value={caso ? caso.cedula : "—"} />
          <PdfRow label="Empresa"            value={caso ? caso.empresa : "—"} />
          <PdfRow label="Diagnóstico (CIE-10)" value="J11.1 — Influenza con otras manifestaciones respiratorias" />
          <PdfRow label="Fecha inicio"       value={caso ? caso.fecha_inicio : "—"} />
          <PdfRow label="Fecha fin"          value={caso ? caso.fecha_fin : "—"} />
          <PdfRow label="Días"               value={caso ? `${caso.dias}` : "—"} />
          <PdfRow label="Médico tratante"    value="Dr. Esteban Cárdenas Murillo · Reg. 87234" />
          <PdfRow label="Institución"        value="Clínica Country, Cra 16 #82-57" />
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: 12, fontSize: 10, color: "#4b5563", lineHeight: 1.7 }}>
        Por medio del presente se certifica que el(la) paciente arriba mencionado(a)
        requiere reposo médico por las fechas indicadas. Esta incapacidad se expide
        para los fines pertinentes ante la EPS y el empleador, conforme a la Resolución
        2266 de 1998 del Ministerio de Salud.
      </div>

      <div style={{ position: "absolute", bottom: 56, left: 56, fontSize: 10, color: "#9ca3af" }}>
        Firma digital · expedido {new Date().toLocaleDateString("es-CO")}
      </div>

      <div style={{ position: "absolute", bottom: 56, right: 56, textAlign: "center" }}>
        <div style={{ width: 90, height: 38, borderTop: "1px solid #1f2937", paddingTop: 4, fontSize: 9, color: "#1f2937" }}>
          Dr. E. Cárdenas
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 9, color: "#9ca3af" }}>
        QR · NB-2026-{caso ? String(caso.id).padStart(5, "0") : "00000"}
      </div>
    </div>
  );
}
function PdfRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "5px 8px", fontWeight: 700, color: "#1f2937", verticalAlign: "top", width: "30%", borderBottom: "1px solid #e5e7eb" }}>{label}</td>
      <td style={{ padding: "5px 8px", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{value}</td>
    </tr>
  );
}

window.DocumentViewerModal = DocumentViewerModal;
