// src/app/pages/membership/membership-sections/MemberView.jsx

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function MemberView({ brand, club, membership }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  async function loadMembers() {
    if (!membership?.id) return;

    setLoadingMembers(true);

    const { data, error } = await supabase
      .from("club_members")
      .select("*")
      .eq("membership_id", membership.id)
      .order("first_name", { ascending: true });

    if (!error) setMembers(data || []);
    setLoadingMembers(false);
  }

  useEffect(() => {
    loadMembers();
  }, [membership?.id]);

  // First household member for thank‑you message
  const primaryMember = members?.[0];
  const firstName = primaryMember?.first_name;

  // Determine if user is Single or Junior
  const isSingleOrJunior =
    membership?.membership_type === "single" ||
    membership?.membership_type === "junior";

  return (
    <main className="max-w-[720px] mx-auto px-4 py-6 flex flex-col gap-8">

      {/* STATUS CARD */}
      <Card
        noPadding
        className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
        style={{
          border: `2px solid ${brand}`,
          background: "white",
          padding: 0,
        }}
      >
        {/* BLUE HEADER BAR */}
        <div
          className="px-5 py-3"
          style={{ background: brand, color: "white" }}
        >
          <h2 className="text-base font-semibold">Membership</h2>
        </div>

        {/* CENTERED CONTENT */}
        <div className="p-6 flex flex-col items-center text-center space-y-6">

          {/* CLUB MEMBER BADGE */}
          <img
            src={
              club?.member_badge_url ||
              "https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/Chargers/chargers-member-badge-01.png"
            }
            alt={`${club?.name} Member Badge`}
            style={{
              height: "200px",
              width: "200px",
              objectFit: "contain",
            }}
          />

          {/* THANK YOU MESSAGE */}
          {firstName && (
            <div className="space-y-1">
              <h2
                className="text-lg font-semibold"
                style={{ color: brand }}
              >
                Thank you {firstName},
              </h2>

              <p className="text-sm text-text-muted">
                Your support is helping make {club?.name} a stronger club.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* HOUSEHOLD MEMBERS */}
      <Card
        noPadding
        className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
        style={{
          border: `2px solid ${brand}`,
          background: "white",
        }}
      >
        <div
          className="px-5 py-3"
          style={{ background: brand, color: "white" }}
        >
          <h2 className="text-base font-semibold">Household Members</h2>
        </div>

        <div className="p-6 space-y-4">
          {loadingMembers && (
            <p className="text-sm text-text-muted">Loading…</p>
          )}

          {!loadingMembers && members.length === 0 && (
            <p className="text-sm text-text-muted">
              No household members have been added yet.
            </p>
          )}

          {!loadingMembers &&
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between border border-surfaceBorder rounded-lg p-3 bg-white"
              >
                <span className="font-medium">
                  {member.first_name} {member.last_name}
                </span>

                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{member.is_junior ? "Junior" : "Adult"}</span>
                  {member.driver_id && <span>• Driver</span>}
                </div>
              </div>
            ))}

          {/* PRIMARY BUTTON — Edit Members & Drivers */}
          <Button
            className="w-full !py-2.5 !text-sm"
            onClick={() => {
              window.location.href = `/${club.slug}/app/profile/drivers`;
            }}
          >
            Edit Members &amp; Drivers
          </Button>

          {/* SECONDARY BUTTON — Change Membership Type */}
          {isSingleOrJunior && (
            <Button
              variant="secondary"
              className="w-full !py-2.5 !text-sm"
              onClick={() => {
                window.location.href = `/${club.slug}/app/membership/renew`;
              }}
            >
              Change Membership Type
            </Button>
          )}

          {/* RENEW MEMBERSHIP BUTTON */}
          <Button
            variant="secondary"
            className="w-full !py-2.5 !text-sm"
            onClick={() => {
              window.location.href = `/${club.slug}/app/membership/renew`;
            }}
          >
            Renew Membership
          </Button>
        </div>
      </Card>
    </main>
  );
}
