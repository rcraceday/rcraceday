import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/TriviaSection.jsx

import React from "react";

export default function TriviaSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.favourite_vintage_rc &&
    !driver.favourite_hobby_shop &&
    !driver.what_do_you_do_when_not_racing &&
    !driver.favourite_meal &&
    !driver.favourite_movie &&
    !driver.favourite_sports_team &&
    !driver.favourite_pro_driver
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">

        {driver.favourite_vintage_rc && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteVintage")}</span>{" "}
            {driver.favourite_vintage_rc}
          </p>
        )}

        {driver.favourite_hobby_shop && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteHobbyShop")}</span>{" "}
            {driver.favourite_hobby_shop}
          </p>
        )}

        {driver.what_do_you_do_when_not_racing && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldWhenNotRacing")}</span>{" "}
            {driver.what_do_you_do_when_not_racing}
          </p>
        )}

        {driver.favourite_meal && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteMeal")}</span>{" "}
            {driver.favourite_meal}
          </p>
        )}

        {driver.favourite_movie && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteMovie")}</span>{" "}
            {driver.favourite_movie}
          </p>
        )}

        {driver.favourite_sports_team && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteSportsTeam")}</span>{" "}
            {driver.favourite_sports_team}
          </p>
        )}

        {driver.favourite_pro_driver && (
          <p>
            <span className="font-semibold">{t("driverProfile.fieldFavouriteProDriver")}</span>{" "}
            {driver.favourite_pro_driver}
          </p>
        )}

      </div>
    </div>
  );
}
