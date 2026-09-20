import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";

export default function FilterDropdown({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { palette } = useTheme();
  const selectedOption = options.find((option) => option.value === value) || options[0];

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

  return (
    <div
      ref={dropdownRef}
      className="filter-dropdown"
      style={{ "--brand-color": palette.primary }}
    >
      <button
        type="button"
        className="filter-dropdown-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>

      {open && (
        <div className="filter-dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="filter-dropdown-option"
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