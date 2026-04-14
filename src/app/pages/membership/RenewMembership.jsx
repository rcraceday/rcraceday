// src/app/pages/membership/RenewMembership.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";

import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { supabase } from "@/supabaseClient";
import { applyMembership } from "@/app/api/membership/membershipAPI";

export default function RenewMembership() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { membership } = useMembership();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState(null);
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

      if (!error) setProducts(data || []);
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

  /* ------------------------------------------------------------
     HANDLE RENEW
  ------------------------------------------------------------ */
  const handleRenew = async () => {
    if (!selectedProduct) {
      setError("Please select a membership option.");
      return;
    }

    setProcessing(true);
    setError("");

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

    navigate(`/${clubSlug}/membership`);
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */
  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">
            Renew Membership
          </h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-[720px] mx-auto px-4 py-10 space-y-8">

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
                            onClick={() => {
                              setSelectedType(type);
                              setSelectedProduct(product);
                            }}
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

            {/* CTA */}
            <div className="flex justify-end pt-2">
              <Button
                className="w-auto px-5 py-2"
                disabled={!selectedProduct || processing}
                onClick={handleRenew}
              >
                {processing ? "Processing…" : "Renew Membership"}
              </Button>
            </div>

          </div>
        </Card>
      </main>
    </div>
  );
}
