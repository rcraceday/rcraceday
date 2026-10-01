// src/app/pages/membership/UpgradeMembership.jsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";

import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import { useNotifications } from "@app/hooks/useNotifications";
import {
  canUpgradeMembershipToFamily,
  familyUpgradeOptionsFromProducts,
} from "@/app/pages/profile/householdDriverLimits";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { upgradeToFamilyMembership } from "@/app/api/membership/membershipAPI";

export default function UpgradeMembership() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { club } = useClub();
  const { membership, loadingMembership, refreshMembership } = useMembership();
  const { notify } = useNotifications();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const brand = palette?.primary || "#00438a";

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      if (!club?.id) return;

      setLoadingProducts(true);

      const { data, error: loadError } = await supabase
        .from("memberships")
        .select("*")
        .eq("club_id", club.id)
        .order("type", { ascending: true });

      if (!loadError) setProducts(data || []);
      setLoadingProducts(false);
    }

    loadProducts();
  }, [club?.id]);

  const upgradeOptions = useMemo(
    () =>
      membership?.membership_type
        ? familyUpgradeOptionsFromProducts(products, membership.membership_type)
        : [],
    [products, membership?.membership_type]
  );

  const selectedOption = useMemo(
    () => upgradeOptions.find((option) => option.key === selectedKey) || null,
    [upgradeOptions, selectedKey]
  );

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
        <Card className="p-4 w-full max-w-md">
          <p className="text-sm text-text-muted">
            You don’t currently have a membership to upgrade.
          </p>
        </Card>
      </div>
    );
  }

  if (!canUpgradeMembershipToFamily(membership.membership_type)) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center px-4">
        <Card className="p-4 w-full max-w-md space-y-4">
          <p className="text-sm text-text-muted">
            {membership.membership_type === "family"
              ? "You already have a Family Membership."
              : "Upgrade to Family is available from an active Single or Junior membership."}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate(`/${clubSlug}/app/membership`)}
          >
            Back to Membership
          </Button>
        </Card>
      </div>
    );
  }

  const handleComplete = async () => {
    if (upgradeOptions.length > 0 && !selectedOption) {
      setError("Please select an upgrade option.");
      return;
    }

    if (!user?.id || !club?.id) {
      setError("You must be signed in to upgrade.");
      return;
    }

    setProcessing(true);
    setError("");

    const { error: upgradeError } = await upgradeToFamilyMembership({
      membership_id: membership.id,
      club_id: club.id,
      user_id: user.id,
    });

    if (upgradeError) {
      setError(
        upgradeError.message ||
          "Something went wrong upgrading your membership."
      );
      setProcessing(false);
      return;
    }

    await refreshMembership();
    notify("Upgraded to Family Membership.", "success");
    navigate(`/${clubSlug}/app/membership`);
  };

  const handleCancel = () => navigate(`/${clubSlug}/app/membership`);

  const currentTypeLabel = membership.membership_type;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title={t("membership.upgradeTitle")}
        style={{ color: brand }}
      />

      <main className="app-page-main space-y-8">

        <Card
          noPadding
          className="w-full rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
        >
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">
              Upgrade to Family Membership
            </h2>
          </div>

          <div className="p-6 space-y-6">

            <div className="space-y-1">
              <p className="text-sm text-text-muted">Current membership type:</p>
              <p className="text-base font-semibold capitalize">
                {currentTypeLabel}
              </p>
            </div>

            <p className="text-sm text-text-muted">
              You can move to Family at any time. Upgrades are free while payment
              is not enabled; the difference shown below is for reference only
              until checkout is added.
            </p>

            {loadingProducts && (
              <p className="text-sm text-text-muted">Loading upgrade options…</p>
            )}

            {!loadingProducts && upgradeOptions.length === 0 && (
              <p className="text-sm text-text-muted">
                No matching Family products are in the catalog for your current
                term. You can still upgrade now without payment.
              </p>
            )}

            {!loadingProducts && upgradeOptions.length > 0 && (
              <div className="space-y-4">
                {upgradeOptions.map((option) => {
                  const isSelected = selectedKey === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedKey(option.key)}
                      className="w-full text-left rounded-md px-5 py-4 transition"
                      style={{
                        background: "#FFFFFF",
                        border: `2px solid ${
                          isSelected ? brand : "rgba(0,0,0,0.08)"
                        }`,
                        boxShadow: isSelected
                          ? `0 0 0 3px ${brand}22`
                          : "0 1px 2px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-text-base">
                          {option.duration === "full"
                            ? "Full Year"
                            : "Half Year"}{" "}
                          {option.period ? `(${option.period})` : ""}
                        </span>

                        <span className="text-text-muted text-sm shrink-0">
                          Difference: ${option.difference}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

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
                disabled={
                  processing ||
                  (upgradeOptions.length > 0 && !selectedOption)
                }
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
