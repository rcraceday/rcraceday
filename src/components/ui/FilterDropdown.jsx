import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import {
  COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
  getCmsSelectMenuStyle,
  getCmsSelectTriggerStyle,
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
  getInlineDropdownMenuStyle,
  getPremiumDropdownMenuStyle,
  getPremiumDropdownTriggerStyle,
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
  compact = true,
  fullWidth = true,
  className = "",
  triggerStyleOverrides = {},
  hideSelectedOption = false,
  menuScroll = true,
  onMenuToggle,
  onClose,
  /** Member app: default premium compact. Admin-only: `variant="cms"`. */
  variant = "premium",
  /** In-flow menu — avoids clipping inside overflow-hidden ancestors. */
  menuInline = false,
  preserveOptionOrder = false,
  /** Closed trigger text when value is empty; menu options unchanged. */
  emptyTriggerLabel,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const { palette } = useTheme();
  const menuOptions = useMemo(() => {
    const sorted = preserveOptionOrder ? options : sortOptionsAlphabetically(options);
    if (!hideSelectedOption) return sorted;
    return sorted.filter((option) => option.value === "" || option.value !== value);
  }, [options, value, hideSelectedOption, preserveOptionOrder]);
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const isEmptyValue = value === "" || value == null;
  const triggerLabel =
    isEmptyValue && emptyTriggerLabel ? emptyTriggerLabel : selectedOption?.label;
  const primary = palette?.primary || "#00438a";
  const isCms = variant === "cms";
  const isPremium = !isCms;
  const chevronColor = primary;

  const menuPanelStyle = useMemo(() => {
    if (menuInline) {
      return getInlineDropdownMenuStyle(palette, {
        boxShadow: isPremium
          ? "0 10px 28px rgba(10, 26, 47, 0.12)"
          : "0 4px 12px rgba(0, 0, 0, 0.08)",
        borderRadius: isPremium ? 10 : undefined,
      });
    }
    const base = isPremium
      ? getPremiumDropdownMenuStyle(palette)
      : isCms
        ? getCmsSelectMenuStyle(palette, { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)" })
        : getDropdownMenuStyle(palette);
    if (!menuScroll) return base;
    return { ...base, overflowX: "hidden", overflowY: "auto" };
  }, [menuInline, isPremium, isCms, palette, menuScroll]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen((wasOpen) => {
          if (wasOpen) onClose?.();
          return false;
        });
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen((wasOpen) => {
          if (wasOpen) onClose?.();
          return false;
        });
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

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
      className={`filter-dropdown ${isPremium ? "filter-dropdown--premium" : ""} ${open ? "is-open" : ""} ${fullWidth ? "min-w-0" : ""} ${className}`.trim()}
      style={{ "--dropdown-primary": primary, width: compact && fullWidth ? "100%" : undefined }}
    >
      <button
        type="button"
        className={`filter-dropdown-trigger max-w-full ${fullWidth ? "w-full" : "w-auto"}`}
        style={(isPremium
          ? getPremiumDropdownTriggerStyle
          : isCms
            ? getCmsSelectTriggerStyle
            : getDropdownTriggerStyle)(palette, {
          ...(compact
            ? {
                ...COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
                ...(isPremium
                  ? { minHeight: "2.25rem", fontSize: "0.75rem", padding: "0.4rem 0.75rem" }
                  : {}),
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
        <span
          className="min-w-0 flex-1 truncate text-left whitespace-nowrap"
          style={
            selectedOption?.optionStyle?.borderLeft
              ? {
                  borderLeft: selectedOption.optionStyle.borderLeft,
                  paddingLeft: "0.375rem",
                }
              : undefined
          }
        >
          {triggerLabel}
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
          className={`filter-dropdown-menu ${isCms ? "filter-dropdown-menu--cms" : ""} ${isPremium ? "filter-dropdown-menu--premium" : ""} ${menuScroll ? "filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] overflow-y-auto overscroll-contain" : ""}`}
          role="listbox"
          aria-label={ariaLabel}
          style={menuPanelStyle}
        >
          {menuOptions.map((option) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="filter-dropdown-option"
              style={{
                ...getDropdownOptionStyle(
                  palette,
                  compact ? { padding: "0.375rem 0.5rem", fontSize: "0.75rem" } : undefined
                ),
                ...(isPremium && option.value === value
                  ? {
                      background: `color-mix(in srgb, ${primary} 12%, #ffffff)`,
                      fontWeight: 600,
                    }
                  : {}),
                ...(option.optionStyle || {}),
              }}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.menuLabel ?? option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
