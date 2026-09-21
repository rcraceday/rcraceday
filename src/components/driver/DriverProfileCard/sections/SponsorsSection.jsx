// src/app/components/driver/DriverProfileCard/sections/SponsorsSection.jsx

import React from "react";
import useTheme from "@/app/providers/useTheme";

export default function SponsorsSection({ driver, brand: brandProp }) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  if (!driver?.sponsors || driver.sponsors.length === 0) return null;

  return (
    <div className="space-y-2">

      {/* LABEL */}
      <label className="text-base font-medium text-gray-700">Sponsors:</label>

      {/* BADGES */}
      <div className="flex flex-wrap gap-2">
        {driver.sponsors.map((sponsor) => (
          <span
            key={sponsor}
            className="text-base font-medium rounded"
            style={{
              padding: "6px 10px",
              color: brand,
              backgroundColor: "white",
              border: `2px solid ${brand}`,
            }}
          >
            {sponsor}
          </span>
        ))}
      </div>

    </div>
  );
}
