import { useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import ClubInfoSettingsCard from "./components/ClubInfoSettingsCard";

export default function ClubInfoSettings() {
  const navigate = useNavigate();
  const { club } = useClub();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        {/* HEADER */}
        <div style={cmsStyles.sectionHeaderWithActions}>
          <div style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>Club Info Settings</h1>

            <p style={cmsStyles.sectionHeaderSubtitle}>
              Manage your club name, contact details, and public information.
            </p>
          </div>

          {/* BACK BUTTON */}
          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${club.slug}/app/admin/settings`)}
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
          title="Club Information"
          style={cmsStyles.card}
        >
          <div style={cmsStyles.cardBody}>
            <ClubInfoSettingsCard club={club} />
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
