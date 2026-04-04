// src/components/ui/Header.jsx
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import AvatarMenu from "@/components/ui/AvatarMenu";
import HamburgerMenu from "@/components/ui/HamburgerMenu";
import rcracedayLogo from "@/assets/rcraceday_logo.png";

export default function Header({ club, hideMenu }) {
  const { clubSlug } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();

  const isAdmin = profile?.role === "admin";

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  return (
    <header className="w-full bg-white">
      <div className="w-full" style={{ borderBottom: `4px solid ${brand}` }}>
        <div
          className="
            w-full max-w-screen-lg mx-auto px-4 py-3
            flex items-center justify-between
            md:grid md:grid-cols-3 md:items-center md:py-0 md:h-24
          "
        >
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src={rcracedayLogo}
                alt="RCRaceDay"
                className="h-8 md:h-10 w-auto object-contain cursor-pointer transition-transform hover:scale-[1.03] hover:drop-shadow-sm"
              />
            </Link>
          </div>

          <div className="flex items-center justify-center md:justify-center px-1 md:px-0">
            {logoSrc && (
              <Link to={`/${clubSlug}/app`} className="flex items-center">
                <img
                  src={logoSrc}
                  alt={club?.name}
                  className="h-12 md:h-20 w-auto object-contain"
                />
              </Link>
            )}
          </div>

          {!hideMenu && user && (
            <>
              <div className="hidden md:flex items-center justify-end gap-4">
                <AvatarMenu isAdmin={isAdmin} />
                <HamburgerMenu clubSlug={clubSlug} />
              </div>

              <div className="flex md:hidden items-center justify-end pr-4">
                <HamburgerMenu clubSlug={clubSlug} showAvatarInside />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
