import SettingsComingSoon from "./SettingsComingSoon";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function UserSettings() {
  const { t } = useTranslation();

  return (
    <SettingsComingSoon
      title={t("admin.settings.user")}
      subtitle={t("admin.settings.usersDesc")}
    />
  );
}
