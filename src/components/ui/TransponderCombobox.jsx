import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import {
  COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
  getCmsSelectMenuStyle,
  getCmsSelectTriggerStyle,
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
} from "@/components/ui/dropdownFieldStyles";

const TRANSPONDER_MAX_LENGTH = 8;

function sanitizeTransponder(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, TRANSPONDER_MAX_LENGTH);
}

export default function TransponderCombobox({
  value = "",
  onChange,
  suggestions = [],
  ariaLabel = "Transponder number",
  placeholder = "Transponder",
  menuScroll = true,
  onMenuToggle,
  variant = "public",
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const { palette } = useTheme();
  const primary = palette?.primary || "#00438a";
  const currentValue = sanitizeTransponder(value);
  const isCms = variant === "cms" || variant === "public";
  const chevronColor = primary;

  useEffect(() => {
    setInputValue(sanitizeTransponder(value));
  }, [value]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!onMenuToggle) return;
    if (!open) {
      onMenuToggle(false, null);
      return;
    }
    const measure = () => onMenuToggle(true, menuRef.current);
    measure();
    requestAnimationFrame(measure);
  }, [open, suggestions.length, onMenuToggle]);

  const normalized = inputValue.trim().toLowerCase();
  const isSearching = sanitizeTransponder(inputValue) !== currentValue;
  const filteredSuggestions = suggestions
    .filter((item) => sanitizeTransponder(item) !== currentValue)
    .filter((item) => {
      if (!isSearching || !normalized) return true;
      return item.toLowerCase().includes(normalized);
    });

  const commitValue = (nextValue) => {
    const sanitized = sanitizeTransponder(nextValue);
    setInputValue(sanitized);
    onChange?.(sanitized);
  };

  return (
    <div
      ref={dropdownRef}
      className={`filter-dropdown w-[6.75rem] sm:w-[7.25rem] shrink-0 max-w-[42%] ${open ? "is-open" : ""}`}
      style={{ "--dropdown-primary": primary }}
    >
      <div
        className="filter-dropdown-trigger flex w-full max-w-full items-center"
        style={(isCms ? getCmsSelectTriggerStyle : getDropdownTriggerStyle)(palette, {
          ...COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
          cursor: "text",
        })}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={TRANSPONDER_MAX_LENGTH}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-xs tabular-nums outline-none focus:ring-0"
          style={{ color: palette?.text || "#0a1a2f" }}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(sanitizeTransponder(e.target.value));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!dropdownRef.current?.contains(document.activeElement)) {
                commitValue(inputValue);
                setOpen(false);
              }
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitValue(inputValue);
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="m-0 flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0"
          aria-label="Show saved transponders"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          <ChevronDownIcon
            aria-hidden="true"
            style={{ width: "0.875rem", height: "0.875rem", color: chevronColor }}
          />
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          className={`filter-dropdown-menu ${isCms ? "filter-dropdown-menu--cms" : ""} ${menuScroll ? "filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] overflow-y-auto overscroll-contain" : ""}`}
          role="listbox"
          aria-label={ariaLabel}
          style={
            isCms
              ? getCmsSelectMenuStyle(palette, { minWidth: "100%" })
              : getDropdownMenuStyle(palette, { minWidth: "100%" })
          }
        >
          {filteredSuggestions.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-text-muted">No other transponders</div>
          ) : (
            filteredSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={item === inputValue}
                className="filter-dropdown-option text-xs tabular-nums"
                style={getDropdownOptionStyle(palette, { padding: "0.375rem 0.5rem", fontSize: "0.75rem" })}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  commitValue(item);
                  setOpen(false);
                }}
              >
                {item}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
