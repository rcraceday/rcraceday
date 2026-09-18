// src/components/ui/MobileDrawer.jsx
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function MobileDrawer({
  open,
  onClose,
  items,
  accentColor = "#0A66C2",
  isAdmin = false,   // ⭐ NEW: explicit admin mode
}) {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div
      className={`mobile-drawer ${open ? "open" : ""} ${
        isAdmin ? "admin-drawer" : ""
      }`}
      style={isAdmin ? { "--admin-accent": accentColor } : {}}
    >
      <button className="close-btn" onClick={onClose}>
        <XMarkIcon
          className="h-6 w-6"
          style={isAdmin ? { color: "var(--admin-accent)" } : {}}
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
              className={isAdmin ? "admin-drawer-item" : ""}
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
