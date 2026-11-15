import React from "react";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSToggle({
  label,
  labelKey,
  checked,
  onChange,
  compact = false,
  disabled = false,
}) {
  const { t } = useTranslation();
  const resolvedLabel = labelKey ? t(labelKey) : label;
  const showLabel = !compact && resolvedLabel;
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: showLabel ? "space-between" : "center",
        gap: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        userSelect: "none",
        fontSize: "14px",
        fontWeight: 500,
        color: "#374151",
        width: compact ? "auto" : undefined,
      }}
    >
      {showLabel ? <span>{resolvedLabel}</span> : null}

      {/* IMPORTANT FIX:
         Use a button instead of a div so React does NOT swallow the click.
         This guarantees onChange fires every time.
      */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onChange(!checked);
        }}
        style={{
          width: "42px",
          height: "22px",
          borderRadius: "999px",
          backgroundColor: checked ? "#16A34A" : "#D1D5DB",
          position: "relative",
          transition: "background-color 0.2s ease",
          border: "none",
          padding: 0,
          cursor: disabled ? "not-allowed" : "pointer",
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
      </button>
    </label>
  );
}
