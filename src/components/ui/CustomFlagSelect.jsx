// src/components/ui/CustomFlagSelect.jsx

import { useState } from "react";
import { COUNTRIES } from "@/data/countries";
import useTheme from "@/app/providers/useTheme";
import {
  getCmsSelectMenuStyle,
  getCmsSelectTriggerStyle,
  getDropdownOptionStyle,
} from "@/components/ui/dropdownFieldStyles";

export default function CustomFlagSelect({ value, onChange, brand }) {
  const [open, setOpen] = useState(false);
  const { palette } = useTheme();
  const primary = brand || palette?.primary || "#00438a";

  const selected = COUNTRIES.find((c) => c.name === value);

  return (
    <div className="relative filter-dropdown" style={{ "--dropdown-primary": primary }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="filter-dropdown-trigger w-full text-sm"
        style={getCmsSelectTriggerStyle(palette, { minWidth: "unset", width: "100%" })}
      >
        <span className="flex items-center gap-2">
          {selected && (
            <img
              src={selected.flag}
              alt={selected.name}
              className="w-5 h-4 object-cover rounded-sm border"
            />
          )}
          {selected ? selected.name : "Select country"}
        </span>

        <span style={{ color: primary }}>▼</span>
      </button>

      {open && (
        <div
          className="filter-dropdown-menu filter-dropdown-menu--cms max-h-60 overflow-y-auto"
          style={getCmsSelectMenuStyle(palette, { width: "100%" })}
        >
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.name);
                setOpen(false);
              }}
              className="filter-dropdown-option text-sm flex items-center gap-2"
              style={getDropdownOptionStyle(palette)}
            >
              <img
                src={c.flag}
                alt={c.name}
                className="w-5 h-4 object-cover rounded-sm border"
              />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
