import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import {
  householdHasLifeMember,
  syncDriversIntoClubMembers,
} from "@/app/lib/syncClubMembers";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import { DeleteButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "@cms/styles";
import { cmsLayout } from "@cms/layout";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Pending" },
];

const DEFAULT_TYPE_OPTIONS = [
  { value: "adult", label: "Single Adult" },
  { value: "junior", label: "Junior" },
  { value: "family", label: "Family" },
  { value: "non_member", label: "Non-member" },
];

const emptyHousehold = {
  primary_first_name: "",
  primary_last_name: "",
  email: "",
  membership_type: "adult",
  status: "active",
  start_date: "",
  end_date: "",
  is_life_member: false,
};

const emptyPerson = {
  first_name: "",
  last_name: "",
  is_junior: false,
  is_driver: false,
  is_life_member: false,
};

export default function AdminMembershipEdit() {
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const { club } = useClub();
  const isNew = !id || id === "new";

  const [household, setHousehold] = useState(emptyHousehold);
  const [people, setPeople] = useState([]);
  const [draft, setDraft] = useState(emptyPerson);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const typeOptions =
    club?.membership_type_configs?.length > 0
      ? club.membership_type_configs
          .filter((row) => row.enabled !== false)
          .map((row) => ({
            value: row.type_key,
            label: row.display_name || row.type_key,
          }))
      : DEFAULT_TYPE_OPTIONS;

  async function loadExisting() {
    if (!id || isNew) return;
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError || !data) {
      setError(loadError?.message || "Household not found.");
      setLoading(false);
      return;
    }

    setHousehold({
      ...emptyHousehold,
      ...data,
      start_date: data.start_date || "",
      end_date: data.end_date || "",
    });

    const { members, error: syncError } = await syncDriversIntoClubMembers(
      supabase,
      id
    );
    if (syncError?.message?.includes("is_life_member")) {
      setError(
        "Life member column is missing. Run scripts/add-admin-membership-life-member.sql in Supabase."
      );
    } else if (syncError) {
      setError(syncError.message);
    }
    setPeople(members || []);
    setLoading(false);
  }

  useEffect(() => {
    loadExisting();
  }, [id]);

  const updateHousehold = (field, value) => {
    setHousehold((prev) => ({ ...prev, [field]: value }));
  };

  async function persistHouseholdLifeFlag(membershipId, nextPeople) {
    const isLife = householdHasLifeMember(nextPeople);
    await supabase
      .from("household_memberships")
      .update({ is_life_member: isLife })
      .eq("id", membershipId);
    setHousehold((prev) => ({ ...prev, is_life_member: isLife }));
  }

  async function handleSaveHousehold() {
    if (!club?.id) return;
    if (!household.email && !household.primary_first_name) {
      setError("Add a name or email for this household.");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");

    const payload = {
      club_id: club.id,
      primary_first_name: household.primary_first_name || "",
      primary_last_name: household.primary_last_name || "",
      email: (household.email || "").trim().toLowerCase() || null,
      membership_type: household.membership_type || "adult",
      status: household.status || "active",
      start_date: household.start_date || null,
      end_date: household.end_date || null,
      is_life_member: householdHasLifeMember(people),
    };

    if (isNew) {
      const { data, error: insertError } = await supabase
        .from("household_memberships")
        .insert(payload)
        .select("id")
        .single();

      setSaving(false);
      if (insertError) {
        setError(insertError.message || "Could not create household.");
        return;
      }
      navigate(`/${clubSlug}/app/admin/membership/${data.id}`, { replace: true });
      return;
    }

    const { error: updateError } = await supabase
      .from("household_memberships")
      .update(payload)
      .eq("id", id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message || "Could not save household.");
      return;
    }
    setStatus("Household saved.");
  }

  async function handleAddPerson() {
    if (isNew) {
      setError("Save the household first, then add members.");
      return;
    }
    if (!draft.first_name.trim() || !draft.last_name.trim()) {
      setError("Member first and last name are required.");
      return;
    }

    setSaving(true);
    setError("");

    let driverId = null;
    if (draft.is_driver) {
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .insert({
          membership_id: id,
          club_id: club.id,
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          is_junior: draft.is_junior,
        })
        .select("id")
        .single();

      if (driverError) {
        setSaving(false);
        setError(driverError.message || "Could not add driver.");
        return;
      }
      driverId = driver.id;
    }

    const { data: created, error: memberError } = await supabase
      .from("club_members")
      .insert({
        membership_id: id,
        driver_id: driverId,
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        is_junior: draft.is_junior,
        is_life_member: draft.is_life_member,
      })
      .select("*")
      .single();

    setSaving(false);
    if (memberError) {
      setError(memberError.message || "Could not add member.");
      return;
    }

    const nextPeople = [...people, created];
    setPeople(nextPeople);
    setDraft(emptyPerson);
    await persistHouseholdLifeFlag(id, nextPeople);
  }

  async function updatePerson(person, field, value) {
    const next = people.map((row) =>
      row.id === person.id ? { ...row, [field]: value } : row
    );
    setPeople(next);

    const { error: updateError } = await supabase
      .from("club_members")
      .update({ [field]: value })
      .eq("id", person.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (field === "is_life_member") {
      await persistHouseholdLifeFlag(id, next);
    }

    if ((field === "first_name" || field === "last_name" || field === "is_junior") && person.driver_id) {
      await supabase
        .from("drivers")
        .update({
          first_name: field === "first_name" ? value : person.first_name,
          last_name: field === "last_name" ? value : person.last_name,
          is_junior: field === "is_junior" ? value : person.is_junior,
        })
        .eq("id", person.driver_id);
    }
  }

  async function removePerson(person) {
    const confirmed = window.confirm(
      `Remove ${person.first_name} ${person.last_name} from this household?`
    );
    if (!confirmed) return;

    if (person.driver_id) {
      const alsoDriver = window.confirm(
        "Also delete their driver profile? Cancel keeps the driver but removes them as a member."
      );
      if (alsoDriver) {
        await supabase.from("drivers").delete().eq("id", person.driver_id);
      } else {
        await supabase
          .from("drivers")
          .update({ membership_id: null })
          .eq("id", person.driver_id);
      }
    }

    const { error: deleteError } = await supabase
      .from("club_members")
      .delete()
      .eq("id", person.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const nextPeople = people.filter((row) => row.id !== person.id);
    setPeople(nextPeople);
    await persistHouseholdLifeFlag(id, nextPeople);
  }

  async function handleDeleteHousehold() {
    if (isNew) return;
    const confirmed = window.confirm(
      "Delete this household membership? Members will be removed. Drivers stay unless you delete them separately."
    );
    if (!confirmed) return;

    await supabase.from("club_members").delete().eq("membership_id", id);
    await supabase.from("drivers").update({ membership_id: null }).eq("membership_id", id);
    const { error: deleteError } = await supabase
      .from("household_memberships")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    navigate(`/${clubSlug}/app/admin/membership`);
  }

  if (loading) {
    return (
      <div style={cmsStyles.pageContainer}>
        <div style={cmsStyles.pageContent}>
          <p style={{ color: "#6B7280" }}>Loading household…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>
              {isNew ? "Add household" : "Edit household"}
            </h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              Household details, members, and life member status.
            </p>
          </header>
          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${clubSlug}/app/admin/membership`)}
          >
            ← Back
          </CMSButton>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {status && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              backgroundColor: "#DCFCE7",
              color: "#166534",
              fontSize: 14,
            }}
          >
            {status}
          </div>
        )}

        <CMSCard title="Household">
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="First name"
                  value={household.primary_first_name}
                  onChange={(value) => updateHousehold("primary_first_name", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Last name"
                  value={household.primary_last_name}
                  onChange={(value) => updateHousehold("primary_last_name", value)}
                />
              </div>
            </div>
            <CMSInput
              label="Email"
              type="email"
              value={household.email || ""}
              onChange={(value) => updateHousehold("email", value)}
            />
            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSSelect
                  label="Membership type"
                  value={household.membership_type}
                  onChange={(value) => updateHousehold("membership_type", value)}
                  options={typeOptions}
                  sortOptions={false}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSSelect
                  label="Status"
                  value={household.status || "active"}
                  onChange={(value) => updateHousehold("status", value)}
                  options={STATUS_OPTIONS}
                  sortOptions={false}
                />
              </div>
            </div>
            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Start date"
                  type="date"
                  value={household.start_date || ""}
                  onChange={(value) => updateHousehold("start_date", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="End date"
                  type="date"
                  value={household.end_date || ""}
                  onChange={(value) => updateHousehold("end_date", value)}
                />
              </div>
            </div>
            <p style={cmsLayout.muted}>
              Life member is set on people below. It makes this household membership
              free; they can still renew and choose whether to pay.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CMSButton
                type="button"
                disabled={saving}
                onClick={handleSaveHousehold}
              >
                {saving ? "Saving…" : isNew ? "Create household" : "Save household"}
              </CMSButton>
              {!isNew && (
                <CMSButton type="button" variant="secondary" onClick={handleDeleteHousehold}>
                  Delete household
                </CMSButton>
              )}
            </div>
          </div>
        </CMSCard>

        {!isNew && (
          <CMSCard title="Members">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <p style={cmsLayout.muted}>
                Drivers on this household are listed as members. Use Life member on a
                row to grant free membership for life.
              </p>

              <div
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 90px 90px 120px 80px",
                    gap: 8,
                    padding: "10px 12px",
                    background: "#F9FAFB",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6B7280",
                  }}
                >
                  <span>First name</span>
                  <span>Last name</span>
                  <span>Junior</span>
                  <span>Driver</span>
                  <span>Life member</span>
                  <span />
                </div>

                {people.length === 0 && (
                  <div style={{ padding: 16, fontSize: 13, color: "#6B7280" }}>
                    No members yet. Drivers linked to this household will appear here
                    after load.
                  </div>
                )}

                {people.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 90px 90px 120px 80px",
                      gap: 8,
                      padding: "10px 12px",
                      alignItems: "center",
                      borderTop: "1px solid #F3F4F6",
                    }}
                  >
                    <CMSInput
                      value={person.first_name || ""}
                      onChange={(value) => updatePerson(person, "first_name", value)}
                    />
                    <CMSInput
                      value={person.last_name || ""}
                      onChange={(value) => updatePerson(person, "last_name", value)}
                    />
                    <CMSToggle
                      label=""
                      checked={!!person.is_junior}
                      onChange={(checked) => updatePerson(person, "is_junior", checked)}
                    />
                    <span style={{ fontSize: 13, color: "#6B7280" }}>
                      {person.driver_id ? "Yes" : "No"}
                    </span>
                    <CMSToggle
                      label=""
                      checked={!!person.is_life_member}
                      onChange={(checked) =>
                        updatePerson(person, "is_life_member", checked)
                      }
                    />
                    <DeleteButton onClick={() => removePerson(person)}>
                      Remove
                    </DeleteButton>
                  </div>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  background: "#FAFAFA",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Add member</p>
                <div style={cmsLayout.row}>
                  <div style={cmsLayout.column}>
                    <CMSInput
                      label="First name"
                      value={draft.first_name}
                      onChange={(value) => setDraft((prev) => ({ ...prev, first_name: value }))}
                    />
                  </div>
                  <div style={cmsLayout.column}>
                    <CMSInput
                      label="Last name"
                      value={draft.last_name}
                      onChange={(value) => setDraft((prev) => ({ ...prev, last_name: value }))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                  <CMSToggle
                    label="Junior"
                    checked={draft.is_junior}
                    onChange={(checked) => setDraft((prev) => ({ ...prev, is_junior: checked }))}
                  />
                  <CMSToggle
                    label="Also a driver"
                    checked={draft.is_driver}
                    onChange={(checked) => setDraft((prev) => ({ ...prev, is_driver: checked }))}
                  />
                  <CMSToggle
                    label="Life member"
                    checked={draft.is_life_member}
                    onChange={(checked) =>
                      setDraft((prev) => ({ ...prev, is_life_member: checked }))
                    }
                  />
                </div>
                <div>
                  <CMSButton type="button" disabled={saving} onClick={handleAddPerson}>
                    Add member
                  </CMSButton>
                </div>
              </div>
            </div>
          </CMSCard>
        )}
      </div>
    </div>
  );
}
