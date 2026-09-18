// src/layouts/AppLayout.jsx

import { Outlet, Navigate, useParams, useLocation } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useTheme } from "@/app/providers/ThemeProvider";

import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function AppLayout() {
  const { club } = useClub();
  const { user, loadingUser } = useAuth();
  const { loadingProfile } = useProfile();
  const { loadingMembership } = useMembership();
  const { clubSlug } = useParams();
  const { palette } = useTheme() || {};
  const location = useLocation();

  // ⭐ Detect admin routes
  const isAdminRoute = location.pathname.includes(`/${clubSlug}/admin`);

  const loading =
    loadingUser ||
    loadingProfile ||
    loadingMembership ||
    !club;

  if (!loadingUser && club && !user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: palette?.background || "#ffffff",
          color: palette?.text || "#111827",
        }}
      >
        <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>
      </div>
    );
  }

  // ⭐ WRAP ADMIN PAGES IN admin-root
  const Wrapper = isAdminRoute ? "div" : "div";
  const wrapperProps = isAdminRoute
    ? { className: "admin-root" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: palette?.background || "#ffffff",
        color: palette?.text || "#111827",
      }}
    >
      <Header club={club} />

      <main
        style={{
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="app-column">
          <Outlet context={{ club }} />
        </div>
      </main>

      <Footer club={club} />
    </Wrapper>
  );
}
