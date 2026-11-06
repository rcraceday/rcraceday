import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { claimHouseholdMembership } from "@/app/lib/claimClubMembership";
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";
import {
  platformHomePath,
  publicClaimMembershipPath,
  resolvePostAuthAppPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";
import { isMissingPlatformPeopleTable } from "@/app/lib/platformPeople";
import {
  addClubDriverForPlatformPerson,
  driverAtClubMatchesPerson,
} from "@/app/lib/clubDriverFromPlatformPerson";

export default function ClaimMembership() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const { user, loadingUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [membershipEmail, setMembershipEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [checkingLoginEmail, setCheckingLoginEmail] = useState(true);

  const [step, setStep] = useState("claim");
  const [claimedMembership, setClaimedMembership] = useState(null);
  const [rosterPeople, setRosterPeople] = useState([]);
  const [rosterAvailable, setRosterAvailable] = useState(true);
  const [loadingRosterContext, setLoadingRosterContext] = useState(false);
  const [selectedRosterIds, setSelectedRosterIds] = useState(() => new Set());
  const rosterInitRef = useRef(false);
  const [driversAtClub, setDriversAtClub] = useState([]);
  const [clubMembersForLimits, setClubMembersForLimits] = useState([]);
  const [provisioningRoster, setProvisioningRoster] = useState(false);

  const returnTo = returnToFromSearch(searchParams);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, clubSlug);
  const loginEmail = user?.email || "";
  const logoSrc = club?.logo_url || club?.logo || null;

  const goToAppAfterClaim = useCallback(() => {
    navigate(
      resolvePostAuthAppPath({
        clubSlug,
        firstLogin: true,
        returnTo: safeReturnTo,
      })
    );
  }, [clubSlug, navigate, safeReturnTo]);

  const isNonMemberClaim =
    claimedMembership?.membership_type === "non_member";

  const { maxAdults, maxJuniors } = useMemo(
    () => resolveHouseholdLimits(club, claimedMembership?.membership_type),
    [club, claimedMembership?.membership_type]
  );

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      navigate(
        platformHomePath(publicClaimMembershipPath(clubSlug, safeReturnTo)),
        { replace: true }
      );
      return;
    }
    setCheckingLoginEmail(false);
  }, [loadingUser, user, clubSlug, navigate, safeReturnTo]);

  useEffect(() => {
    if (!loginEmail || membershipEmail) return;
    setMembershipEmail(loginEmail);
  }, [loginEmail, membershipEmail]);

  useEffect(() => {
    if (step !== "roster" || !claimedMembership?.id || !user?.id || !club?.id) {
      return;
    }
    let cancelled = false;
    rosterInitRef.current = false;

    (async () => {
      setLoadingRosterContext(true);
      setErrorMsg("");

      const [
        { data: rosterData, error: rosterErr },
        driversQuery,
        membersResult,
      ] = await Promise.all([
        supabase
          .from("platform_people")
          .select("id, first_name, last_name, is_junior")
          .eq("user_id", user.id)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
        isNonMemberClaim
          ? supabase
              .from("drivers")
              .select("*")
              .eq("club_id", club.id)
              .eq("created_by", user.id)
          : supabase
              .from("drivers")
              .select("*")
              .eq("club_id", club.id)
              .eq("membership_id", claimedMembership.id),
        claimedMembership.membership_type === "family"
          ? supabase
              .from("club_members")
              .select("*")
              .eq("membership_id", claimedMembership.id)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;

      if (rosterErr) {
        if (isMissingPlatformPeopleTable(rosterErr)) {
          setRosterAvailable(false);
          setRosterPeople([]);
          setLoadingRosterContext(false);
          goToAppAfterClaim();
          return;
        }
        setErrorMsg(rosterErr.message || t("claimMembership.failed"));
        setLoadingRosterContext(false);
        goToAppAfterClaim();
        return;
      }

      setRosterAvailable(true);
      setRosterPeople(rosterData || []);

      const { data: driverRows, error: driversErr } = driversQuery;
      if (driversErr) {
        console.warn("[ClaimMembership] drivers load", driversErr.message);
        setDriversAtClub([]);
      } else {
        setDriversAtClub(driverRows || []);
      }

      const { data: memberRows } = membersResult;
      setClubMembersForLimits(memberRows || []);

      setLoadingRosterContext(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    step,
    claimedMembership,
    user?.id,
    club?.id,
    isNonMemberClaim,
    goToAppAfterClaim,
    t,
  ]);

  useEffect(() => {
    if (
      step !== "roster" ||
      !rosterAvailable ||
      loadingRosterContext ||
      rosterInitRef.current
    ) {
      return;
    }
    if (!rosterPeople.length) {
      rosterInitRef.current = true;
      goToAppAfterClaim();
      return;
    }

    const next = new Set();
    for (const p of rosterPeople) {
      if (!driverAtClubMatchesPerson(driversAtClub, p)) {
        next.add(p.id);
      }
    }
    setSelectedRosterIds(next);
    rosterInitRef.current = true;
  }, [
    step,
    rosterAvailable,
    loadingRosterContext,
    rosterPeople,
    driversAtClub,
    goToAppAfterClaim,
  ]);

  async function handleClaim(e) {
    e.preventDefault();
    setErrorMsg("");

    const email = membershipEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg(t("signup.enterClubEmail"));
      return;
    }

    setLoading(true);
    const result = await claimHouseholdMembership({
      clubId: club.id,
      membershipEmail: email,
    });
    setLoading(false);

    if (!result.ok) {
      const key = {
        not_found: "claimMembership.notFound",
        already_linked: "claimMembership.alreadyLinked",
        already_has_membership: "claimMembership.alreadyHasMembership",
      }[result.error];
      setErrorMsg(t(key || "claimMembership.failed"));
      return;
    }

    setClaimedMembership(result.membership);
    setStep("roster");
  }

  async function handleContinueVisitor() {
    setErrorMsg("");
    setContinuing(true);
    await reconcileClubAccess({
      user,
      club,
      clubSlug,
      navigate,
      returnTo: safeReturnTo,
      skipMembershipClaim: true,
      onError: (message) => setErrorMsg(message),
    });
    setContinuing(false);
  }

  async function handleAddSelectedRoster() {
    if (!user?.id || !claimedMembership || !selectedRosterIds.size) return;
    setProvisioningRoster(true);
    setErrorMsg("");

    try {
      for (const id of selectedRosterIds) {
        const person = rosterPeople.find((p) => p.id === id);
        if (!person) continue;

        const result = await addClubDriverForPlatformPerson(
          {
            userId: user.id,
            club,
            membership: isNonMemberClaim ? null : claimedMembership,
            membershipType: claimedMembership.membership_type,
            isNonMember: isNonMemberClaim,
            clubMembers: clubMembersForLimits,
            driversAtClub,
            maxAdults,
            maxJuniors,
            t,
          },
          {
            trimmedFirst: String(person.first_name || "").trim(),
            trimmedLast: String(person.last_name || "").trim(),
            isJun: !!person.is_junior,
            platformPersonId: person.id,
          }
        );

        if (!result.ok) {
          setErrorMsg(result.error || t("drivers.welcomeGenericError"));
          setProvisioningRoster(false);
          return;
        }
      }

      goToAppAfterClaim();
    } catch (err) {
      console.error("[ClaimMembership] roster provision", err);
      setErrorMsg(t("drivers.welcomeGenericError"));
    } finally {
      setProvisioningRoster(false);
    }
  }

  function toggleRosterId(id) {
    setSelectedRosterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSkipRoster() {
    goToAppAfterClaim();
  }

  if (loadingUser || !club || checkingLoginEmail || !user) {
    return <div style={{ padding: "24px", textAlign: "center" }}>{t("loading.loading")}</div>;
  }

  if (step === "roster" && rosterAvailable && loadingRosterContext) {
    return <div style={{ padding: "24px", textAlign: "center" }}>{t("loading.loading")}</div>;
  }

  if (step === "roster" && rosterAvailable && rosterPeople.length > 0) {
    const busy = provisioningRoster || continuing;
    const selectedCount = selectedRosterIds.size;

    return (
      <div className="public-auth">
        {logoSrc ? <img src={logoSrc} alt={club.name} className="public-auth-logo" /> : null}

        <h1 className="public-auth-title">{t("claimMembership.rosterTitle", { club: club.name })}</h1>
        <p className="public-auth-lead">{t("claimMembership.rosterHint")}</p>

        {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}

        <div className="public-auth-form" style={{ textAlign: "left" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
            {rosterPeople.map((p) => (
              <li key={p.id} style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRosterIds.has(p.id)}
                    disabled={busy}
                    onChange={() => toggleRosterId(p.id)}
                  />
                  <span>
                    {p.first_name} {p.last_name}
                    {p.is_junior ? ` (${t("settings.roster.junior")})` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            variant="primary"
            disabled={busy || !selectedCount}
            onClick={handleAddSelectedRoster}
          >
            {provisioningRoster ? t("common.saving") : t("claimMembership.rosterAddSelected")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={handleSkipRoster}>
            {t("claimMembership.rosterSkip")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-auth">
      {logoSrc ? <img src={logoSrc} alt={club.name} className="public-auth-logo" /> : null}

      <h1 className="public-auth-title">{t("claimMembership.title")}</h1>
      <p className="public-auth-lead">
        {t("claimMembership.signedInAs", { email: loginEmail })}
      </p>
      <p className="public-auth-lead">
        {t("claimMembership.membershipEmailHelp", { clubName: club.name })}
      </p>

      {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}

      <form onSubmit={handleClaim} className="public-auth-form">
        <Input
          label={t("claimMembership.membershipEmail")}
          type="email"
          value={membershipEmail}
          onChange={(e) => setMembershipEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" disabled={loading || continuing}>
          {loading ? t("claimMembership.linking") : t("claimMembership.submit")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || continuing}
          onClick={handleContinueVisitor}
        >
          {continuing ? t("claimMembership.continuing") : t("claimMembership.continueVisitor")}
        </Button>
      </form>
    </div>
  );
}
