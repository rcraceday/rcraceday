import React from "react";
import useTheme from "@/app/providers/useTheme";
import { getNativeSelectStyle } from "@/components/ui/dropdownFieldStyles";

export default function Select({
  label,
  value,
  onChange,
  children,
  style = {},
}) {
  const { palette } = useTheme();

  return (
    <label style={{ display: "block", width: "100%" }}>
      {label && (
        <div
          style={{
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: 500,
            color: palette?.text || "#333",
          }}
        >
          {label}
        </div>
      )}

      <select
        value={value}
        onChange={onChange}
        style={{
          ...getNativeSelectStyle(palette, {
            width: "100%",
            padding: "8px 10px",
            fontSize: "14px",
            appearance: "auto",
          }),
          ...style,
        }}
      >
        {children}
      </select>
    </label>
  );
}
