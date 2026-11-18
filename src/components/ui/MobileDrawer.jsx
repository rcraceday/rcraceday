// src/components/ui/MobileDrawer.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { XMarkIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import MenuUnreadBadge from "@/components/ui/MenuUnreadBadge";

const BODY_LOCK_CLASS = "body-drawer-open";

function lockPageScroll() {
  const scrollY = window.scrollY;
  const { body, documentElement: html } = document;

  body.classList.add(BODY_LOCK_CLASS);
  html.classList.add(BODY_LOCK_CLASS);

  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";
  html.style.overflow = "hidden";

  const blockBackgroundTouch = (event) => {
    if (event.target.closest(".mobile-drawer-nav")) return;
    event.preventDefault();
  };

  document.addEventListener("touchmove", blockBackgroundTouch, { passive: false });

  return {
    scrollY,
    blockBackgroundTouch,
  };
}

function unlockPageScroll(lock) {
  if (!lock) return;
  const { body, documentElement: html } = document;

  document.removeEventListener("touchmove", lock.blockBackgroundTouch);

  body.classList.remove(BODY_LOCK_CLASS);
  html.classList.remove(BODY_LOCK_CLASS);
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.overflow = "";
  html.style.overflow = "";

  window.scrollTo(0, lock.scrollY);
}

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
    const lock = lockPageScroll();
    return () => unlockPageScroll(lock);
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
