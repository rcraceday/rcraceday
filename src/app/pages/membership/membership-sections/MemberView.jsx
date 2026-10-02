// src/app/pages/membership/membership-sections/MemberView.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { canUpgradeMembershipToFamily } from "@/app/pages/profile/householdDriverLimits";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/app/i18n/I18nContext";

function membershipTypeLabel(membership, t) {
  const key = (membership?.membership_type || "").toLowerCase();
  if (key === "junior") return t("membershipUi.typeJunior");
  if (key === "family") return t("membershipUi.typeFamily");
  if (key === "adult" || key === "single") return t("membershipUi.typeSingle");
  return t("membershipUi.typeGeneric");
}

function statusLabel(membership, t) {
  const key = (membership?.status || "").toLowerCase();
  if (key === "expired") return t("membershipUi.statusExpired");
  if (key === "active" || key === "current") return t("membershipUi.statusActive");
  return membership?.status || t("membershipUi.statusActive");
}

function formatExpiry(endDate) {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MemberView({ brand, club, membership }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const clubSlug = club?.slug;

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

  const primaryMember = members?.[0];
  const firstName = primaryMember?.first_name;
  const isLifeMember = membership?.is_life_member === true;
  const showUpgradeToFamily = canUpgradeMembershipToFamily(membership?.membership_type);
  const expiryText = formatExpiry(membership?.end_date);

  const statusKey = (membership?.status || "").toLowerCase();
  const statusPillClass =
    statusKey === "expired"
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-50 text-emerald-800";

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) =>
      String(a.first_name || "").localeCompare(String(b.first_name || ""))
    );
  }, [members]);

  return (
    <main className="app-page-main flex flex-col gap-6 !py-6 max-w-lg mx-auto w-full">
      <Card className="p-6 sm:p-8 flex flex-col items-center text-center gap-5">
        {club?.member_badge_url ? (
          <img
            src={club.member_badge_url}
            alt={t("membershipUi.clubLogoAlt", { name: club?.name })}
            className="h-40 w-40 sm:h-48 sm:w-48 object-contain"
          />
        ) : (
          <p className="text-sm text-text-muted m-0">{t("membershipUi.badgeNotConfigured")}</p>
        )}

        {isLifeMember && (
          <p
            className="m-0 text-sm font-bold tracking-wide uppercase px-4 py-1.5 rounded-full"
            style={{
              color: "#92400E",
              backgroundColor: "#FFFBEB",
              border: "1px solid #FCD34D",
            }}
          >
            {t("membershipUi.lifeMemberTitle")}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: `${brand}14`, color: brand }}
          >
            {membershipTypeLabel(membership, t)}
          </span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusPillClass}`}>
            {statusLabel(membership, t)}
          </span>
        </div>

        {expiryText && !isLifeMember && (
          <p className="text-sm text-text-muted m-0">
            {t("membershipUi.expiresOn")} {expiryText}
          </p>
        )}

        {firstName && (
          <div className="space-y-1 pt-1">
            <p className="text-lg font-semibold m-0" style={{ color: brand }}>
              {t("membershipUi.thankYou", { name: firstName })}
            </p>
            <p className="text-sm text-text-muted m-0">
              {t("membershipUi.supportMessage", { clubName: club?.name })}
            </p>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted m-0">
          {t("membershipUi.householdMembersTitle")}
        </h2>

        {loadingMembers && (
          <p className="text-sm text-text-muted m-0">{t("loading.loading")}</p>
        )}

        {!loadingMembers && sortedMembers.length === 0 && (
          <p className="text-sm text-text-muted m-0">{t("membershipUi.noHouseholdMembers")}</p>
        )}

        {!loadingMembers && sortedMembers.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {sortedMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-surfaceBorder bg-slate-50/80 px-3 py-2.5"
              >
                <span className="font-medium text-sm">
                  {member.first_name} {member.last_name}
                </span>
                <span className="text-xs text-text-muted shrink-0">
                  {member.is_junior ? t("membershipUi.junior") : t("membershipUi.adult")}
                  {member.driver_id ? ` · ${t("driverUi.driverBadge")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="w-full !py-2.5 !text-sm"
            onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
          >
            {t("membershipUi.editMembersDrivers")}
          </Button>

          {showUpgradeToFamily && (
            <Button
              variant="secondary"
              className="w-full !py-2.5 !text-sm"
              onClick={() => navigate(`/${clubSlug}/app/membership/upgrade`)}
            >
              {t("membershipUi.upgradeFamily")}
            </Button>
          )}

          <Button
            variant="secondary"
            className="w-full !py-2.5 !text-sm"
            onClick={() => navigate(`/${clubSlug}/app/membership/renew`)}
          >
            {isLifeMember
              ? t("membershipUi.renewOptional")
              : t("membershipUi.renewMembership")}
          </Button>
        </div>
      </Card>
    </main>
  );
}
