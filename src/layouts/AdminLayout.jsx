import { Outlet } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import AdminTopBar from "@app/pages/admin/components/AdminTopBar";
import Footer from "@/components/ui/Footer";
import "@app/pages/admin/cms/admin.css";

export default function AdminLayout() {
  const { club } = useClub();

  return (
    <div
      className="admin-root app-layout"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        color: "#111827",
      }}
    >
      <AdminTopBar />

      <main
        style={{
          width: "100%",
          backgroundColor: "#F5F5F5",
          minWidth: 0,
          boxSizing: "border-box",
          flex: "0 0 auto",
        }}
      >
        <div className="app-column">
          <Outlet context={{ club }} />
        </div>
      </main>

      <Footer club={club} />
    </div>
  );
}
