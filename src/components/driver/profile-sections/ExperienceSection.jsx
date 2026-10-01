import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/ExperienceSection.jsx

import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

export default function ExperienceSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.experience")}</h3>

      <Input
        label={t("driverProfile.yearStarted")}
        value={driver.year_started || ""}
        onChange={(e) => update("year_started", e.target.value)}
      />

      <Textarea
        label={t("driverProfile.careerHighlight")}
        value={driver.career_highlight || ""}
        onChange={(e) => update("career_highlight", e.target.value)}
      />

      <Textarea
        label={t("driverProfile.bestAboutHobby")}
        value={driver.best_thing_about_hobby || ""}
        onChange={(e) => update("best_thing_about_hobby", e.target.value)}
      />

      <Textarea
        label={t("driverProfile.inspiration")}
        value={driver.inspiration || ""}
        onChange={(e) => update("inspiration", e.target.value)}
      />

      {/* ADDITIONAL FIELDS MERGED HERE */}
      <Textarea
        label={t("driverProfile.raceNumberMeaning")}
        value={driver.race_number_meaning || ""}
        onChange={(e) => update("race_number_meaning", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteTrack")}
        value={driver.favourite_track || ""}
        onChange={(e) => update("favourite_track", e.target.value)}
      />
    </section>
  );
}
