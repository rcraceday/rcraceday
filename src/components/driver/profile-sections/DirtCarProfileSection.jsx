import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/DirtCarProfileSection.jsx

import Input from "@/components/ui/Input";

export default function DirtCarProfileSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.dirtCarProfile")}</h3>

      <Input
        label={t("driverProfile.carType")}
        value={driver.dirt_car_type || ""}
        onChange={(e) => update("dirt_car_type", e.target.value)}
      />

      <Input
        label={t("driverProfile.chassis")}
        value={driver.dirt_chassis || ""}
        onChange={(e) => update("dirt_chassis", e.target.value)}
      />

      <Input
        label={t("driverProfile.motor")}
        value={driver.dirt_motor || ""}
        onChange={(e) => update("dirt_motor", e.target.value)}
      />

      <Input
        label={t("driverProfile.esc")}
        value={driver.dirt_esc || ""}
        onChange={(e) => update("dirt_esc", e.target.value)}
      />

      <Input
        label={t("driverProfile.battery")}
        value={driver.dirt_battery || ""}
        onChange={(e) => update("dirt_battery", e.target.value)}
      />

      <Input
        label={t("driverProfile.servo")}
        value={driver.dirt_servo || ""}
        onChange={(e) => update("dirt_servo", e.target.value)}
      />

      <Input
        label={t("driverProfile.tires")}
        value={driver.dirt_tires || ""}
        onChange={(e) => update("dirt_tires", e.target.value)}
      />

      <Input
        label={t("driverProfile.transmitter")}
        value={driver.dirt_transmitter || ""}
        onChange={(e) => update("dirt_transmitter", e.target.value)}
      />
    </section>
  );
}
