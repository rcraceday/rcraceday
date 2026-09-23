import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import {
  COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
} from "@/components/ui/dropdownFieldStyles";

function sortOptionsAlphabetically(options) {
  if (!Array.isArray(options) || options.length === 0) return options;
  const placeholders = options.filter((option) => option.value === "" || option.value == null);
  const items = options.filter((option) => option.value !== "" && option.value != null);
  items.sort((a, b) =>
    String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base", numeric: true })
  );
  return [...placeholders, ...items];
}

export default function FilterDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  compact = false,
  fullWidth = true,
  className = "",
  triggerStyleOverrides = {},
  hideSelectedOption = false,
  menuScroll = true,
  onMenuToggle,
  variant = "brand",
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const { palette } = useTheme();
  const menuOptions = useMemo(() => {
    const sorted = sortOptionsAlphabetically(options);
    if (!hideSelectedOption) return sorted;
    return sorted.filter((option) => option.value === "" || option.value !== value);
  }, [options, value, hideSelectedOption]);
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const primary = palette?.primary || "#00438a";
  const isCms = variant === "cms";
  const chevronColor = primary;

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
  }, [open, menuOptions.length, onMenuToggle]);

  return (
    <div
      ref={dropdownRef}
      className={`filter-dropdown ${open ? "is-open" : ""} ${fullWidth ? "min-w-0" : ""} ${className}`.trim()}
      style={{ "--dropdown-primary": primary, width: compact && fullWidth ? "100%" : undefined }}
    >
      <button
        type="button"
        className={`filter-dropdown-trigger max-w-full ${fullWidth ? "w-full" : "w-auto"}`}
        style={getDropdownTriggerStyle(palette, {
          ...(compact
            ? {
                ...COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
                ...(fullWidth ? {} : { width: "auto", minWidth: "9rem" }),
              }
            : {}),
          ...triggerStyleOverrides,
        })}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
          {selectedOption?.label}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="shrink-0"
          style={{ width: compact ? "0.875rem" : "1rem", height: compact ? "0.875rem" : "1rem", color: chevronColor }}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`filter-dropdown-menu ${isCms ? "filter-dropdown-menu--cms" : ""} ${menuScroll ? "filter-dropdown-menu-scroll max-h-40 overflow-y-auto" : ""}`}
          role="listbox"
          aria-label={ariaLabel}
          style={getDropdownMenuStyle(palette, isCms ? { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" } : undefined)}
        >
          {menuOptions.map((option) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="filter-dropdown-option"
              style={getDropdownOptionStyle(palette, compact ? { padding: "0.375rem 0.5rem", fontSize: "0.75rem" } : undefined)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
