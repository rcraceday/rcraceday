import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/SicCarProfileSection.jsx

import Input from "@/components/ui/Input";

export default function SicCarProfileSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.sicCarProfile")}</h3>

      <Input
        label={t("driverProfile.carType")}
        value={driver.sic_car_type || ""}
        onChange={(e) => update("sic_car_type", e.target.value)}
      />

      <Input
        label={t("driverProfile.chassis")}
        value={driver.sic_chassis || ""}
        onChange={(e) => update("sic_chassis", e.target.value)}
      />

      <Input
        label={t("driverProfile.motor")}
        value={driver.sic_motor || ""}
        onChange={(e) => update("sic_motor", e.target.value)}
      />

      <Input
        label={t("driverProfile.esc")}
        value={driver.sic_esc || ""}
        onChange={(e) => update("sic_esc", e.target.value)}
      />

      <Input
        label={t("driverProfile.battery")}
        value={driver.sic_battery || ""}
        onChange={(e) => update("sic_battery", e.target.value)}
      />

      <Input
        label={t("driverProfile.servo")}
        value={driver.sic_servo || ""}
        onChange={(e) => update("sic_servo", e.target.value)}
      />

      <Input
        label={t("driverProfile.tires")}
        value={driver.sic_tires || ""}
        onChange={(e) => update("sic_tires", e.target.value)}
      />

      <Input
        label={t("driverProfile.transmitter")}
        value={driver.sic_transmitter || ""}
        onChange={(e) => update("sic_transmitter", e.target.value)}
      />
    </section>
  );
}
