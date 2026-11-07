// src/app/pages/profile/WelcomeAddDrivers.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";
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

  const afterWelcomePath = () =>
    safeWelcomeReturnTo || `/${clubSlug}/app/profile/drivers`;

  const { membership, loadingMembership } = useMembership();
  const { user, loadingProfile } = useProfile();
  const { refreshDrivers, drivers, loadingDrivers } = useDrivers();
  const { palette } = useTheme();

  const { t } = useTranslation();
  const brand = palette.primary;

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
      navigate(clubDriverSetupPath(clubSlug, safeWelcomeReturnTo));
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

      refreshDrivers();
      reloadMembers();

      navigate(clubDriverSetupPath(clubSlug, safeWelcomeReturnTo));
    } catch (err) {
      console.error("[WelcomeAddDrivers] handleAddPerson error", err);
      setError(t("drivers.welcomeGenericError"));
    } finally {
      setSaving(false);
    }
  };

  const rosterToShow = rosterAvailable ? rosterPeople : [];
  const rosterCheckboxDisabled = saving || loadingRoster;
  const hasRosterChoices = rosterToShow.length > 0;
  const selectedCount = selectedRosterIds.size;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle
        title={t("drivers.welcomeTitle")}
        style={{ color: brand }}
        centered
      />

      <main className="app-page-main space-y-12 flex flex-col !pt-8 !pb-16">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("drivers.welcomeSectionIntro")}</h2>

          <p className="text-sm text-gray-700">{t("drivers.welcomeIntroBody")}</p>

          <Card className="p-4 space-y-3 bg-yellow-300 text-black">
            <h3 className="text-md font-bold text-red-600">{t("drivers.welcomeLiveTimeTitle")}</h3>

            <p className="text-sm text-black">{t("drivers.welcomeLiveTimeExact")}</p>

            <p className="text-sm text-black">{t("drivers.welcomeLiveTimeVariation")}</p>
          </Card>
        </Card>

        {hasRosterChoices ? (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {t("drivers.welcomeRosterTitle", { club: club?.name || "" })}
            </h2>
            <p className="text-sm text-gray-700">{t("drivers.welcomeRosterHint")}</p>
            {loadingRoster ? (
              <p className="text-sm text-gray-600">{t("loading.loading")}</p>
            ) : (
              <ul className="space-y-3 m-0 p-0 list-none">
                {rosterToShow.map((p) => (
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
                        {p.is_junior ? ` (${t("settings.roster.junior")})` : ""}
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
          </Card>
        ) : null}

        <Card className="p-6 space-y-6">
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            {t("drivers.addManuallyLabel")}
          </p>

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
              {t("settings.roster.junior")}
            </label>

            <Button
              onClick={handleAddPerson}
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("drivers.addDriver")}
            </Button>
          </div>
        </Card>

        {membershipType === "family" && clubMembers.length > 0 ? (
          <Card className="p-6 space-y-4">
            <h3 className="text-md font-semibold">{t("drivers.welcomeHouseholdHeading")}</h3>

            <ul className="space-y-2">
              {clubMembers.map((m) => (
                <li key={m.id} className="text-sm">
                  {m.first_name} {m.last_name}{" "}
                  {m.is_junior ? `(${t("settings.roster.junior")})` : `(${t("drivers.welcomeAdultLabel")})`}{" "}
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
