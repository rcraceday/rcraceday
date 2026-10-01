export default function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  last = false,
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid #E5E7EB",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: "20px" }}>
          {label}
        </div>
        {description ? (
          <div style={{ marginTop: "4px", fontSize: "13px", color: "#6B7280", lineHeight: "18px" }}>
            {description}
          </div>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
      />
    </label>
  );
}
