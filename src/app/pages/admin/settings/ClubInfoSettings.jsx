import { useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { cmsStyles } from "../cms/styles";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import ClubInfoSettingsCard from "./components/ClubInfoSettingsCard";

export default function ClubInfoSettings() {
  const navigate = useNavigate();
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#F5F5F5",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          margin: "0 auto",
          padding: "20px 16px 32px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Club Info Settings
            </h1>

            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
                margin: 0,
              }}
            >
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
          style={{
            ...cmsStyles.card,
            borderLeft: `4px solid ${brand}`,
          }}
        >
          <div style={cmsStyles.cardBody}>
            <ClubInfoSettingsCard club={club} />
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
