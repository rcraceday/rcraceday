import { useState, useEffect, useMemo } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";

import DesktopDropdown from "@/components/ui/DesktopDropdown";
import MobileDrawer from "@/components/ui/MobileDrawer";
import { buildMenuItems } from "@/components/ui/menuItems.js";

export default function HamburgerMenu({
  clubSlug,
  adminItems = null,
  accentColor = "#0A66C2",
  isAdmin = false,   // ⭐ NEW: explicit admin mode
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { user } = useAuth();
  const { profile } = useProfile();
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#00438a";

  const isAdminUser = profile?.role === "admin";
  const { club } = useClub();
  const { membership } = useMembership();
  const messageAudience = isAdmin ? "admin" : "member";
  const { unreadCount: messageUnreadCount } = useClubMessageUnreadCount({
    clubId: club?.id,
    membershipId: membership?.id,
    audience: messageAudience,
  });

  const items = useMemo(() => {
    const base = adminItems ?? buildMenuItems({ clubSlug, isAdmin: isAdminUser, user });
    return base.map((item) =>
      item.messagesMenu ? { ...item, unreadCount: messageUnreadCount } : item
    );
  }, [adminItems, clubSlug, isAdminUser, user, messageUnreadCount]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      className={`menu-wrapper ${isAdmin ? "admin-menu" : ""}`}
      style={{ color: "inherit" }}
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <button
        className="menu-button"
        onClick={() => isMobile && setOpen(true)}
      >
        <Bars3Icon
          className="hamburger-icon"
          style={
            isAdmin
              ? { color: "var(--admin-accent)" }
              : { color: primaryColor }
          }
        />
        <span>Menu</span>
      </button>

      {!isMobile && (
        <DesktopDropdown
          open={open}
          items={items}
          onClose={() => setOpen(false)}
          accentColor={isAdmin ? accentColor : primaryColor}
          isAdmin={isAdmin}
        />
      )}

      {isMobile && (
        <MobileDrawer
          open={open}
          onClose={() => setOpen(false)}
          items={items}
          accentColor={isAdmin ? accentColor : primaryColor}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
