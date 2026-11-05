import { useEffect, useId, useRef } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useTranslation } from "@/app/i18n/I18nContext";
import useTheme from "@/app/providers/useTheme";

export default function FavoriteClubTileMenu({
  club,
  index,
  total,
  isHomeClub,
  busy,
  open,
  onToggleOpen,
  onMakeHomeClub,
  onMoveLeft,
  onMoveRight,
  onRemove,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const menuId = useId();
  const wrapRef = useRef(null);
  const brandColor = palette?.primary || "#00438a";

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onToggleOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") onToggleOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onToggleOpen]);

  const canMoveLeft = index > 0;
  const canMoveRight = index < total - 1;
  const showSetHome = !isHomeClub || index !== 0;

  return (
    <div
      ref={wrapRef}
      className={`menu-wrapper platform-club-tile-menu${open ? " is-open" : ""}`}
      style={{ "--brand-color": brandColor }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="menu-button menu-button--icon-only"
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={t("platformHome.clubMenuLabel", { name: club.name })}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleOpen(!open);
        }}
      >
        <Bars3Icon className="hamburger-icon" aria-hidden />
      </button>

      <div
        id={menuId}
        role="menu"
        className={`desktop-dropdown desktop-dropdown--align-end${open ? " open" : ""}`}
      >
        <nav>
          {showSetHome ? (
            <button
              type="button"
              role="menuitem"
              className="desktop-dropdown-item"
              disabled={busy}
              onClick={() => onMakeHomeClub()}
            >
              {t("platformHome.setHomeClub")}
            </button>
          ) : null}
          {canMoveLeft ? (
            <button
              type="button"
              role="menuitem"
              className="desktop-dropdown-item"
              disabled={busy}
              onClick={() => onMoveLeft()}
            >
              {t("platformHome.moveLeft")}
            </button>
          ) : null}
          {canMoveRight ? (
            <button
              type="button"
              role="menuitem"
              className="desktop-dropdown-item"
              disabled={busy}
              onClick={() => onMoveRight()}
            >
              {t("platformHome.moveRight")}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="desktop-dropdown-item desktop-dropdown-item--danger"
            disabled={busy}
            onClick={() => onRemove()}
          >
            {t("platformHome.removeFromHome")}
          </button>
        </nav>
      </div>
    </div>
  );
}
