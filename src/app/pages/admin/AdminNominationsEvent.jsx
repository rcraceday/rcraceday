import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { richTextToPlainText } from "@/app/lib/richText";
import {
  classEntryCounts,
  classMaxLimit,
  collectEventClassIds,
  driverDisplayName,
  formatEventDate,
  nominationWindowStatus,
  policyHint,
  racingEntriesOf,
} from "@/app/lib/adminNominations";
import { eventClassMinimumEntries } from "@app/pages/nominations/classMinimumEntries";
import { buildLiveTimeCsv, buildLiveTimeRows } from "@app/pages/nominations/LiveTimeExport";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import { DeleteButton, EditButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "@cms/styles";
import { cmsLayout } from "@cms/layout";

function windowBadgeStyle(statusId) {
  if (statusId === "open") return cmsStyles.badgePublished;
  if (statusId === "late") {
    return {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
    };
  }
  if (statusId === "closed") return cmsStyles.badgeDraft;
  return {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  };
}

const emptyDraft = {
  driver_id: "",
  classIds: [],
  preference: "",
  paid: true,
  total_fee: "",
};

export default function AdminNominationsEvent() {
  const navigate = useNavigate();
  const params = useParams();
  const { clubSlug } = params;
  const eventId = params.eventId || params.id;
  const { club } = useClub();

  const [event, setEvent] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [clubDrivers, setClubDrivers] = useState([]);
  const [classMap, setClassMap] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [availableClassIds, setAvailableClassIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    if (!eventId || !club?.id) return;
    setLoading(true);
    setError("");

    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !eventRow) {
      setError(eventError?.message || "Event not found.");
      setLoading(false);
      return;
    }

    const [{ data: nominationRows, error: nominationError }, { data: driverRows }] =
      await Promise.all([
        supabase.from("nominations").select("*").eq("event_id", eventId),
        supabase
          .from("drivers")
          .select("id, first_name, last_name, membership_id, club_id, permanent_number, is_junior, nickname, primary_color, secondary_color, gender, country, sponsors")
          .eq("club_id", club.id)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
      ]);

    if (nominationError) {
      setError((nominationError.message || "Could not load nominations.") + policyHint(nominationError.message));
    }

    const noms = nominationRows || [];
    const nominationIds = noms.map((row) => row.id);
    const { data: entryRows } = nominationIds.length
      ? await supabase.from("nomination_entries").select("*").in("nomination_id", nominationIds)
      : { data: [] };

    let trackClassIds = [];
    if (eventRow.track) {
      const { data: trackRows } = await supabase
        .from("club_track_classes")
        .select("class_id")
        .eq("track_id", eventRow.track);
      trackClassIds = (trackRows || []).map((row) => row.class_id).filter(Boolean);
    }

    const classIds = new Set(collectEventClassIds(eventRow, trackClassIds));
    (entryRows || []).forEach((entry) => {
      if (entry.class_id) classIds.add(entry.class_id);
    });

    const { data: classRows } = classIds.size
      ? await supabase.from("club_classes").select("id, name").in("id", Array.from(classIds))
      : { data: [] };

    const membershipIds = [
      ...new Set(
        (driverRows || [])
          .map((row) => row.membership_id)
          .filter(Boolean)
      ),
    ];
    const { data: membershipRows } = membershipIds.length
      ? await supabase
          .from("household_memberships")
          .select("id, email, primary_first_name, primary_last_name, membership_type, status")
          .in("id", membershipIds)
      : { data: [] };

    setEvent(eventRow);
    setNominations(noms);
    setEntries(entryRows || []);
    setClubDrivers(driverRows || []);
    setClassMap(Object.fromEntries((classRows || []).map((row) => [row.id, row.name])));
    setAvailableClassIds(Array.from(classIds));
    setMemberships(membershipRows || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [eventId, club?.id]);

  const driverMap = useMemo(
    () => new Map(clubDrivers.map((driver) => [driver.id, driver])),
    [clubDrivers]
  );

  const entriesByNomination = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      if (!map[entry.nomination_id]) map[entry.nomination_id] = [];
      map[entry.nomination_id].push(entry);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    );
    return map;
  }, [entries]);

  const racing = useMemo(() => racingEntriesOf(entries), [entries]);
  const counts = useMemo(() => classEntryCounts(entries), [entries]);
  const classMinimum = eventClassMinimumEntries(event);
  const window = nominationWindowStatus(event);
  const paidCount = nominations.filter((row) => row.paid).length;

  const classOptions = useMemo(() => {
    return availableClassIds
      .map((id) => ({ value: id, label: classMap[id] || "Unknown class" }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [availableClassIds, classMap]);

  const nominatedDriverIds = useMemo(
    () => new Set(nominations.map((row) => row.driver_id)),
    [nominations]
  );

  const addDriverOptions = useMemo(
    () =>
      clubDrivers
        .filter((driver) => !nominatedDriverIds.has(driver.id))
        .map((driver) => ({
          value: driver.id,
          label: `${driverDisplayName(driver)}${driver.permanent_number ? ` (#${driver.permanent_number})` : ""}`,
        })),
    [clubDrivers, nominatedDriverIds]
  );

  const filteredNominations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nominations
      .map((nomination) => ({
        nomination,
        driver: driverMap.get(nomination.driver_id),
        entries: entriesByNomination[nomination.id] || [],
      }))
      .filter((row) => {
        if (filter === "paid" && !row.nomination.paid) return false;
        if (filter === "unpaid" && row.nomination.paid) return false;
        if (!q) return true;
        const name = driverDisplayName(row.driver).toLowerCase();
        const number = String(row.driver?.permanent_number || "");
        const classes = row.entries
          .map((entry) => classMap[entry.class_id] || "")
          .join(" ")
          .toLowerCase();
        return name.includes(q) || number.includes(q) || classes.includes(q);
      })
      .sort((a, b) =>
        driverDisplayName(a.driver).localeCompare(driverDisplayName(b.driver))
      );
  }, [nominations, driverMap, entriesByNomination, search, filter, classMap]);

  function classIdsFromEntries(list) {
    return racingEntriesOf(list).map((entry) => entry.class_id).filter(Boolean);
  }

  function preferenceFromEntries(list) {
    return (list || []).find((entry) => entry.is_preference)?.class_id || "";
  }

  function startEdit(nomination) {
    const list = entriesByNomination[nomination.id] || [];
    setEditingId(nomination.id);
    setShowAdd(false);
    setEditDraft({
      driver_id: nomination.driver_id,
      classIds: classIdsFromEntries(list),
      preference: preferenceFromEntries(list),
      paid: !!nomination.paid,
      total_fee: nomination.total_fee ?? "",
    });
    setError("");
    setStatus("");
  }

  function addClass(setDraft, classId) {
    if (!classId) return;
    setDraft((prev) => ({ ...prev, classIds: [...prev.classIds, classId] }));
  }

  function removeClassAt(setDraft, index) {
    setDraft((prev) => {
      const classIds = prev.classIds.filter((_, i) => i !== index);
      const preference =
        prev.preference && classIds.includes(prev.preference) ? prev.preference : "";
      return { ...prev, classIds, preference };
    });
  }

  async function writeEntries(nominationId, classIds, preference) {
    const { error: deleteError } = await supabase
      .from("nomination_entries")
      .delete()
      .eq("nomination_id", nominationId);
    if (deleteError) return deleteError;

    const rows = classIds.filter(Boolean).map((classId, index) => ({
      nomination_id: nominationId,
      class_id: classId,
      is_preference: false,
      order_index: index + 1,
    }));
    if (preference && classIds.includes(preference)) {
      rows.push({
        nomination_id: nominationId,
        class_id: preference,
        is_preference: true,
        order_index: rows.length + 1,
      });
    }
    if (!rows.length) return null;
    const { error: insertError } = await supabase.from("nomination_entries").insert(rows);
    return insertError;
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (editDraft.classIds.length === 0) {
      setError("Select at least one class.");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");

    const { error: updateError } = await supabase
      .from("nominations")
      .update({
        paid: !!editDraft.paid,
        total_fee: editDraft.total_fee === "" ? null : Number(editDraft.total_fee),
      })
      .eq("id", editingId);

    if (updateError) {
      setError((updateError.message || "Could not save nomination.") + policyHint(updateError.message));
      setSaving(false);
      return;
    }

    const entryError = await writeEntries(editingId, editDraft.classIds, editDraft.preference);
    setSaving(false);
    if (entryError) {
      setError((entryError.message || "Could not save classes.") + policyHint(entryError.message));
      return;
    }
    setEditingId(null);
    setStatus("Nomination saved.");
    await load();
  }

  async function handleAdd() {
    if (!addDraft.driver_id) {
      setError("Select a driver.");
      return;
    }
    if (addDraft.classIds.length === 0) {
      setError("Select at least one class.");
      return;
    }
    const driver = driverMap.get(addDraft.driver_id) || clubDrivers.find((row) => row.id === addDraft.driver_id);
    setSaving(true);
    setError("");
    setStatus("");

    const { data, error: insertError } = await supabase
      .from("nominations")
      .insert({
        event_id: eventId,
        driver_id: addDraft.driver_id,
        group_id: driver?.membership_id || null,
        club_id: event?.club_id || club.id,
        total_fee: addDraft.total_fee === "" ? null : Number(addDraft.total_fee),
        paid: !!addDraft.paid,
        merchandise: { payment_method: "admin" },
      })
      .select("id")
      .single();

    if (insertError) {
      const duplicate = (insertError.message || "").toLowerCase().includes("unique");
      setError(
        duplicate
          ? "That driver is already nominated for this event."
          : (insertError.message || "Could not add nomination.") + policyHint(insertError.message)
      );
      setSaving(false);
      return;
    }

    const entryError = await writeEntries(data.id, addDraft.classIds, addDraft.preference);
    setSaving(false);
    if (entryError) {
      setError((entryError.message || "Could not save classes.") + policyHint(entryError.message));
      await load();
      return;
    }
    setAddDraft(emptyDraft);
    setShowAdd(false);
    setStatus("Nomination added.");
    await load();
  }

  async function handleDelete(nomination, driver) {
    const name = driverDisplayName(driver);
    const confirmed = window.confirm(`Delete ${name}'s nomination for this event?`);
    if (!confirmed) return;
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase.from("nominations").delete().eq("id", nomination.id);
    setSaving(false);
    if (deleteError) {
      setError((deleteError.message || "Could not delete nomination.") + policyHint(deleteError.message));
      return;
    }
    if (editingId === nomination.id) setEditingId(null);
    setStatus("Nomination deleted.");
    await load();
  }

  async function togglePaid(nomination) {
    const paid = nomination.paid !== true;
    const { error: updateError } = await supabase
      .from("nominations")
      .update({ paid })
      .eq("id", nomination.id);
    if (updateError) {
      setError((updateError.message || "Could not update paid.") + policyHint(updateError.message));
      return;
    }
    setNominations((current) =>
      current.map((row) => (row.id === nomination.id ? { ...row, paid } : row))
    );
  }

  function downloadCsv() {
    const csv = buildLiveTimeCsv(
      buildLiveTimeRows({
        nominations,
        entries,
        drivers: clubDrivers,
        classes: availableClassIds.map((id) => ({ id, name: classMap[id] })),
        memberships,
        clubName: club?.name || "",
        event,
      })
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${richTextToPlainText(event?.name) || "event"}-livetime.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function classPicker(draft, setDraft) {
    const selectedIds = [...new Set(draft.classIds.filter(Boolean))];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Classes</div>
        {draft.classIds.length === 0 ? (
          <p style={cmsLayout.muted}>No classes yet. Add a class below.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {draft.classIds.map((classId, index) => (
              <div
                key={`${classId}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>
                  {classMap[classId] || "Unknown class"}
                </span>
                <CMSButton type="button" onClick={() => removeClassAt(setDraft, index)}>
                  Remove
                </CMSButton>
              </div>
            ))}
          </div>
        )}
        <CMSSelect
          label="Add class"
          value=""
          onChange={(value) => addClass(setDraft, value)}
          options={classOptions}
          placeholder="Select class"
        />
        {classOptions.length === 0 && (
          <p style={cmsLayout.muted}>No classes assigned to this event.</p>
        )}
        <CMSSelect
          label="Preference"
          value={draft.preference || "none"}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, preference: value === "none" ? "" : value }))
          }
          options={[
            { value: "none", label: "None" },
            ...classOptions.filter((option) => selectedIds.includes(option.value)),
          ]}
          sortOptions={false}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={cmsStyles.pageContainer}>
        <div style={cmsStyles.pageContent}>
          <p style={{ color: "#6B7280" }}>Loading nominations…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={cmsStyles.pageContainer}>
        <div style={cmsStyles.pageContent}>
          <p style={{ color: "#991B1B" }}>{error || "Event not found."}</p>
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
              {richTextToPlainText(event.name).replace(/\s+/g, " ").trim() || "Event nominations"}
            </h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              {formatEventDate(event.event_date)} · add, change, or delete driver entries.
            </p>
          </header>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CMSButton
              variant="secondary"
              onClick={() => navigate(`/${clubSlug}/app/admin/nominations`)}
            >
              ← Back
            </CMSButton>
            <CMSButton type="button" onClick={downloadCsv}>
              LiveTime CSV
            </CMSButton>
            <CMSButton
              type="button"
              onClick={() => {
                setShowAdd(true);
                setEditingId(null);
                setError("");
                setStatus("");
              }}
            >
              Add nomination
            </CMSButton>
          </div>
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

        <CMSCard title="Overall">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              paddingTop: 8,
              alignItems: "center",
            }}
          >
            <span style={windowBadgeStyle(window.id)}>{window.label}</span>
            <span style={{ fontSize: 14, color: "#111827" }}>
              <strong>{nominations.length}</strong> driver{nominations.length === 1 ? "" : "s"}
            </span>
            <span style={{ fontSize: 14, color: "#111827" }}>
              <strong>{racing.length}</strong> {racing.length === 1 ? "entry" : "entries"}
            </span>
            <span style={{ fontSize: 14, color: "#111827" }}>
              <strong>{paidCount}</strong> paid · <strong>{nominations.length - paidCount}</strong> unpaid
            </span>
            {classMinimum != null && (
              <span style={{ fontSize: 13, color: "#6B7280" }}>
                Class minimum {classMinimum}
              </span>
            )}
          </div>
        </CMSCard>

        <CMSCard title="By class">
          {classOptions.length === 0 ? (
            <p style={{ color: "#6B7280", fontSize: 14, paddingTop: 8 }}>No classes on this event.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
                paddingTop: 8,
              }}
            >
              {classOptions.map((option) => {
                const count = counts[option.value] || 0;
                const max = classMaxLimit(event, option.value);
                const belowMin = classMinimum != null && count < classMinimum;
                return (
                  <div
                    key={option.value}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {option.label}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 18,
                        fontWeight: 700,
                        color: belowMin ? "#991B1B" : "#111827",
                      }}
                    >
                      {max != null ? `${count} / ${max}` : count}
                    </div>
                    {belowMin && (
                      <div style={{ fontSize: 12, color: "#991B1B" }}>
                        Below minimum {classMinimum}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CMSCard>

        {showAdd && (
          <CMSCard title="Add nomination">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <CMSSelect
                label="Driver"
                value={addDraft.driver_id}
                onChange={(value) => setAddDraft((prev) => ({ ...prev, driver_id: value }))}
                options={addDriverOptions}
                placeholder="Select driver"
              />
              {classPicker(addDraft, setAddDraft)}
              <div style={cmsLayout.row}>
                <div style={cmsLayout.column}>
                  <CMSInput
                    label="Fee"
                    type="number"
                    value={addDraft.total_fee}
                    onChange={(value) => setAddDraft((prev) => ({ ...prev, total_fee: value }))}
                  />
                </div>
                <div style={{ ...cmsLayout.column, display: "flex", alignItems: "flex-end" }}>
                  <CMSToggle
                    label="Paid"
                    checked={!!addDraft.paid}
                    onChange={(checked) => setAddDraft((prev) => ({ ...prev, paid: checked }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <CMSButton type="button" disabled={saving} onClick={handleAdd}>
                  {saving ? "Saving…" : "Add nomination"}
                </CMSButton>
                <CMSButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAdd(false);
                    setAddDraft(emptyDraft);
                  }}
                >
                  Cancel
                </CMSButton>
              </div>
            </div>
          </CMSCard>
        )}

        <CMSCard title="Nominations">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            <CMSInput
              label="Search"
              placeholder="Driver, number, or class"
              value={search}
              onChange={setSearch}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { id: "all", label: "All" },
                { id: "paid", label: "Paid" },
                { id: "unpaid", label: "Unpaid" },
              ].map((item) => (
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

            {filteredNominations.length === 0 ? (
              <p style={{ color: "#6B7280", fontSize: 14 }}>No nominations match.</p>
            ) : (
              filteredNominations.map(({ nomination, driver, entries: rowEntries }) => {
                const racingRow = racingEntriesOf(rowEntries);
                const preference = preferenceFromEntries(rowEntries);
                const isEditing = editingId === nomination.id;
                return (
                  <div
                    key={nomination.id}
                    style={{
                      padding: "16px 0",
                      borderBottom: "1px solid #F3F4F6",
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {driverDisplayName(driver)}
                          {driver?.permanent_number ? (
                            <span style={{ fontWeight: 400, color: "#6B7280" }}>
                              {" "}
                              #{driver.permanent_number}
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
                              nomination.paid ? cmsStyles.badgePublished : cmsStyles.badgeDraft
                            }
                          >
                            {nomination.paid ? "Paid" : "Unpaid"}
                          </span>
                          {nomination.total_fee != null && nomination.total_fee !== "" && (
                            <span style={{ fontSize: 12, color: "#6B7280" }}>
                              ${Number(nomination.total_fee).toFixed(2)}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {racingRow.length} {racingRow.length === 1 ? "class" : "classes"}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                          {racingRow.length
                            ? racingRow
                                .map((entry) => classMap[entry.class_id] || "Unknown class")
                                .join(" · ")
                            : "No classes"}
                          {preference
                            ? ` · Preference: ${classMap[preference] || "Unknown class"}`
                            : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <CMSButton type="button" onClick={() => togglePaid(nomination)}>
                          {nomination.paid ? "Mark unpaid" : "Mark paid"}
                        </CMSButton>
                        <EditButton onClick={() => startEdit(nomination)} />
                        <DeleteButton
                          onClick={() => handleDelete(nomination, driver)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          background: "#FAFAFA",
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                        }}
                      >
                        {classPicker(editDraft, setEditDraft)}
                        <div style={cmsLayout.row}>
                          <div style={cmsLayout.column}>
                            <CMSInput
                              label="Fee"
                              type="number"
                              value={editDraft.total_fee}
                              onChange={(value) =>
                                setEditDraft((prev) => ({ ...prev, total_fee: value }))
                              }
                            />
                          </div>
                          <div style={{ ...cmsLayout.column, display: "flex", alignItems: "flex-end" }}>
                            <CMSToggle
                              label="Paid"
                              checked={!!editDraft.paid}
                              onChange={(checked) =>
                                setEditDraft((prev) => ({ ...prev, paid: checked }))
                              }
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <CMSButton type="button" disabled={saving} onClick={handleSaveEdit}>
                            {saving ? "Saving…" : "Save changes"}
                          </CMSButton>
                          <CMSButton
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </CMSButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
