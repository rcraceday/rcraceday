// src/app/pages/profile/WelcomeAddDrivers.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";
import { getJuniorCheckboxLabel, juniorTagInParens } from "@/app/lib/driverClubSettings";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import { isMissingPlatformPeopleTable } from "@/app/lib/platformPeople";
import {
  addClubDriverForPlatformPerson,
  driverAtClubMatchesPerson,
} from "@/app/lib/clubDriverFromPlatformPerson";

import Card from "@/components/ui/Card";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  clubDriverSetupPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function SimpleSpinner() {
  return (
    <div className="p-6 w-full" aria-live="polite">
      <p className="text-gray-600">Loading…</p>
    </div>
  );
}

export default function WelcomeAddDrivers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { club } = useClub();
  const clubSlug = club?.slug;

  const welcomeReturnTo = returnToFromSearch(searchParams);
  const safeWelcomeReturnTo = sanitizeClubAppReturnPath(welcomeReturnTo, clubSlug);

  const clubAppHome = `/${clubSlug}/app`;

  const afterWelcomePath = () => safeWelcomeReturnTo || clubAppHome;

  const navigateAfterDriverAdd = (wasFirstDriverAtClub) => {
    if (wasFirstDriverAtClub) {
      navigate(safeWelcomeReturnTo || clubAppHome, { replace: true });
      return;
    }
    navigate(clubDriverSetupPath(clubSlug, safeWelcomeReturnTo), { replace: true });
  };

  const { membership, loadingMembership } = useMembership();
  const { user, profile, loadingProfile } = useProfile();
  const { refreshDrivers, drivers, loadingDrivers } = useDrivers();
  const { palette } = useTheme();

  const { t } = useTranslation();
  const brand = palette.primary;
  const juniorParens = juniorTagInParens(club);
  const juniorCheckboxLabel = getJuniorCheckboxLabel(club);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [rosterPeople, setRosterPeople] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [rosterAvailable, setRosterAvailable] = useState(true);
  const [selectedRosterIds, setSelectedRosterIds] = useState(() => new Set());
  const rosterSelectionInitRef = useRef(false);
  const manualPrefillRef = useRef(false);
  const [showPrefillNote, setShowPrefillNote] = useState(false);
  const [hasDriversAtOtherClubs, setHasDriversAtOtherClubs] = useState(false);
  const [manualAddOpen, setManualAddOpen] = useState(false);

  const membershipType = membership?.membership_type;
  const membershipId = membership?.id;
  const isNonMember = membershipType === "non_member";

  const { maxAdults, maxJuniors } = resolveHouseholdLimits(club, membershipType);

  const driverList = useMemo(
    () => (Array.isArray(drivers) ? drivers : []),
    [drivers]
  );

  useEffect(() => {
    if (isNonMember) return;
    if (!membershipId) return;

    const loadMembers = async () => {
      setLoadingMembers(true);

      const { data } = await supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: true });

      if (data) setClubMembers(data);
      setLoadingMembers(false);
    };

    loadMembers();
  }, [membershipId, isNonMember]);

  useEffect(() => {
    if (!user?.id) {
      setLoadingRoster(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRoster(true);
      const { data, error: rosterErr } = await supabase
        .from("platform_people")
        .select("id, first_name, last_name, is_junior")
        .eq("user_id", user.id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (cancelled) return;

      if (rosterErr) {
        if (isMissingPlatformPeopleTable(rosterErr)) {
          setRosterAvailable(false);
          setRosterPeople([]);
        } else {
          console.warn("[WelcomeAddDrivers] roster load", rosterErr.message);
        }
        setLoadingRoster(false);
        return;
      }

      setRosterAvailable(true);
      setRosterPeople(data || []);
      setLoadingRoster(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !club?.id) {
      setHasDriversAtOtherClubs(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("drivers")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .neq("club_id", club.id);
      if (!cancelled) {
        setHasDriversAtOtherClubs(!error && (count ?? 0) > 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, club?.id]);

  useEffect(() => {
    if (manualPrefillRef.current) return;
    if (loadingRoster || loadingProfile || loadingDrivers) return;
    if (firstName.trim() || lastName.trim()) return;

    if (driverList.length > 0 && rosterPeople.length === 1) {
      const p = rosterPeople[0];
      if (p && !driverAtClubMatchesPerson(driverList, p)) {
        manualPrefillRef.current = true;
        setShowPrefillNote(true);
        setFirstName(String(p.first_name || "").trim());
        setLastName(String(p.last_name || "").trim());
        setIsJunior(!!p.is_junior);
        return;
      }
    }

    const fn = String(profile?.first_name || "").trim();
    const ln = String(profile?.last_name || "").trim();
    if (fn || ln) {
      manualPrefillRef.current = true;
      setShowPrefillNote(true);
      if (fn) setFirstName(fn);
      if (ln) setLastName(ln);
    }
  }, [
    loadingRoster,
    loadingProfile,
    loadingDrivers,
    rosterPeople,
    driverList,
    profile,
    firstName,
    lastName,
  ]);

  useEffect(() => {
    if (loadingDrivers || !rosterAvailable || rosterSelectionInitRef.current) return;
    if (!rosterPeople.length) return;

    const next = new Set();
    for (const p of rosterPeople) {
      if (!driverAtClubMatchesPerson(driverList, p)) {
        next.add(p.id);
      }
    }
    setSelectedRosterIds(next);
    rosterSelectionInitRef.current = true;
  }, [loadingDrivers, rosterAvailable, rosterPeople, driverList]);

  useEffect(() => {
    if (!drivers?.length) {
      setManualAddOpen(false);
    }
  }, [drivers?.length]);

  if (loadingProfile || loadingMembership || loadingMembers) {
    return <SimpleSpinner />;
  }

  const reloadMembers = async () => {
    if (isNonMember) return;
    if (!membershipId) return;

    const { data } = await supabase
      .from("club_members")
      .select("*")
      .eq("membership_id", membershipId)
      .order("created_at", { ascending: true });

    if (data) setClubMembers(data);
  };

  async function addDriverForNamedPerson({
    trimmedFirst,
    trimmedLast,
    isJun,
    platformPersonId = null,
  }) {
    return addClubDriverForPlatformPerson(
      {
        userId: user.id,
        club,
        membership,
        membershipType,
        isNonMember,
        clubMembers,
        driversAtClub: driverList,
        maxAdults,
        maxJuniors,
        t,
      },
      { trimmedFirst, trimmedLast, isJun, platformPersonId }
    );
  }

  const handleAddSelectedFromRoster = async () => {
    if (!user?.id || !selectedRosterIds.size) return;
    setSaving(true);
    setError("");

    const wasFirstDriverAtClub = driverList.length === 0;

    try {
      for (const id of selectedRosterIds) {
        const person = rosterPeople.find((p) => p.id === id);
        if (!person) continue;

        const result = await addDriverForNamedPerson({
          trimmedFirst: String(person.first_name || "").trim(),
          trimmedLast: String(person.last_name || "").trim(),
          isJun: !!person.is_junior,
          platformPersonId: person.id,
        });

        if (!result.ok) {
          setError(result.error || t("drivers.welcomeGenericError"));
          setSaving(false);
          return;
        }
      }

      await refreshDrivers();
      await reloadMembers();
      navigateAfterDriverAdd(wasFirstDriverAtClub);
    } catch (err) {
      console.error("[WelcomeAddDrivers] handleAddSelectedFromRoster", err);
      setError(t("drivers.welcomeGenericError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleRosterId = (id) => {
    setSelectedRosterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddPerson = async () => {
    setSaving(true);
    setError("");

    const wasFirstDriverAtClub = driverList.length === 0;

    try {
      if (!user) {
        setError(t("drivers.welcomeMustBeSignedIn"));
        return;
      }

      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      if (!trimmedFirst || !trimmedLast) {
        setError(t("drivers.welcomeNameRequired"));
        return;
      }

      const result = await addDriverForNamedPerson({
        trimmedFirst,
        trimmedLast,
        isJun: isJunior,
        platformPersonId: null,
      });

      if (!result.ok) {
        setError(result.error || t("drivers.welcomeGenericError"));
        return;
      }

      await refreshDrivers();
      reloadMembers();

      navigateAfterDriverAdd(wasFirstDriverAtClub);
    } catch (err) {
      console.error("[WelcomeAddDrivers] handleAddPerson error", err);
      setError(t("drivers.welcomeGenericError"));
    } finally {
      setSaving(false);
    }
  };

  const rosterNotAtClub = useMemo(() => {
    if (!rosterAvailable) return [];
    return rosterPeople.filter((p) => !driverAtClubMatchesPerson(driverList, p));
  }, [rosterAvailable, rosterPeople, driverList]);

  const rosterCheckboxDisabled = saving || loadingRoster;
  const hasClubDriver = driverList.length > 0;
  const showRosterFromAccount =
    rosterNotAtClub.length > 0 && (hasClubDriver || hasDriversAtOtherClubs);
  const selectedCount = selectedRosterIds.size;
  const showManualForm = !hasClubDriver || manualAddOpen;

  function openManualAdd() {
    setError("");
    setFirstName("");
    setLastName("");
    setIsJunior(false);
    setShowPrefillNote(false);
    manualPrefillRef.current = false;
    setManualAddOpen(true);
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle
        title={t("drivers.welcomeTitle", { club: club?.name || "" })}
        style={{ color: brand }}
        centered
      />

      <main className="app-page-main space-y-12 flex flex-col !pt-8 !pb-16">
        <Card className="p-6 space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold m-0">{t("drivers.welcomeSectionIntro")}</h2>
            <p className="text-sm text-gray-700 m-0">{t("drivers.welcomeIntroPara1")}</p>
            <p className="text-sm text-gray-700 m-0">{t("drivers.welcomeIntroPara2")}</p>
            <p className="text-sm text-gray-700 m-0">
              {t("drivers.welcomeIntroPara3", { club: club?.name || "" })}
            </p>
            <div
              className="rounded-lg p-4 space-y-2 border border-amber-300 bg-amber-50 text-gray-900"
              role="note"
            >
              <h3 className="text-sm font-bold text-red-700 m-0">{t("drivers.welcomeLiveTimeTitle")}</h3>
              <p className="text-sm m-0">{t("drivers.welcomeLiveTimeExact")}</p>
              <p className="text-sm m-0">{t("drivers.welcomeLiveTimeVariation")}</p>
            </div>
          </div>

          {showRosterFromAccount ? (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <h3 className="text-md font-semibold m-0">{t("drivers.welcomeRosterTitle")}</h3>
              <p className="text-sm text-gray-700 m-0">
                {t("drivers.welcomeRosterHint", { club: club?.name || "" })}
              </p>
              {loadingRoster ? (
                <p className="text-sm text-gray-600 m-0">{t("loading.loading")}</p>
              ) : (
                <ul className="space-y-3 m-0 p-0 list-none">
                  {rosterNotAtClub.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-start gap-3 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedRosterIds.has(p.id)}
                          disabled={rosterCheckboxDisabled}
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
              )}
              <Button
                type="button"
                onClick={handleAddSelectedFromRoster}
                disabled={saving || !selectedCount || loadingRoster}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("drivers.welcomeRosterAddSelected")}
              </Button>
            </div>
          ) : null}

          <div className="space-y-4 pt-2 border-t border-gray-200">
            {hasClubDriver ? (
              <div className="space-y-4">
                <h3 className="text-md font-semibold m-0">
                  {t("drivers.welcomeDriversAtClubTitle", { club: club?.name || "" })}
                </h3>
                <ul className="m-0 p-0 list-none space-y-2">
                  {driverList.map((d) => (
                    <li
                      key={d.id}
                      className="text-sm text-gray-800 py-2 px-3 rounded-md bg-gray-50 border border-gray-200"
                    >
                      {d.first_name} {d.last_name}
                      {d.is_junior ? juniorParens : ""}
                    </li>
                  ))}
                </ul>
                {!manualAddOpen ? (
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openManualAdd}
                      className="w-full"
                    >
                      {t("drivers.addAdditionalDriverButton")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate(afterWelcomePath())}
                      className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t("drivers.welcomeContinueToApp")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showManualForm ? (
              <div className="space-y-4">
                <h3 className="text-md font-semibold m-0">
                  {hasClubDriver
                    ? t("drivers.addAdditionalDriverLabel")
                    : t("drivers.addManuallyLabel")}
                </h3>
                <p className="text-sm text-gray-700 m-0">{t("drivers.welcomeManualHint")}</p>
                <p className="text-sm text-gray-700 m-0">{t("drivers.welcomeManualSaveHint")}</p>
                {showPrefillNote ? (
                  <p className="text-xs text-gray-600 m-0">{t("drivers.welcomeManualPrefillNote")}</p>
                ) : null}

                {error ? (
                  <div className="p-3 bg-red-100 text-red-700 rounded" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <Input
                    label={t("settings.account.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />

                  <Input
                    label={t("settings.account.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isJunior}
                      onChange={(e) => setIsJunior(e.target.checked)}
                    />
                    {juniorCheckboxLabel}
                  </label>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={handleAddPerson}
                      disabled={saving}
                      className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? t("common.saving") : t("drivers.addDriver")}
                    </Button>
                    {hasClubDriver ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => setManualAddOpen(false)}
                        className="w-full"
                      >
                        {t("drivers.welcomeCloseAdditionalForm")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        {membershipType === "family" && clubMembers.length > 0 ? (
          <Card className="p-6 space-y-4">
            <h3 className="text-md font-semibold">{t("drivers.welcomeHouseholdHeading")}</h3>

            <ul className="space-y-2">
              {clubMembers.map((m) => (
                <li key={m.id} className="text-sm">
                  {m.first_name} {m.last_name}{" "}
                  {m.is_junior ? juniorParens.trim() : `(${t("drivers.welcomeAdultLabel")})`}{" "}
                  {m.driver_id ? `– ${t("drivers.addDriver")}` : ""}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t("drivers.welcomeSaveContinue")}
            </Button>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
