// src/app/pages/profile/UserProfile.jsx

import { useNavigate, useParams } from "react-router-dom";
import {
  IdentificationIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function UserProfile() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const { club } = useClub();
  const { profile } = useProfile();
  const { membership } = useMembership();
  const { drivers } = useDrivers();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const membershipLabel = membership
    ? membership.membership_type === "non_member"
      ? "Non-Member"
      : membership.membership_type === "junior"
      ? "Junior Membership"
      : membership.membership_type === "single"
      ? "Single Membership"
      : membership.membership_type === "family"
      ? "Family Membership"
      : "Membership"
    : "—";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <UserIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">User Profile</h1>
        </div>
      </section>

      {/* MAIN CONTENT */}
            <main className="max-w-3xl mx-auto px-4 pb-16 space-y-12 flex flex-col items-center">

        {/* ACCOUNT DETAILS */}
        <Card
          className="p-6 space-y-4 w-full text-center"
          style={{ border: `2px solid ${brand}` }}
        >
          <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
            <UserIcon className="h-5 w-5" style={{ color: brand }} />
            Account Details
          </h2>

          <div className="space-y-1">
            <p className="text-text-base font-medium">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-text-muted text-sm">{profile?.email}</p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              className="!w-auto !px-6 !py-1.5 !text-sm !rounded-md"
              onClick={() => navigate(`/${clubSlug}/app/profile/edit`)}
            >
              Edit User
            </Button>
          </div>
        </Card>

        {/* MEMBERSHIP */}
        <Card
          className="p-6 space-y-4 w-full text-center"
          style={{ border: `2px solid ${brand}` }}
        >
          <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
            <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
            Membership
          </h2>

          <p className="text-text-base font-medium">{membershipLabel}</p>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              className="!w-auto !px-6 !py-1.5 !text-sm !rounded-md"
              onClick={() => navigate(`/${clubSlug}/app/membership`)}
            >
              View Membership
            </Button>
          </div>
        </Card>

        {/* DRIVERS */}
        <Card
          className="p-6 space-y-4 w-full text-center"
          style={{ border: `2px solid ${brand}` }}
        >
          <h2 className="text-lg font-semibold flex items-center justify-center gap-2">
            <UsersIcon className="h-5 w-5" style={{ color: brand }} />
            Drivers on Account
          </h2>

          {drivers?.length > 0 ? (
            <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
              {drivers.map((d) => (
                <li key={d.id} style={{ fontSize: "14px", color: "var(--text-base)" }}>
                  {d.first_name} {d.last_name}
                  {d.is_junior && (
                    <span style={{ color: "var(--text-muted)" }}> (Junior)</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              No drivers added yet.
            </p>
          )}

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              className="!w-auto !px-6 !py-1.5 !text-sm !rounded-md"
              onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
            >
              Manage Drivers
            </Button>
          </div>
        </Card>

      </main>
    </div>
  );
}
