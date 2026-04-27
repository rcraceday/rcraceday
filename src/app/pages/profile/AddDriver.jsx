// src/app/pages/profile/AddDriver.jsx

import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useDrivers } from "@/app/providers/DriverProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function SimpleSpinner() {
  return (
    <div className="p-6 max-w-[720px] mx-auto" aria-live="polite">
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
  const { refreshDrivers } = useDrivers();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);

  // Only visible for MEMBERS
  const [isMemberOnly, setIsMemberOnly] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      await refreshDrivers();
      navigate(`/${clubSlug}/app`);
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

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Add Driver</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-[720px] mx-auto px-4 py-10 space-y-10">

        <Card
          className="p-6 space-y-6"
          style={{ border: `2px solid ${brand}` }}
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
