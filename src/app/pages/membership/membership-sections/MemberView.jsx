// src/app/pages/membership/membership-sections/MemberView.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { canUpgradeMembershipToFamily } from "@/app/pages/profile/householdDriverLimits";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function MemberView({ brand, club, membership }) {
  const navigate = useNavigate();
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

  const showUpgradeToFamily = canUpgradeMembershipToFamily(
    membership?.membership_type
  );

  return (
    <main className="app-page-main flex flex-col gap-8 !py-6">

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

          {/* CLUB MEMBER BADGE — upload in Admin → Settings → Membership */}
          {club?.member_badge_url ? (
            <img
              src={club.member_badge_url}
              alt={`${club?.name} Member Badge`}
              style={{
                height: "200px",
                width: "200px",
                objectFit: "contain",
              }}
            />
          ) : (
            <p className="text-sm text-text-muted">
              Member badge not configured yet.
            </p>
          )}

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

          {showUpgradeToFamily && (
            <Button
              variant="secondary"
              className="w-full !py-2.5 !text-sm"
              onClick={() => navigate(`/${club.slug}/app/membership/upgrade`)}
            >
              Upgrade to Family Membership
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
            {membership?.is_life_member ? "Renew Membership (optional)" : "Renew Membership"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
