import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";

export default function EventDefaultsSettings() {
  const { club } = useOutletContext();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Event Defaults Settings</h1>

          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure default event values, timings, limits, and behaviour.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <EventDefaultsSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
