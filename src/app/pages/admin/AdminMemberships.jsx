import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import {
  displayNameFromMembershipRow,
  fetchMembershipDisplayNameMap,
  formatPersonName,
} from "@/app/lib/membershipDisplayName";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import { EditButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "@cms/styles";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "members", label: "Members" },
  { id: "non_member", label: "Non-members" },
  { id: "life", label: "Life members" },
];

function typeLabel(type) {
  const key = (type || "").toLowerCase();
  if (key === "adult" || key === "single") return "Single Adult";
  if (key === "junior") return "Junior";
  if (key === "family") return "Family";
  if (key === "non_member") return "Non-member";
  return type || "—";
}

function householdIsLife(row, people = []) {
  return (
    row.is_life_member === true ||
    people.some((person) => !person.driver_id && person.is_life_member)
  );
}

function statusStyle(status, isLife) {
  const key = (status || "").toLowerCase();
  if (isLife) {
    return { backgroundColor: "#FEF3C7", color: "#92400E" };
  }
  if (key === "active" || key === "current") {
    return cmsStyles.badgePublished;
  }
  if (key === "expired") {
    return cmsStyles.badgeDraft;
  }
  return {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  };
}

export default function AdminMemberships() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();

  const [households, setHouseholds] = useState([]);
  const [membersByHousehold, setMembersByHousehold] = useState({});
  const [displayNameById, setDisplayNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    if (!club?.id) return;
    setLoading(true);
    setError("");

    const { data: rows, error: householdError } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .order("primary_last_name", { ascending: true })
      .order("primary_first_name", { ascending: true });

    if (householdError) {
      setError(householdError.message || "Could not load memberships.");
      setHouseholds([]);
      setLoading(false);
      return;
    }

    const list = rows || [];
    setHouseholds(list);

    const ids = list.map((row) => row.id);
    if (ids.length === 0) {
      setMembersByHousehold({});
      setDisplayNameById({});
      setLoading(false);
      return;
    }

    const nameMap = await fetchMembershipDisplayNameMap(supabase, ids);
    setDisplayNameById(nameMap);

    const { data: people, error: peopleError } = await supabase
      .from("club_members")
      .select(
        "id, membership_id, first_name, last_name, is_junior, driver_id, is_life_member"
      )
      .in("membership_id", ids);

    if (peopleError) {
      setError(peopleError.message);
    }

    const grouped = {};
    (people || []).forEach((person) => {
      if (!grouped[person.membership_id]) grouped[person.membership_id] = [];
      grouped[person.membership_id].push(person);
    });
    setMembersByHousehold(grouped);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [club?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return households.filter((row) => {
      const type = (row.membership_type || "").toLowerCase();
      const people = membersByHousehold[row.id] || [];
      const isLife = householdIsLife(row, people);

      if (filter === "members" && type === "non_member") return false;
      if (filter === "non_member" && type !== "non_member") return false;
      if (filter === "life" && !isLife) return false;

      if (!q) return true;
      const accountName = (
        displayNameById[row.id] || displayNameFromMembershipRow(row)
      ).toLowerCase();
      const primaryName = formatPersonName(
        row.primary_first_name,
        row.primary_last_name
      ).toLowerCase();
      const email = (row.email || "").toLowerCase();
      const memberNames = people
        .map((person) =>
          formatPersonName(person.first_name, person.last_name).toLowerCase()
        )
        .join(" ");
      const haystack = [accountName, primaryName, email, memberNames]
        .filter(Boolean)
        .join(" ");
      return haystack.includes(q);
    });
  }, [households, membersByHousehold, displayNameById, search, filter]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>Membership</h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              Households, members, and drivers for this club.
            </p>
          </header>
          <CMSButton
            onClick={() => navigate(`/${clubSlug}/app/admin/membership/new`)}
            style={{ whiteSpace: "nowrap" }}
          >
            Add household
          </CMSButton>
        </div>

        <CMSCard titleKey="admin.membership.householdsCard">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            <CMSInput
              label="Search"
              placeholder="Account holder, email, or member name"
              value={search}
              onChange={setSearch}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FILTERS.map((item) => (
                <CMSButton
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  style={
                    filter === item.id
                      ? { borderColor: "#991B1B", backgroundColor: "#f8f3f3" }
                      : undefined
                  }
                >
                  {item.label}
                </CMSButton>
              ))}
            </div>

            {loading ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>Loading memberships…</p>
            ) : error ? (
              <p style={{ color: "#991B1B", fontSize: 14 }}>
                {error}
                {error.toLowerCase().includes("is_life_member") ||
                error.toLowerCase().includes("policy")
                  ? " Run scripts/add-admin-membership-life-member.sql in Supabase."
                  : ""}
              </p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>No households match.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((row) => {
                  const people = membersByHousehold[row.id] || [];
                  const isLife = householdIsLife(row, people);
                  const driverCount = people.filter((person) => person.driver_id).length;
                  const name =
                    displayNameById[row.id] || displayNameFromMembershipRow(row);

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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{name}</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                          {row.email || "No email"}
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
                          <span style={statusStyle(row.status, isLife)}>
                            {isLife ? "Life member" : row.status || "—"}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {typeLabel(row.membership_type)}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {people.length} member{people.length === 1 ? "" : "s"}
                            {driverCount
                              ? ` · ${driverCount} driver${driverCount === 1 ? "" : "s"}`
                              : ""}
                          </span>
                        </div>
                        {people.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                            {people
                              .map((person) => {
                                const personName = [person.first_name, person.last_name]
                                  .filter(Boolean)
                                  .join(" ");
                                const tags = [
                                  person.is_junior ? "Junior" : null,
                                  person.driver_id ? "Driver" : null,
                                ].filter(Boolean);
                                return tags.length
                                  ? `${personName} (${tags.join(", ")})`
                                  : personName;
                              })
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                      <EditButton
                        onClick={() =>
                          navigate(`/${clubSlug}/app/admin/membership/${row.id}`)
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
