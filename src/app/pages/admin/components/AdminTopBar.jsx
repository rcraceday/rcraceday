import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import rcracedayLogo from "@/assets/rcraceday_logo.png";
import { supabase } from "@/supabaseClient";

import HamburgerMenu from "@/components/ui/HamburgerMenu";
import ClubMessagesNavLink from "@/components/ui/ClubMessagesNavLink";
import { buildAdminMenuItems } from "./adminMenuItems";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function AdminTopBar() {
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  const [adminLogo, setAdminLogo] = useState(null);

  // Default admin accent (red) — NOT the user blue
  const [accentColor, setAccentColor] = useState("#c20a0a");

  useEffect(() => {
    async function loadClub() {
      const { data } = await supabase
        .from("clubs")
        .select("admin_logo_url")
        .eq("slug", clubSlug)
        .maybeSingle();

      const adminLogoUrl = data?.admin_logo_url
        ? `${data.admin_logo_url}?v=${Date.now()}`
        : null;

      setAdminLogo(adminLogoUrl);

    }

    loadClub();
  }, [clubSlug]);

  const adminItems = buildAdminMenuItems({ clubSlug, t });

  return (
    <header
      className="admin-header w-full bg-white"
      style={{ "--admin-accent": accentColor }}
    >
      {/* Admin border is isolated from user CSS */}
      <div
        className="admin-header-border w-full"
        style={{
          borderBottom: "4px solid var(--admin-accent)",
        }}
      >
        <div
          className="
            app-column py-3
            grid grid-cols-3 items-center
            md:py-0 md:h-24
          "
        >
          {/* LEFT: RC RaceDay logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src={rcracedayLogo}
                alt="RCRaceDay"
                className="
                  h-8 md:h-10 w-auto object-contain
                  cursor-pointer transition-transform
                  hover:scale-[1.03] hover:drop-shadow-sm
                "
              />
            </Link>
          </div>

          {/* CENTER: Admin logo */}
          <div className="flex items-center justify-center md:justify-center px-1 md:px-0">
            {adminLogo && (
              <Link to={`/${clubSlug}/app/admin`} className="flex items-center">
                <img
                  src={adminLogo}
                  alt="Admin Portal"
                  className="h-11 md:h-18 w-auto object-contain"
                />
              </Link>
            )}
          </div>

          {/* RIGHT: Admin menu */}
          <div className="hidden md:flex items-center justify-end gap-2 shrink-0 justify-self-end">
            <ClubMessagesNavLink variant="admin" />
            <HamburgerMenu
              clubSlug={clubSlug}
              adminItems={adminItems}
              accentColor={accentColor}
              isAdmin
            />
          </div>

          <div className="flex md:hidden items-center justify-end gap-2 shrink-0 justify-self-end">
            <ClubMessagesNavLink variant="admin" />
            <HamburgerMenu
              clubSlug={clubSlug}
              adminItems={adminItems}
              accentColor={accentColor}
              showAvatarInside
              isAdmin
            />
          </div>
        </div>
      </div>
    </header>
  );
}
