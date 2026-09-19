// src/components/ui/Card.jsx
import { useTheme } from "@/app/providers/ThemeProvider";
import { useEffect } from "react";

export default function Card({
  children,
  className = "",
  style = {},
  noPadding = false,

  ...props
}) {
  const { palette } = useTheme();
  const { cardColor, borderColor } = palette;

  const baseStyle = {
    background: cardColor || "#FFFFFF", // Use cardColor as the background color
  borderRadius: "16px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
  transition: "all 0.25s ease",
  ...style,
    border: `2px solid ${borderColor || "#ccc"}`, // Use borderColor for the border
};

  const hoverStyle = {
  boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
};

useEffect(() => {
  if (!palette) return;
  console.log("Palette from Card.jsx:", palette);
}, [palette]);

return (
  <div
    {...props}
    className={`transition-all ${className} text-text-muted`}
    style={baseStyle}
    onMouseEnter={(e) => {
      Object.assign(e.currentTarget.style, hoverStyle);
    }}
    onMouseLeave={(e) => {
      Object.assign(e.currentTarget.style, baseStyle);
    }}
  >
    {children}
  </div>
);
}