import { useNavigate, useParams } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function SettingsComingSoon({ title, subtitle }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();
  const slug = clubSlug || club?.slug;

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>{title}</h1>
            {subtitle ? (
              <p style={cmsStyles.sectionHeaderSubtitle}>{subtitle}</p>
            ) : null}
          </header>

          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${slug}/app/admin/settings`)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          >
            ← {t("common.back")}
          </CMSButton>
        </div>

        <CMSCard title={t("admin.settings.comingSoon")} style={cmsStyles.card}>
          <p style={{ ...cmsStyles.sectionHeaderSubtitle, margin: 0 }}>
            {t("admin.settings.comingSoonBody")}
          </p>
        </CMSCard>
      </div>
    </div>
  );
}
