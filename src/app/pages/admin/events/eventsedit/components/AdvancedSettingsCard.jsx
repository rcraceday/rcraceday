import CMSToggle from "@cms/CMSToggle";

export default function AdvancedSettingsCard({ event, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* PREFERENCE NOMINATIONS ENABLED */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <CMSToggle
            label="Preference Nominations Enabled"
            checked={event.preference_enabled}
            onChange={(v) => onChange("preference_enabled", v)}
          />
        </div>
      </div>
    </div>
  );
}
