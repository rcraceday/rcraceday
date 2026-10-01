import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/PersonalDetailsSection.jsx

import React from "react";

export default function PersonalDetailsSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.gender &&
    !driver.year_of_birth &&
    !driver.hometown
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">

        {driver.gender && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldGender")}</span>{" "}
            {driver.gender}
          </p>
        )}

        {driver.year_of_birth && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldYearOfBirth")}</span>{" "}
            {driver.year_of_birth}
          </p>
        )}

        {driver.hometown && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldHometown")}</span>{" "}
            {driver.hometown}
          </p>
        )}

        {driver.occupation && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldOccupation")}</span>{" "}
            {driver.occupation}
          </p>
        )}

      </div>
    </div>
  );
}
