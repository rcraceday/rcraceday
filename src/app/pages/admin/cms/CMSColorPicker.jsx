export default function CMSColorPicker({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "14px", fontWeight: 500 }}>{label}</label>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* COLOR PICKER */}
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "40px",
            height: "40px",
            padding: 0,
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        />

        {/* HEX FIELD */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1,
            height: "40px",
            padding: "8px 10px",
            border: "1px solid #D1D5DB",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>
    </div>
  );
}
