// src/layouts/ClubLayout.jsx
import { Navigate, useParams, useLocation, Outlet } from "react-router-dom";
import ThemeProvider from "@/app/providers/ThemeProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import Footer from "@/components/ui/Footer";

export default function ClubLayout({ children, mode = "drivers" }) {
  const { clubSlug } = useParams();
  const location = useLocation();
  const { user, loadingUser } = useAuth();
  const { club, loadingClub } = useClub();

  const isPublicRoute = location.pathname.includes("/public/");

  //
  // ROOT (no slug)
  //
  if (!clubSlug) {
    return (
      <ThemeProvider mode={mode}>
        <div className="w-full flex justify-center overflow-x-visible">
          <div className="w-full max-w-5xl px-4">{children}</div>
        </div>
        <Footer />
      </ThemeProvider>
    );
  }

  //
  // PUBLIC ROUTES
  //
  if (isPublicRoute) {
    if (loadingClub) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div>Loading…</div>
        </div>
      );
    }

    return (
      <ThemeProvider mode={mode} clubTheme={club?.theme}>
        <div className="w-full flex justify-center overflow-x-visible">
          <div className="w-full max-w-5xl px-4">
            <Outlet context={{ club }} />
          </div>
        </div>
        <Footer />
      </ThemeProvider>
    );
  }

  //
  // PRIVATE ROUTES
  //
  if (!loadingUser && !user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (loadingUser || loadingClub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading…</div>
      </div>
    );
  }

  //
  // PRIVATE ROUTES — THEME COMES FROM ClubProvider
  //
  return (
    <ThemeProvider mode={mode} clubTheme={club?.theme}>
      <div className="w-full flex justify-center overflow-x-visible">
        <div className="w-full max-w-5xl px-4">
          <Outlet context={{ club }} />
        </div>
      </div>
      <Footer />
    </ThemeProvider>
  );
}
