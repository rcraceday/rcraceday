// src/app/pages/profile/AddDriver.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useTheme from "@/app/providers/useTheme";
import {
  canAddHouseholdDriver,
} from "@/app/pages/profile/householdDriverLimits";
import { resolveHouseholdLimits } from "@/app/lib/membershipClubLimits";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";

function SimpleSpinner() {
  return (
    <div className="p-6 w-full" aria-live="polite">
      <p className="text-gray-600">Loading…</p>
    </div>
  );
}

export default function AddDriver() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const clubSlug = club?.slug;

  const { membership, loadingMembership } = useMembership();
  const { user, loadingProfile } = useProfile();
  const { drivers, refreshDrivers } = useDrivers();
  const { palette } = useTheme();

  const brand = palette.primary;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);
  const [clubMembers, setClubMembers] = useState([]);

  // Only visible for MEMBERS
  const [isMemberOnly, setIsMemberOnly] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { maxAdults, maxJuniors } = resolveHouseholdLimits(
    club,
    membership?.membership_type
  );

  useEffect(() => {
    if (!membership?.id || membership?.membership_type !== "family") {
      setClubMembers([]);
      return;
    }

    supabase
      .from("club_members")
      .select("*")
      .eq("membership_id", membership.id)
      .then(({ data }) => setClubMembers(data || []));
  }, [membership?.id, membership?.membership_type]);

  if (loadingProfile || loadingMembership) {
    return <SimpleSpinner />;
  }

  const membershipTypeRaw =
    membership?.membership_type || membership?.type || membership?.plan;

  const membershipType = membershipTypeRaw
    ? membershipTypeRaw.toLowerCase().trim()
    : null;

  const isNonMember = membershipType === "non_member";

  const handleSubmit = async () => {
    setSaving(true);
    setError("");

    if (!user) {
      setError("You must be logged in to add a driver.");
      setSaving(false);
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setError("First and last name are required.");
      setSaving(false);
      return;
    }

    if (
      !canAddHouseholdDriver({
        membershipType,
        isJunior,
        drivers,
        clubMembers,
        maxAdults,
        maxJuniors,
      })
    ) {
      if (membershipType === "family" || membershipType === "non_member") {
        setError(
          isJunior
            ? `Your club allows a maximum of ${maxJuniors} junior drivers for your household.`
            : `Your club allows a maximum of ${maxAdults} adult drivers for your household.`
        );
      } else {
        setError("Your membership only allows one driver profile.");
      }
      setSaving(false);
      return;
    }

    // ------------------------------------------------------
    // NON‑MEMBER FLOW (driver only, no club_members)
    // ------------------------------------------------------
    if (isNonMember) {
      const { error: insertError } = await supabase
        .from("drivers")
        .insert({
          membership_id: null,
          club_id: club.id,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          is_junior: isJunior,
          created_by: user.id,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      await refreshDrivers();
      navigate(`/${clubSlug}/app/profile/drivers`);
      return;
    }

    // ------------------------------------------------------
    // MEMBER FLOW — MEMBER‑ONLY (NO DRIVER)
    // ------------------------------------------------------
    if (isMemberOnly) {
      const { error: insertMemberError } = await supabase
        .from("club_members")
        .insert({
          membership_id: membership.id,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          is_junior: isJunior,
          driver_id: null,
        });

      if (insertMemberError) {
        setError(insertMemberError.message);
        setSaving(false);
        return;
      }

      navigate(`/${clubSlug}/app/profile/drivers`);
      return;
    }

    // ------------------------------------------------------
    // MEMBER FLOW — DRIVER CREATION
    // ------------------------------------------------------

    // 1. Check for existing driver with same name
    const { data: existing, error: lookupError } = await supabase
      .from("drivers")
      .select("id")
      .eq("first_name", trimmedFirst)
      .eq("last_name", trimmedLast);

    if (lookupError) {
      setError("Error checking existing drivers.");
      setSaving(false);
      return;
    }

    if (existing && existing.length > 0) {
      setError(
        "This driver name already exists in the ChargersRC system. " +
          "LiveTime requires unique First + Last names. " +
          "If this driver has raced before, please check the exact spelling used previously. " +
          "If the spelling differs in any way, LiveTime will create a new racer and previous results or seeding will not carry over."
      );
      setSaving(false);
      return;
    }

    // 2. Create driver
    const { data: driver, error: insertError } = await supabase
      .from("drivers")
      .insert({
        membership_id: membership.id,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJunior,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    // ⭐ 3. ALWAYS INSERT A NEW CLUB MEMBER ROW (correct behaviour)
    await supabase.from("club_members").insert({
      membership_id: membership.id,
      driver_id: driver.id,
      first_name: trimmedFirst,
      last_name: trimmedLast,
      is_junior: isJunior,
    });

    // 4. Reconcile number
    await supabase.rpc("reconcile_driver_number", {
      p_club_id: club.id,
      p_driver_id: driver.id,
      p_first_name: trimmedFirst,
      p_last_name: trimmedLast,
    });

    await refreshDrivers();

    navigate(`/${clubSlug}/app/profile/drivers`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle title="Add Driver" style={{ color: brand }} />

      {/* MAIN */}
      <main className="app-page-main space-y-10">

        <Card
          className="p-6 space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <Input
            label="Last Name"
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
            Junior
          </label>

          {/* Only show for MEMBERS */}
          {!isNonMember && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMemberOnly}
                onChange={(e) => setIsMemberOnly(e.target.checked)}
              />
              Non‑Driver Member (does not race)
            </label>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Adding…"
              : isNonMember
              ? "Add Driver"
              : isMemberOnly
              ? "Add Member"
              : "Add Driver"}
          </Button>
        </Card>
      </main>
    </div>
  );
}
