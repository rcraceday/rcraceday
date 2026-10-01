// src/app/pages/membership/RenewMembership.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";

import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";

import { supabase } from "@/supabaseClient";
import { applyMembership } from "@/app/api/membership/membershipAPI";

export default function RenewMembership() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { membership } = useMembership();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const brand = palette?.primary || "#00438a";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  /* ------------------------------------------------------------
     LOAD MEMBERSHIP PRODUCTS FOR THIS CLUB
  ------------------------------------------------------------ */
  useEffect(() => {
    async function loadProducts() {
      if (!club?.id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("club_id", club.id)
        .order("type", { ascending: true });

      if (!error) {
        setProducts((data || []).filter((row) => row.is_active !== false));
      }
      setLoading(false);
    }

    loadProducts();
  }, [club?.id]);

  /* ------------------------------------------------------------
     GROUP + SORT PRODUCTS BY TYPE
     ORDER: Full → Half (Jan–Jun) → Half (Jul–Dec)
  ------------------------------------------------------------ */
  const types = [...new Set(products.map((p) => p.type))];

  const productsByType = types.reduce((acc, type) => {
    acc[type] = products
      .filter((p) => p.type === type)
      .sort((a, b) => {
        // Full year always first
        if (a.duration === "full" && b.duration !== "full") return -1;
        if (b.duration === "full" && a.duration !== "full") return 1;

        // Both half-year → sort by period
        const order = ["Jan–Jun", "Jul–Dec"];
        return order.indexOf(a.period) - order.indexOf(b.period);
      });

    return acc;
  }, {});

  const isLifeMember = membership?.is_life_member === true;

  /* ------------------------------------------------------------
     HANDLE RENEW
  ------------------------------------------------------------ */
  const handleRenew = async ({ skipPayment = false } = {}) => {
    if (!skipPayment && !selectedProduct) {
      setError("Please select a membership option.");
      return;
    }

    setProcessing(true);
    setError("");

    if (skipPayment) {
      const { error: updateError } = await supabase
        .from("household_memberships")
        .update({
          status: "active",
        })
        .eq("id", membership.id);

      setProcessing(false);
      if (updateError) {
        setError(updateError.message || "Could not continue as a life member.");
        return;
      }
      navigate(`/${clubSlug}/app/membership`);
      return;
    }

    const { error } = await applyMembership({
      action: "renew",
      membership_id: membership.id,
      membership_product_id: selectedProduct.id,
      club_slug: clubSlug,
    });

    if (error) {
      setError("Something went wrong renewing your membership.");
      setProcessing(false);
      return;
    }

    navigate(`/${clubSlug}/app/membership`);
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      <PageTitle
        icon={IdentificationIcon}
        title={t("membership.renewTitle")}
        style={{ color: brand }}
      />

      {/* MAIN */}
      <main className="app-page-main space-y-8">

        {/* CARD */}
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
              Choose Your Membership
            </h2>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-6">

            {/* LOADING */}
            {loading && (
              <p className="text-sm text-text-muted">Loading membership options…</p>
            )}

            {/* MEMBERSHIP TYPES */}
            {!loading && (
              <div className="space-y-6">
                {types.map((type) => (
                  <div key={type} className="space-y-3">

                    {/* TYPE LABEL */}
                    <h3 className="text-base font-semibold capitalize">
                      {productsByType[type][0]?.name || type}
                    </h3>

                    {/* PRODUCT OPTIONS */}
                    <div className="space-y-3">
                      {productsByType[type].map((product) => {
                        const isSelected = selectedProduct?.id === product.id;

                        return (
                          <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
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
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-text-base">
                                {product.duration === "full"
                                  ? "Full Year"
                                  : "Half Year"}{" "}
                                {product.period ? `(${product.period})` : ""}
                              </span>

                              <span className="text-text-muted text-sm">
                                ${product.price}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {isLifeMember && (
              <p className="text-sm text-text-muted">
                You are a life member, so renewal is optional and there is no
                membership fee. You can still pay if you want to support the club.
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              {isLifeMember && (
                <Button
                  variant="secondary"
                  className="w-auto px-5 py-2"
                  disabled={processing}
                  onClick={() => handleRenew({ skipPayment: true })}
                >
                  {processing ? "Saving…" : "Continue without paying"}
                </Button>
              )}
              <Button
                className="w-auto px-5 py-2"
                disabled={!selectedProduct || processing}
                onClick={() => handleRenew()}
              >
                {processing ? "Processing…" : isLifeMember ? "Pay to renew" : "Renew Membership"}
              </Button>
            </div>

          </div>
        </Card>
      </main>
    </div>
  );
}
