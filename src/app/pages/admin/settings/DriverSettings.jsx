import SettingsComingSoon from "./SettingsComingSoon";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function DriverSettings() {
  const { t } = useTranslation();

  return (
    <SettingsComingSoon
      title={t("admin.settings.driver")}
      subtitle={t("admin.settings.driverDesc")}
    />
  );
}
