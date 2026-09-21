import React from "react";
import useTheme from "@/app/providers/useTheme";

export default function NumberNicknameSection({ driver, brand: brandProp }) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  return (
    <div className="w-full md:col-span-3 flex flex-col items-center -mt-20 justify-center text-center space-y-2">
      {driver.permanent_number && (
        <div
          className="text-9xl font-extrabold italic tracking-tight"
          style={{ color: brand }}
        >
          {driver.permanent_number}
        </div>
      )}

      {driver.nickname && (
        <div className="text-xl italic text-gray-600">
          “{driver.nickname}”
        </div>
      )}
    </div>
  );
}
