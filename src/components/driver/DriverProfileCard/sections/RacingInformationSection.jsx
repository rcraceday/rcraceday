import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/RacingInformationSection.jsx

import React from "react";

export default function RacingInformationSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.favourite_classes?.length &&
    !driver.preferred_surface &&
    !driver.home_track
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

      </div>
    </div>
  );
}
