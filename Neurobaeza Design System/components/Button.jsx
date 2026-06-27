import React from "react";

/**
 * Neurobaeza · Button
 * Linear-Indigo, light-theme primary action button.
 * Variants: primary | success | danger | warning | ghost
 * Sizes:    sm | md | lg
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  style = {},
}) {
  const [hover, setHover] = React.useState(false);

  const palette = {
    primary: {
      bg: "linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)",
      hover: "linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)",
      color: "#fff",
      ring: "rgba(79,70,229,0.45)",
      glow: "0 6px 18px rgba(79,70,229,0.30), 0 0 22px rgba(99,102,241,0.30)",
      border: "none",
    },
    success: {
      bg: "linear-gradient(180deg, #22C55E 0%, #15803D 100%)",
      hover: "linear-gradient(180deg, #4ADE80 0%, #16A34A 100%)",
      color: "#fff",
      ring: "rgba(34,197,94,0.4)",
      glow: "0 6px 18px rgba(21,128,61,0.25)",
      border: "none",
    },
    danger: {
      bg: "linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)",
      hover: "linear-gradient(180deg, #F87171 0%, #DC2626 100%)",
      color: "#fff",
      ring: "rgba(220,38,38,0.4)",
      glow: "0 6px 18px rgba(185,28,28,0.25)",
      border: "none",
    },
    warning: {
      bg: "linear-gradient(180deg, #F59E0B 0%, #B45309 100%)",
      hover: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
      color: "#fff",
      ring: "rgba(245,158,11,0.4)",
      glow: "0 6px 18px rgba(180,83,9,0.25)",
      border: "none",
    },
    ghost: {
      bg: "#FFFFFF",
      hover: "#F1F5F9",
      color: "#334155",
      ring: "rgba(79,70,229,0.25)",
      glow: "none",
      border: "1px solid rgba(15,23,42,0.12)",
    },
  }[variant] || {};

  const sizing = {
    sm: { padding: "7px 13px", fontSize: 12, radius: 10 },
    md: { padding: "10px 18px", fontSize: 13, radius: 14 },
    lg: { padding: "13px 24px", fontSize: 14, radius: 18 },
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
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
        boxShadow: disabled
          ? "none"
          : `${palette.glow}, inset 0 1px 0 rgba(255,255,255,0.30)` +
            (hover ? `, 0 0 0 4px ${palette.ring}` : ""),
        transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
