// src/components/ui/MobileDrawer.jsx
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { XMarkIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";

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

  return (
    <div
      className={`mobile-drawer ${open ? "open" : ""} ${
        isAdmin ? "admin-drawer" : ""
      }`}
      style={
        isAdmin
          ? {
              "--admin-accent": accentColor,
              "--brand-color": primaryColor,
            }
          : {
              "--admin-accent": "#c20a0a",
              "--brand-color": primaryColor,
            }
      }
    >
      <button className="close-btn" onClick={onClose}>
        <XMarkIcon
          className="h-6 w-6"
          style={
            isAdmin
              ? { color: "var(--admin-accent)" }
              : { color: primaryColor }
          }
        />
      </button>

      <nav>
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
              } ${
                item.useAdminColor ? "admin-accent-item" : ""
              }`}
              style={
                isAdmin
                  ? { "--admin-accent": accentColor }
                  : {}
              }
            >
              <Icon
                className="menu-icon"
                style={
                  ((isAdmin && !item.usePrimaryColor) || item.useAdminColor)
                    ? { color: "var(--admin-accent)" }
                    : { color: primaryColor }
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
