// src/components/ui/Button.jsx
import useTheme from "@/app/providers/useTheme";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  const { palette } = useTheme();
  const brand = palette?.primary || "#0A66C2";
  const buttonColor = palette?.button || brand;
  const buttonTextColor = palette?.buttonText || "#FFFFFF";

  const lighten = (hex) => {
    try {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.min(255, (num >> 16) + 30);
      const g = Math.min(255, ((num >> 8) & 0xff) + 30);
      const b = Math.min(255, (num & 0xff) + 30);
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return hex;
    }
  };

  const buttonHover = lighten(buttonColor);

  const variants = {
    primary: {
      bg: buttonColor,
      hover: buttonHover,
      text: buttonTextColor,
      border: "rgba(255,255,255,0.8)",
    },
    secondary: {
      bg: "#FFFFFF",
      hover: "#F5F5F5",
      text: brand,
      border: brand,
    },
    success: {
      bg: "#16a34a",
      hover: "#15803d",
      text: buttonTextColor,
      border: "#15803d",
    },
    danger: {
      bg: "#dc2626",
      hover: "#b91c1c",
      text: "#ffffff",
      border: "#b91c1c",
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
        if (!disabled) {
          if (!inlineBg) e.currentTarget.style.backgroundColor = style.hover;
          e.currentTarget.style.filter = "brightness(1.12)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          if (!inlineBg) e.currentTarget.style.backgroundColor = style.bg;
          e.currentTarget.style.filter = "";
        }
      }}
    >
      {children}
    </button>
  );
}
