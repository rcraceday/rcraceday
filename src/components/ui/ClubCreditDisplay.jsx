import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import {
  clubCreditExpiryTooltip,
  fetchNominationCreditSummary,
  formatAud,
} from "@/app/lib/eventCancellation";

export default function ClubCreditDisplay({ className = "" }) {
  const { t } = useTranslation();
  const { club } = useClub();
  const { membership } = useMembership();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!membership?.id || !club?.id) {
        setSummary(null);
        return;
      }
      const next = await fetchNominationCreditSummary(membership.id, club.id);
      if (!cancelled) setSummary(next);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [membership?.id, club?.id]);

  if (summary == null) return null;

  const tooltip = clubCreditExpiryTooltip(summary, club, t);
  const showTooltip = summary.balance > 0.005 && Boolean(tooltip);

  return (
    <p className={`m-0 text-sm ${className}`.trim()}>
      <span
        title={showTooltip ? tooltip : undefined}
        className={showTooltip ? "cursor-help" : undefined}
      >
        <span className="text-text-muted">{t("clubCredit.label")}</span>{" "}
        <span
          className={`font-semibold text-green-700 ${showTooltip ? "underline decoration-dotted decoration-green-700/50 underline-offset-2" : ""}`}
        >
          {formatAud(summary.balance)}
        </span>
      </span>
    </p>
  );
}