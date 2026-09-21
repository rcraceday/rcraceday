// src/app/components/driver/profile-sections/NumberAndColoursSection.jsx

import useTheme from "@/app/providers/useTheme";
import Input from "@/components/ui/Input";

export default function NumberAndColoursSection({
  driver,
  update,
  brand: brandProp,
  club,
  navigate,
  previewNumber,
}) {
  const { palette } = useTheme();
  const brand = brandProp || palette?.primary || "#0A66C2";

  return (
    <section className="space-y-10">
      {/* ------------------------------------------------------------
          PERMANENT NUMBER
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Permanent Number</h3>

        <div className="flex items-center justify-between flex-wrap gap-3 p-3 border border-gray-300 rounded-lg">
          <span className="text-3xl font-semibold">
            {previewNumber || "None"}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/${club.slug}/app/profile/drivers/${driver.id}/choose-number`
              )
            }
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{ background: brand }}
          >
            Change Number
          </button>
        </div>
      </div>

      <hr className="border-surfaceBorder" />

      {/* ------------------------------------------------------------
          CAR COLOURS + LIVETIME PREVIEW
      ------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Car Colours</h3>
          <h3 className="text-sm font-semibold">LiveTime Preview</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COLOUR PICKERS */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">Primary Colour</label>
              <input
                type="color"
                value={driver.primary_color || "#000000"}
                onChange={(e) => update("primary_color", e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 text-sm font-medium">
                Secondary Colour
              </label>
              <input
                type="color"
                value={driver.secondary_color || "#ffffff"}
                onChange={(e) => update("secondary_color", e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* LIVETIME PREVIEW */}
          <div className="flex flex-col items-start md:items-end">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: "72px",
                height: "72px",
                backgroundColor: driver.primary_color || "#000",
                border: `3px solid ${driver.secondary_color || "#fff"}`,
              }}
            >
              <span
                className="font-bold"
                style={{
                  color: driver.secondary_color || "#fff",
                  fontSize: "28px",
                  lineHeight: 1,
                }}
              >
                {previewNumber}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
