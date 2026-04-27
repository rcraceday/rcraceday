// src/app/pages/admin/components/AdminTopBar.jsx
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import rcracedayLogo from "../../../../assets/rcraceday_logo.png";
import { supabase } from "@/supabaseClient";

import {
  CalendarDaysIcon,
  UserPlusIcon,
  IdentificationIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  HomeIcon,
} from "@heroicons/react/24/solid";

const navItems = [
  { to: "", label: "Dashboard", icon: Squares2X2Icon },
  { to: "events", label: "Events", icon: CalendarDaysIcon },
  { to: "nominations", label: "Nominations", icon: UserPlusIcon },
  { to: "membership", label: "Membership", icon: IdentificationIcon },
  { to: "drivers", label: "Drivers", icon: UserGroupIcon },
  { to: "settings", label: "Settings", icon: Cog6ToothIcon },
  { to: "home", label: "Home", icon: HomeIcon },
];

export default function AdminTopBar() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();

  const [isMobile, setIsMobile] = useState(false);
  const [adminLogo, setAdminLogo] = useState(null);
  const [clubColor, setClubColor] = useState("#0A66C2");

  // Load admin logo + club theme colour
  useEffect(() => {
    async function loadClub() {
      const { data } = await supabase
        .from("clubs")
        .select("admin_logo_url, theme")
        .eq("slug", clubSlug)
        .single();

      const logoUrl = data?.admin_logo_url
        ? `${data.admin_logo_url}?v=${Date.now()}`
        : "https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/chargers/DriverPortal_Admin_Logo_512x512.png";

      setAdminLogo(logoUrl);

      setClubColor(
        data?.theme?.hero?.backgroundColor || "#0A66C2"
      );
    }

    loadClub();
  }, [clubSlug]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <header
      style={{
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT: RC RaceDay Logo */}
        <a
          href="https://rcraceday.com"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <img
            src={rcracedayLogo}
            alt="RC RaceDay"
            style={{ height: "32px", width: "auto" }}
          />
        </a>

        {/* CENTER: Nav (desktop) OR Admin Logo (mobile) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {!isMobile ? (
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {navItems.map(({ to, label, icon: Icon }) => {
                const isHome = label === "Home";

                return (
                  <NavLink
                    key={label}
                    to={
                      isHome
                        ? `/${clubSlug}/app`
                        : `/${clubSlug}/app/admin/${to}`
                    }
                    end={isHome || to === ""}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#111827" : "#4B5563",
                      textDecoration: "none",
                      backgroundColor: isActive ? "#FEE2E2" : "transparent",
                      cursor: "pointer",
                    })}
                  >
                    <Icon
                      style={{
                        width: "16px",
                        height: "16px",
                        color: isHome ? clubColor : "#B91C1C",
                      }}
                    />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
            </nav>
          ) : (
            adminLogo && (
              <img
                src={adminLogo}
                alt="Club Admin Logo"
                style={{
                  height: "36px",
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            )
          )}
        </div>

        {/* RIGHT: Admin Logo (desktop) — nothing on mobile */}
        <div style={{ flexShrink: 0 }}>
          {!isMobile ? (
            <button
              type="button"
              onClick={() => navigate(`/${clubSlug}/app`)}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              {adminLogo && (
                <img
                  src={adminLogo}
                  alt="Club Admin Home"
                  style={{
                    height: "36px",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* ADMIN RED UNDERLINE */}
      <div
        style={{
          width: "100%",
          height: "2px",
          backgroundColor: "#B91C1C",
        }}
      />
    </header>
  );
}
