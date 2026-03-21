// src/app/providers/ClubLayout.jsx
import { Navigate, useMatch, useParams, useLocation } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import ThemeProvider from "@/app/providers/ThemeProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ClubLayout({ children, mode = "drivers" }) {
  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();
  const { user, loadingUser } = useAuth();
  const location = useLocation();

  const params = useParams();
  const topMatch = useMatch("/:clubSlug/*");
  const clubSlug = topMatch?.params?.clubSlug || null;

  const isPublicRoute = location.pathname.includes("/public/");

  console.log("ClubLayout params", {
    params,
    topMatch: topMatch?.params,
    loadingClub,
    loadingProfile,
    loadingUser,
    clubSlug,
    isPublicRoute,
  });

  // ⭐ NEW: Confirm support email is flowing through
  console.log("Club support email:", club?.system_support_email);

  // Router hasn't stabilized yet
  if (!clubSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading…</div>
      </div>
    );
  }

  // 🚨 PUBLIC ROUTES: only require club to load
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
        {children}
      </ThemeProvider>
    );
  }

  // 🚨 PRIVATE ROUTES: require user + profile + club
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
      {children}
    </ThemeProvider>
  );
}
