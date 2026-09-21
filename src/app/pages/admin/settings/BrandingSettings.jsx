import { useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import BrandingSettingsCard from "./components/BrandingSettingsCard";

export default function BrandingSettings() {
  const navigate = useNavigate();
  const { club } = useClub();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <div style={cmsStyles.sectionHeaderWithActions}>
          <div style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>Branding Settings</h1>

            <p style={cmsStyles.sectionHeaderSubtitle}>
              Manage your platform name, logo, and brand colours.
            </p>
          </div>

          {/* BACK BUTTON */}
          <CMSButton
            variant="secondary"
            onClick={() => navigate("/chargers-rc/app/admin/settings")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "4px",
            }}
          >
            ← Back
          </CMSButton>
        </div>

        {/* CARD */}
        <CMSCard
          title="Branding"
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <BrandingSettingsCard club={club} />
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
