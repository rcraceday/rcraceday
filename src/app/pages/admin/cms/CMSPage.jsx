export default function CMSPage({ title, children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",        // ⭐ unified global width
        margin: "0 auto",
        padding: "20px",           // ⭐ matches AdminSettingsLayout + AdminEvents
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {title && (
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            margin: 0,
            padding: 0,
            color: "#111827",
          }}
        >
          {title}
        </h1>
      )}

      {children}
    </div>
  );
}
