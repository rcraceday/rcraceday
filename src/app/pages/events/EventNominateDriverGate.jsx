import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@/app/i18n/I18nContext";
import useTheme from "@/app/providers/useTheme";
import { createHostClubVisitorDriver } from "@/app/lib/ensureHostClubVisitorDriver";
import { welcomeDriversPath, clubDriverSetupPath } from "@/app/lib/publicAuthRedirect";
import { isMissingPlatformPeopleTable } from "@/app/lib/platformPeople";
import { addClubDriverForPlatformPerson, driverAtClubMatchesPerson } from "@/app/lib/clubDriverFromPlatformPerson";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";
import { getJuniorCheckboxLabel, juniorTagInParens } from "@/app/lib/driverClubSettings";

export default function EventNominateDriverGate({
  userId,
  clubId,
  club,
  clubSlug,
  membership,
  driversAtClub = [],
  onDriverReady,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = `${location.pathname}${location.search || ""}`;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [rosterPeople, setRosterPeople] = useState([]);
  const [rosterAvailable, setRosterAvailable] = useState(true);
  const [selectedRosterIds, setSelectedRosterIds] = useState(() => new Set());
  const [clubMembers, setClubMembers] = useState([]);
  const driversAtClubRef = useRef(driversAtClub);
  driversAtClubRef.current = driversAtClub;

  const membershipType = membership?.membership_type;
  const isNonMember = membershipType === "non_member";
  const { maxAdults, maxJuniors } = useMemo(
    () => resolveHouseholdLimits(club, membershipType),
    [club, membershipType]
  );
  const juniorCheckboxLabel = getJuniorCheckboxLabel(club);
  const juniorParens = juniorTagInParens(club);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      if (membership?.id && membershipType === "family") {
        const { data } = await supabase
          .from("club_members")
          .select("*")
          .eq("membership_id", membership.id);
        if (!cancelled) setClubMembers(data || []);
      } else if (!cancelled) {
        setClubMembers([]);
      }

      const { data: rosterData, error: rosterErr } = await supabase
        .from("platform_people")
        .select("id, first_name, last_name, is_junior")
        .eq("user_id", userId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (!cancelled) {
        if (rosterErr) {
          if (isMissingPlatformPeopleTable(rosterErr)) {
            setRosterAvailable(false);
            setRosterPeople([]);
          } else {
            console.warn("[EventNominateDriverGate] roster", rosterErr.message);
            setRosterPeople([]);
          }
        } else {
          const people = rosterData || [];
          setRosterPeople(people);
          const next = new Set();
          for (const p of people) {
            if (!driverAtClubMatchesPerson(driversAtClubRef.current, p)) {
              next.add(p.id);
            }
          }
          setSelectedRosterIds(next);
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, membership?.id, membershipType]);

  const rosterAtClub = useMemo(() => {
    if (!rosterPeople.length) return [];
    return rosterPeople.filter((p) => !driverAtClubMatchesPerson(driversAtClub, p));
  }, [rosterPeople, driversAtClub]);

  function toggleRosterId(id) {
    setSelectedRosterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function finishAfterDrivers() {
    const loadedCount = (await onDriverReady?.()) ?? 0;
    if (loadedCount === 0) {
      setError(t("nominate.visitorDriverSaveFailed"));
      return false;
    }
    return true;
  }

  async function handleAddFromRoster() {
    setSaving(true);
    setError("");

    const ctx = {
      userId,
      club,
      membership,
      membershipType,
      isNonMember,
      clubMembers,
      driversAtClub,
      maxAdults,
      maxJuniors,
      t,
    };

    const selected = rosterPeople.filter((p) => selectedRosterIds.has(p.id));
    if (!selected.length) {
      setError(t("nominate.driverGateRosterNoneSelected"));
      setSaving(false);
      return;
    }

    let added = 0;
    for (const person of selected) {
      const result = await addClubDriverForPlatformPerson(ctx, {
        trimmedFirst: String(person.first_name || "").trim(),
        trimmedLast: String(person.last_name || "").trim(),
        isJun: !!person.is_junior,
        platformPersonId: person.id,
      });
      if (result.ok) added += 1;
      else if (!result.skipped) {
        setError(result.error || t("nominate.visitorDriverSaveFailed"));
        setSaving(false);
        return;
      }
    }

    if (!added) {
      setError(t("nominate.driverGateRosterNoneSelected"));
      setSaving(false);
      return;
    }

    const ok = await finishAfterDrivers();
    setSaving(false);
    if (!ok) return;

    if (selected.length > 0 && clubSlug) {
      navigate(clubDriverSetupPath(clubSlug, returnTo), { replace: true });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const result = await createHostClubVisitorDriver({
      userId,
      clubId,
      membership,
      firstName,
      lastName,
      isJunior,
    });

    if (!result.ok) {
      if (result.error === "duplicate_name") {
        setError(t("nominate.visitorDriverDuplicate"));
      } else if (result.error === "name_required") {
        setError(t("nominate.visitorDriverNameRequired"));
      } else {
        setError(result.error || t("nominate.visitorDriverSaveFailed"));
      }
      setSaving(false);
      return;
    }

    const ok = await finishAfterDrivers();
    setSaving(false);
    if (!ok) return;

    if (clubSlug) {
      navigate(clubDriverSetupPath(clubSlug, returnTo), { replace: true });
    }
  }

  function goWelcome() {
    if (!clubSlug) return;
    navigate(welcomeDriversPath(clubSlug, returnTo));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
        <PageTitle icon={ClipboardDocumentCheckIcon} title={t("nominate.title")} style={{ color: brand }} />
        <div style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "14px" }}>
          {t("nominate.loadingForm")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
      <PageTitle icon={ClipboardDocumentCheckIcon} title={t("nominate.title")} style={{ color: brand }} />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 12px 32px" }}>
        <Card>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
            {t("nominate.visitorDriverTitle")}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>
            {t("nominate.visitorDriverHint")}
          </p>

          {error ? (
            <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 12 }} role="alert">
              {error}
            </p>
          ) : null}

          {rosterAvailable && rosterAtClub.length > 0 ? (
            <div style={{ marginBottom: 20, textAlign: "left" }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>
                {t("nominate.driverGateRosterTitle")}
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563", lineHeight: 1.4 }}>
                {t("nominate.driverGateRosterHint")}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                {rosterAtClub.map((p) => (
                  <li key={p.id} style={{ marginBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedRosterIds.has(p.id)}
                        disabled={saving}
                        onChange={() => toggleRosterId(p.id)}
                      />
                      <span>
                        {p.first_name} {p.last_name}
                        {p.is_junior ? juniorParens : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                disabled={saving || !selectedRosterIds.size}
                onClick={handleAddFromRoster}
              >
                {saving ? t("nominate.saving") : t("nominate.driverGateRosterAdd")}
              </Button>
            </div>
          ) : null}

          <div style={{ marginBottom: 16 }}>
            <Button type="button" variant="secondary" disabled={saving} onClick={goWelcome}>
              {t("nominate.driverGateOpenWelcome")}
            </Button>
          </div>

          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
            {t("nominate.driverGateManualLead")}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input
                label={t("nominate.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label={t("nominate.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={isJunior}
                  disabled={saving}
                  onChange={(e) => setIsJunior(e.target.checked)}
                />
                {juniorCheckboxLabel}
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? t("nominate.saving") : t("nominate.visitorDriverContinue")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
