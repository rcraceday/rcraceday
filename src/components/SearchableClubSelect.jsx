import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import useTheme from "@/app/providers/useTheme";
import {
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
} from "@/components/ui/dropdownFieldStyles";
import { useTranslation } from "@/app/i18n/I18nContext";
import { formatDistanceKm } from "@/app/lib/clubDirectoryGeo";

export default function SearchableClubSelect({
  clubs,
  selectedClubId,
  onSelectClub,
  onSelectClubRecord,
  contained = false,
  showDistance = false,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { palette } = useTheme();
  const primary = palette?.primary || "#00438a";

  const filteredClubs = useMemo(
    () =>
      clubs.filter((club) =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, clubs]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (club) => {
    onSelectClub(club.id);
    onSelectClubRecord?.(club);
    setSearchTerm(club.name);
    setIsOpen(false);
  };

  const selectedClubName = clubs.find((club) => club.id === selectedClubId)?.name || "";

  useEffect(() => {
    if (isOpen) return;
    const name = selectedClubId
      ? clubs.find((club) => club.id === selectedClubId)?.name || ""
      : "";
    setSearchTerm(name);
  }, [selectedClubId, clubs, isOpen]);

  const wrapperStyle = contained
    ? { "--dropdown-primary": primary, width: "100%", maxWidth: "100%", minWidth: 0 }
    : { "--dropdown-primary": primary };

  const menuStyle = contained
    ? getDropdownMenuStyle(palette, {
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
      })
    : getDropdownMenuStyle(palette);

  const menuClass = contained
    ? "filter-dropdown-menu max-h-[min(20rem,70vh)] w-full overflow-y-auto overflow-x-hidden overscroll-contain text-base sm:text-sm list-none m-0 p-0"
    : "filter-dropdown-menu filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] w-full overflow-y-auto overscroll-contain text-base sm:text-sm list-none m-0 p-0";

  return (
    <div
      className={`relative filter-dropdown min-w-0 max-w-full${isOpen ? " is-open" : ""}`}
      ref={dropdownRef}
      style={wrapperStyle}
    >
      <button
        type="button"
        className="filter-dropdown-trigger relative w-full max-w-full cursor-default text-left sm:text-sm"
        style={getDropdownTriggerStyle(palette, {
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: "0.5rem 2.5rem 0.5rem 0.75rem",
        })}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center w-full min-w-0">
          <input
            type="text"
            className="w-full min-w-0 border-none focus:ring-0 p-0 text-sm bg-transparent outline-none"
            style={{ color: palette?.text || "#0a1a2f" }}
            value={searchTerm}
            onChange={(e) => {
              const next = e.target.value;
              setSearchTerm(next);
              setIsOpen(true);
              if (!next.trim()) {
                onSelectClub("");
                onSelectClubRecord?.(null);
              }
            }}
            onFocus={() => {
              setIsOpen(true);
              if (!searchTerm && selectedClubName) {
                setSearchTerm(selectedClubName);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder={t("clubSelect.searchPlaceholder")}
          />
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5" style={{ color: primary }} aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <ul
          className={menuClass}
          style={menuStyle}
          tabIndex="-1"
          role="listbox"
          aria-labelledby="listbox-label"
        >
          {filteredClubs.length === 0 && (
            <li className="filter-dropdown-option" style={getDropdownOptionStyle(palette)}>
              {t("clubSelect.noClubsFound")}
            </li>
          )}
          {filteredClubs.map((club) => (
            <li
              key={club.id}
              className="filter-dropdown-option"
              style={getDropdownOptionStyle(palette, { overflow: "hidden", textOverflow: "ellipsis" })}
              onClick={() => handleSelect(club)}
              role="option"
              aria-selected={club.id === selectedClubId}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span>{club.name}</span>
                {showDistance && club.directoryDistanceKm != null ? (
                  <span style={{ fontSize: 11, opacity: 0.75 }}>
                    {formatDistanceKm(club.directoryDistanceKm)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
