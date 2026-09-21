import { useOutletContext } from "react-router-dom";
import Card from "@/components/ui/Card";
import { cmsStyles } from "../cms/styles";

export default function MembershipSettings() {
  const { club } = useOutletContext();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <header style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Membership Settings</h1>

          <p style={cmsStyles.sectionHeaderSubtitle}>
            Configure membership types, pricing, renewal rules, and account limits.
          </p>
        </header>

        {/* CARD — USING cmsStyles + canonical Card */}
        <Card
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <MembershipSettingsCard />
          </div>
        </Card>
      </div>
    </div>
  );
}
