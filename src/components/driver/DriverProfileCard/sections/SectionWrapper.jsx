// src/app/components/driver/DriverProfileCard/sections/SectionWrapper.jsx

import React from "react";
import useTheme from "@/app/providers/useTheme";

export default function SectionWrapper({ title, brand: brandProp, children }) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ borderColor: "#e5e7eb" }} // subtle separator
    >
      {/* HEADER */}
      <div
        className="px-4 py-2"
        style={{
          backgroundColor: brand,
          color: "white",
        }}
      >
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      {/* BODY */}
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}
