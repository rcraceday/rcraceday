export default function AdminDrivers() {
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
        Drivers
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#6B7280",
        }}
      >
        View and manage drivers associated with this club. This page will list drivers and their linked memberships.
      </p>
    </div>
  );
}
