import CMSInput from "@cms/CMSInput";

export default function EventPricingCard({ event, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* PRICING ROW */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Member Price"
            type="number"
            value={event.member_price ?? ""}
            onChange={(v) => onChange("member_price", v)}
          />
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Non‑Member Price"
            type="number"
            value={event.non_member_price ?? ""}
            onChange={(v) => onChange("non_member_price", v)}
          />
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <CMSInput
            label="Junior Price"
            type="number"
            value={event.junior_price ?? ""}
            onChange={(v) => onChange("junior_price", v)}
          />
        </div>
      </div>
    </div>
  );
}
