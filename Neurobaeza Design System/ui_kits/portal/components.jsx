/* Atoms for the Portal Neurobaeza UI Kit */

const { useEffect, useState, useRef, useCallback, useMemo } = React;

/* ---- Lucide helper: re-renders icons after React patches the DOM ---- */
function useLucide(deps) {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
}

function Icon({ name, size = 16, className = "", style = {} }) {
  return (
    <i
      data-lucide={name}
      className={className}
      style={{ width: size, height: size, display: "inline-flex", ...style }}
    ></i>
  );
}

/* ---- Glass surface ----------------------------------------------------- */
function GlassPanel({ children, style, className = "", radius = 28, padding = "24px" }) {
  return (
    <div
      className={`np-glass ${className}`}
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(15,23,42,0.07)",
        boxShadow: "0 16px 48px rgba(15,23,42,0.5), inset 0 1px 0 rgba(15,23,42,0.05)",
        borderRadius: radius,
        padding,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(15,23,42,0.08), transparent)",
          pointerEvents: "none", zIndex: 10,
        }}
      />
      {children}
    </div>
  );
}

/* ---- Buttons ----------------------------------------------------------- */
function Button({ children, onClick, icon, disabled, variant = "primary", size = "md", style = {}, type = "button" }) {
  const palette = {
    primary: { bg: "#4338CA", hover: "#4F46E5", color: "white", shadow: "0 0 20px rgba(79,70,229,0.35)", border: "1px solid rgba(129,140,248,0.3)" },
    success: { bg: "#16A34A", hover: "#22C55E", color: "white", shadow: "0 8px 24px rgba(22,163,74,0.25)", border: "none" },
    danger:  { bg: "#DC2626", hover: "#EF4444", color: "white", shadow: "0 8px 24px rgba(220,38,38,0.25)", border: "none" },
    warning: { bg: "#D97706", hover: "#F59E0B", color: "white", shadow: "0 8px 24px rgba(217,119,6,0.25)", border: "none" },
    ghost:   { bg: "rgba(15,23,42,0.05)", hover: "rgba(15,23,42,0.08)", color: "#334155", shadow: "none", border: "1px solid rgba(15,23,42,0.07)" },
  }[variant];
  const sizes = {
    sm: { padding: "8px 14px", fontSize: 12, radius: 10 },
    md: { padding: "12px 18px", fontSize: 13, radius: 14 },
    lg: { padding: "14px 22px", fontSize: 14, radius: 20 },
  }[size];
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
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
        boxShadow: hover && !disabled && variant === "primary"
          ? "0 0 32px rgba(79,70,229,0.55)"
          : palette.shadow,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={sizes.fontSize + 4} /> : null}
      {children}
    </button>
  );
}

/* ---- Status badge (pill) ---------------------------------------------- */
function StatusBadge({ status, mini = false }) {
  const info = window.STATUS_MAP[status] || { label: status, color: "#6B7280", icon: "circle" };
  const fg = info.color;
  // hex → soft text color via rgba; for label keep punchy
  return (
    <span style={{
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
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: fg }} />
      {info.label}
    </span>
  );
}

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
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
    "#6B7280": "#D1D5DB",
  };
  return map[hex] || hex;
}

/* ---- KPI card ---------------------------------------------------------- */
function KPICard({ label, value, sub, emoji, tint = "blue" }) {
  const tints = {
    blue:   "rgba(59,130,246,0.20), rgba(30,64,175,0.20)",
    cyan:   "rgba(6,182,212,0.20), rgba(8,145,178,0.20)",
    red:    "rgba(220,38,38,0.20), rgba(153,27,27,0.20)",
    orange: "rgba(245,158,11,0.20), rgba(180,83,9,0.20)",
    rose:   "rgba(244,63,94,0.22), rgba(159,18,57,0.22)",
    green:  "rgba(34,197,94,0.20), rgba(21,128,61,0.20)",
  };
  const borders = {
    blue: "rgba(59,130,246,0.3)", cyan: "rgba(6,182,212,0.3)",
    red: "rgba(220,38,38,0.3)",   orange: "rgba(245,158,11,0.3)",
    rose: "rgba(244,63,94,0.35)", green: "rgba(34,197,94,0.35)",
  };
  return (
    <div style={{
      background: `linear-gradient(135deg, ${tints[tint]})`,
      border: `1px solid ${borders[tint]}`,
      borderRadius: 16,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#94A3B8",
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>{label}</span>
        <span style={{ fontSize: 18 }}>{emoji}</span>
      </div>
      <div style={{
        fontFamily: "Outfit, sans-serif", fontWeight: 900, fontSize: 32,
        color: "#0F172A", lineHeight: 1, marginTop: 6,
      }}>{value}</div>
      {sub ? <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

/* ---- Eyebrow label ----------------------------------------------------- */
function Eyebrow({ children, style }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: "#94A3B8",
      letterSpacing: "0.12em", textTransform: "uppercase",
      ...style,
    }}>{children}</span>
  );
}

/* ---- Serial (champagne mono) ------------------------------------------ */
function Serial({ children }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700, color: "#B45309", fontSize: 12,
      letterSpacing: 0.3, textTransform: "uppercase",
    }}>{children}</span>
  );
}

/* ---- Toast ------------------------------------------------------------- */
function Toast({ type = "info", children, onClose }) {
  const colors = {
    success: { bg: "rgba(16,185,129,0.14)", fg: "#065F46", border: "rgba(16,185,129,0.35)" },
    warning: { bg: "rgba(245,158,11,0.14)", fg: "#B45309", border: "rgba(245,158,11,0.35)" },
    danger:  { bg: "rgba(220,38,38,0.14)",  fg: "#B91C1C", border: "rgba(220,38,38,0.35)" },
    info:    { bg: "rgba(59,130,246,0.14)", fg: "#1D4ED8", border: "rgba(59,130,246,0.35)" },
  }[type];
  return (
    <div style={{
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
      boxShadow: "0 8px 24px rgba(15,23,42,0.5)",
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose ? (
        <button onClick={onClose} style={{
          background: "transparent", border: "none", color: colors.fg,
          cursor: "pointer", padding: 0, opacity: 0.7,
        }}><Icon name="x" size={16} /></button>
      ) : null}
    </div>
  );
}

/* ---- Field (label + input) -------------------------------------------- */
function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 13, color: "#334155", marginBottom: 6 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
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
        ...props.style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#4F46E5";
        e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.25)";
        e.target.style.background = "rgba(79,70,229,0.06)";
        props.onFocus && props.onFocus(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(15,23,42,0.07)";
        e.target.style.boxShadow = "none";
        e.target.style.background = "rgba(15,23,42,0.03)";
        props.onBlur && props.onBlur(e);
      }}
    />
  );
}

function Select({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
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
        ...style,
      }}
    >{children}</select>
  );
}

/* expose globals */
Object.assign(window, {
  useLucide, Icon, GlassPanel, Button, StatusBadge, KPICard,
  Eyebrow, Serial, Toast, Field, TextInput, Select, hexToRgba,
});
