import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { displayNameFromMembershipRow } from "@/app/lib/membershipDisplayName";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import { EditButton } from "@cms/CMSButtonSet";
import { useTranslation } from "@/app/i18n/I18nContext";
import { cmsStyles } from "@cms/styles";

const FILTER_IDS = ["all", "adults", "juniors", "unlinked"];

function driverName(row, unnamedLabel) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || unnamedLabel;
}

export default function AdminDrivers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  const [drivers, setDrivers] = useState([]);
  const [householdsById, setHouseholdsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    if (!club?.id) return;
    setLoading(true);
    setError("");

    const { data: rows, error: driverError } = await supabase
      .from("drivers")
      .select("*")
      .eq("club_id", club.id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (driverError) {
      setError(driverError.message || t("admin.common.couldNotLoadDrivers"));
      setDrivers([]);
      setLoading(false);
      return;
    }

    const list = rows || [];
    setDrivers(list);

    const membershipIds = [...new Set(list.map((row) => row.membership_id).filter(Boolean))];
    if (membershipIds.length === 0) {
      setHouseholdsById({});
      setLoading(false);
      return;
    }

    const { data: households, error: householdError } = await supabase
      .from("household_memberships")
      .select("id, email, primary_first_name, primary_last_name, membership_type, status")
      .in("id", membershipIds);

    if (householdError) {
      setError(householdError.message);
    }

    const map = {};
    (households || []).forEach((row) => {
      map[row.id] = row;
    });
    setHouseholdsById(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [club?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((row) => {
      if (filter === "adults" && row.is_junior) return false;
      if (filter === "juniors" && !row.is_junior) return false;
      if (filter === "unlinked" && row.membership_id) return false;

      if (!q) return true;
      const household = row.membership_id ? householdsById[row.membership_id] : null;
      const householdName = household ? displayNameFromMembershipRow(household).toLowerCase() : "";
      const haystack = [
        driverName(row, t("admin.common.unnamedDriver")),
        row.nickname,
        row.permanent_number,
        householdName,
        household?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [drivers, householdsById, search, filter]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.drivers.title")}</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>{t("admin.drivers.subtitle")}</p>
          </header>
          <CMSButton
            onClick={() => navigate(`/${clubSlug}/app/admin/drivers/new`)}
            style={{ whiteSpace: "nowrap" }}
          >
            {t("admin.drivers.addDriver")}
          </CMSButton>
        </div>

        <CMSCard titleKey="admin.drivers.cardTitle">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            <CMSInput
              label={t("admin.drivers.search")}
              placeholder={t("admin.drivers.searchPlaceholder")}
              value={search}
              onChange={setSearch}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FILTER_IDS.map((id) => {
                const filterLabelKey = {
                  all: "admin.drivers.filterAll",
                  adults: "admin.drivers.filterAdults",
                  juniors: "admin.drivers.filterJuniors",
                  unlinked: "admin.drivers.filterUnlinked",
                }[id];
                return (
                <CMSButton
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  style={
                    filter === id
                      ? { borderColor: "#991B1B", backgroundColor: "#f8f3f3" }
                      : undefined
                  }
                >
                  {t(filterLabelKey)}
                </CMSButton>
                );
              })}
            </div>

            {loading ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>{t("admin.drivers.loading")}</p>
            ) : error ? (
              <p style={{ color: "#991B1B", fontSize: 14 }}>{error}</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>{t("admin.drivers.noMatch")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((row) => {
                  const household = row.membership_id ? householdsById[row.membership_id] : null;
                  const householdName = household
                    ? displayNameFromMembershipRow(household)
                    : t("admin.common.noHousehold");

                  return (
                    <div
                      key={row.id}
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        padding: "16px 0",
                        borderBottom: "1px solid #F3F4F6",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          flexShrink: 0,
                          backgroundColor: row.primary_color || "#111827",
                          border: `3px solid ${row.secondary_color || "#ffffff"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: row.secondary_color || "#ffffff",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {row.permanent_number || "—"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {driverName(row, t("admin.common.unnamedDriver"))}
                          {row.nickname ? (
                            <span style={{ fontWeight: 400, color: "#6B7280" }}>
                              {" "}
                              “{row.nickname}”
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={
                              row.is_junior ? cmsStyles.badgeDraft : cmsStyles.badgePublished
                            }
                          >
                            {row.is_junior ? t("admin.common.junior") : t("admin.common.adult")}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {householdName}
                          </span>
                          {household?.status ? (
                            <span style={{ fontSize: 12, color: "#6B7280" }}>
                              {household.status}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <EditButton
                        onClick={() =>
                          navigate(`/${clubSlug}/app/admin/drivers/${row.id}`)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
