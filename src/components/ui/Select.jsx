import React from "react";

export default function Select({
  label,
  value,
  onChange,
  children,
  style = {},
}) {
  return (
    <label style={{ display: "block", width: "100%" }}>
      {label && (
        <div
          style={{
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#333",
          }}
        >
          {label}
        </div>
      )}

      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "8px 10px",
          fontSize: "14px",
          borderRadius: "6px",
          border: "2px solid #ccc",
          background: "white",
          color: "#333",
          appearance: "auto",
          ...style,
        }}
      >
        {children}
      </select>
    </label>
  );
}
