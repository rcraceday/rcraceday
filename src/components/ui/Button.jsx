// src/components/ui/Button.jsx
import useTheme from "@/app/providers/useTheme";

function parseColorToRgb(color) {
  if (!color) return null;
  const hex = String(color).trim();
  if (hex.startsWith("#")) {
    const num = parseInt(hex.replace("#", ""), 16);
    if (Number.isNaN(num)) return null;
    return { r: num >> 16, g: (num >> 8) & 0xff, b: num & 0xff };
  }
  const rgbMatch = hex.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  return null;
}

function shiftRgb(color, amount) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return color;
  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  const { palette } = useTheme();
  const brand = palette?.primary || "#ce0202";
  const buttonColor = palette?.button || brand;
  const buttonTextColor = palette?.buttonText || "#FFFFFF";

  const variants = {
    primary: {
      bg: buttonColor,
      hover: shiftRgb(buttonColor, -28),
      text: buttonTextColor,
      border: "rgba(255,255,255,0.8)",
      hoverBorder: "rgba(255,255,255,0.8)",
    },
    secondary: {
      bg: "#FFFFFF",
      hover: "#E5E7EB",
      text: brand,
      border: brand,
      hoverBorder: brand,
    },
    success: {
      bg: "#16a34a",
      hover: shiftRgb("#16a34a", -24),
      text: buttonTextColor,
      border: "#15803d",
      hoverBorder: shiftRgb("#15803d", -12),
    },
    danger: {
      bg: "#dc2626",
      hover: shiftRgb("#dc2626", -24),
      text: "#ffffff",
      border: "#b91c1c",
      hoverBorder: shiftRgb("#b91c1c", -12),
    },
  };

  const style = variants[variant] || variants.primary;

  const sizeStyles = {
    sm: { padding: "6px 10px", fontSize: "14px", borderRadius: "4px" },
    md: { padding: "10px 14px", fontSize: "15px", borderRadius: "6px" },
    lg: { padding: "14px 18px", fontSize: "16px", fontWeight: 600, borderRadius: "6px" },
  };

  const sizeStyle = sizeStyles[size] || sizeStyles.md;

  const inlineBg = props.style?.backgroundColor;
  const baseBg = inlineBg || style.bg;
  const hoverBg = inlineBg ? shiftRgb(inlineBg, -28) : style.hover;

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
        backgroundColor: baseBg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: userOverridesPadding ? undefined : sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: sizeStyle.fontWeight || "500",
        borderRadius: sizeStyle.borderRadius,
        ...(props.style || {}),
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.backgroundColor = hoverBg;
        e.currentTarget.style.color = style.text;
        e.currentTarget.style.borderColor = style.hoverBorder || style.border;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.backgroundColor = baseBg;
        e.currentTarget.style.color = style.text;
        e.currentTarget.style.borderColor = style.border;
      }}
    >
      {children}
    </button>
  );
}
