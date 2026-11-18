// src/components/ui/MobileDrawer.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { XMarkIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import MenuUnreadBadge from "@/components/ui/MenuUnreadBadge";

export default function MobileDrawer({
  open,
  onClose,
  items,
  accentColor = "#0A66C2",
  isAdmin = false,   // ⭐ NEW: explicit admin mode
}) {
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#00438a";

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const drawerStyle = isAdmin
    ? {
        "--admin-accent": accentColor,
        "--brand-color": primaryColor,
      }
    : {
        "--admin-accent": "#c20a0a",
        "--brand-color": primaryColor,
      };

  return createPortal(
    <>
      {open ? <button type="button" className="drawer-overlay" aria-label="Close menu" onClick={onClose} /> : null}
      <div
        className={`mobile-drawer ${open ? "open" : ""} ${isAdmin ? "admin-drawer" : ""}`}
        style={drawerStyle}
        aria-hidden={!open}
      >
        <button type="button" className="close-btn" onClick={onClose}>
          <XMarkIcon
            className="h-6 w-6"
            style={
              isAdmin ? { color: "var(--admin-accent)" } : { color: primaryColor }
            }
          />
        </button>

        <nav className="mobile-drawer-nav">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => {
                  if (item.logout) handleLogout();
                  onClose();
                }}
                className={`${isAdmin ? "admin-drawer-item" : ""} ${
                  item.usePrimaryColor ? "admin-primary-item" : ""
                } ${item.useAdminColor ? "admin-accent-item" : ""}`}
                style={isAdmin ? { "--admin-accent": accentColor } : {}}
              >
                <Icon
                  className="menu-icon"
                  style={
                    item.neutralIcon
                      ? { color: "#000000" }
                      : (isAdmin && !item.usePrimaryColor) || item.useAdminColor
                        ? { color: "var(--admin-accent)" }
                        : { color: primaryColor }
                  }
                />
                <span className="flex-1">{item.label}</span>
                <MenuUnreadBadge
                  count={item.unreadCount}
                  accentColor={
                    isAdmin && !item.usePrimaryColor ? accentColor : primaryColor
                  }
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </>,
    document.body
  );
}
