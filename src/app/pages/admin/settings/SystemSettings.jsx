import SettingsComingSoon from "./SettingsComingSoon";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function SystemSettings() {
  const { t } = useTranslation();

  return (
    <SettingsComingSoon
      title={t("admin.settings.system")}
      subtitle={t("admin.settings.systemDesc")}
    />
  );
}
