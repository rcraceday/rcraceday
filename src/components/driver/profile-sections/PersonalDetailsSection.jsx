import { useTranslation } from "@/app/i18n/I18nContext";
// src/app/components/driver/profile-sections/PersonalDetailsSection.jsx

import Input from "@/components/ui/Input";

export default function PersonalDetailsSection({ driver, update }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">{t("driverProfile.personalDetails")}</h3>

      <Input
        label={t("driverProfile.yearOfBirth")}
        value={driver.year_of_birth || ""}
        onChange={(e) => update("year_of_birth", e.target.value)}
      />

      <Input
        label={t("driverProfile.hometown")}
        value={driver.hometown || ""}
        onChange={(e) => update("hometown", e.target.value)}
      />

       <Input
        label={t("driverProfile.occupation")}
        value={driver.occupation || ""}
        onChange={(e) => update("occupation", e.target.value)}
      />
    </section>
  );
}
