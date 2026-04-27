import { Outlet, useOutletContext } from "react-router-dom";
import AdminTopBar from "./components/AdminTopBar";

export default function AdminLayout() {
  // Receive context from ClubLayout
  const ctx = useOutletContext(); // this contains { club }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#F5F5F5",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AdminTopBar />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "720px",
          margin: "0 auto",
          padding: "24px 0 32px",
          boxSizing: "border-box",
        }}
      >
        {/* Forward context to all admin pages */}
        <Outlet context={ctx} />
      </main>
    </div>
  );
}
