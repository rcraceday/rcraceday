import { Link, useParams } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import SettingsPage from "./SettingsPage";
import { settingsStyles as s } from "./settingsStyles";

export default function UserSettingsIndex() {
  const { clubSlug } = useParams();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette?.primary || "#DC2626";
  const base = `/${clubSlug}/app/settings`;

  const items = [
    {
      path: `${base}/account`,
      title: t("settings.account.title"),
      desc: t("settings.account.menuDesc"),
    },
    {
      path: `${base}/notifications`,
      title: t("settings.notifications.title"),
      desc: t("settings.notifications.menuDesc"),
    },
    {
      path: `${base}/language`,
      title: t("settings.language.title"),
      desc: t("settings.language.menuDesc"),
    },
    {
      path: `${base}/timezone`,
      title: t("settings.timezone.title"),
      desc: t("settings.timezone.menuDesc"),
    },
  ];

  return (
    <SettingsPage
      title={t("settings.hubTitle")}
      subtitle={t("settings.hubSubtitle")}
      showBack={false}
    >
      <style>
        {`
          .user-settings-grid {
            display: grid;
            grid-template-columns: 1fr;
            row-gap: 12px;
            column-gap: 24px;
          }
          @media (min-width: 600px) {
            .user-settings-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
        `}
      </style>

      <div className="user-settings-grid">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={s.menuCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.menuTitle}>{item.title}</div>
                <div style={s.menuDesc}>{item.desc}</div>
              </div>
              <ChevronRightIcon
                style={{
                  width: 20,
                  height: 20,
                  color: brand,
                  flexShrink: 0,
                }}
              />
            </div>
          </Link>
        ))}
      </div>
    </SettingsPage>
  );
}
