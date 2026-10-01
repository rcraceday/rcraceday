import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/RacingInfoSection.jsx

import Input from "@/components/ui/Input";

export default function RacingInfoSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.racingInfo")}</h3>

      <Input
        label={t("driverProfile.favouriteClasses")}
        value={(driver.favourite_classes || []).join(", ")}
        onChange={(e) =>
          update(
            "favourite_classes",
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
      />

      <Input
        label={t("driverProfile.preferredSurface")}
        value={driver.preferred_surface || ""}
        onChange={(e) => update("preferred_surface", e.target.value)}
      />

      <Input
        label={t("driverProfile.homeTrack")}
        value={driver.home_track || ""}
        onChange={(e) => update("home_track", e.target.value)}
      />
    </section>
  );
}
