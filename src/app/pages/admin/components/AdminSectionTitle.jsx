export default function AdminSectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: "13px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: "#6B7280",
        marginBottom: "10px",
      }}
    >
      {children}
    </h2>
  );
}
