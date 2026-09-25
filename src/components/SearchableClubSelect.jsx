import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import useTheme from "@/app/providers/useTheme";
import {
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
} from "@/components/ui/dropdownFieldStyles";

export default function SearchableClubSelect({ clubs, selectedClubId, onSelectClub }) {
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
    setSearchTerm(club.name);
    setIsOpen(false);
  };

  const selectedClubName = clubs.find((club) => club.id === selectedClubId)?.name || "";

  return (
    <div
      className={`relative filter-dropdown${isOpen ? " is-open" : ""}`}
      ref={dropdownRef}
      style={{ "--dropdown-primary": primary }}
    >
      <button
        type="button"
        className="filter-dropdown-trigger relative w-full cursor-default text-left sm:text-sm"
        style={getDropdownTriggerStyle(palette, {
          minWidth: "unset",
          width: "100%",
          padding: "0.5rem 2.5rem 0.5rem 0.75rem",
        })}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center w-full">
          <input
            type="text"
            className="w-full border-none focus:ring-0 p-0 text-sm bg-transparent outline-none"
            style={{ color: palette?.text || "#0a1a2f" }}
            value={searchTerm || selectedClubName}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search for a club"
          />
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5" style={{ color: primary }} aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <ul
          className="filter-dropdown-menu filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] w-full overflow-y-auto overscroll-contain text-base sm:text-sm list-none m-0 p-0"
          style={getDropdownMenuStyle(palette)}
          tabIndex="-1"
          role="listbox"
          aria-labelledby="listbox-label"
        >
          {filteredClubs.length === 0 && (
            <li
              className="relative cursor-default select-none py-2 pl-3 pr-9"
              style={getDropdownOptionStyle(palette)}
            >
              No clubs found.
            </li>
          )}
          {filteredClubs.map((club) => (
            <li
              key={club.id}
              className="filter-dropdown-option relative cursor-default select-none py-2 pl-3 pr-9"
              style={getDropdownOptionStyle(palette)}
              onClick={() => handleSelect(club)}
              role="option"
              aria-selected={club.id === selectedClubId}
            >
              {club.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
