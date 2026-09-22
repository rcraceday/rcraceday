// src/app/components/driver/profile-sections/SponsorsAndManufacturerSection.jsx

import { useState } from "react";
import Input from "@/components/ui/Input";
import { MANUFACTURERS } from "@/data/manufacturers";

export default function SponsorsAndManufacturerSection({ driver, update }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [sponsorsText, setSponsorsText] = useState(() =>
    (driver.sponsors || []).join(", ")
  );

  const filtered = MANUFACTURERS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = MANUFACTURERS.find(
    (m) => m.name === driver.manufacturer
  );

  return (
    <section className="space-y-6">
      <h3 className="text-sm font-semibold">Team & Sponsors</h3>

      {/* TEAM NAME */}
      <Input
        label="Team Name"
        value={driver.team_name || ""}
        onChange={(e) => update("team_name", e.target.value)}
      />

      {/* SELECTED MANUFACTURER PREVIEW */}
      {selected && (
        <div className="flex items-center gap-2 mt-1">
          {selected.logo && (
            <img
              src={selected.logo}
              alt={selected.name}
              className="h-10 w-10 object-contain"
            />
          )}
          <span className="text-sm text-gray-700">{selected.name}</span>
        </div>
      )}

      {/* MANUFACTURER DROPDOWN WITH LOGOS */}
      <div className="relative">
        <Input
          label="Manufacturer"
          value={search || driver.manufacturer || ""}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
        />

        {showDropdown && (
          <div
            className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto"
            style={{ borderColor: "#ddd" }}
          >
            {filtered.map((m) => (
              <div
                key={m.name}
                className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                onClick={() => {
                  update("manufacturer", m.name);
                  setSearch("");
                  setShowDropdown(false);
                }}
              >
                {m.logo && (
                  <img
                    src={m.logo}
                    alt={m.name}
                    className="h-10 w-10 object-contain"
                  />
                )}
                <span>{m.name}</span>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No matches
              </div>
            )}
          </div>
        )}
      </div>

      {/* SPONSORS */}
      <Input
        label="Sponsors (comma separated)"
        type="text"
        value={sponsorsText}
        onChange={(e) => setSponsorsText(e.target.value)}
        onBlur={() =>
          update(
            "sponsors",
            sponsorsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
      />
    </section>
  );
}
