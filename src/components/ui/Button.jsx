// src/components/ui/Button.jsx
import { useOutletContext } from "react-router-dom";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  const outlet = useOutletContext() || {};
  const club = outlet.club;
  const theme = club?.theme;

  const brand = theme?.hero?.backgroundColor || "#0A66C2";

  const darken = (hex) => {
    try {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.max(0, (num >> 16) - 20);
      const g = Math.max(0, ((num >> 8) & 0xff) - 20);
      const b = Math.max(0, (num & 0xff) - 20);
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return hex;
    }
  };

  const brandHover = darken(brand);

  const variants = {
    primary: {
      bg: brand,
      hover: brandHover,
      text: "#FFFFFF",
      border: "rgba(255,255,255,0.8)",
    },
    secondary: {
      bg: "#FFFFFF",
      hover: "#F5F5F5",
      text: brand,
      border: brand,
    },
    success: {
      bg: "#16A34A",
      hover: "#15803D",
      text: "#FFFFFF",
      border: "#15803D",
    },
  };

  const style = variants[variant] || variants.primary;

  const sizeStyles = {
    sm: { padding: "6px 10px", fontSize: "14px", borderRadius: "4px" },
    md: { padding: "10px 14px", fontSize: "15px", borderRadius: "6px" },
    lg: { padding: "14px 18px", fontSize: "16px", fontWeight: 600, borderRadius: "6px" },
  };

  const sizeStyle = sizeStyles[size] || sizeStyles.md;

  // ⭐ Detect inline background override
  const inlineBg = props.style?.backgroundColor;

  // ⭐ Detect Tailwind padding override
  const userOverridesPadding =
    className.includes("px-") || className.includes("py-") || className.includes("p-");

  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      style={{
        backgroundColor: inlineBg || style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: userOverridesPadding ? undefined : sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: sizeStyle.fontWeight || "500",
        borderRadius: sizeStyle.borderRadius,
        ...(props.style || {}),
      }}
      onMouseEnter={(e) => {
        if (!disabled && !inlineBg) {
          e.currentTarget.style.backgroundColor = style.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !inlineBg) {
          e.currentTarget.style.backgroundColor = style.bg;
        }
      }}
    >
      {children}
    </button>
  );
}
