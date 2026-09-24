import CMSButton from "@cms/CMSButton";

export default function EventPreviewModal({ clubSlug, eventId, onClose }) {
  const previewUrl = `/${clubSlug}/app/events/${eventId}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1100px",
          height: "90vh",
          background: "#FFF",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Event Preview</h2>
          <CMSButton variant="secondary" onClick={onClose}>
            Close
          </CMSButton>
        </div>

        <iframe
          src={previewUrl}
          title="Event Preview"
          style={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fff",
          }}
        />
      </div>
    </div>
  );
}
