// src/app/pages/profile/DriverProfile.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import DriverProfileCard from "@/components/driver/DriverProfileCard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { IdentificationIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function DriverProfile() {
  const { id, clubSlug } = useParams();
  const navigate = useNavigate();

  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const { membership } = useMembership();
  const isMember =
    membership &&
    membership.membership_type &&
    membership.membership_type !== "non_member";

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", id)
        .single();

      setDriver(data);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <p className="text-gray-600">Loading driver…</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <Card
          className="p-6 text-center space-y-4"
          style={{ border: `2px solid ${brand}` }}
        >
          <h2 className="text-xl font-semibold">Driver Not Found</h2>
          <Button onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}>
            Back to Drivers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

          {/* LEFT: Heading */}
          <div className="flex items-center gap-2">
            <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
            <h1 className="text-xl font-semibold tracking-tight">
              Driver Profile
            </h1>
          </div>

          {/* RIGHT: Small Back Button */}
          <Button
            variant="secondary"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() =>
              navigate(`/${clubSlug}/app/profile/drivers/${id}/edit`)
            }
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-3xl mx-auto px-4 flex-col items-center">
        <DriverProfileCard
          driver={driver}
          club={club}
          isMember={isMember}
          navigate={navigate}
        />
      </main>
    </div>
  );
}
