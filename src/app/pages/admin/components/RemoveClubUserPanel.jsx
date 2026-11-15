import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";
import {
  adminRemoveUserFromClub,
  mapRemoveUserFromClubError,
} from "@/app/lib/adminRemoveUserFromClub";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";

const CONFIRM_TOKEN = "REMOVE";

export default function RemoveClubUserPanel({ userId, accountLabel, householdEmail }) {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { hasPermission, isFullAdmin } = useAdminAccess();

  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const canRemove = isFullAdmin || hasPermission("membership");

  const confirmOk = useMemo(() => {
    const trimmed = confirmText.trim().toUpperCase();
    return trimmed === CONFIRM_TOKEN;
  }, [confirmText]);

  if (!userId || !canRemove) return null;

  async function handleRemove() {
    if (!club?.id || !userId) return;
    if (!acknowledged || !confirmOk) return;

    const sure = window.confirm(t("admin.removeClubUser.confirmDialog"));
    if (!sure) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await adminRemoveUserFromClub(supabase, {
      clubId: club.id,
      userId,
    });

    setWorking(false);

    if (rpcError) {
      setError(mapRemoveUserFromClubError(rpcError, t));
      return;
    }

    navigate(`/${clubSlug}/app/admin/membership`, {
      replace: true,
      state: { status: t("admin.removeClubUser.success") },
    });
  }

  return (
    <CMSCard titleKey="admin.removeClubUser.cardTitle">
      <div style={{ display: "flex", flexDirection: "column", gap: cmsLayout.spacing.md }}>
        <p style={{ ...cmsLayout.muted, margin: 0 }}>{t("admin.removeClubUser.lead")}</p>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            color: "#991B1B",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <li>{t("admin.removeClubUser.warnPermanent")}</li>
          <li>{t("admin.removeClubUser.warnMembership")}</li>
          <li>{t("admin.removeClubUser.warnDrivers")}</li>
          <li>{t("admin.removeClubUser.warnNominations")}</li>
          <li>{t("admin.removeClubUser.warnMessages")}</li>
          <li>{t("admin.removeClubUser.warnFreshStart")}</li>
        </ul>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
          {t("admin.removeClubUser.target", {
            name: accountLabel || "—",
            email: householdEmail || "",
          })}
        </p>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>{t("admin.removeClubUser.acknowledge")}</span>
        </label>
        <CMSInput
          label={t("admin.removeClubUser.confirmLabel", { token: CONFIRM_TOKEN })}
          value={confirmText}
          onChange={setConfirmText}
          autoComplete="off"
        />
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        <div>
          <CMSButton
            type="button"
            disabled={working || !acknowledged || !confirmOk}
            onClick={handleRemove}
            style={{
              backgroundColor: working || !acknowledged || !confirmOk ? "#E5E7EB" : "#B91C1C",
              borderColor: "#991B1B",
              color: "#FFFFFF",
            }}
          >
            {working ? t("admin.removeClubUser.removing") : t("admin.removeClubUser.submit")}
          </CMSButton>
        </div>
        <p style={{ ...cmsLayout.muted, margin: 0, fontSize: 12 }}>
          {t("admin.removeClubUser.globalAccountNote")}
        </p>
      </div>
    </CMSCard>
  );
}