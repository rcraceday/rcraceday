import React from "react";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function TeamChassisTrackSection({ driver }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-6 space-y-4 flex flex-col items-center text-center">

      {driver.team_name && (
        <p className="text-lrg text-gray-800">
          <span className="font-semibold">{t("driverProfile.fieldTeam")}</span> {driver.team_name}
        </p>
      )}

      {driver.home_track && (
        <p className="text-lrg text-gray-800">
          <span className="font-semibold">{t("driverProfile.fieldHomeTrack")}</span>{" "}
          {driver.home_track}
        </p>
      )}
    </div>
  );
}
