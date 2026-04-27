// src/app/pages/profile/WelcomeAddDrivers.jsx

import React, { useState, useEffect } from "react";
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
    <div className="p-6 max-w-3xl mx-auto" aria-live="polite">
      <p className="text-gray-600">Loading…</p>
    </div>
  );
}

export default function WelcomeAddDrivers() {
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clubMembers, setClubMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const membershipType = membership?.membership_type;
  const membershipId = membership?.id;
  const isNonMember = membershipType === "non_member";

  const maxAdults = club?.max_adults ?? 0;
  const maxJuniors = club?.max_juniors ?? 0;

  // Load club_members for paid members
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

  if (loadingProfile || loadingMembership || loadingMembers) {
    return <SimpleSpinner />;
  }

  const adultCount = clubMembers.filter((m) => !m.is_junior).length;
  const juniorCount = clubMembers.filter((m) => m.is_junior).length;

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

  const handleAddPerson = async () => {
    setSaving(true);
    setError("");

    try {
      if (!user) {
        setError("You must be logged in to add a driver.");
        return;
      }

      // ⭐ NO CAPITALISATION — user controls exact name
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      if (!trimmedFirst || !trimmedLast) {
        setError("First and last name are required.");
        return;
      }

      // ------------------------------------------------------------
      // ⭐ NON-MEMBER FLOW — drivers only, no club_members
      // ------------------------------------------------------------
      if (isNonMember) {
        const { data: existingDrivers } = await supabase
          .from("drivers")
          .select("id")
          .eq("first_name", trimmedFirst)
          .eq("last_name", trimmedLast)
          .eq("club_id", club.id);

        if (existingDrivers?.length > 0) {
          setError(
            "This driver name already exists in the ChargersRC system. LiveTime requires exact name matching."
          );
          return;
        }

        await supabase.from("drivers").insert({
          membership_id: null,
          club_id: club.id,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          is_junior: isJunior,
          created_by: user.id,
        });

        refreshDrivers();
        navigate(`/${clubSlug}/app/profile/drivers`);
        return;
      }

      // ------------------------------------------------------------
      // ⭐ PAID MEMBER FLOW — must insert into club_members
      // ------------------------------------------------------------

      if (!membershipId) {
        setError("Your membership is not active. Cannot add drivers.");
        return;
      }

      // Family membership limits
      if (membershipType === "family") {
        if (!isJunior && adultCount >= maxAdults) {
          setError(
            `Your club allows a maximum of ${maxAdults} adult members for a family membership.`
          );
          return;
        }

        if (isJunior && juniorCount >= maxJuniors) {
          setError(
            `Your club allows a maximum of ${maxJuniors} junior members for a family membership.`
          );
          return;
        }
      }

      // Check if club_member already exists
      const { data: existingMembers } = await supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membershipId)
        .eq("first_name", trimmedFirst)
        .eq("last_name", trimmedLast);

      let memberRow =
        existingMembers && existingMembers.length > 0
          ? existingMembers[0]
          : null;

      // Check if driver exists globally
      const { data: existingDrivers } = await supabase
        .from("drivers")
        .select("id")
        .eq("first_name", trimmedFirst)
        .eq("last_name", trimmedLast)
        .eq("club_id", club.id);

      if (existingDrivers?.length > 0 && !memberRow?.driver_id) {
        setError(
          "This driver name already exists in the ChargersRC system. LiveTime requires exact name matching."
        );
        return;
      }

      let driver = null;

      const createDriverIfNeeded = async () => {
        if (memberRow?.driver_id) {
          const { data: existingDriver } = await supabase
            .from("drivers")
            .select("*")
            .eq("id", memberRow.driver_id)
            .single();

          if (existingDriver) return existingDriver;
        }

        const { data: newDriver, error: newDriverError } = await supabase
          .from("drivers")
          .insert({
            membership_id: membershipId,
            club_id: club.id,
            first_name: trimmedFirst,
            last_name: trimmedLast,
            is_junior: isJunior,
            created_by: user.id,
          })
          .select()
          .single();

        if (newDriverError) {
          setError("There was a problem creating this driver. Please try again.");
          return null;
        }

        await supabase.rpc("reconcile_driver_number", {
          p_club_id: club.id,
          p_driver_id: newDriver.id,
          p_first_name: trimmedFirst,
          p_last_name: trimmedLast,
        });

        return newDriver;
      };

      // Update or insert club_member
      if (memberRow) {
        if (memberRow.is_junior !== isJunior) {
          await supabase
            .from("club_members")
            .update({ is_junior: isJunior })
            .eq("id", memberRow.id);
        }

        driver = await createDriverIfNeeded();

        if (driver && memberRow.driver_id !== driver.id) {
          await supabase
            .from("club_members")
            .update({ driver_id: driver.id })
            .eq("id", memberRow.id);
        }
      } else {
        const { data: newMember, error: newMemberError } = await supabase
          .from("club_members")
          .insert({
            membership_id: membershipId,
            club_id: club.id,
            first_name: trimmedFirst,
            last_name: trimmedLast,
            is_junior: isJunior,
            slot_index: null,
          })
          .select()
          .single();

        if (newMemberError) {
          setError("There was a problem adding this member. Please try again.");
          return;
        }

        memberRow = newMember;

        driver = await createDriverIfNeeded();

        if (driver) {
          await supabase
            .from("club_members")
            .update({ driver_id: driver.id })
            .eq("id", memberRow.id);
        }
      }

      refreshDrivers();
      reloadMembers();

      navigate(`/${clubSlug}/app/profile/drivers`);
    } catch (err) {
      console.error("[WelcomeAddDrivers] handleAddPerson error", err);
      setError("Something went wrong while adding this driver. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome to {club?.name}
          </h1>
        </div>
      </section>

      <main className="max-w-[720px] mx-auto px-4 space-y-12 pb-10 flex flex-col">

        <Card
          className="p-6 space-y-4"
          style={{ border: `2px solid ${brand}` }}
        >
          <h2 className="text-lg font-semibold">Add Drivers</h2>

          <p className="text-sm text-gray-700">
            Add each driver who will be racing under your membership.  
            Every driver needs a profile so the club can recognise them on race day and link their race history correctly.
          </p>

          <Card
            className="p-4 space-y-3 bg-yellow-50"
            style={{ border: `2px solid ${brand}` }}
          >
            <h3 className="text-md font-semibold">Important</h3>

            <p className="text-sm text-gray-700">
              Your driver’s name must match <strong>exactly</strong> as it appears in LiveTime — spelling, spacing, and capitalisation included.
            </p>

            <p className="text-sm text-gray-700">
              LiveTime treats any variation as a completely new racer. If the name does not match perfectly, previous race history, seeding, and results will not link correctly.
            </p>
          </Card>
        </Card>

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

            <Button
              onClick={handleAddPerson}
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Driver"}
            </Button>
          </div>
        </Card>

        {membershipType === "family" && clubMembers.length > 0 && (
          <Card
            className="p-6 space-y-4"
            style={{ border: `2px solid ${brand}` }}
          >
            <h3 className="text-md font-semibold">Household Members</h3>

            <ul className="space-y-2">
              {clubMembers.map((m) => (
                <li key={m.id} className="text-sm">
                  {m.first_name} {m.last_name}{" "}
                  {m.is_junior ? "(Junior)" : "(Adult)"}{" "}
                  {m.driver_id ? "– Driver" : ""}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save & Continue
            </Button>
          </Card>
        )}

      </main>
    </div>
  );
}
