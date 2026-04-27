import React from "react";
import { cmsStyles } from "./styles";

export default function CMSSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  style = {},
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
      }}
    >
      {label && <label style={cmsStyles.label}>{label}</label>}

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "6px",
          border: "1px solid #D1D5DB",
          backgroundColor: "#FFFFFF",
          fontSize: "14px",
          color: "#111827",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
          boxSizing: "border-box",
          ...style,
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
