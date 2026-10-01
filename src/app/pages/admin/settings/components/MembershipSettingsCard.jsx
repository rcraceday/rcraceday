import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import {
  membershipBadgePath,
  removeClubAssetPath,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";
import { DEFAULT_MEMBERSHIP_TYPE_SEEDS } from "@/app/lib/membershipClubLimits";
import { normalizeMembershipProductType } from "@/app/pages/profile/householdDriverLimits";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";
import CMSImageUpload from "@cms/CMSImageUpload";
import CMSCard from "@cms/CMSCard";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";

const DURATION_PRESETS = [
  { duration: "full", period: "", label: "Full year" },
  { duration: "half", period: "H1", label: "Half year (Jan–Jun)" },
  { duration: "half", period: "H2", label: "Half year (Jul–Dec)" },
];

const bannerStyle = (kind) => ({
  padding: "12px 16px",
  borderRadius: "6px",
  backgroundColor: kind === "error" ? "#FEE2E2" : "#DCFCE7",
  color: kind === "error" ? "#991B1B" : "#166534",
  fontSize: "14px",
});

const styles = {
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  cardInner: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingTop: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "20px",
  },
  twoCol: {
    display: "flex",
    flexWrap: "wrap",
    gap: "32px",
    alignItems: "flex-start",
  },
  badgeCol: {
    flex: "0 1 280px",
    minWidth: "220px",
  },
  defaultsCol: {
    flex: "1 1 280px",
    minWidth: "220px",
  },
  groupLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    margin: 0,
  },
  groupHint: {
    fontSize: "12px",
    color: "#6B7280",
    margin: "4px 0 0",
    lineHeight: 1.45,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  toggleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px 28px",
  },
  pricingTable: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#FFFFFF",
  },
  pricingHead: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 88px 72px",
    gap: "12px",
    padding: "10px 16px",
    background: "#F9FAFB",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6B7280",
  },
  pricingRow: {
    display: "grid",
    gridTemplateColumns: "1fr 140px 88px 72px",
    gap: "12px",
    padding: "12px 16px",
    alignItems: "center",
    borderTop: "1px solid #F3F4F6",
  },
  durationLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#111827",
  },
  addRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "12px 16px",
    borderTop: "1px solid #F3F4F6",
    background: "#FAFAFA",
  },
};

function productTypeKey(product) {
  return normalizeMembershipProductType(product?.type) || product?.type;
}

function durationKey(product) {
  const duration = product?.duration || "full";
  const period = product?.period || "";
  if (duration === "full") return "full:";
  if (period === "Jan–Jun" || period === "H1") return "half:H1";
  if (period === "Jul–Dec" || period === "H2") return "half:H2";
  return `${duration}:${period}`;
}

function durationLabel(product) {
  const key = durationKey(product);
  return DURATION_PRESETS.find((p) => `${p.duration}:${p.period}` === key)?.label
    || [product.duration, product.period].filter(Boolean).join(" ");
}

function emptyProduct(clubId, typeKey, duration, period) {
  return {
    id: null,
    club_id: clubId,
    type: typeKey,
    name: "",
    duration,
    period: period || null,
    price: "",
    description: "",
    benefits_summary: "",
    is_active: true,
    access_driver_profiles: true,
    access_championship_points: true,
    discounted_racing: false,
    sort_order: 0,
  };
}

export default function MembershipSettingsCard({ club }) {
  const { t } = useTranslation();
  const { refreshClub } = useClub();

  const [clubForm, setClubForm] = useState({
    member_badge_url: "",
    max_adults: 2,
    max_juniors: 2,
    membership_join_enabled: true,
  });
  const [typeRows, setTypeRows] = useState([]);
  const [products, setProducts] = useState([]);

  const [badgeFile, setBadgeFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    if (!club?.id) return;

    setLoading(true);
    setError(null);

    const [typesRes, productsRes] = await Promise.all([
      supabase
        .from("club_membership_types")
        .select("*")
        .eq("club_id", club.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("memberships")
        .select("*")
        .eq("club_id", club.id)
        .order("sort_order", { ascending: true })
        .order("type", { ascending: true }),
    ]);

    if (typesRes.error?.message?.includes("club_membership_types")) {
      setError(
        "Membership settings tables are missing. Run scripts/add-membership-settings.sql in Supabase."
      );
      setLoading(false);
      return;
    }

    if (typesRes.error || productsRes.error) {
      setError(typesRes.error?.message || productsRes.error?.message);
      setLoading(false);
      return;
    }

    setClubForm({
      member_badge_url: club.member_badge_url || "",
      max_adults: club.max_adults ?? 2,
      max_juniors: club.max_juniors ?? 2,
      membership_join_enabled: club.membership_join_enabled !== false,
    });

    let types = typesRes.data || [];
    if (types.length === 0) {
      types = DEFAULT_MEMBERSHIP_TYPE_SEEDS.map((seed) => ({
        ...seed,
        club_id: club.id,
        benefits_notes: "",
        merch_benefits_notes: "",
      }));
    }
    setTypeRows(types);
    setProducts(productsRes.data || []);
    setLoading(false);
  }, [club?.id, club?.member_badge_url, club?.max_adults, club?.max_juniors, club?.membership_join_enabled]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateTypeRow = (index, field, value) => {
    setTypeRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const productsForType = (typeKey) =>
    products.filter((product) => productTypeKey(product) === typeKey);

  const updateProductByIdOrIndex = (product, field, value) => {
    setProducts((prev) =>
      prev.map((row) => {
        if (product.id && row.id === product.id) return { ...row, [field]: value };
        if (!product.id && row === product) return { ...row, [field]: value };
        return row;
      })
    );
  };

  const addDuration = (typeKey, duration, period) => {
    const exists = products.some(
      (product) =>
        productTypeKey(product) === typeKey &&
        durationKey(product) === `${duration}:${period}`
    );
    if (exists) return;
    setProducts((prev) => [...prev, emptyProduct(club.id, typeKey, duration, period)]);
  };

  const removeProduct = (product) => {
    setProducts((prev) =>
      prev.filter((row) => {
        if (product.id) return row.id !== product.id;
        return row !== product;
      })
    );
  };

  const uploadBadge = async () => {
    if (!badgeFile || !club?.slug) return clubForm.member_badge_url;

    setUploading(true);
    try {
      const objectPath = membershipBadgePath(club.slug, badgeFile);
      const { publicUrl, error: uploadError } = await uploadClubAsset(supabase, {
        objectPath,
        file: badgeFile,
        previousUrlOrPath: clubForm.member_badge_url,
      });

      if (uploadError || !publicUrl) {
        throw uploadError || new Error("Badge upload failed");
      }

      setClubForm((prev) => ({ ...prev, member_badge_url: publicUrl }));
      setBadgeFile(null);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const clearBadge = async () => {
    if (!clubForm.member_badge_url) return;
    if (!window.confirm("Remove the member badge image?")) return;
    setUploading(true);
    try {
      await removeClubAssetPath(supabase, clubForm.member_badge_url);
      setClubForm((prev) => ({ ...prev, member_badge_url: "" }));
      setBadgeFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!club?.id) return;

    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      let badgeUrl = clubForm.member_badge_url;
      if (badgeFile) {
        badgeUrl = await uploadBadge();
      }

      const { error: clubError } = await supabase
        .from("clubs")
        .update({
          member_badge_url: badgeUrl || null,
          max_adults: Number(clubForm.max_adults) || 0,
          max_juniors: Number(clubForm.max_juniors) || 0,
          membership_join_enabled: clubForm.membership_join_enabled,
        })
        .eq("id", club.id);

      if (clubError) throw clubError;

      const typesPayload = typeRows.map((row, index) => ({
        club_id: club.id,
        type_key: row.type_key,
        display_name: row.display_name || row.type_key,
        enabled: row.enabled !== false,
        max_household_adults: Number(row.max_household_adults) || 0,
        max_household_juniors: Number(row.max_household_juniors) || 0,
        max_drivers: row.max_drivers === "" || row.max_drivers == null
          ? null
          : Number(row.max_drivers),
        access_driver_profiles: row.access_driver_profiles !== false,
        access_championship_points: row.access_championship_points !== false,
        discounted_racing: row.discounted_racing === true,
        merch_benefits_notes: row.merch_benefits_notes || null,
        benefits_notes: row.benefits_notes || null,
        sort_order: row.sort_order ?? index * 10,
        updated_at: new Date().toISOString(),
      }));

      const { error: typesError } = await supabase
        .from("club_membership_types")
        .upsert(typesPayload, { onConflict: "club_id,type_key" });

      if (typesError) throw typesError;

      const keptIds = new Set(products.filter((p) => p.id).map((p) => p.id));
      const { data: stillThere } = await supabase
        .from("memberships")
        .select("id")
        .eq("club_id", club.id);

      const toDelete = (stillThere || [])
        .map((r) => r.id)
        .filter((id) => !keptIds.has(id));

      if (toDelete.length > 0) {
        const { error: delError } = await supabase
          .from("memberships")
          .delete()
          .in("id", toDelete);
        if (delError) throw delError;
      }

      for (const [index, product] of products.entries()) {
        const payload = {
          club_id: club.id,
          type: product.type,
          name: product.name || null,
          duration: product.duration || "full",
          period: product.period || null,
          price: product.price === "" ? null : Number(product.price),
          description: product.description || null,
          benefits_summary: product.benefits_summary || null,
          is_active: product.is_active !== false,
          access_driver_profiles: product.access_driver_profiles !== false,
          access_championship_points: product.access_championship_points !== false,
          discounted_racing: product.discounted_racing === true,
          sort_order: Number(product.sort_order) || index,
        };

        if (product.id) {
          const { error: updError } = await supabase
            .from("memberships")
            .update(payload)
            .eq("id", product.id);
          if (updError) throw updError;
        } else {
          const { error: insError } = await supabase
            .from("memberships")
            .insert(payload);
          if (insError) throw insError;
        }
      }

      setStatus("Membership settings saved.");
      await refreshClub();
      await loadAll();
    } catch (err) {
      console.error("Membership settings save:", err);
      setError(err.message || "Failed to save membership settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={cmsLayout.muted}>Loading membership settings…</p>;
  }

  return (
    <div style={styles.stack}>
      {error && <div style={bannerStyle("error")}>{error}</div>}
      {status && <div style={bannerStyle("success")}>{status}</div>}

      <CMSCard titleKey="admin.membership.club">
        <div style={styles.cardInner}>
          <div style={styles.twoCol}>
            <div style={{ ...styles.group, ...styles.badgeCol }}>
              <div>
                <p style={styles.groupLabel}>Member badge</p>
                <p style={styles.groupHint}>
                  Shown on the member membership page, not the club logo.
                </p>
              </div>
              <CMSImageUpload
                value={clubForm.member_badge_url}
                filePreview={badgeFile}
                onChange={(file) => {
                  if (file) {
                    setBadgeFile(file);
                    return;
                  }
                  setBadgeFile(null);
                  if (clubForm.member_badge_url) {
                    clearBadge();
                  }
                }}
              />
            </div>

            <div style={{ ...styles.group, ...styles.defaultsCol }}>
              <div>
                <p style={styles.groupLabel}>Club defaults</p>
                <p style={styles.groupHint}>
                  Fallback household limits when a type does not set its own values.
                </p>
              </div>
              <div style={styles.grid}>
                <CMSInput
                  labelKey="admin.membership.defaultMaxAdults"
                  type="number"
                  value={String(clubForm.max_adults ?? "")}
                  onChange={(value) =>
                    setClubForm((prev) => ({ ...prev, max_adults: value }))
                  }
                />
                <CMSInput
                  labelKey="admin.membership.defaultMaxJuniors"
                  type="number"
                  value={String(clubForm.max_juniors ?? "")}
                  onChange={(value) =>
                    setClubForm((prev) => ({ ...prev, max_juniors: value }))
                  }
                />
              </div>
              <CMSToggle
                labelKey="admin.membership.allowJoinRenew"
                checked={clubForm.membership_join_enabled}
                onChange={(checked) =>
                  setClubForm((prev) => ({
                    ...prev,
                    membership_join_enabled: checked,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </CMSCard>

      {typeRows.map((row, index) => {
        const typeProducts = productsForType(row.type_key);
        const usedKeys = new Set(typeProducts.map(durationKey));
        const missingDurations = DURATION_PRESETS.filter(
          (preset) => !usedKeys.has(`${preset.duration}:${preset.period}`)
        );

        return (
          <CMSCard
            key={row.type_key || index}
            title={row.display_name || row.type_key}
            actions={
              <CMSToggle
                labelKey="cms.enabled"
                checked={row.enabled !== false}
                onChange={(checked) => updateTypeRow(index, "enabled", checked)}
              />
            }
          >
            <div style={styles.cardInner}>
              <div style={styles.group}>
                <div>
                  <p style={styles.groupLabel}>Household rules</p>
                  <p style={styles.groupHint}>
                    Limits for members and drivers on this membership type.
                  </p>
                </div>
                <div style={styles.grid}>
                  <CMSInput
                    labelKey="admin.membership.displayName"
                    value={row.display_name}
                    onChange={(value) => updateTypeRow(index, "display_name", value)}
                  />
                  <CMSInput
                    labelKey="admin.membership.maxAdults"
                    type="number"
                    value={String(row.max_household_adults ?? "")}
                    onChange={(value) =>
                      updateTypeRow(index, "max_household_adults", value)
                    }
                  />
                  <CMSInput
                    labelKey="admin.membership.maxJuniors"
                    type="number"
                    value={String(row.max_household_juniors ?? "")}
                    onChange={(value) =>
                      updateTypeRow(index, "max_household_juniors", value)
                    }
                  />
                  <CMSInput
                    labelKey="admin.membership.maxDrivers"
                    type="number"
                    placeholder="No cap"
                    value={row.max_drivers == null ? "" : String(row.max_drivers)}
                    onChange={(value) => updateTypeRow(index, "max_drivers", value)}
                  />
                </div>
              </div>

              <div style={styles.group}>
                <div>
                  <p style={styles.groupLabel}>Access and benefits</p>
                </div>
                <div style={styles.toggleRow}>
                  <CMSToggle
                    labelKey="admin.membership.driverProfiles"
                    checked={row.access_driver_profiles !== false}
                    onChange={(checked) =>
                      updateTypeRow(index, "access_driver_profiles", checked)
                    }
                  />
                  <CMSToggle
                    labelKey="admin.membership.championshipPoints"
                    checked={row.access_championship_points !== false}
                    onChange={(checked) =>
                      updateTypeRow(index, "access_championship_points", checked)
                    }
                  />
                  <CMSToggle
                    labelKey="admin.membership.discountedRacing"
                    checked={row.discounted_racing === true}
                    onChange={(checked) =>
                      updateTypeRow(index, "discounted_racing", checked)
                    }
                  />
                </div>
                <div style={styles.grid}>
                  <CMSTextarea
                    labelKey="admin.membership.benefits"
                    value={row.benefits_notes || ""}
                    onChange={(value) => updateTypeRow(index, "benefits_notes", value)}
                  />
                  <CMSTextarea
                    labelKey="admin.membership.merchBenefits"
                    value={row.merch_benefits_notes || ""}
                    onChange={(value) =>
                      updateTypeRow(index, "merch_benefits_notes", value)
                    }
                  />
                </div>
              </div>

              {row.type_key !== "non_member" && (
                <div style={styles.group}>
                  <div>
                    <p style={styles.groupLabel}>Pricing</p>
                    <p style={styles.groupHint}>
                      Full year and half year options for this type.
                    </p>
                  </div>

                  <div style={styles.pricingTable}>
                    <div style={styles.pricingHead}>
                      <span>Duration</span>
                      <span>Price ($)</span>
                      <span>Active</span>
                      <span />
                    </div>

                    {typeProducts.length === 0 && (
                      <div style={{ ...styles.pricingRow, color: "#6B7280", fontSize: 13 }}>
                        No durations added yet.
                      </div>
                    )}

                    {typeProducts.map((product) => (
                      <div
                        key={product.id || `${row.type_key}-${durationKey(product)}`}
                        style={styles.pricingRow}
                      >
                        <span style={styles.durationLabel}>{durationLabel(product)}</span>
                        <CMSInput
                          type="number"
                          value={product.price ?? ""}
                          onChange={(value) =>
                            updateProductByIdOrIndex(product, "price", value)
                          }
                        />
                        <CMSToggle
                          label=""
                          checked={product.is_active !== false}
                          onChange={(checked) =>
                            updateProductByIdOrIndex(product, "is_active", checked)
                          }
                        />
                        <CMSButton
                          variant="secondary"
                          type="button"
                          onClick={() => removeProduct(product)}
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Remove
                        </CMSButton>
                      </div>
                    ))}

                    {missingDurations.length > 0 && (
                      <div style={styles.addRow}>
                        {missingDurations.map((preset) => (
                          <CMSButton
                            key={`${preset.duration}:${preset.period}`}
                            variant="secondary"
                            type="button"
                            onClick={() =>
                              addDuration(row.type_key, preset.duration, preset.period)
                            }
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Add {preset.label}
                          </CMSButton>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CMSCard>
        );
      })}

      <div>
        <CMSButton
          variant="primary"
          type="button"
          disabled={saving || uploading}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save membership settings"}
        </CMSButton>
      </div>
    </div>
  );
}
