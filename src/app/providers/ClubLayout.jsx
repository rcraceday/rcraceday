// src/app/providers/ClubLayout.jsx
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import ThemeProvider from "@/app/providers/ThemeProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import Footer from "@/components/ui/Footer";

export default function ClubLayout({ children, mode = "drivers" }) {
  const { clubSlug } = useParams();
  const location = useLocation();

  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();
  const { user, loadingUser } = useAuth();

  const isPublicRoute = location.pathname.includes("/public/");

  // If slug missing, show loading (rare but safe)
  if (!clubSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading…</div>
      </div>
    );
  }

  //
  // PUBLIC ROUTES
  //
  if (isPublicRoute) {
    if (loadingClub || !club) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div>Loading…</div>
        </div>
      );
    }

    return (
      <ThemeProvider mode={mode} clubTheme={club.theme}>
        <div className="w-full flex justify-center overflow-x-visible">
          <div className="w-full max-w-5xl px-4">
            {children}
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

  if (loadingUser || loadingClub || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading…</div>
      </div>
    );
  }

  if (!club) {
    return <Navigate to="/" replace />;
  }

  return (
    <ThemeProvider mode={mode} clubTheme={club.theme}>
      <div className="w-full flex justify-center overflow-x-visible">
        <div className="w-full max-w-5xl px-4">
          {children}
        </div>
      </div>
      <Footer />
    </ThemeProvider>
  );
}
