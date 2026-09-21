import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";

export default function UserSettings() {
  const { club } = useOutletContext();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>User Settings</h1>

          <p style={cmsStyles.sectionHeaderSubtitle}>
            Manage user defaults, preferences, and notification settings.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <UserSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
