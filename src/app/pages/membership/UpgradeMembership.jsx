// src/app/pages/membership/UpgradeMembership.jsx

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";

import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useNotifications } from "@app/hooks/useNotifications";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const PRICING = {
  single: { full: 80, half: 50 },
  family: { full: 110, half: 70 },
  junior: { full: 40, half: 40 },
};

export default function UpgradeMembership() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { membership, loadingMembership } = useMembership();
  const { notify } = useNotifications();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [duration, setDuration] = useState("full");
  const [processing, setProcessing] = useState(false);

  if (loadingMembership) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading membership…</p>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center px-4">
        <Card className="p-4 w-full max-w-md" style={{ border: `2px solid ${brand}` }}>
          <p className="text-sm text-text-muted">
            You don’t currently have a membership to upgrade.
          </p>
        </Card>
      </div>
    );
  }

  if (membership.membership_type === "family") {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center px-4">
        <Card className="p-4 w-full max-w-md" style={{ border: `2px solid ${brand}` }}>
          <p className="text-sm text-text-muted">
            You already have a Family Membership.
          </p>
        </Card>
      </div>
    );
  }

  const currentType = membership.membership_type.toLowerCase();
  const currentPrices = PRICING[currentType];
  const familyPrices = PRICING.family;

  const currentPrice = duration === "full" ? currentPrices.full : currentPrices.half;
  const familyPrice = duration === "full" ? familyPrices.full : familyPrices.half;
  const difference = Math.max(familyPrice - currentPrice, 0);

  const handleComplete = async () => {
    setProcessing(true);
    try {
      notify("Upgrade recorded (simulated).", "success");
      navigate(`/${clubSlug}/app/membership`);
    } catch (e) {
      notify("There was a problem upgrading your membership.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => navigate(`/${clubSlug}/app/membership`);

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER — MATCHES JOIN MEMBERSHIP */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">
            Upgrade Membership
          </h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-[720px] mx-auto px-4 py-10 space-y-8">

        {/* CARD — EXACT JOIN MEMBERSHIP STYLE */}
        <Card
          noPadding
          className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
          style={{
            border: `2px solid ${brand}`,
            background: "white",
          }}
        >
          {/* BLUE HEADER BAR */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">
              Upgrade to Family Membership
            </h2>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-6">

            {/* CURRENT MEMBERSHIP TYPE */}
            <div className="space-y-1">
              <p className="text-sm text-text-muted">Current membership type:</p>
              <p className="text-base font-semibold capitalize">
                {currentType}
              </p>
            </div>

            {/* UPGRADE OPTIONS — MATCH JOIN MEMBERSHIP BUTTON STYLE */}
            <div className="space-y-4">
              {["full", "half"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className="w-full text-left rounded-md px-5 py-4 transition"
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${
                      duration === d ? brand : "rgba(0,0,0,0.08)"
                    }`,
                    boxShadow:
                      duration === d
                        ? `0 0 0 3px ${brand}22`
                        : "0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-base">
                      {d === "full"
                        ? "Full Year (Jan – Dec)"
                        : "Half Year (Jan – Jun / Jul – Dec)"}
                    </span>

                    <span className="text-text-muted text-sm">
                      Difference: ${difference}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="flex justify-between pt-2">
              <Button
                variant="secondary"
                className="px-5 py-2"
                disabled={processing}
                onClick={handleCancel}
              >
                Cancel
              </Button>

              <Button
                className="px-5 py-2"
                disabled={processing}
                onClick={handleComplete}
              >
                {processing ? "Processing…" : "Confirm Upgrade"}
              </Button>
            </div>

          </div>
        </Card>
      </main>
    </div>
  );
}
