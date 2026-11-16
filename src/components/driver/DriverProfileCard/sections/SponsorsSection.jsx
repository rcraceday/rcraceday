import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/SponsorsSection.jsx



import { useState } from "react";

import useTheme from "@/app/providers/useTheme";

import Input from "@/components/ui/Input";

function SponsorsEditSection({ driver, update }) {
  const { t } = useTranslation();

  const [sponsorsText, setSponsorsText] = useState(() =>

    (driver.sponsors || []).join(", ")

  );

  return (

    <section className="space-y-6">

      <h3 className="text-sm font-semibold">{t("driverProfile.teamSponsors")}</h3>



      <Input

        label={t("driverProfile.teamName")}

        value={driver.team_name || ""}

        onChange={(e) => update("team_name", e.target.value)}

      />

      <Input

        label={t("driverProfile.sponsorsComma")}

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
  const { t } = useTranslation();

  const { palette } = useTheme();

  const brand = brandProp || palette?.primary || "#0A66C2";



  if (typeof update === "function") {

    return <SponsorsEditSection driver={driver} update={update} />;

  }



  if (!driver?.sponsors || driver.sponsors.length === 0) return null;



  return (

    <div className="space-y-2">

      <label className="text-base font-medium text-gray-700">{t("driverProfile.sponsorsLabel")}</label>



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

