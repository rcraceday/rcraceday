// src/layouts/ClubLayout.jsx
import { Navigate, useParams, useLocation } from "react-router-dom";
import ThemeProvider from "@/app/providers/ThemeProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import Footer from "@/components/ui/Footer";

export default function ClubLayout({ children, mode = "drivers" }) {
  const { clubSlug } = useParams();
  const location = useLocation();
  const { user, loadingUser } = useAuth();

  const isPublicRoute = location.pathname.includes("/public/");

  //
  // PUBLIC ROOT (no slug)
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
  // PRIVATE ROUTES
  //
  if (!loadingUser && !user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  if (loadingUser) {
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
    <ThemeProvider mode={mode}>
      <div className="w-full flex justify-center overflow-x-visible">
        <div className="w-full max-w-5xl px-4">{children}</div>
      </div>
      <Footer />
    </ThemeProvider>
  );
}
