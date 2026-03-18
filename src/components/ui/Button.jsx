// src/components/ui/Button.jsx
import { useOutletContext } from "react-router-dom";

export default function Button({
  children,
  variant = "primary",
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
  };

  const style = variants[variant];

  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        block
        w-full
        py-3
        rounded-md
        text-[15px]
        font-medium
        text-center
        transition-colors
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = style.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = style.bg;
        }
      }}
    >
      {children}
    </button>
  );
}
