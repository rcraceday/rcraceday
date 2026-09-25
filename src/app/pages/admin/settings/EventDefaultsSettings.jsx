import { useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "@cms/styles";
import CMSButton from "@cms/CMSButton";
import EventDefaultsSettingsCard from "./components/EventDefaultsSettingsCard";

export default function EventDefaultsSettings() {
  const navigate = useNavigate();
  const { club } = useClub();

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={cmsStyles.sectionHeaderTitle}>Event Defaults</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              Set default timing, nominations open/close, pricing, class limits, and
              nomination behaviour per event type and track. New events copy these values
              when both are selected.
            </p>
          </div>

          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${club?.slug}/app/admin/settings`)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          >
            ← Back
          </CMSButton>
        </div>

        <EventDefaultsSettingsCard club={club} />
      </div>
    </div>
  );
}
