/* @ds-bundle: {"format":3,"namespace":"NeurobaezaDesignSystem_a0fa6a","components":[{"name":"Button","sourcePath":"components/Button.jsx"}],"sourceHashes":{"components/Button.jsx":"83ef9661730b","ui_kits/portal/AppShell.jsx":"f629a1ac8d3d","ui_kits/portal/DocumentViewerModal.jsx":"26b81dfb7fc5","ui_kits/portal/LoginScreen.jsx":"6343195be7a2","ui_kits/portal/ReportesTab.jsx":"f02b847cfa73","ui_kits/portal/ValidacionTab.jsx":"1003cc3839ca","ui_kits/portal/components.jsx":"e5c0126762fa","ui_kits/portal/data.js":"281e8881e2c9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NeurobaezaDesignSystem_a0fa6a = window.NeurobaezaDesignSystem_a0fa6a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Button.jsx
try { (() => {
/**
 * Neurobaeza · Button
 * Linear-Indigo, light-theme primary action button.
 * Variants: primary | success | danger | warning | ghost
 * Sizes:    sm | md | lg
 */
function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  const palette = {
    primary: {
      bg: "linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)",
      hover: "linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)",
      color: "#fff",
      ring: "rgba(79,70,229,0.45)",
      glow: "0 6px 18px rgba(79,70,229,0.30), 0 0 22px rgba(99,102,241,0.30)",
      border: "none"
    },
    success: {
      bg: "linear-gradient(180deg, #22C55E 0%, #15803D 100%)",
      hover: "linear-gradient(180deg, #4ADE80 0%, #16A34A 100%)",
      color: "#fff",
      ring: "rgba(34,197,94,0.4)",
      glow: "0 6px 18px rgba(21,128,61,0.25)",
      border: "none"
    },
    danger: {
      bg: "linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)",
      hover: "linear-gradient(180deg, #F87171 0%, #DC2626 100%)",
      color: "#fff",
      ring: "rgba(220,38,38,0.4)",
      glow: "0 6px 18px rgba(185,28,28,0.25)",
      border: "none"
    },
    warning: {
      bg: "linear-gradient(180deg, #F59E0B 0%, #B45309 100%)",
      hover: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
      color: "#fff",
      ring: "rgba(245,158,11,0.4)",
      glow: "0 6px 18px rgba(180,83,9,0.25)",
      border: "none"
    },
    ghost: {
      bg: "#FFFFFF",
      hover: "#F1F5F9",
      color: "#334155",
      ring: "rgba(79,70,229,0.25)",
      glow: "none",
      border: "1px solid rgba(15,23,42,0.12)"
    }
  }[variant] || {};
  const sizing = {
    sm: {
      padding: "7px 13px",
      fontSize: 12,
      radius: 10
    },
    md: {
      padding: "10px 18px",
      fontSize: 13,
      radius: 14
    },
    lg: {
      padding: "13px 24px",
      fontSize: 14,
      radius: 18
    }
  }[size];
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: hover && !disabled ? palette.hover : palette.bg,
      color: palette.color,
      border: palette.border,
      borderRadius: sizing.radius,
      padding: sizing.padding,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: sizing.fontSize,
      letterSpacing: "0.01em",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      boxShadow: disabled ? "none" : `${palette.glow}, inset 0 1px 0 rgba(255,255,255,0.30)` + (hover ? `, 0 0 0 4px ${palette.ring}` : ""),
      transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/AppShell.jsx
try { (() => {
/* App shell — gradient header + permission-filtered tab bar */

function AppShell({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  children
}) {
  useLucide();
  const tabs = [{
    id: "validacion",
    label: "✅ Validación de Casos"
  }, {
    id: "reportes",
    label: "📊 Reportes y Tablas Vivas"
  }, {
    id: "ia",
    label: "🤖 Validaciones IA"
  }, {
    id: "exportaciones",
    label: "📦 Exportaciones PDF"
  }, {
    id: "powerbi",
    label: "📈 Power BI"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "#FFFFFF",
      color: "#0F172A"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "20px 24px 48px",
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A78BFA 100%)",
      borderRadius: 20,
      padding: "22px 28px",
      boxShadow: "0 16px 48px rgba(79, 70, 229, 0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "Outfit, sans-serif",
      fontWeight: 800,
      fontSize: 26,
      color: "white",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: 12,
      letterSpacing: "-0.02em"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 28
  }), "Portal de Validadores"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#DBEAFE",
      margin: "6px 0 0",
      fontSize: 13
    }
  }, "Sistema de gesti\xF3n de incapacidades m\xE9dicas")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(15,23,42,0.08)",
      padding: "8px 14px",
      borderRadius: 10,
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "white",
      fontSize: 13,
      fontWeight: 600
    }
  }, user.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(219,234,254,0.7)",
      fontSize: 10,
      marginTop: 2
    }
  }, window.ROLE_LABELS[user.rol])), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
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
      transition: "background 200ms"
    },
    onMouseEnter: e => e.currentTarget.style.background = "rgba(255,255,255,0.22)",
    onMouseLeave: e => e.currentTarget.style.background = "rgba(15,23,42,0.08)"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 16
  }), "Salir")))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 2,
      borderBottom: "2px solid #E2E8F0"
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setActiveTab(t.id),
    style: {
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
      transition: "color 200ms"
    }
  }, t.label))), /*#__PURE__*/React.createElement("div", null, children)));
}
window.AppShell = AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/DocumentViewerModal.jsx
try { (() => {
/* Document Viewer Modal — full-screen, PDF placeholder, action panel */

function DocumentViewerModal({
  caso,
  onClose,
  onValidate
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [actionView, setActionView] = useState(null); // null | 'incompleta' | 'fraude'
  const [checks, setChecks] = useState([]);
  useLucide();
  const pageCount = 5; // mock
  const tipoLabel = window.TIPO_MAP[caso.tipo];
  const checksOptions = {
    enfermedad_general: [{
      key: "incapacidad_faltante",
      label: "Falta soporte de incapacidad",
      desc: "No se adjuntó el documento oficial de la EPS"
    }, {
      key: "epicrisis_faltante",
      label: "Falta epicrisis/resumen",
      desc: "Requerido para 3+ días"
    }, {
      key: "ilegible_recortada",
      label: "Documento recortado",
      desc: "Bordes no visibles"
    }, {
      key: "ilegible_borrosa",
      label: "Documento borroso",
      desc: "Mala calidad de imagen"
    }],
    maternidad: [{
      key: "incapacidad_faltante",
      label: "Falta licencia de maternidad",
      desc: "Documento oficial de la EPS"
    }, {
      key: "epicrisis_faltante",
      label: "Falta epicrisis",
      desc: "Resumen clínico completo"
    }, {
      key: "registro_civil_faltante",
      label: "Falta registro civil",
      desc: "Del bebé"
    }, {
      key: "nacido_vivo_faltante",
      label: "Falta certificado nacido vivo",
      desc: "Original legible"
    }],
    accidente_transito: [{
      key: "incapacidad_faltante",
      label: "Falta incapacidad médica",
      desc: "Documento oficial"
    }, {
      key: "furips_faltante",
      label: "Falta FURIPS",
      desc: "Formato Único de Reporte"
    }, {
      key: "soat_faltante",
      label: "Falta SOAT",
      desc: "✅ Se enviará imagen automática"
    }],
    paternidad: [{
      key: "cedula_padre_faltante",
      label: "Falta cédula del padre",
      desc: "Ambas caras"
    }, {
      key: "registro_civil_faltante",
      label: "Falta registro civil",
      desc: "Del bebé"
    }],
    enfermedad_laboral: [{
      key: "incapacidad_faltante",
      label: "Falta incapacidad médica",
      desc: "Documento oficial de ARL"
    }, {
      key: "epicrisis_faltante",
      label: "Falta epicrisis",
      desc: "Resumen clínico completo"
    }]
  }[caso.tipo] || [];
  const toggleCheck = k => setChecks(c => c.includes(k) ? c.filter(x => x !== k) : [...c, k]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.8)",
      backdropFilter: "blur(8px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      animation: "fadeUp2026 0.35s cubic-bezier(0.22,1,0.36,1) both"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 1400,
      height: "100%",
      maxHeight: 880,
      background: "#F1F5F9",
      border: "1px solid rgba(15,23,42,0.07)",
      borderRadius: 24,
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 24px 64px rgba(15,23,42,0.7)",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 24px",
      borderBottom: "1px solid rgba(15,23,42,0.06)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      background: "rgba(255,255,255,0.85)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "rgba(15,23,42,0.05)",
      border: "1px solid rgba(15,23,42,0.07)",
      color: "#334155",
      borderRadius: 12,
      padding: "8px 12px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 13,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 16
  }), "Volver"), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement(Serial, null, caso.serial), /*#__PURE__*/React.createElement(StatusBadge, {
    status: caso.estado
  }), caso.bloquea ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    },
    title: "Bloqueado"
  }, "\uD83D\uDD12") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Outfit, sans-serif",
      fontWeight: 700,
      fontSize: 18,
      color: "#0F172A",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, caso.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#94A3B8"
    }
  }, "CC ", caso.cedula, " \xB7 ", caso.empresa, " \xB7 ", tipoLabel, " \xB7 ", caso.dias, " d\xEDa", caso.dias === 1 ? "" : "s"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "undo-2"
  }, "Deshacer"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "save"
  }, "Guardar en Drive"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "120px 1fr 360px",
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      borderRight: "1px solid rgba(15,23,42,0.05)",
      padding: 12,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      fontSize: 9,
      marginBottom: 4,
      textAlign: "center"
    }
  }, "P\xE1ginas"), Array.from({
    length: pageCount
  }).map((_, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setCurrentPage(i),
    style: {
      position: "relative",
      background: "white",
      padding: 0,
      border: i === currentPage ? "2px solid #4F46E5" : "1px solid rgba(15,23,42,0.07)",
      borderRadius: 8,
      cursor: "pointer",
      height: 120,
      boxShadow: i === currentPage ? "0 0 16px rgba(79,70,229,0.4)" : "0 2px 8px rgba(15,23,42,0.3)",
      transition: "all 200ms"
    }
  }, /*#__PURE__*/React.createElement(PagePlaceholder, {
    mini: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 4,
      left: "50%",
      transform: "translateX(-50%)",
      background: i === currentPage ? "#4F46E5" : "rgba(15,23,42,0.65)",
      color: "white",
      padding: "1px 8px",
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, i + 1)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      overflow: "auto",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
      transformOrigin: "center top",
      transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
      width: 560,
      height: 720,
      background: "white",
      borderRadius: 6,
      boxShadow: "0 24px 64px rgba(15,23,42,0.6)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(PagePlaceholder, {
    caso: caso,
    page: currentPage + 1
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      bottom: 0,
      marginTop: 16,
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(15,23,42,0.07)",
      borderRadius: 12,
      padding: "6px 10px",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      boxShadow: "0 8px 24px rgba(15,23,42,0.5)"
    }
  }, /*#__PURE__*/React.createElement(IconBtn, {
    name: "chevron-left",
    onClick: () => setCurrentPage(p => Math.max(0, p - 1)),
    title: "Anterior"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      color: "#334155",
      padding: "0 8px"
    }
  }, currentPage + 1, " / ", pageCount), /*#__PURE__*/React.createElement(IconBtn, {
    name: "chevron-right",
    onClick: () => setCurrentPage(p => Math.min(pageCount - 1, p + 1)),
    title: "Siguiente"
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(IconBtn, {
    name: "zoom-out",
    onClick: () => setZoom(z => Math.max(50, z - 10))
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      padding: "0 6px",
      minWidth: 36,
      textAlign: "center"
    }
  }, zoom, "%"), /*#__PURE__*/React.createElement(IconBtn, {
    name: "zoom-in",
    onClick: () => setZoom(z => Math.min(200, z + 10))
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(IconBtn, {
    name: "rotate-ccw",
    onClick: () => setRotation(r => r - 90),
    title: "Rotar"
  }), /*#__PURE__*/React.createElement(IconBtn, {
    name: "rotate-cw",
    onClick: () => setRotation(r => r + 90)
  }), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement(IconBtn, {
    name: "sliders",
    title: "Mejorar calidad"
  }), /*#__PURE__*/React.createElement(IconBtn, {
    name: "image",
    title: "Recortar"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.6)",
      borderLeft: "1px solid rgba(15,23,42,0.06)",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Acciones del validador"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#94A3B8",
      fontSize: 12,
      lineHeight: 1.6,
      margin: "8px 0 0"
    }
  }, "Selecciona el resultado de la validaci\xF3n. Se enviar\xE1n las notificaciones por email y WhatsApp.")), actionView === null ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "success",
    size: "lg",
    icon: "check-circle",
    onClick: () => onValidate("completa", caso)
  }, "\u2705 Completa"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "lg",
    icon: "x-circle",
    onClick: () => setActionView("incompleta")
  }, "\u274C Incompleta / Ilegible"), /*#__PURE__*/React.createElement(Button, {
    variant: "warning",
    size: "lg",
    icon: "alert-circle",
    onClick: () => setActionView("fraude")
  }, "\uD83D\uDEA8 Posible Fraude"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    icon: "edit-3",
    onClick: () => onValidate("extra", caso)
  }, "\uD83D\uDCDD Notificaci\xF3n personalizada")) : actionView === "incompleta" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#0F172A",
      marginBottom: 2
    }
  }, "Selecciona los problemas detectados"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8"
    }
  }, "Tipo: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#334155"
    }
  }, tipoLabel))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      maxHeight: 320,
      overflow: "auto"
    }
  }, checksOptions.map(opt => /*#__PURE__*/React.createElement("label", {
    key: opt.key,
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      padding: "10px 12px",
      background: checks.includes(opt.key) ? "rgba(220,38,38,0.10)" : "rgba(15,23,42,0.02)",
      border: `1px solid ${checks.includes(opt.key) ? "rgba(220,38,38,0.35)" : "rgba(15,23,42,0.06)"}`,
      borderRadius: 10,
      cursor: "pointer",
      transition: "all 200ms"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checks.includes(opt.key),
    onChange: () => toggleCheck(opt.key),
    style: {
      marginTop: 3,
      accentColor: "#DC2626"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#0F172A",
      fontWeight: 600
    }
  }, opt.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      marginTop: 2
    }
  }, opt.desc))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    onClick: () => {
      setActionView(null);
      setChecks([]);
    },
    style: {
      flex: 1
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "md",
    icon: "send",
    disabled: checks.length === 0,
    onClick: () => {
      onValidate("incompleta", caso, checks);
      setActionView(null);
      setChecks([]);
    },
    style: {
      flex: 2
    }
  }, "Confirmar (", checks.length, ")"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(220,38,38,0.10)",
      border: "1px solid rgba(220,38,38,0.3)",
      borderRadius: 10,
      padding: 12,
      color: "#B91C1C",
      fontSize: 13,
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: "block",
      marginBottom: 4
    }
  }, "\uD83D\uDEA8 Posible Fraude"), "Caso con posibles inconsistencias. Seleccione la acci\xF3n."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    icon: "file-text",
    onClick: () => {
      onValidate("solicitar_epicrisis", caso);
      setActionView(null);
    }
  }, "\uD83D\uDCCB Solicitar Epicrisis"), /*#__PURE__*/React.createElement(Button, {
    variant: "warning",
    size: "md",
    icon: "send",
    onClick: () => {
      onValidate("enviar_validar", caso);
      setActionView(null);
    }
  }, "\uD83D\uDD0D Enviar a Validar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    onClick: () => setActionView(null)
  }, "Cancelar")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: "12px 14px",
      background: "rgba(15,23,42,0.02)",
      border: "1px solid rgba(15,23,42,0.06)",
      borderRadius: 12,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(MetaRow, {
    label: "Fecha inicio",
    value: caso.fecha_inicio
  }), /*#__PURE__*/React.createElement(MetaRow, {
    label: "Fecha fin",
    value: caso.fecha_fin
  }), /*#__PURE__*/React.createElement(MetaRow, {
    label: "D\xEDas",
    value: `${caso.dias}`
  }), /*#__PURE__*/React.createElement(MetaRow, {
    label: "Reenv\xEDos",
    value: caso.reenvios > 0 ? `${caso.reenvios} ⚠️` : "—"
  }), /*#__PURE__*/React.createElement(MetaRow, {
    label: "Bloquea nuevas",
    value: caso.bloquea ? "🔒 Sí" : "No"
  }))))));
}
function MetaRow({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#94A3B8"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#0F172A",
      fontWeight: 600
    }
  }, value));
}
function IconBtn({
  name,
  onClick,
  title
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: hover ? "rgba(15,23,42,0.07)" : "transparent",
      border: "none",
      color: "#334155",
      cursor: "pointer",
      padding: 8,
      borderRadius: 8,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 200ms"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: name,
    size: 16
  }));
}
function Divider() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 20,
      background: "rgba(15,23,42,0.07)",
      margin: "0 2px"
    }
  });
}

/* Faux PDF page — mimics the look of an EPS incapacidad scan */
function PagePlaceholder({
  caso,
  page,
  mini
}) {
  if (mini) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg, #fff 0%, #f4f4f5 100%)",
        padding: 8,
        fontFamily: "Times, serif",
        color: "#4a4a52",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 14,
        background: "#cbd5e1",
        borderRadius: 2,
        width: "80%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "#e5e7eb",
        borderRadius: 1,
        width: "60%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "#e5e7eb",
        borderRadius: 1,
        width: "90%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "#e5e7eb",
        borderRadius: 1,
        width: "75%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 30,
        background: "#f1f5f9",
        borderRadius: 2,
        marginTop: 6
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "#e5e7eb",
        borderRadius: 1,
        width: "85%"
      }
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      padding: "48px 56px",
      background: "white",
      color: "#1f2937",
      fontFamily: "'Times New Roman', serif",
      fontSize: 12,
      lineHeight: 1.5,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottom: "2px solid #1e3a8a",
      paddingBottom: 10,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Arial, sans-serif",
      fontWeight: 800,
      color: "#1e3a8a",
      fontSize: 16,
      letterSpacing: 0.5
    }
  }, "EPS SANITAS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#6b7280"
    }
  }, "NIT 800.251.440-6 \xB7 Sucursal Bogot\xE1")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      fontSize: 10,
      color: "#6b7280"
    }
  }, "P\xE1gina ", page, " de 5", /*#__PURE__*/React.createElement("br", null), "Folio: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#1e3a8a"
    }
  }, "2026-", (caso ? caso.id : 1) * 10417))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      fontWeight: 800,
      fontSize: 14,
      color: "#111",
      marginBottom: 18,
      textTransform: "uppercase",
      letterSpacing: 1
    }
  }, "Certificado de Incapacidad M\xE9dica"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      fontSize: 11,
      borderCollapse: "collapse",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement(PdfRow, {
    label: "Paciente",
    value: caso ? caso.nombre : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "C\xE9dula",
    value: caso ? caso.cedula : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "Empresa",
    value: caso ? caso.empresa : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "Diagn\xF3stico (CIE-10)",
    value: "J11.1 \u2014 Influenza con otras manifestaciones respiratorias"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "Fecha inicio",
    value: caso ? caso.fecha_inicio : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "Fecha fin",
    value: caso ? caso.fecha_fin : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "D\xEDas",
    value: caso ? `${caso.dias}` : "—"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "M\xE9dico tratante",
    value: "Dr. Esteban C\xE1rdenas Murillo \xB7 Reg. 87234"
  }), /*#__PURE__*/React.createElement(PdfRow, {
    label: "Instituci\xF3n",
    value: "Cl\xEDnica Country, Cra 16 #82-57"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px dashed #cbd5e1",
      paddingTop: 12,
      fontSize: 10,
      color: "#4b5563",
      lineHeight: 1.7
    }
  }, "Por medio del presente se certifica que el(la) paciente arriba mencionado(a) requiere reposo m\xE9dico por las fechas indicadas. Esta incapacidad se expide para los fines pertinentes ante la EPS y el empleador, conforme a la Resoluci\xF3n 2266 de 1998 del Ministerio de Salud."), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 56,
      left: 56,
      fontSize: 10,
      color: "#9ca3af"
    }
  }, "Firma digital \xB7 expedido ", new Date().toLocaleDateString("es-CO")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 56,
      right: 56,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      height: 38,
      borderTop: "1px solid #1f2937",
      paddingTop: 4,
      fontSize: 9,
      color: "#1f2937"
    }
  }, "Dr. E. C\xE1rdenas")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 12,
      right: 12,
      fontSize: 9,
      color: "#9ca3af"
    }
  }, "QR \xB7 NB-2026-", caso ? String(caso.id).padStart(5, "0") : "00000"));
}
function PdfRow({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      fontWeight: 700,
      color: "#1f2937",
      verticalAlign: "top",
      width: "30%",
      borderBottom: "1px solid #e5e7eb"
    }
  }, label), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#374151",
      borderBottom: "1px solid #e5e7eb"
    }
  }, value));
}
window.DocumentViewerModal = DocumentViewerModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/DocumentViewerModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/LoginScreen.jsx
try { (() => {
/* Login screen — sapphire glass card on animated obsidian fog background */

function LoginScreen({
  onLogin
}) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // login | forgot
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  useLucide();
  const handleLogin = e => {
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
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "#FFFFFF",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fog-layer fog-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fog-layer fog-2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fog-layer fog-3"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      width: "100%",
      maxWidth: 440
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 64,
      height: 64,
      background: "rgba(79,70,229,0.18)",
      border: "1px solid rgba(129,140,248,0.4)",
      borderRadius: 20,
      marginBottom: 16,
      boxShadow: "0 0 32px rgba(79,70,229,0.35)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 32,
    style: {
      color: "#818CF8"
    }
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "Outfit, sans-serif",
      fontWeight: 800,
      fontSize: 26,
      color: "#0F172A",
      letterSpacing: "-0.02em",
      margin: 0
    }
  }, "Portal Incapacidades"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#94A3B8",
      fontSize: 13,
      margin: "6px 0 0",
      fontWeight: 500
    }
  }, "Sistema de Validaci\xF3n \xB7 Neurobaeza")), /*#__PURE__*/React.createElement(GlassPanel, {
    radius: 28,
    padding: "32px"
  }, mode === "login" ? /*#__PURE__*/React.createElement("form", {
    onSubmit: handleLogin,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      fontSize: 18,
      color: "#0F172A",
      margin: 0
    }
  }, "Iniciar Sesi\xF3n"), /*#__PURE__*/React.createElement(Field, {
    label: "Usuario"
  }, /*#__PURE__*/React.createElement(TextInput, {
    value: username,
    onChange: e => setUsername(e.target.value),
    placeholder: "Tu nombre de usuario",
    autoFocus: true
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(TextInput, {
    type: showPassword ? "text" : "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    style: {
      paddingRight: 48
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    style: {
      position: "absolute",
      right: 14,
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      color: "#94A3B8",
      cursor: "pointer",
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: showPassword ? "eye-off" : "eye",
    size: 18
  })))), error ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(220,38,38,0.10)",
      border: "1px solid rgba(220,38,38,0.3)",
      color: "#B91C1C",
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert-circle",
    size: 16
  }), error) : null, /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    size: "lg",
    variant: "primary",
    disabled: loading,
    style: {
      marginTop: 4
    }
  }, loading ? /*#__PURE__*/React.createElement(Icon, {
    name: "loader-2",
    size: 18,
    className: "spin"
  }) : null, loading ? "Ingresando..." : "Iniciar Sesión"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setMode("forgot");
      setError("");
    },
    style: {
      background: "transparent",
      border: "none",
      color: "#818CF8",
      fontSize: 13,
      cursor: "pointer",
      fontWeight: 500
    }
  }, "\xBFOlvidaste tu contrase\xF1a?"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMode("login");
      setForgotSuccess(false);
    },
    style: {
      background: "transparent",
      border: "none",
      color: "#94A3B8",
      cursor: "pointer",
      fontSize: 13,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: 0,
      width: "fit-content"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 14
  }), " Volver al login"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600,
      fontSize: 18,
      color: "#0F172A",
      margin: 0
    }
  }, "Recuperar Contrase\xF1a"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#94A3B8",
      fontSize: 13,
      margin: 0,
      lineHeight: 1.6
    }
  }, "Ingresa tu correo y te enviaremos un enlace para restablecer tu contrase\xF1a."), /*#__PURE__*/React.createElement(Field, {
    label: "Correo electr\xF3nico"
  }, /*#__PURE__*/React.createElement(TextInput, {
    type: "email",
    value: forgotEmail,
    onChange: e => setForgotEmail(e.target.value),
    placeholder: "tu@correo.com"
  })), forgotSuccess ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(16,185,129,0.12)",
      border: "1px solid rgba(16,185,129,0.35)",
      color: "#065F46",
      padding: "10px 14px",
      borderRadius: 10,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 16
  }), "Si el correo est\xE1 registrado, recibir\xE1s un enlace.") : null, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "primary",
    icon: "mail",
    onClick: () => setForgotSuccess(true),
    disabled: !forgotEmail || forgotSuccess
  }, "Enviar enlace de recuperaci\xF3n"))), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "#94A3B8",
      fontSize: 11,
      marginTop: 24
    }
  }, "\xA9 2026 Portal Incapacidades \xB7 Todos los derechos reservados"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: "10px 14px",
      background: "rgba(129,140,248,0.06)",
      border: "1px solid rgba(129,140,248,0.18)",
      borderRadius: 12,
      fontSize: 12,
      color: "#94A3B8",
      textAlign: "center"
    }
  }, "\uD83D\uDCA1 Demo \xB7 usuario ", /*#__PURE__*/React.createElement("code", {
    style: {
      color: "#B45309",
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, "demo"), " \xB7 contrase\xF1a ", /*#__PURE__*/React.createElement("code", {
    style: {
      color: "#B45309",
      fontFamily: "'JetBrains Mono', monospace"
    }
  }, "demo"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/ReportesTab.jsx
try { (() => {
/* Reportes y Tablas Vivas tab */

function ReportesTab({
  casos
}) {
  const [subTab, setSubTab] = useState("resumen");
  const [periodo, setPeriodo] = useState("mes_actual");
  const [empresa, setEmpresa] = useState("all");
  useLucide();
  const subTabs = [{
    id: "resumen",
    label: "📊 Resumen"
  }, {
    id: "th",
    label: "👔 Talento Humano"
  }, {
    id: "sst",
    label: "🛡️ Seg. y Salud"
  }, {
    id: "nomina",
    label: "💰 Nómina"
  }, {
    id: "ind",
    label: "📈 Indicadores"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(GlassPanel, {
    radius: 20,
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(SubTabs, {
    tabs: subTabs,
    active: subTab,
    onChange: setSubTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: empresa,
    onChange: e => setEmpresa(e.target.value),
    style: {
      width: 220
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Todas las empresas"), window.EMPRESAS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e,
    value: e
  }, e))), /*#__PURE__*/React.createElement(Select, {
    value: periodo,
    onChange: e => setPeriodo(e.target.value),
    style: {
      width: 180
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "mes_actual"
  }, "Mes Actual"), /*#__PURE__*/React.createElement("option", {
    value: "mes_anterior"
  }, "Mes Anterior"), /*#__PURE__*/React.createElement("option", {
    value: "a\xF1o_actual"
  }, "A\xF1o Actual"), /*#__PURE__*/React.createElement("option", {
    value: "todo"
  }, "Todo (hist\xF3rico)"), /*#__PURE__*/React.createElement("option", {
    value: "personalizado"
  }, "\uD83D\uDCC5 Personalizado\u2026")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "refresh-cw",
    size: "sm"
  }, "Actualizar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
      fontSize: 11,
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "#22C55E",
      boxShadow: "0 0 8px #22C55E"
    }
  }), "Auto-refresh activo \xB7 cada 30s"), /*#__PURE__*/React.createElement("span", null, "\xB7 \xFAltima actualizaci\xF3n hace 14s"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Total casos",
    value: "635",
    emoji: "\uD83D\uDCCA",
    tint: "blue",
    sub: "periodo actual"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "D\xEDas promedio",
    value: "4.8",
    emoji: "\u23F1\uFE0F",
    tint: "cyan",
    sub: "por incapacidad"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "\u2265 180 d\xEDas",
    value: "12",
    emoji: "\uD83D\uDEA8",
    tint: "rose",
    sub: "requieren alerta"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Tasa validaci\xF3n",
    value: "97%",
    emoji: "\u2705",
    tint: "green",
    sub: "en menos de 24h"
  })), /*#__PURE__*/React.createElement(GlassPanel, {
    radius: 20,
    padding: "0"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.7)",
      padding: "12px 18px",
      borderBottom: "1px solid rgba(15,23,42,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#0F172A",
      margin: 0
    }
  }, "Incapacidades en vivo \xB7 Talento Humano"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "rgba(15,23,42,0.06)",
      color: "#334155",
      padding: "2px 10px",
      borderRadius: 9999,
      fontSize: 10,
      fontWeight: 600
    }
  }, casos.length, " registros")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14,
    style: {
      position: "absolute",
      left: 10,
      top: 9,
      color: "#94A3B8"
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar...",
    style: {
      background: "#F1F5F9",
      color: "#0F172A",
      fontSize: 12,
      padding: "6px 10px 6px 30px",
      border: "1px solid rgba(15,23,42,0.08)",
      borderRadius: 10,
      outline: "none",
      width: 200,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "success",
    icon: "download",
    size: "sm"
  }, "Excel"))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "auto",
      maxHeight: 460
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }
  }, /*#__PURE__*/React.createElement("thead", {
    style: {
      background: "rgba(255,255,255,0.85)",
      position: "sticky",
      top: 0,
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("tr", null, ["LLAVE", "CÉDULA", "NOMBRES Y APELLIDOS", "EMPRESA", "F. INICIO", "F. FIN", "DÍAS", "ESTADO"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 14px",
      textAlign: "left",
      fontSize: 10,
      color: "#94A3B8",
      letterSpacing: "0.10em",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, h, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-down",
    size: 10,
    style: {
      color: "#CBD5E1"
    }
  })))))), /*#__PURE__*/React.createElement("tbody", null, casos.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c.id,
    style: {
      borderTop: "1px solid rgba(15,23,42,0.04)",
      background: c.dias >= 180 ? "rgba(220,38,38,0.10)" : "transparent"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px"
    }
  }, /*#__PURE__*/React.createElement(Serial, null, c.serial)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#1D4ED8",
      fontSize: 11
    }
  }, c.cedula), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      color: "#0F172A",
      textTransform: "uppercase",
      fontSize: 11
    }
  }, c.nombre), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      color: "#334155",
      textTransform: "uppercase",
      fontSize: 11
    }
  }, c.empresa), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      color: "#94A3B8"
    }
  }, c.fecha_inicio), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      color: "#94A3B8"
    }
  }, c.fecha_fin), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px",
      color: "#0F172A",
      fontWeight: 700
    }
  }, c.dias), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "8px 14px"
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: c.estado,
    mini: true
  })))))))));
}
function SubTabs({
  tabs,
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: "rgba(255,255,255,0.6)",
      padding: 4,
      borderRadius: 10,
      border: "1px solid rgba(15,23,42,0.05)"
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => onChange(t.id),
    style: {
      background: active === t.id ? "#2563EB" : "transparent",
      color: active === t.id ? "white" : "#94A3B8",
      fontWeight: 700,
      fontSize: 11,
      padding: "6px 12px",
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      boxShadow: active === t.id ? "0 4px 12px rgba(79,70,229,0.4)" : "none",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "all 200ms",
      whiteSpace: "nowrap"
    }
  }, t.label)));
}
window.ReportesTab = ReportesTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/ReportesTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/ValidacionTab.jsx
try { (() => {
/* Validación tab — stats, filters, paginated case table */

function ValidacionTab({
  casos,
  onOpenCaso,
  onExport
}) {
  const [filtros, setFiltros] = useState({
    empresa: "all",
    estado: "all",
    q: ""
  });
  useLucide();
  const filtrados = useMemo(() => {
    return casos.filter(c => {
      if (filtros.empresa !== "all" && c.empresa !== filtros.empresa) return false;
      if (filtros.estado !== "all" && c.estado !== filtros.estado) return false;
      if (filtros.q) {
        const q = filtros.q.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) && !c.serial.toLowerCase().includes(q) && !c.cedula.includes(q)) return false;
      }
      return true;
    });
  }, [casos, filtros]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(KPICard, {
    label: "Nuevos",
    value: window.STATS.nuevos,
    emoji: "\uD83D\uDCE5",
    tint: "blue",
    sub: "esta semana"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "En revisi\xF3n",
    value: window.STATS.en_revision,
    emoji: "\uD83D\uDD0D",
    tint: "cyan",
    sub: "con el equipo"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Incompletas",
    value: window.STATS.incompletas,
    emoji: "\u26A0\uFE0F",
    tint: "red",
    sub: "requieren docs"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Ilegibles",
    value: window.STATS.ilegibles,
    emoji: "\uD83D\uDCC4",
    tint: "orange",
    sub: "calidad baja"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Posible fraude",
    value: window.STATS.posible_fraude,
    emoji: "\uD83D\uDEA8",
    tint: "rose",
    sub: "derivado a TTHH"
  }), /*#__PURE__*/React.createElement(KPICard, {
    label: "Validadas",
    value: window.STATS.validadas,
    emoji: "\u2705",
    tint: "green",
    sub: "+18% MoM"
  })), /*#__PURE__*/React.createElement(GlassPanel, {
    radius: 20,
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 2fr auto",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: filtros.empresa,
    onChange: e => setFiltros(f => ({
      ...f,
      empresa: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Todas las empresas"), window.EMPRESAS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e,
    value: e
  }, e))), /*#__PURE__*/React.createElement(Select, {
    value: filtros.estado,
    onChange: e => setFiltros(f => ({
      ...f,
      estado: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, "Todos los estados"), Object.entries(window.STATUS_MAP).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, v.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    style: {
      position: "absolute",
      left: 14,
      top: 12,
      color: "#94A3B8"
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: filtros.q,
    onChange: e => setFiltros(f => ({
      ...f,
      q: e.target.value
    })),
    placeholder: "Buscar serial, c\xE9dula o nombre...",
    style: {
      width: "100%",
      boxSizing: "border-box",
      background: "#F1F5F9",
      color: "#0F172A",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 13,
      padding: "10px 14px 10px 38px",
      border: "1px solid rgba(15,23,42,0.08)",
      borderRadius: 12,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "success",
    icon: "download",
    size: "md",
    onClick: onExport
  }, "Exportar Excel"))), /*#__PURE__*/React.createElement(GlassPanel, {
    radius: 20,
    padding: "0"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      borderRadius: 20
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", {
    style: {
      background: "rgba(255,255,255,0.85)"
    }
  }, /*#__PURE__*/React.createElement("tr", null, ["Serial", "Nombre", "Empresa", "Tipo", "Estado", "Fecha", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "12px 16px",
      textAlign: "left",
      fontSize: 10,
      color: "#94A3B8",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtrados.map(c => /*#__PURE__*/React.createElement(CasoRow, {
    key: c.id,
    caso: c,
    onOpen: () => onOpenCaso(c)
  })), filtrados.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "7",
    style: {
      padding: 40,
      textAlign: "center",
      color: "#94A3B8"
    }
  }, "Sin resultados con los filtros actuales")) : null))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.5)",
      borderTop: "1px solid rgba(15,23,42,0.06)",
      padding: "10px 18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Anterior"), /*#__PURE__*/React.createElement("span", null, "P\xE1gina ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#0F172A"
    }
  }, "1"), " de ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#0F172A"
    }
  }, "23"), " \xB7 ", filtrados.length, " mostrados"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Siguiente"))));
}
function CasoRow({
  caso,
  onOpen
}) {
  const [hover, setHover] = useState(false);
  const tieneReenvios = caso.reenvios > 0;
  return /*#__PURE__*/React.createElement("tr", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderTop: "1px solid rgba(15,23,42,0.05)",
      background: hover ? "rgba(129,140,248,0.05)" : tieneReenvios ? "rgba(244,63,94,0.05)" : "transparent",
      transition: "background 200ms"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Serial, null, caso.serial), tieneReenvios ? /*#__PURE__*/React.createElement("span", {
    style: {
      background: "rgba(244,63,94,0.7)",
      color: "white",
      padding: "1px 7px",
      borderRadius: 9999,
      fontSize: 9,
      fontWeight: 700
    }
  }, caso.reenvios) : null, caso.bloquea ? /*#__PURE__*/React.createElement("span", {
    title: "Bloqueado"
  }, "\uD83D\uDD12") : null)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "#0F172A",
      fontWeight: 500
    }
  }, caso.nombre), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "#94A3B8"
    }
  }, caso.empresa), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "#334155"
    }
  }, window.TIPO_MAP[caso.tipo]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement(StatusBadge, {
    status: caso.estado
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "#94A3B8"
    }
  }, caso.fecha_inicio), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "10px 16px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    onClick: onOpen,
    icon: "file-text"
  }, "Ver")));
}
window.ValidacionTab = ValidacionTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/ValidacionTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Atoms for the Portal Neurobaeza UI Kit */

const {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo
} = React;

/* ---- Lucide helper: re-renders icons after React patches the DOM ---- */
function useLucide(deps) {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
}
function Icon({
  name,
  size = 16,
  className = "",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("i", {
    "data-lucide": name,
    className: className,
    style: {
      width: size,
      height: size,
      display: "inline-flex",
      ...style
    }
  });
}

/* ---- Glass surface ----------------------------------------------------- */
function GlassPanel({
  children,
  style,
  className = "",
  radius = 28,
  padding = "24px"
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `np-glass ${className}`,
    style: {
      position: "relative",
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(40px)",
      WebkitBackdropFilter: "blur(40px)",
      border: "1px solid rgba(15,23,42,0.07)",
      boxShadow: "0 16px 48px rgba(15,23,42,0.5), inset 0 1px 0 rgba(15,23,42,0.05)",
      borderRadius: radius,
      padding,
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)",
      pointerEvents: "none",
      zIndex: 10
    }
  }), children);
}

/* ---- Buttons ----------------------------------------------------------- */
function Button({
  children,
  onClick,
  icon,
  disabled,
  variant = "primary",
  size = "md",
  style = {},
  type = "button"
}) {
  const palette = {
    primary: {
      bg: "#4338CA",
      hover: "#4F46E5",
      color: "white",
      shadow: "0 0 20px rgba(79,70,229,0.35)",
      border: "1px solid rgba(129,140,248,0.3)"
    },
    success: {
      bg: "#16A34A",
      hover: "#22C55E",
      color: "white",
      shadow: "0 8px 24px rgba(22,163,74,0.25)",
      border: "none"
    },
    danger: {
      bg: "#DC2626",
      hover: "#EF4444",
      color: "white",
      shadow: "0 8px 24px rgba(220,38,38,0.25)",
      border: "none"
    },
    warning: {
      bg: "#D97706",
      hover: "#F59E0B",
      color: "white",
      shadow: "0 8px 24px rgba(217,119,6,0.25)",
      border: "none"
    },
    ghost: {
      bg: "rgba(15,23,42,0.05)",
      hover: "rgba(15,23,42,0.08)",
      color: "#334155",
      shadow: "none",
      border: "1px solid rgba(15,23,42,0.07)"
    }
  }[variant];
  const sizes = {
    sm: {
      padding: "8px 14px",
      fontSize: 12,
      radius: 10
    },
    md: {
      padding: "12px 18px",
      fontSize: 13,
      radius: 14
    },
    lg: {
      padding: "14px 22px",
      fontSize: 14,
      radius: 20
    }
  }[size];
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: onClick,
    disabled: disabled,
    style: {
      background: hover && !disabled ? palette.hover : palette.bg,
      color: palette.color,
      border: palette.border,
      borderRadius: sizes.radius,
      padding: sizes.padding,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      fontSize: sizes.fontSize,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      boxShadow: hover && !disabled && variant === "primary" ? "0 0 32px rgba(79,70,229,0.55)" : palette.shadow,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: sizes.fontSize + 4
  }) : null, children);
}

/* ---- Status badge (pill) ---------------------------------------------- */
function StatusBadge({
  status,
  mini = false
}) {
  const info = window.STATUS_MAP[status] || {
    label: status,
    color: "#6B7280",
    icon: "circle"
  };
  const fg = info.color;
  // hex → soft text color via rgba; for label keep punchy
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: mini ? "3px 8px" : "4px 10px",
      borderRadius: 9999,
      background: hexToRgba(fg, 0.18),
      color: lighten(fg),
      border: `1px solid ${hexToRgba(fg, 0.35)}`,
      fontSize: mini ? 9 : 10,
      fontWeight: 700,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      letterSpacing: 0.2,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: fg
    }
  }), info.label);
}
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
}
function lighten(hex) {
  // Map common status colors to their light/-400 cousins
  const map = {
    "#3B82F6": "#1D4ED8",
    "#06B6D4": "#0E7490",
    "#DC2626": "#DC2626",
    "#F59E0B": "#B45309",
    "#CA8A04": "#A16207",
    "#16A34A": "#15803D",
    "#6B7280": "#D1D5DB"
  };
  return map[hex] || hex;
}

/* ---- KPI card ---------------------------------------------------------- */
function KPICard({
  label,
  value,
  sub,
  emoji,
  tint = "blue"
}) {
  const tints = {
    blue: "rgba(59,130,246,0.20), rgba(30,64,175,0.20)",
    cyan: "rgba(6,182,212,0.20), rgba(8,145,178,0.20)",
    red: "rgba(220,38,38,0.20), rgba(153,27,27,0.20)",
    orange: "rgba(245,158,11,0.20), rgba(180,83,9,0.20)",
    rose: "rgba(244,63,94,0.22), rgba(159,18,57,0.22)",
    green: "rgba(34,197,94,0.20), rgba(21,128,61,0.20)"
  };
  const borders = {
    blue: "rgba(59,130,246,0.3)",
    cyan: "rgba(6,182,212,0.3)",
    red: "rgba(220,38,38,0.3)",
    orange: "rgba(245,158,11,0.3)",
    rose: "rgba(244,63,94,0.35)",
    green: "rgba(34,197,94,0.35)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(135deg, ${tints[tint]})`,
      border: `1px solid ${borders[tint]}`,
      borderRadius: 16,
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#94A3B8",
      letterSpacing: "0.12em",
      textTransform: "uppercase"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, emoji)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Outfit, sans-serif",
      fontWeight: 900,
      fontSize: 32,
      color: "#0F172A",
      lineHeight: 1,
      marginTop: 6
    }
  }, value), sub ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#94A3B8",
      marginTop: 4
    }
  }, sub) : null);
}

/* ---- Eyebrow label ----------------------------------------------------- */
function Eyebrow({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#94A3B8",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      ...style
    }
  }, children);
}

/* ---- Serial (champagne mono) ------------------------------------------ */
function Serial({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700,
      color: "#B45309",
      fontSize: 12,
      letterSpacing: 0.3,
      textTransform: "uppercase"
    }
  }, children);
}

/* ---- Toast ------------------------------------------------------------- */
function Toast({
  type = "info",
  children,
  onClose
}) {
  const colors = {
    success: {
      bg: "rgba(16,185,129,0.14)",
      fg: "#065F46",
      border: "rgba(16,185,129,0.35)"
    },
    warning: {
      bg: "rgba(245,158,11,0.14)",
      fg: "#B45309",
      border: "rgba(245,158,11,0.35)"
    },
    danger: {
      bg: "rgba(220,38,38,0.14)",
      fg: "#B91C1C",
      border: "rgba(220,38,38,0.35)"
    },
    info: {
      bg: "rgba(59,130,246,0.14)",
      fg: "#1D4ED8",
      border: "rgba(59,130,246,0.35)"
    }
  }[type];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.fg,
      padding: "12px 16px",
      borderRadius: 14,
      fontSize: 14,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: "fadeUp2026 0.5s cubic-bezier(0.22,1,0.36,1) both",
      boxShadow: "0 8px 24px rgba(15,23,42,0.5)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), onClose ? /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "transparent",
      border: "none",
      color: colors.fg,
      cursor: "pointer",
      padding: 0,
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  })) : null);
}

/* ---- Field (label + input) -------------------------------------------- */
function Field({
  label,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#334155",
      marginBottom: 6
    }
  }, label), children, hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      marginTop: 4
    }
  }, hint) : null);
}
function TextInput(props) {
  return /*#__PURE__*/React.createElement("input", _extends({}, props, {
    style: {
      width: "100%",
      boxSizing: "border-box",
      background: "rgba(15,23,42,0.03)",
      color: "#0F172A",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 14,
      padding: "14px 18px",
      border: "1px solid rgba(15,23,42,0.07)",
      borderRadius: 20,
      outline: "none",
      transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      ...props.style
    },
    onFocus: e => {
      e.target.style.borderColor = "#4F46E5";
      e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.25)";
      e.target.style.background = "rgba(79,70,229,0.06)";
      props.onFocus && props.onFocus(e);
    },
    onBlur: e => {
      e.target.style.borderColor = "rgba(15,23,42,0.07)";
      e.target.style.boxShadow = "none";
      e.target.style.background = "rgba(15,23,42,0.03)";
      props.onBlur && props.onBlur(e);
    }
  }));
}
function Select({
  value,
  onChange,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    style: {
      width: "100%",
      boxSizing: "border-box",
      background: "#F1F5F9",
      color: "#0F172A",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 13,
      padding: "10px 14px",
      border: "1px solid rgba(15,23,42,0.08)",
      borderRadius: 12,
      outline: "none",
      appearance: "none",
      backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      backgroundSize: "14px",
      paddingRight: 32,
      ...style
    }
  }, children);
}

/* expose globals */
Object.assign(window, {
  useLucide,
  Icon,
  GlassPanel,
  Button,
  StatusBadge,
  KPICard,
  Eyebrow,
  Serial,
  Toast,
  Field,
  TextInput,
  Select,
  hexToRgba
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/data.js
try { (() => {
// Mock data for Portal Neurobaeza UI Kit
// Spanish names, Colombian context, status keys match the codebase.

window.MOCK_USERS = [{
  username: "carolina.lopez",
  password: "demo",
  nombre: "Carolina López",
  rol: "admin",
  avatar: "🛡️"
}, {
  username: "andres.ruiz",
  password: "demo",
  nombre: "Andrés Ruiz",
  rol: "th",
  avatar: "👥"
}, {
  username: "demo",
  password: "demo",
  nombre: "Demo User",
  rol: "superadmin",
  avatar: "🔑"
}];
window.ROLE_LABELS = {
  superadmin: "🔑 Super Admin",
  admin: "🛡️ Administrador",
  th: "👥 Talento Humano",
  sst: "🦺 SST",
  nomina: "💰 Nómina",
  viewer: "👁️ Visualizador"
};
window.STATUS_MAP = {
  NUEVO: {
    label: "NUEVO",
    color: "#3B82F6",
    icon: "clock"
  },
  EN_REVISION: {
    label: "EN REVISIÓN",
    color: "#06B6D4",
    icon: "search"
  },
  INCOMPLETA: {
    label: "INCOMPLETA",
    color: "#DC2626",
    icon: "x-circle"
  },
  ILEGIBLE: {
    label: "ILEGIBLE",
    color: "#F59E0B",
    icon: "alert-circle"
  },
  EPS_TRANSCRIPCION: {
    label: "EN VALIDACIÓN",
    color: "#CA8A04",
    icon: "file-text"
  },
  DERIVADO_TTHH: {
    label: "POSIBLE FRAUDE",
    color: "#DC2626",
    icon: "alert-circle"
  },
  COMPLETA: {
    label: "VALIDADA",
    color: "#16A34A",
    icon: "check-circle"
  },
  CAUSA_EXTRA: {
    label: "EXTRA",
    color: "#6B7280",
    icon: "edit-3"
  }
};
window.TIPO_MAP = {
  enfermedad_general: "Enfermedad general",
  maternidad: "Maternidad",
  paternidad: "Paternidad",
  accidente_transito: "Accidente de tránsito",
  enfermedad_laboral: "Enfermedad laboral"
};
window.EMPRESAS = ["Neurobaeza SAS", "Inversiones Andes SA", "Constructora del Sur", "Grupo Logístico Caribe", "Servicios Médicos del Valle"];
window.STATS = {
  nuevos: 147,
  en_revision: 38,
  incompletas: 23,
  ilegibles: 11,
  posible_fraude: 4,
  validadas: 412
};
window.MOCK_CASOS = [{
  id: 1,
  serial: "NB-2026-00471-MAT",
  nombre: "Carolina López Mendoza",
  cedula: "1.012.388.471",
  empresa: "Neurobaeza SAS",
  tipo: "maternidad",
  estado: "COMPLETA",
  fecha_inicio: "12 nov 2026",
  fecha_fin: "10 may 2027",
  dias: 126,
  created_at: "2026-11-12",
  reenvios: 0,
  bloquea: false
}, {
  id: 2,
  serial: "NB-2026-00472-EG",
  nombre: "Andrés Felipe Ruiz",
  cedula: "1.020.111.092",
  empresa: "Inversiones Andes SA",
  tipo: "enfermedad_general",
  estado: "INCOMPLETA",
  fecha_inicio: "11 nov 2026",
  fecha_fin: "13 nov 2026",
  dias: 3,
  created_at: "2026-11-11",
  reenvios: 2,
  bloquea: true
}, {
  id: 3,
  serial: "NB-2026-00473-AT",
  nombre: "Sandra Milena Páez",
  cedula: "52.876.214",
  empresa: "Servicios Médicos Valle",
  tipo: "accidente_transito",
  estado: "ILEGIBLE",
  fecha_inicio: "10 nov 2026",
  fecha_fin: "20 nov 2026",
  dias: 11,
  created_at: "2026-11-10",
  reenvios: 0,
  bloquea: false
}, {
  id: 4,
  serial: "NB-2026-00474-EG",
  nombre: "Juan Camilo Restrepo",
  cedula: "1.144.029.881",
  empresa: "Constructora del Sur",
  tipo: "enfermedad_general",
  estado: "NUEVO",
  fecha_inicio: "13 nov 2026",
  fecha_fin: "15 nov 2026",
  dias: 3,
  created_at: "2026-11-13",
  reenvios: 0,
  bloquea: false
}, {
  id: 5,
  serial: "NB-2026-00475-EG",
  nombre: "Diana Marcela Ortiz",
  cedula: "39.554.107",
  empresa: "Grupo Logístico Caribe",
  tipo: "enfermedad_general",
  estado: "EPS_TRANSCRIPCION",
  fecha_inicio: "08 nov 2026",
  fecha_fin: "11 nov 2026",
  dias: 4,
  created_at: "2026-11-08",
  reenvios: 1,
  bloquea: false
}, {
  id: 6,
  serial: "NB-2026-00476-EL",
  nombre: "Felipe Hernández Salazar",
  cedula: "80.214.665",
  empresa: "Inversiones Andes SA",
  tipo: "enfermedad_laboral",
  estado: "DERIVADO_TTHH",
  fecha_inicio: "05 nov 2026",
  fecha_fin: "—",
  dias: 8,
  created_at: "2026-11-05",
  reenvios: 0,
  bloquea: true
}, {
  id: 7,
  serial: "NB-2026-00477-MAT",
  nombre: "Laura Catalina Vargas",
  cedula: "1.018.402.336",
  empresa: "Neurobaeza SAS",
  tipo: "maternidad",
  estado: "COMPLETA",
  fecha_inicio: "01 nov 2026",
  fecha_fin: "30 abr 2027",
  dias: 126,
  created_at: "2026-11-01",
  reenvios: 0,
  bloquea: false
}, {
  id: 8,
  serial: "NB-2026-00478-PAT",
  nombre: "Ricardo Mauricio Bermúdez",
  cedula: "79.881.024",
  empresa: "Servicios Médicos Valle",
  tipo: "paternidad",
  estado: "NUEVO",
  fecha_inicio: "14 nov 2026",
  fecha_fin: "27 nov 2026",
  dias: 14,
  created_at: "2026-11-14",
  reenvios: 0,
  bloquea: false
}, {
  id: 9,
  serial: "NB-2026-00479-EG",
  nombre: "Mónica Alejandra Torres",
  cedula: "43.221.987",
  empresa: "Constructora del Sur",
  tipo: "enfermedad_general",
  estado: "COMPLETA",
  fecha_inicio: "03 nov 2026",
  fecha_fin: "06 nov 2026",
  dias: 4,
  created_at: "2026-11-03",
  reenvios: 0,
  bloquea: false
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

})();
