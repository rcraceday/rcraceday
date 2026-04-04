// src/app/pages/membership/MembershipMembersSection.jsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function MembershipMembersSection({ onOpenAddMember }) {
  const { membership } = useMembership();
  const { drivers } = useDrivers();

  const membershipId = membership?.id;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // Fetch club members
  // -----------------------------
  useEffect(() => {
    if (!membershipId) return;

    async function loadMembers() {
      setLoading(true);

      const { data, error } = await supabase
        .from("club_members")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: true });

      if (!error) {
        setMembers(data);
      }

      setLoading(false);
    }

    loadMembers();
  }, [membershipId]);

  // -----------------------------
  // Derived state
  // -----------------------------
  const adults = members.filter((m) => !m.is_junior);
  const juniors = members.filter((m) => m.is_junior);

  const driverIdsInMembers = new Set(
    members.filter((m) => m.driver_id).map((m) => m.driver_id)
  );

  const driversNotMembers = drivers.filter(
    (d) => !driverIdsInMembers.has(d.id)
  );

  // -----------------------------
  // Render
  // -----------------------------
  if (!membershipId) {
    return (
      <Card className="p-4">
        <p className="text-gray-600">No membership found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Members</h2>

        <Button variant="primary" onClick={onOpenAddMember}>
          Add Member
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="p-4">
          <p className="text-gray-600">Loading members…</p>
        </Card>
      )}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <Card className="p-4">
          <p className="text-gray-600">No members added yet.</p>
        </Card>
      )}

      {/* Members List */}
      {!loading && members.length > 0 && (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {m.first_name} {m.last_name}
                </p>

                <div className="flex gap-2 mt-1">
                  {m.is_junior ? (
                    <span className="text-sm text-blue-600">Junior</span>
                  ) : (
                    <span className="text-sm text-gray-700">Adult</span>
                  )}

                  {m.driver_id && (
                    <span className="text-sm text-green-600">Driver</span>
                  )}
                </div>
              </div>

              {/* Remove button will be added in Step 4.3 */}
            </Card>
          ))}
        </div>
      )}

      {/* Debug (optional) */}
      {/* <pre>{JSON.stringify({ members, driversNotMembers }, null, 2)}</pre> */}
    </div>
  );
}
