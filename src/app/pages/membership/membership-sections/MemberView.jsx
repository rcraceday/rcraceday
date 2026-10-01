// src/app/pages/membership/membership-sections/MemberView.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { canUpgradeMembershipToFamily } from "@/app/pages/profile/householdDriverLimits";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function MemberView({ brand, club, membership }) {
  const { t } = useTranslation();
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
          <h2 className="text-base font-semibold">{t("membershipUi.membership")}</h2>
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
            <p className="text-sm text-text-muted">{t("membershipUi.badgeNotConfigured")}</p>
          )}

          {/* THANK YOU MESSAGE */}
          {firstName && (
            <div className="space-y-1">
              <h2
                className="text-lg font-semibold"
                style={{ color: brand }}
              >
                {t("membershipUi.thankYou", { name: firstName })}
              </h2>

              <p className="text-sm text-text-muted">
                {t("membershipUi.supportMessage", { clubName: club?.name })}
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
          <h2 className="text-base font-semibold">{t("membershipUi.householdMembersTitle")}</h2>
        </div>

        <div className="p-6 space-y-4">
          {loadingMembers && (
            <p className="text-sm text-text-muted">{t("loading.loading")}</p>
          )}

          {!loadingMembers && members.length === 0 && (
            <p className="text-sm text-text-muted">{t("membershipUi.noHouseholdMembers")}</p>
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
                  <span>{member.is_junior ? t("membershipUi.junior") : t("membershipUi.adult")}</span>
                  {member.driver_id && <span>• {t("driverUi.driverBadge")}</span>}
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
            {t("membershipUi.editMembersDrivers")}
          </Button>

          {showUpgradeToFamily && (
            <Button
              variant="secondary"
              className="w-full !py-2.5 !text-sm"
              onClick={() => navigate(`/${club.slug}/app/membership/upgrade`)}
            >
              {t("membershipUi.upgradeFamily")}
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
            {membership?.is_life_member ? t("membershipUi.renewOptional") : t("membershipUi.renewMembership")}
          </Button>
        </div>
      </Card>
    </main>
  );
}
