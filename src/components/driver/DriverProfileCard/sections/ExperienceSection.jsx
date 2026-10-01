import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/ExperienceSection.jsx

import React from "react";

export default function ExperienceSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.year_started &&
    !driver.career_highlight &&
    !driver.best_thing_about_hobby &&
    !driver.inspiration &&
    !driver.race_number_meaning &&
    !driver.favourite_track
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">
        {driver.year_started && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldYearStarted")}</span>{" "}
            {driver.year_started}
          </p>
        )}
        {driver.career_highlight && (
          <p className="whitespace-pre-line">
            <span className="font-semibold">{t("driverProfile.fieldCareerHighlight")}</span>{" "}
            {driver.career_highlight}
          </p>
        )}
        {driver.best_thing_about_hobby && (
          <p className="whitespace-pre-line">
            <span className="font-semibold">{t("driverProfile.fieldBestAboutHobby")}</span>{" "}
            {driver.best_thing_about_hobby}
          </p>
        )}
        {driver.inspiration && (
          <p className="whitespace-pre-line">
            <span className="font-semibold">{t("driverProfile.fieldInspiration")}</span>{" "}
            {driver.inspiration}
          </p>
        )}
        {driver.race_number_meaning && (
          <p className="whitespace-pre-line">
            <span className="font-semibold">{t("driverProfile.fieldRaceNumberMeaning")}</span>{" "}
            {driver.race_number_meaning}
          </p>
        )}
        {driver.favourite_track && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteTrack")}</span>{" "}
            {driver.favourite_track}
          </p>
        )}
      </div>
    </div>
  );
}
