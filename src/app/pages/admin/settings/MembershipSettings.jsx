import { useNavigate, useParams } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSButton from "@cms/CMSButton";
import MembershipSettingsCard from "./components/MembershipSettingsCard";

export default function MembershipSettings() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>Membership Settings</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              Badge, household rules, access, and pricing for each membership type.
            </p>
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

        <MembershipSettingsCard club={club} />
      </div>
    </div>
  );
}
