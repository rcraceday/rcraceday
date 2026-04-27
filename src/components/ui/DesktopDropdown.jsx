// src/components/ui/DesktopDropdown.jsx
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";

export default function DesktopDropdown({ open, items, onClose, accentColor }) {
  async function handleLogout() {
    await supabase.auth.signOut();
    if (onClose) onClose();
  }

  return (
    <div
      className={`desktop-dropdown ${open ? "open" : ""}`}
      style={{ "--brand-color": accentColor }}   // ⭐ FIXED: AdminRed now works
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
            >
              <Icon className="menu-icon" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
