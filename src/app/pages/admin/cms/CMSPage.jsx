export default function CMSPage({ title, children }) {
  return (
    <div>
      {title && (
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            marginBottom: "12px",
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
