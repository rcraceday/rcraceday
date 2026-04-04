// src/components/ui/Card.jsx
export default function Card({
  children,
  className = "",
  style = {},
  noPadding = false,
  ...props
}) {
  // Base style with optional padding removal
  const baseStyle = {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: noPadding ? "0px" : "12px",   // ⭐ FIX: padding can now be removed
    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
    transition: "all 0.25s ease",
    ...style,
  };

  const hoverStyle = {
    boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
  };

  return (
    <div
      {...props}
      className={`transition-all ${className}`}
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
