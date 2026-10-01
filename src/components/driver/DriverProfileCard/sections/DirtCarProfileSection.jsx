import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/DriverProfileCard/sections/DirtCarProfileSection.jsx

import React from "react";

export default function DirtCarProfileSection({ driver }) {
  const { t } = useTranslation();
  if (
    !driver.dirt_car_type &&
    !driver.dirt_chassis &&
    !driver.dirt_motor &&
    !driver.dirt_esc &&
    !driver.dirt_battery &&
    !driver.dirt_servo &&
    !driver.dirt_tires &&
    !driver.dirt_transmitter
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm space-y-1">
        {driver.dirt_car_type && (
          <p>
            <span className="font-semibold">{t("driverProfile.carType")}:</span>{" "}
            {driver.dirt_car_type}
          </p>
        )}
        {driver.dirt_chassis && (
          <p>
            <span className="font-semibold">{t("driverProfile.chassis")}:</span>{" "}
            {driver.dirt_chassis}
          </p>
        )}
        {driver.dirt_motor && (
          <p>
            <span className="font-semibold">{t("driverProfile.motor")}:</span>{" "}
            {driver.dirt_motor}
          </p>
        )}
        {driver.dirt_esc && (
          <p>
            <span className="font-semibold">{t("driverProfile.esc")}:</span>{" "}
            {driver.dirt_esc}
          </p>
        )}
        {driver.dirt_battery && (
          <p>
            <span className="font-semibold">{t("driverProfile.battery")}:</span>{" "}
            {driver.dirt_battery}
          </p>
        )}
        {driver.dirt_servo && (
          <p>
            <span className="font-semibold">{t("driverProfile.servo")}:</span>{" "}
            {driver.dirt_servo}
          </p>
        )}
        {driver.dirt_tires && (
          <p>
            <span className="font-semibold">{t("driverProfile.tires")}:</span>{" "}
            {driver.dirt_tires}
          </p>
        )}
        {driver.dirt_transmitter && (
          <p>
            <span className="font-semibold">{t("driverProfile.transmitter")}:</span>{" "}
            {driver.dirt_transmitter}
          </p>
        )}
      </div>
    </div>
  );
}
