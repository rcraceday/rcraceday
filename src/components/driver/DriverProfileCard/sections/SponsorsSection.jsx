// src/app/components/driver/DriverProfileCard/sections/SponsorsSection.jsx



import { useMemo, useState } from "react";

import useTheme from "@/app/providers/useTheme";

import Input from "@/components/ui/Input";

import FilterDropdown from "@/components/ui/FilterDropdown";

import { MANUFACTURERS } from "@/data/manufacturers";



function SponsorsEditSection({ driver, update }) {

  const [sponsorsText, setSponsorsText] = useState(() =>

    (driver.sponsors || []).join(", ")

  );



  const manufacturerOptions = useMemo(

    () => [

      { value: "", label: "Select manufacturer..." },

      ...MANUFACTURERS.map((m) => ({ value: m.name, label: m.name })),

    ],

    []

  );



  const selected = MANUFACTURERS.find((m) => m.name === driver.manufacturer);



  return (

    <section className="space-y-6">

      <h3 className="text-sm font-semibold">Team & Sponsors</h3>



      <Input

        label="Team Name"

        value={driver.team_name || ""}

        onChange={(e) => update("team_name", e.target.value)}

      />



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



      <div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>

        <FilterDropdown
          variant="cms"
          value={driver.manufacturer || ""}
          onChange={(value) => update("manufacturer", value)}
          options={manufacturerOptions}
          ariaLabel="Manufacturer"
          triggerStyleOverrides={{ fontSize: "0.875rem" }}
        />

      </div>



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



export default function SponsorsSection({ driver, brand: brandProp, update }) {

  const { palette } = useTheme();

  const brand = brandProp || palette?.primary || "#0A66C2";



  if (typeof update === "function") {

    return <SponsorsEditSection driver={driver} update={update} />;

  }



  if (!driver?.sponsors || driver.sponsors.length === 0) return null;



  return (

    <div className="space-y-2">

      <label className="text-base font-medium text-gray-700">Sponsors:</label>



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

