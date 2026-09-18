// src/components/ui/DesktopDropdown.jsx
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";

export default function DesktopDropdown({
  open,
  items,
  onClose,
  accentColor = "#0A66C2",
  isAdmin = false,   // ⭐ NEW: explicit admin mode
}) {
  async function handleLogout() {
    await supabase.auth.signOut();
    if (onClose) onClose();
  }

  return (
    <div
      className={`desktop-dropdown ${open ? "open" : ""} ${
        isAdmin ? "admin-dropdown" : ""
      }`}
      style={isAdmin ? { "--admin-accent": accentColor } : {}}
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
              className={isAdmin ? "admin-dropdown-item" : ""}
              style={isAdmin ? { "--admin-accent": accentColor } : {}}
            >
              <Icon
                className="menu-icon"
                style={isAdmin ? { color: "var(--admin-accent)" } : {}}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
