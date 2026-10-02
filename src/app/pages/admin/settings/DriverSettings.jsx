import { useNavigate, useParams } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSButton from "@cms/CMSButton";
import DriverSettingsCard from "./components/DriverSettingsCard";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function DriverSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.settings.driver")}</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.settings.driverDesc")}</p>
          </header>

          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${clubSlug}/app/admin/settings`)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          >
            ← Back
          </CMSButton>
        </div>

        <DriverSettingsCard club={club} />
      </div>
    </div>
  );
}
