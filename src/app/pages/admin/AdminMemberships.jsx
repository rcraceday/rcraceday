export default function AdminMembership() {
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
        Membership
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "#6B7280",
        }}
      >
        Manage club memberships, plans, and statuses. This page will surface active, expired, and pending memberships.
      </p>
    </div>
  );
}
