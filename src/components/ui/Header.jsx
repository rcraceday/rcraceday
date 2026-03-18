// src/components/ui/Header.jsx
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import AvatarMenu from "@/components/ui/AvatarMenu";
import HamburgerMenu from "@/components/ui/HamburgerMenu";
import rcracedayLogo from "@/assets/rcraceday_logo.png";

export default function Header({ club, hideMenu }) {
  const { clubSlug } = useParams();
  const { user } = useAuth();

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
        {/* MOBILE = flex row, DESKTOP = grid */}
        <div className="
          w-full max-w-screen-lg mx-auto px-4 py-3
          flex items-center justify-between
          md:grid md:grid-cols-3 md:items-center md:py-0 md:h-24
        ">

          {/* LEFT */}
          <div className="flex items-center">
            <img
              src={rcracedayLogo}
              alt="RCRaceDay"
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>

          {/* CENTER */}
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

          {/* RIGHT */}
          {!hideMenu && user && (
            <>
              {/* Desktop */}
              <div className="hidden md:flex items-center justify-end gap-4">
                <AvatarMenu />
                <HamburgerMenu clubSlug={clubSlug} />
              </div>

              {/* Mobile */}
              <div className="flex md:hidden items-center justify-end pr-2">
                <HamburgerMenu clubSlug={clubSlug} showAvatarInside />
              </div>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
