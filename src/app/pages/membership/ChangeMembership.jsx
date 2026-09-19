import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";

import { useClub } from "@/app/providers/ClubProvider";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";

import { moveToFamily } from "@/app/api/membership/membershipAPI";

export default function ChangeMembership() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const membershipId = new URLSearchParams(window.location.search).get("id");

  const handleMove = async () => {
    if (!membershipId) {
      setError("Membership ID missing.");
      return;
    }

    setProcessing(true);
    setError("");

    const { error } = await moveToFamily(membershipId);

    if (error) {
      setError("Something went wrong updating your membership.");
      setProcessing(false);
      return;
    }

    navigate(`/${clubSlug}/membership`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title="Move to Family Membership"
        style={{ color: brand }}
        actions={
          <Button
            variant="secondary"
            className="!w-auto !px-3 !py-1.5 !text-sm"
            onClick={() => navigate(`/${clubSlug}/membership`)}
          >
            Back
          </Button>
        }
      />

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-12">

        <section className="rounded-xl border border-surfaceBorder bg-surface p-6 space-y-6 max-w-xl">
          <h2 className="text-lg font-semibold">Upgrade to Family</h2>

          <p className="text-text-muted text-sm leading-relaxed">
            Family Membership allows you to include parents/guardians and junior
            drivers under one account. This is ideal for households with multiple
            racers.
          </p>

          <div
            className="rounded-xl px-5 py-4 shadow-sm"
            style={{
              background: "#FFFFFF",
              border: `2px solid ${brand}`,
              boxShadow: `0 0 0 3px ${brand}22`,
            }}
          >
            <p className="font-medium text-text-base">Family Membership</p>
            <p className="text-sm text-text-muted">Includes all household drivers</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              className="!w-auto !px-5 !py-2.5 !text-sm"
              disabled={processing}
              onClick={handleMove}
            >
              {processing ? "Processing…" : "Move to Family"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
