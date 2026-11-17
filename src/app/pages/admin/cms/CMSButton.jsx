import React, { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSButton({
  children,
  className = "",
  style = {},
  ...props
}) {
  const { t } = useTranslation();
  const [state, setState] = useState("base");

  const baseStyle = {
    background: "linear-gradient(180deg, #f6f6f6 0%, #ececec 100%)",
    border: "1px solid #aeb1b4",
    color: "#374151",
    fontSize: "12px",
    fontWeight: 600,
    height: 28,
    minHeight: 28,
    maxHeight: 28,
    padding: "0 10px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "8px",
    boxSizing: "border-box",
    cursor: "pointer",
    transition:
      "background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, border-color 0.15s ease",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 2px rgba(0,0,0,0.06)",
  };

  const hoverStyle = {
    background: "linear-gradient(180deg, #ffffff 0%, #f8f3f3 100%)",
    border: "1px solid #991B1B",
  };

  const activeStyle = {
    background: "linear-gradient(180deg, #ececec 0%, #e5e7eb 100%)",
    transform: "scale(0.98)",
  };

  const mergedStyle =
    state === "active"
      ? { ...baseStyle, ...style, ...activeStyle }
      : state === "hover"
      ? { ...baseStyle, ...style, ...hoverStyle }
      : { ...baseStyle, ...style };

  return (
    <button
      type="button"   // ⭐ FIX: prevents accidental navigation
      {...props}
      className={`admin-cms-btn ${className}`.trim()}
      style={mergedStyle}
      onMouseEnter={() => setState("hover")}
      onMouseLeave={() => setState("base")}
      onMouseDown={() => setState("active")}
      onMouseUp={() => setState("hover")}
    >
      {children}
    </button>
  );
}
