import { Navigate, useNavigate, useParams } from "react-router-dom";
import { cmsStyles } from "../cms/styles";
import CMSButton from "@cms/CMSButton";
import UserSettingsCard from "./components/UserSettingsCard";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";

export default function UserSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { loadingAdminAccess, canManageAdminUsers } = useAdminAccess();

  if (!loadingAdminAccess && !canManageAdminUsers) {
    return <Navigate to={`/${clubSlug}/app/admin/settings`} replace />;
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.settings.user")}</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.settings.usersDesc")}</p>
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
            ← {t("common.back")}
          </CMSButton>
        </div>

        <UserSettingsCard />
      </div>
    </div>
  );
}
