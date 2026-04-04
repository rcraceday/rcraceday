// src/app/pages/membership/NonMember.jsx

import { useNavigate, useParams } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useClub } from "@/app/providers/ClubProvider";

export default function NonMember() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const logo = club?.logo_url;

  return (
    <div className="min-h-screen w-full bg-background text-text-base flex flex-col items-center px-4 py-10">

      {/* Club Logo */}
      {logo && (
        <img
          src={logo}
          alt={`${club?.name} Logo`}
          style={{
            width: "120px",
            height: "auto",
            marginBottom: "20px",
          }}
        />
      )}

      {/* Membership Intro */}
      <Card
        style={{
          border: `2px solid ${brand}`,
          padding: "18px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
          MEMBERSHIP
        </h1>

        <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "16px" }}>
          Our members are the backbone of our club and becoming a member has its benefits!
        </p>

        <ul
          style={{
            textAlign: "left",
            fontSize: "14px",
            opacity: 0.9,
            lineHeight: 1.5,
            marginBottom: "16px",
          }}
        >
          <li>• 50% off race fees</li>
          <li>• Insurance coverage</li>
          <li>• Junior members race free</li>
          <li>• Access to RCRA sanctioned events</li>
          <li>• Helps increase the club’s profile for council and government investment</li>
          <li>• Voting rights at AGM</li>
        </ul>

        <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "16px" }}>
          Your membership and involvement is appreciated and valuable to the strength of our club.
        </p>

        <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "20px" }}>
          Our 2026 fees are listed below.
        </p>

        <Button
          variant="primary"
          className="!w-auto !px-6 !py-2 !text-sm !rounded-md"
          onClick={() => navigate(`/${clubSlug}/app/membership/join`)}
        >
          Join the Club
        </Button>
      </Card>
    </div>
  );
}
