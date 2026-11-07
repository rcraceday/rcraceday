import { useTranslation } from "@/app/i18n/I18nContext";
import SettingsPage from "./SettingsPage";
import TransponderInventoryCard from "./TransponderInventoryCard";
import PlatformRosterCard from "./PlatformRosterCard";
import ClubDriverProfilesCard from "./ClubDriverProfilesCard";

export default function MyDriversSettings() {
  const { t } = useTranslation();

  return (
    <SettingsPage
      title={t("settings.myDrivers.title")}
      subtitle={t("settings.myDrivers.subtitle")}
    >
      <style>
        {`
          .settings-field-grid-2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }
          @media (min-width: 600px) {
            .settings-field-grid-2 {
              grid-template-columns: 1fr 1fr;
            }
          }
        `}
      </style>
      <div className="max-w-3xl flex flex-col gap-3 text-sm text-gray-700 leading-relaxed mb-2">
        <p className="m-0">{t("settings.myDrivers.pageLead1")}</p>
        <p className="m-0">{t("settings.myDrivers.pageLead2")}</p>
        <p className="m-0">{t("settings.myDrivers.pageLead3")}</p>
        <p className="m-0">{t("settings.myDrivers.pageLead4")}</p>
      </div>
      <div className="flex flex-col gap-6 max-w-3xl w-full">
        <ClubDriverProfilesCard />
        <PlatformRosterCard />
        <TransponderInventoryCard />
      </div>
    </SettingsPage>
  );
}
