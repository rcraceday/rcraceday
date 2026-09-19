// src/components/ui/Card.jsx
export default function Card({
  children,
  className = "",
  style = {},
  noPadding = false,
  brand = "#0A66C2", // Default fallback if brand is not provided
  ...props
}) {

  const baseStyle = {
  background: "#FFFFFF",
  borderRadius: "16px",
  padding: noPadding ? "0px" : "12px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
  transition: "all 0.25s ease",
  ...style,
  border: `2px solid ${brand}`, // <-- Now uses the brand prop
};

const hoverStyle = {
  boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
};

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

