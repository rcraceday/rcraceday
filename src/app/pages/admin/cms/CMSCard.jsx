import { cmsStyles } from "./styles";

export default function CMSCard({ title, actions, children }) {
  return (
    <div
      style={{
        width: "100%",                 // ⭐ full width
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "6px",
        padding: "20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
            {title}
          </div>

          {actions && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {actions}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
      </div>
    </div>
  );
}
