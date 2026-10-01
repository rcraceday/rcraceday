import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/RacingInformationSection.jsx

import React from "react";

export default function RacingInformationSection({ driver, chassis }) {
  const { t } = useTranslation();
  if (
    !driver.favourite_classes?.length &&
    !driver.preferred_surface &&
    !driver.home_track &&
    !driver.manufacturer
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">

        {driver.favourite_classes?.length > 0 && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteClasses")}</span>{" "}
            {driver.favourite_classes.join(", ")}
          </p>
        )}

        {driver.preferred_surface && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldPreferredSurface")}</span>{" "}
            {driver.preferred_surface}
          </p>
        )}

        {driver.manufacturer && (
          <p className="flex items-center gap-2">
            <span className="font-semibold">{t("driverProfile.fieldChassisManufacturer")}</span>

            {/* If logo exists → show ONLY the logo */}
            {chassis?.logo ? (
              <img
                src={chassis.logo}
                alt={chassis.name}
                className="h-28 w-28 object-contain"
              />
            ) : (
              /* Otherwise → show the text */
              driver.manufacturer
            )}
          </p>
        )}

      </div>
    </div>
  );
}
