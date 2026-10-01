import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSSettings() {
  const { t } = useTranslation();
  const { club } = useOutletContext();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>CMS Settings</h1>

          <p style={cmsStyles.sectionHeaderSubtitle}>
            Manage public‑facing pages, content blocks, and CMS configuration.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <CMSSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
