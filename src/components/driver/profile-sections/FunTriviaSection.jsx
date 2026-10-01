import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/FunTriviaSection.jsx

import Input from "@/components/ui/Input";

export default function FunTriviaSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.funTrivia")}</h3>

      <Input
        label={t("driverProfile.favoriteVintage")}
        value={driver.favourite_vintage_rc || ""}
        onChange={(e) => update("favourite_vintage_rc", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteHobbyShop")}
        value={driver.favourite_hobby_shop || ""}
        onChange={(e) => update("favourite_hobby_shop", e.target.value)}
      />

      <Input
        label={t("driverProfile.whenNotRacing")}
        value={driver.what_do_you_do_when_not_racing || ""}
        onChange={(e) => update("what_do_you_do_when_not_racing", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteMeal")}
        value={driver.favourite_meal || ""}
        onChange={(e) => update("favourite_meal", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteMovie")}
        value={driver.favourite_movie || ""}
        onChange={(e) => update("favourite_movie", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteSportsTeam")}
        value={driver.favourite_sports_team || ""}
        onChange={(e) => update("favourite_sports_team", e.target.value)}
      />

      <Input
        label={t("driverProfile.favoriteProDriver")}
        value={driver.favourite_pro_driver || ""}
        onChange={(e) => update("favourite_pro_driver", e.target.value)}
      />
    </section>
  );
}
