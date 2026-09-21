import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";

export default function SystemSettings() {
  const { club } = useOutletContext();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>System Settings</h1>

          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure platform behaviour, defaults, and system‑level options.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <SystemSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
