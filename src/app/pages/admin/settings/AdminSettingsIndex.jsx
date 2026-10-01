import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { cmsStyles } from "../cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function AdminSettingsIndex() {
  const { t } = useTranslation();
  const items = [
    { path: "club-info", titleKey: "admin.settings.clubInfoShort", descKey: "admin.settings.clubInfoDesc" },
    { path: "branding", titleKey: "admin.settings.brandingShort", descKey: "admin.settings.brandingDesc" },
    { path: "system", titleKey: "admin.settings.system", descKey: "admin.settings.systemDesc" },
    { path: "cms", titleKey: "admin.settings.cms", descKey: "admin.settings.cmsDesc" },
    { path: "users", titleKey: "admin.settings.usersShort", descKey: "admin.settings.usersDesc" },
    { path: "membership", titleKey: "admin.membership.title", descKey: "admin.settings.membershipDesc" },
    { path: "event-defaults", titleKey: "admin.settings.eventDefaults", descKey: "admin.settings.eventDefaultsDesc" },
    { path: "driver", titleKey: "admin.settings.driver", descKey: "admin.settings.driverDesc" },
    { path: "tracks-and-classes", titleKey: "admin.settings.tracksClassesShort", descKey: "admin.settings.tracksClassesDesc" },
  ];

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>

        {/* Inject responsive CSS */}
        <style>
          {`
            .settings-grid {
              display: grid;
              grid-template-columns: 1fr;
              row-gap: 12px;
              column-gap: 24px;
            }

            @media (min-width: 600px) {
              .settings-grid {
                grid-template-columns: 1fr 1fr;
              }
            }
          `}
        </style>

        {/* PAGE HEADER */}
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.settings.hubTitle")}</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.settings.hubSubtitle")}</p>
        </div>

        {/* RESPONSIVE GRID */}
        <div className="settings-grid">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                {/* TEXT BLOCK — FULL WIDTH */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#111827",
                      lineHeight: "20px",
                    }}
                  >
                    {t(item.titleKey)}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "13px",
                      color: "#6B7280",
                      lineHeight: "18px",
                    }}
                  >
                    {t(item.descKey)}
                  </div>
                </div>

                {/* CHEVRON — ALIGNED WITH DESCRIPTION */}
                <ChevronRightIcon
                  style={{
                    width: "20px",
                    height: "20px",
                    color: "#DC2626",
                    flexShrink: 0,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
