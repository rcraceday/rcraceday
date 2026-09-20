// src/components/ui/DesktopDropdown.jsx
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import useTheme from "@/app/providers/useTheme";

export default function DesktopDropdown({
  open,
  items,
  onClose,
  accentColor = "#0A66C2",
  isAdmin = false,   // ⭐ NEW: explicit admin mode
}) {
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#00438a";

  async function handleLogout() {
    await supabase.auth.signOut();
    if (onClose) onClose();
  }

  return (
    <div
      className={`desktop-dropdown ${open ? "open" : ""} ${
        isAdmin ? "admin-dropdown" : ""
      }`}
      style={
        isAdmin
          ? { "--admin-accent": accentColor, "--brand-color": primaryColor }
          : { "--admin-accent": "#c20a0a", "--brand-color": primaryColor }
      }
    >
      <nav>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={(e) => {
                if (item.logout) {
                  e.preventDefault();
                  handleLogout();
                }
                if (onClose) onClose();
              }}
              className={`${isAdmin ? "admin-dropdown-item" : ""} ${
                item.usePrimaryColor ? "admin-primary-item" : ""
              } ${item.useAdminColor ? "admin-accent-item" : ""}`}
              style={
                isAdmin
                  ? item.usePrimaryColor
                    ? { "--admin-accent": accentColor, "--brand-color": primaryColor }
                    : { "--admin-accent": accentColor }
                  : {}
              }
            >
              <Icon
                className="menu-icon"
                style={
                  (isAdmin && !item.usePrimaryColor) || item.useAdminColor
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
