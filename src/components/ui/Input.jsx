// src/components/ui/Input.jsx
import React from "react";
import { useOutletContext } from "react-router-dom";

export default function Input({
  label,
  type = "text",
  textarea = false,
  value,
  onChange,
  required = false,
  className = "",
  style = {},
  ...props
}) {
  const outlet = useOutletContext() || {};
  const club = outlet.club;
  const theme = club?.theme;

  const brand = theme?.hero?.backgroundColor || "#0A66C2";

  // ⭐ FIX: remove width control — let parent decide
  const baseInputStyle = {
    padding: "10px 14px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #D0D5DD",
    background: "#FFFFFF",
    color: "#1A1A1A",
    transition: "all 0.2s ease",
    outline: "none",
    boxSizing: "border-box",   // ⭐ ensures consistent sizing
    ...style,
  };

  const handleFocus = (e) => {
    e.target.style.border = `1px solid ${brand}`;
    e.target.style.boxShadow = `0 0 0 3px ${brand}33`;
  };

  const handleBlur = (e) => {
    e.target.style.border = "1px solid #D0D5DD";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",          // ⭐ parent controls width
      }}
    >
      {label && (
        <label
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#333333",
          }}
        >
          {label}
        </label>
      )}

      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          required={required}
          style={{ ...baseInputStyle, minHeight: "90px", resize: "vertical" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={className}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          style={baseInputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={className}
          {...props}
        />
      )}
    </div>
  );
}
