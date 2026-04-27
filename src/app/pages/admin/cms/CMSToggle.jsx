import React from "react";

export default function CMSToggle({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        cursor: "pointer",
        userSelect: "none",
        fontSize: "14px",
        fontWeight: 500,
        color: "#374151",
      }}
    >
      <span>{label}</span>

      <div
        onClick={() => onChange(!checked)}
        style={{
          width: "42px",
          height: "22px",
          borderRadius: "999px",
          backgroundColor: checked ? "#16A34A" : "#D1D5DB",
          position: "relative",
          transition: "background-color 0.2s ease",
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            backgroundColor: "white",
            position: "absolute",
            top: "2px",
            left: checked ? "22px" : "2px",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </label>
  );
}
