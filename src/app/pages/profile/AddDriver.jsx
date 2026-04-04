// src/app/pages/profile/AddDriver.jsx
import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { UserPlusIcon } from "@heroicons/react/24/solid";

function SimpleSpinner() {
  return (
    <div className="p-6 max-w-3xl mx-auto" aria-live="polite">
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

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const capitalise = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  // HYDRATION GUARD
  if (loadingProfile || loadingMembership) {
    return <SimpleSpinner />;
  }

  const handleAddDriver = async () => {
    setSaving(true);
    setError("");

    if (!membership) {
      setError("No active membership found.");
      setSaving(false);
      return;
    }

    if (!user) {
      setError("You must be logged in to add a driver.");
      setSaving(false);
      return;
    }

    const trimmedFirst = capitalise(firstName.trim());
    const trimmedLast = capitalise(lastName.trim());

    if (!trimmedFirst || !trimmedLast) {
      setError("First and last name are required.");
      setSaving(false);
      return;
    }

    // LIVE TIME NAME VALIDATION
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

    // INSERT DRIVER — ⭐ FIXED: added club_id
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

    // ⭐ NEW — MID-SEASON NUMBER RECONCILIATION
    await supabase.rpc("reconcile_driver_number", {
      p_club_id: club.id,
      p_driver_id: driver.id,
      p_first_name: trimmedFirst,
      p_last_name: trimmedLast,
    });

    // ⭐ NEW — Reload driver to get permanent_number
    const { data: refreshed } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driver.id)
      .single();

    // ⭐ Navigate to EditDriver with synced number
    navigate(`/${clubSlug}/app/profile/drivers/${driver.id}/edit`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <UserPlusIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Add Driver</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-3xl mx-auto px-4 space-y-12 pb-10 flex flex-col">

        {/* FORM CARD WITH BLUE BORDER */}
        <Card
          className="p-6 space-y-6"
          style={{ border: `2px solid ${brand}` }}
        >
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">

            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(capitalise(e.target.value))}
              required
            />

            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(capitalise(e.target.value))}
              required
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isJunior}
                onChange={(e) => setIsJunior(e.target.checked)}
              />
              Junior Driver
            </label>

            <Button
              onClick={handleAddDriver}
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Driver"}
            </Button>
          </div>
        </Card>

        {/* EXPLANATION */}
        <Card className="p-6 space-y-3 text-sm text-gray-700">
          <h2 className="font-semibold text-base">Important for Returning Racers</h2>
          <p>
            If this driver has raced with LiveTime before, their <strong>first and last
            name must match exactly</strong> as it appears in LiveTime.
          </p>
          <p>
            Even small differences — spelling, spacing, punctuation, or capitalisation —
            will cause LiveTime to treat them as a new racer. This means previous
            results, seeding, and history will not carry over.
          </p>
          <p>
            If you’re unsure of the correct spelling, please check LiveTime or ask race
            control before creating the driver.
          </p>
        </Card>

      </main>
    </div>
  );
}
