import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import {
  COMPACT_DROPDOWN_TRIGGER_OVERRIDES,
  getCmsSelectMenuStyle,
  getCmsSelectTriggerStyle,
  getDropdownOptionStyle,
} from "@/components/ui/dropdownFieldStyles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function ManufacturerSelect({
  value = "",
  options = [],
  onChange,
  ariaLabel,
  placeholder,
  fullWidth = true,
  compact = false,
  /** When true, sized for a flex row beside class + transponder (Driver Manager / nominate). */
  rowSlot = false,
  menuScroll = true,
  onMenuToggle,
  variant = "cms",
  allowEmpty = true,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  /** Typing filter only — empty while menu is open shows full manufacturer list. */
  const [listFilter, setListFilter] = useState("");
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const { palette } = useTheme();
  const primary = palette?.primary || "#00438a";
  const isCms = variant === "cms" || variant === "public";
  const trimmedValue = String(value ?? "").trim();
  const emptyLabel =
    placeholder ?? (rowSlot ? t("nominate.chassisManufacturerShort") : t("nominate.chassisManufacturerSelect"));

  const selectable = useMemo(() => {
    const fromOptions = options.filter((opt) => opt.value !== "" && opt.value != null);
    if (!allowEmpty) return fromOptions;
    const emptyOpt = options.find((opt) => opt.value === "" || opt.value == null);
    const noneRow = {
      value: "",
      label: emptyOpt?.label ?? t("nominate.noChassisManufacturer"),
    };
    return [noneRow, ...fromOptions];
  }, [options, allowEmpty, t]);

  const filtered = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    const none = selectable.find((opt) => opt.value === "");
    const rest = selectable.filter((opt) => opt.value !== "");
    const matchedRest = !q
      ? rest
      : rest.filter((opt) => String(opt.label).toLowerCase().includes(q));
    const showNone =
      none && (!q || String(none.label).toLowerCase().includes(q));
    return showNone ? [none, ...matchedRest] : matchedRest;
  }, [selectable, listFilter]);

  useEffect(() => {
    if (open) return;
    setSearchTerm(trimmedValue);
    setListFilter("");
  }, [trimmedValue, open]);

  function openMenu() {
    setListFilter("");
    setOpen(true);
    if (trimmedValue) setSearchTerm(trimmedValue);
  }

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
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
  }, [open, filtered.length, onMenuToggle]);

  const selectValue = (next) => {
    const name = String(next ?? "").trim();
    setSearchTerm(name);
    onChange?.(name);
    setOpen(false);
  };

  const wrapClass = rowSlot
    ? `filter-dropdown ${open ? "is-open" : ""} min-w-0 w-full sm:min-w-[8.5rem] sm:max-w-[11rem] sm:flex-1`
    : `filter-dropdown ${open ? "is-open" : ""} ${fullWidth ? "min-w-0 w-full" : ""}`;

  return (
    <div
      ref={dropdownRef}
      className={wrapClass}
      style={{ "--dropdown-primary": primary }}
    >
      <div
        className="filter-dropdown-trigger relative flex w-full max-w-full items-center"
        style={
          isCms
            ? getCmsSelectTriggerStyle(palette, {
                width: "100%",
                cursor: "text",
                ...(compact ? COMPACT_DROPDOWN_TRIGGER_OVERRIDES : {}),
              })
            : undefined
        }
      >
        <input
          type="text"
          aria-label={ariaLabel}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-xs outline-none focus:ring-0"
          style={{ color: palette?.text || "#0a1a2f" }}
          value={open ? searchTerm : trimmedValue || searchTerm}
          placeholder={emptyLabel}
          onChange={(e) => {
            const next = e.target.value;
            setSearchTerm(next);
            setListFilter(next);
            setOpen(true);
          }}
          onFocus={openMenu}
        />
        <button
          type="button"
          className="m-0 flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 pl-1"
          aria-label={ariaLabel}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else openMenu();
          }}
        >
          <ChevronDownIcon
            aria-hidden="true"
            style={{
              width: compact ? "0.875rem" : "1rem",
              height: compact ? "0.875rem" : "1rem",
              color: primary,
            }}
          />
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          className={`filter-dropdown-menu ${isCms ? "filter-dropdown-menu--cms" : ""} ${menuScroll ? "filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] overflow-y-auto overscroll-contain" : ""}`}
          role="listbox"
          aria-label={ariaLabel}
          style={isCms ? getCmsSelectMenuStyle(palette, { minWidth: "100%" }) : undefined}
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-text-muted">{t("cms.noResults")}</div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === trimmedValue}
                className="filter-dropdown-option"
                style={getDropdownOptionStyle(palette, compact ? { padding: "0.375rem 0.5rem", fontSize: "0.75rem" } : undefined)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue(option.value)}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}