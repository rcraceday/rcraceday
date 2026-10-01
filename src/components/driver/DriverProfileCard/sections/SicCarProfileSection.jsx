import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/SicCarProfileSection.jsx

import React from "react";

export default function SicCarProfileSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.sic_car_type &&
    !driver.sic_chassis &&
    !driver.sic_motor &&
    !driver.sic_esc &&
    !driver.sic_battery &&
    !driver.sic_servo &&
    !driver.sic_tires &&
    !driver.sic_transmitter
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">
        {driver.sic_car_type && (
          <p>
            <span className="font-semibold">{t("driverProfile.carType")}:</span>{" "}
            {driver.sic_car_type}
          </p>
        )}
        {driver.sic_chassis && (
          <p>
            <span className="font-semibold">{t("driverProfile.chassis")}:</span>{" "}
            {driver.sic_chassis}
          </p>
        )}
        {driver.sic_motor && (
          <p>
            <span className="font-semibold">{t("driverProfile.motor")}:</span>{" "}
            {driver.sic_motor}
          </p>
        )}
        {driver.sic_esc && (
          <p>
            <span className="font-semibold">{t("driverProfile.esc")}:</span>{" "}
            {driver.sic_esc}
          </p>
        )}
        {driver.sic_battery && (
          <p>
            <span className="font-semibold">{t("driverProfile.battery")}:</span>{" "}
            {driver.sic_battery}
          </p>
        )}
        {driver.sic_servo && (
          <p>
            <span className="font-semibold">{t("driverProfile.servo")}:</span>{" "}
            {driver.sic_servo}
          </p>
        )}
        {driver.sic_tires && (
          <p>
            <span className="font-semibold">{t("driverProfile.tires")}:</span>{" "}
            {driver.sic_tires}
          </p>
        )}
        {driver.sic_transmitter && (
          <p>
            <span className="font-semibold">{t("driverProfile.transmitter")}:</span>{" "}
            {driver.sic_transmitter}
          </p>
        )}
      </div>
    </div>
  );
}
