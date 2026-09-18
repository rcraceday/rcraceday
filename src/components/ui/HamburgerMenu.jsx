import { useState, useEffect } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";

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

  const isAdminUser = profile?.role === "admin";

  // If adminItems are provided (admin header) use them,
  // otherwise fall back to the normal user menu.
  const items =
    adminItems ?? buildMenuItems({ clubSlug, isAdmin: isAdminUser, user });

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
          style={isAdmin ? { color: "var(--admin-accent)" } : {}}
        />
        <span>Menu</span>
      </button>

      {!isMobile && (
        <DesktopDropdown
          open={open}
          items={items}
          onClose={() => setOpen(false)}
          accentColor={accentColor}
          isAdmin={isAdmin}
        />
      )}

      {isMobile && (
        <MobileDrawer
          open={open}
          onClose={() => setOpen(false)}
          items={items}
          accentColor={accentColor}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
