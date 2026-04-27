export default function AdminNominations() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "#111827",
        }}
      >
        Nominations
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#6B7280",
        }}
      >
        View and manage race nominations. This page will show upcoming events and their nomination lists.
      </p>
    </div>
  );
}
