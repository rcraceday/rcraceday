import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import {
  getDropdownMenuStyle,
  getDropdownOptionStyle,
  getDropdownTriggerStyle,
} from "@/components/ui/dropdownFieldStyles";

export default function FilterMultiDropdown({
  values = [],
  onChange,
  options,
  ariaLabel,
  placeholder = "Any",
  fullWidth = true,
  className = "",
  triggerStyleOverrides = {},
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { palette } = useTheme();
  const primary = palette?.primary || "#00438a";
  const selectedSet = useMemo(() => new Set(values || []), [values]);

  const summary = useMemo(() => {
    if (!values?.length) return placeholder;
    if (values.length === 1) {
      const match = options.find((o) => o.value === values[0]);
      return match?.label || placeholder;
    }
    return `${values.length} selected`;
  }, [options, placeholder, values]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
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

  function toggle(value) {
    const next = new Set(values || []);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange([...next]);
  }

  return (
    <div
      ref={dropdownRef}
      className={`filter-dropdown ${open ? "is-open" : ""} ${fullWidth ? "min-w-0 w-full" : ""} ${className}`.trim()}
      style={{ "--dropdown-primary": primary }}
    >
      <button
        type="button"
        className={`filter-dropdown-trigger max-w-full ${fullWidth ? "w-full" : "w-auto"}`}
        style={getDropdownTriggerStyle(palette, triggerStyleOverrides)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">{summary}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="shrink-0"
          style={{ width: "1rem", height: "1rem", color: primary }}
        />
      </button>

      {open && (
        <div
          className="filter-dropdown-menu filter-dropdown-menu-scroll max-h-[min(20rem,70vh)] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          style={getDropdownMenuStyle(palette)}
        >
          {options.map((option) => {
            const selected = selectedSet.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className="filter-dropdown-option"
                style={getDropdownOptionStyle(palette, {
                  fontWeight: selected ? 600 : 400,
                  background: selected ? "#e5e7eb" : "transparent",
                })}
                onClick={() => toggle(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
