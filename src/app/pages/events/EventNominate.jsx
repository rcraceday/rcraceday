import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardDocumentCheckIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useTheme from "@app/providers/useTheme";
import { calculateUserPricing } from "@app/pages/events/events-sections/calculatePricing";
import useRcraClubs from "@app/providers/useRcraClubs";
import SearchableClubSelect from "@components/SearchableClubSelect";
import {
  classLimitLabel,
  flattenMultiDaySelections,
  getClassLimitNumber,
  getDayClassLimit,
  getDayClassSlots,
  getEventClassLimit,
  multiDayClassLimitError,
  multiDaySlotsPerDay,
  validateDriverClassSelections,
} from "@/app/lib/eventClassLimit";

const money = (value) => Number(value || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const emptySelection = () => ({ classSlots: [], classesByDay: {}, preference: "", merch: {}, addons: {} });

// Legacy events only have flat member/non_member/junior prices - map them onto the pricing engine's per_entry shape.
function pricingConfigFor(event) {
  if (event?.pricing?.mode) return event.pricing;
  return {
    mode: "per_entry",
    global: { free: false, member: event?.member_price ?? 0, non_member: event?.non_member_price ?? 0, junior: event?.junior_price ?? 0 },
    charge_preferences: false,
    late_fee: 0,
  };
}

function optionExtra(group, selectedLabel) {
  const value = group?.values?.find((v) => v.label === selectedLabel);
  return Number(value?.price || 0);
}

export default function EventNominate() {
  const { eventId, clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { membership } = useMembership();
  const { drivers, loadingDrivers } = useDrivers();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";
  const contentText = palette?.text || "#1f2937";
  const { clubs: rcraClubs, loading: loadingClubs } = useRcraClubs();

  const [event, setEvent] = useState(null);
  const [clubClasses, setClubClasses] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [otherEntryCounts, setOtherEntryCounts] = useState({});
  const [requirementSelections, setRequirementSelections] = useState({});
  const [clubAffiliationConfirmed, setClubAffiliationConfirmed] = useState(false);
  const [affiliatedClubId, setAffiliatedClubId] = useState("");

  const logoSrc = event?.logourl
    ? event.logourl.startsWith("http")
      ? event.logourl
      : `https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/${event.logourl}`
    : null;

  useEffect(() => {
    async function load() {
      const { data: eventRow, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (eventError) setError("Unable to load this event nomination.");
      setEvent(eventRow || null);

      const classIds = Array.from(new Set(eventRow?.is_multi_day ? (eventRow.classes_by_day || []).flatMap((day) => day.classes || []) : eventRow?.classes || []));
      if (classIds.length) {
        const { data: classRows, error: classError } = await supabase.from("club_classes").select("id, name").in("id", classIds);
        if (classError) setError("Unable to load this event nomination.");
        setClubClasses(classRows || []);
      } else {
        setClubClasses([]);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  // Count entries already taken by other households so limits can count down live.
  useEffect(() => {
    async function loadCounts() {
      const limits = event?.class_entry_limits;
      if (!event?.id || !limits || Object.keys(limits).length === 0) {
        setOtherEntryCounts({});
        return;
      }

      const { data: nominationRows } = await supabase.from("nominations").select("id, group_id").eq("event_id", event.id);
      const otherIds = (nominationRows || []).filter((row) => row.group_id !== membership?.id).map((row) => row.id);
      if (!otherIds.length) {
        setOtherEntryCounts({});
        return;
      }

      const { data: entryRows } = await supabase.from("nomination_entries").select("class_id").in("nomination_id", otherIds).eq("is_preference", false);
      const counts = {};
      (entryRows || []).forEach((row) => {
        counts[row.class_id] = (counts[row.class_id] || 0) + 1;
      });
      setOtherEntryCounts(counts);
    }
    loadCounts();
  }, [event, membership?.id]);

  const classMap = useMemo(() => new Map(clubClasses.map((item) => [item.id, item.name])), [clubClasses]);
  const classLimit = getClassLimitNumber(event);
  const classLimitPerDay = getDayClassLimit(event);
  const preferenceEnabled = !!event?.preference_enabled;
  const requiresRcraClub = !!event?.requires_rcra_club;
  const merchandise = Array.isArray(event?.merchandise) ? event.merchandise : [];
  const addOns = Array.isArray(event?.class_add_ons) ? event.class_add_ons : [];
  const clubRequirements = Array.isArray(event?.club_requirements) ? event.club_requirements : [];
  const pricing = useMemo(() => pricingConfigFor(event), [event]);
  const entryLimits = event?.class_entry_limits || {};

  function localSelectionCount(classId) {
    return Object.values(selections).reduce((count, selection) => {
      const ids = event?.is_multi_day
        ? flattenMultiDaySelections(selection.classesByDay || {})
        : (selection.classSlots || []);
      return count + ids.filter((id) => id === classId).length;
    }, 0);
  }

  // Returns { limit, taken } for classes with a configured max, otherwise null (unlimited).
  function classUsage(classId) {
    if (!classId || entryLimits[classId] == null || entryLimits[classId] === "") return null;
    const limit = Number(entryLimits[classId]);
    const taken = (otherEntryCounts[classId] || 0) + localSelectionCount(classId);
    return { limit, taken };
  }

  function classOptionLabel(classId) {
    const name = classMap.get(classId) || classId;
    const usage = classUsage(classId);
    return usage ? `${name} (${usage.taken}/${usage.limit})` : name;
  }

  function classOptionDisabled(classId, currentValue) {
    if (classId === currentValue) return false;
    const usage = classUsage(classId);
    return !!usage && usage.taken >= usage.limit;
  }

  // Seed one selection slot per driver once drivers/event are known, and resize when limits change.
  useEffect(() => {
    if (!event || !drivers.length) return;
    setSelections((current) => {
      const next = { ...current };
      const dayCount = event.is_multi_day ? (event.days || []).length : 0;
      const slotsPerDay = multiDaySlotsPerDay(event);
      drivers.forEach((driver) => {
        const existing = next[driver.id];
        if (!existing) {
          const classesByDay = {};
          if (event.is_multi_day) {
            for (let i = 0; i < dayCount; i += 1) {
              classesByDay[i] = Array.from({ length: slotsPerDay }, () => "");
            }
          }
          next[driver.id] = {
            ...emptySelection(),
            classesByDay,
            classSlots: Array.from({ length: classLimit }, () => ""),
          };
          return;
        }
        if (event.is_multi_day) {
          const classesByDay = { ...existing.classesByDay };
          for (let i = 0; i < dayCount; i += 1) {
            classesByDay[i] = getDayClassSlots(classesByDay, i, slotsPerDay);
          }
          next[driver.id] = { ...existing, classesByDay };
        } else {
          const slots = (existing.classSlots || []).slice();
          while (slots.length < classLimit) slots.push("");
          next[driver.id] = { ...existing, classSlots: slots.slice(0, classLimit) };
        }
      });
      return next;
    });
  }, [event, drivers, classLimit, classLimitPerDay]);

  function updateSelection(driverId, update) {
    setSelections((current) => ({ ...current, [driverId]: { ...emptySelection(), ...current[driverId], ...update } }));
  }

  function toggleRequirement(id) {
    setRequirementSelections((current) => ({ ...current, [id]: !current[id] }));
  }

  function setDayClass(driverId, dayIndex, classId, slotIndex = 0) {
    const current = selections[driverId] || emptySelection();
    const slotsPerDay = multiDaySlotsPerDay(event);
    const slots = getDayClassSlots(current.classesByDay, dayIndex, slotsPerDay);
    const currentValue = slots[slotIndex] || "";
    const limitErr = multiDayClassLimitError({
      event,
      classesByDay: current.classesByDay,
      dayIndex,
      classId,
      currentValue,
    });
    if (limitErr) {
      setError(limitErr);
      setTimeout(() => setError(""), 2500);
      return;
    }
    slots[slotIndex] = classId;
    const nextByDay = { ...current.classesByDay, [dayIndex]: slots };
    const flat = flattenMultiDaySelections(nextByDay);
    const stillSelected = flat.includes(current.preference);
    updateSelection(driverId, { classesByDay: nextByDay, preference: stillSelected ? current.preference : "" });
  }

  function setClassSlot(driverId, slotIndex, classId) {
    const current = selections[driverId] || emptySelection();
    const slots = current.classSlots.slice();
    slots[slotIndex] = classId;
    const stillSelected = slots.includes(current.preference);
    updateSelection(driverId, { classSlots: slots, preference: stillSelected ? current.preference : "" });
  }

  function selectedClassIds(selection) {
    if (!selection) return [];
    return Array.from(
      new Set(
        event?.is_multi_day
          ? flattenMultiDaySelections(selection.classesByDay)
          : selection.classSlots.filter(Boolean)
      )
    );
  }

  function updateMerchQty(driverId, itemId, qty, maxQty) {
    const current = selections[driverId] || emptySelection();
    const clamped = Math.max(0, Math.min(Number(qty) || 0, maxQty || 99));
    updateSelection(driverId, { merch: { ...current.merch, [itemId]: { ...(current.merch[itemId] || {}), qty: clamped } } });
  }

  function updateMerchOption(driverId, itemId, groupName, value) {
    const current = selections[driverId] || emptySelection();
    const entry = current.merch[itemId] || { qty: 1, options: {} };
    updateSelection(driverId, { merch: { ...current.merch, [itemId]: { ...entry, options: { ...entry.options, [groupName]: value } } } });
  }

  function updateAddonQty(driverId, addonId, qty, maxQty) {
    const current = selections[driverId] || emptySelection();
    const clamped = Math.max(0, Math.min(Number(qty) || 0, maxQty || 99));
    updateSelection(driverId, { addons: { ...current.addons, [addonId]: { ...(current.addons[addonId] || {}), qty: clamped, selected: clamped > 0 } } });
  }

  function updateAddonOption(driverId, addonId, groupName, value) {
    const current = selections[driverId] || emptySelection();
    const entry = current.addons[addonId] || { qty: 1, selected: true, options: {} };
    updateSelection(driverId, { addons: { ...current.addons, [addonId]: { ...entry, options: { ...entry.options, [groupName]: value } } } });
  }

  function merchandiseCostFor(selection) {
    return merchandise.reduce((sum, item) => {
      const entry = selection.merch[item.id];
      const qty = item.included || item.compulsory ? 1 : Number(entry?.qty || 0);
      if (qty <= 0) return sum;
      const base = item.included ? 0 : Number(item.price || 0);
      const optionsCost = Array.isArray(item.options) ? item.options.reduce((s, group) => s + optionExtra(group, entry?.options?.[group.name]), 0) : 0;
      return sum + (base + optionsCost) * qty;
    }, 0);
  }

  function addonsFor(selection) {
    const classIds = selectedClassIds(selection);
    return addOns.filter((addon) => !Array.isArray(addon.classes) || addon.classes.length === 0 || addon.classes.some((id) => classIds.includes(id)));
  }

  function addonCostFor(selection) {
    return addonsFor(selection).reduce((sum, addon) => {
      const entry = selection.addons[addon.id];
      const qty = addon.required ? 1 : Number(entry?.qty || 0);
      if (qty <= 0) return sum;
      const base = Number(addon.price || 0);
      const optionsCost = Array.isArray(addon.options) ? addon.options.reduce((s, group) => s + optionExtra(group, entry?.options?.[group.name]), 0) : 0;
      return sum + (base + optionsCost) * qty;
    }, 0);
  }

  function driverTotal(driver) {
    const selection = selections[driver.id] || emptySelection();
    const classIds = selectedClassIds(selection);
    const membershipType = driver.is_junior ? "junior" : membership?.isMember ? "member" : "non_member";
    const classResult = calculateUserPricing({
      event,
      pricing,
      selectedClasses: classIds,
      membershipType,
      preferenceMap: selection.preference ? { [selection.preference]: true } : {},
    });
    return (classResult.total || 0) + merchandiseCostFor(selection) + addonCostFor(selection);
  }

  const householdTotal = drivers.reduce((sum, driver) => sum + driverTotal(driver), 0);

  // Stub payment step - a real integration would create a Stripe/PayPal session on the server and redirect here on return.
  function startPayment(method) {
    setPaymentMethod(method);
    setPaymentConfirmed(true);
  }

  async function confirmPaymentAndNominations() {
    if (!membership?.id) return setError("Membership information is not available.");
    const active = drivers.map((driver) => ({ driver, selection: selections[driver.id] || emptySelection() })).filter(({ selection }) => selectedClassIds(selection).length > 0);
    if (!active.length) return setError("Select at least one class for a driver.");

    if (requiresRcraClub && !clubAffiliationConfirmed) {
      return setError("You must confirm your RCRA club affiliation.");
    }

    if (requiresRcraClub && !affiliatedClubId) {
      return setError("Select your RCRA club.");
    }

    for (const { selection } of active) {
      const limitErr = validateDriverClassSelections(event, selection);
      if (limitErr) return setError(limitErr);
    }

    for (const { selection } of active) {
      for (const classId of selectedClassIds(selection)) {
        const usage = classUsage(classId);
        if (usage && usage.taken > usage.limit) {
          return setError(`${classMap.get(classId) || "A class"} is full. Please choose another class.`);
        }
      }
    }

    setSaving(true);
    setError("");

    const { data: existing } = await supabase.from("nominations").select("id").eq("event_id", eventId).eq("group_id", membership.id);
    const existingIds = (existing || []).map((item) => item.id);
    if (existingIds.length) {
      await supabase.from("nomination_entries").delete().in("nomination_id", existingIds);
      await supabase.from("nominations").delete().in("id", existingIds);
    }

    const { data: nominations, error: nominationError } = await supabase
      .from("nominations")
      .insert(
        active.map(({ driver, selection }) => ({
          event_id: eventId,
          driver_id: driver.id,
          group_id: membership.id,
          club_id: club?.id || driver.club_id,
          affiliated_club_id: affiliatedClubId,
          total_fee: driverTotal(driver),
          paid: true,
          merchandise: {
            merch: selection.merch,
            addons: selection.addons,
            requirements: requirementSelections,
            payment_method: paymentMethod,
          },
        }))
      )
      .select("id, driver_id");

    if (nominationError || !nominations) {
      setError(nominationError?.message || "Unable to save nominations.");
      setSaving(false);
      return;
    }

    const entries = [];
    nominations.forEach((nomination) => {
      const selection = selections[nomination.driver_id] || emptySelection();
      const classIds = selectedClassIds(selection);
      classIds.forEach((classId, index) => entries.push({ nomination_id: nomination.id, class_id: classId, is_preference: false, order_index: index + 1 }));
      if (preferenceEnabled && selection.preference) entries.push({ nomination_id: nomination.id, class_id: selection.preference, is_preference: true, order_index: classIds.length + 1 });
    });

    const { error: entryError } = await supabase.from("nomination_entries").insert(entries);
    setSaving(false);
    if (entryError) return setError(entryError.message || "Unable to save class entries.");
    setSaved(true);
    navigate(`/${clubSlug}/app/events/${eventId}/nominations`);
  }

  function Field({ label, value }) {
    return (
      <div>
        <div className="text-xs font-medium text-text-muted mb-1">{label}</div>
        <div className="rounded-md border border-surfaceBorder bg-surfaceAlt px-3 py-2 text-sm">{value || "—"}</div>
      </div>
    );
  }

  function OptionGroups({ groups, selected, onChange }) {
    if (!Array.isArray(groups) || groups.length === 0) return null;
    return (
      <div className="grid gap-2 sm:grid-cols-2 mt-2">
        {groups.map((group) => (
          <label key={group.name} className="text-xs font-medium">
            {group.name}
            <select className="mt-1 w-full rounded-md border border-surfaceBorder bg-white px-2 py-1.5 text-sm" value={selected?.[group.name] || ""} onChange={(e) => onChange(group.name, e.target.value)}>
              <option value="">Select {group.name}</option>
              {group.values.map((v) => (
                <option key={v.label} value={v.label}>
                  {v.label}{typeof v.price === "number" && v.price > 0 ? ` (+${money(v.price)})` : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  function flattenRequirements(requirements) {
    if (!Array.isArray(requirements)) return [];

    return requirements.flatMap((requirement, groupIndex) => {
      const descriptor = typeof requirement?.descriptor === "string" ? requirement.descriptor.trim() : "";
      const items = Array.isArray(requirement?.items)
        ? requirement.items.map((item) => String(item ?? "").trim()).filter(Boolean)
        : typeof requirement?.item === "string" && requirement.item.trim()
          ? [requirement.item.trim()]
          : [];

      const requirementId = requirement?.id || `requirement-${groupIndex}`;

      return items.map((item, itemIndex) => ({
        id: `${requirementId}-${itemIndex}`,
        requirementId,
        descriptor,
        item,
      }));
    });
  }

  const flatRequirements = useMemo(
    () => flattenRequirements(event?.club_requirements),
    [event?.club_requirements]
  );

  if (loading || loadingDrivers) return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading nomination form...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-text-muted">Event not found.</div>;

  const days = event.is_multi_day ? event.days || [] : [{ date: event.event_date, label: "" }];

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle
        icon={ClipboardDocumentCheckIcon}
        title="Nominate"
        style={{ color: brand }}
        actions={
          <Button variant="primary" size="sm" className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1" onClick={() => navigate(`/${clubSlug}/app/events/${event.id}`)}>
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        }
      />

      <main className="max-w-[820px] mx-auto px-4 py-6 space-y-5">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <Card className="!p-0 overflow-hidden">
          {/* EVENT HEADER - matches Event Details logo/name block */}
          <div className="flex flex-col items-center" style={{ background: `linear-gradient(180deg, ${brand} 0%, ${palette?.surfaceAlt || "#f9fafb"} 70%)`, padding: "24px 0" }}>
            <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] border rounded-[10px] overflow-hidden flex items-center justify-center mb-3" style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}>
              {logoSrc ? <img src={logoSrc} alt={event.name} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-[#f0f0f0]" />}
            </div>
            <div className="font-semibold text-center text-[20px] sm:text-[28px]" style={{ color: contentText }}>{event.name}</div>
          </div>

          <div className="p-5 space-y-6">
            {/* EVENT FIELDS */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Event Type" value={event.event_type ? event.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""} />
              <Field label="Track" value={event.track || ""} />
              {event.is_multi_day ? (
                <>
                  <Field label="Max Event Classes per Driver" value={getEventClassLimit(event) ?? "No event maximum"} />
                  <Field label="Max Classes per Day per Driver" value={getDayClassLimit(event) ?? "No daily maximum"} />
                </>
              ) : (
                <Field label="Class Limit" value={classLimitLabel(event)} />
              )}
              <Field label="Preferences" value={preferenceEnabled ? `Allowed (${event.preference_limit ?? 1})` : "Not allowed"} />
              <Field label="Nominations Open" value={event.nominations_open ? new Date(event.nominations_open).toLocaleString("en-AU") : ""} />
              <Field label="Nominations Close" value={event.nominations_close ? new Date(event.nominations_close).toLocaleString("en-AU") : ""} />
            </div>

            {flatRequirements.length > 0 && (
              <div className="rounded-lg border border-surfaceBorder p-4 space-y-3">
                <p className="text-sm font-medium">Club Requirements</p>

                {Object.values(
                  flatRequirements.reduce((groups, requirement) => {
                    if (!groups[requirement.requirementId]) {
                      groups[requirement.requirementId] = {
                        descriptor: requirement.descriptor,
                        items: [],
                      };
                    }
                    groups[requirement.requirementId].items.push(requirement);
                    return groups;
                  }, {})
                ).map((group) => (
                  <div key={group.items[0].requirementId} className="space-y-2">
                    <div className="text-sm font-medium">{group.descriptor}</div>
                    <div className="flex flex-col gap-2 pl-1">
                      {group.items.map((requirement) => (
                        <label key={requirement.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!requirementSelections[requirement.id]}
                            onChange={() => toggleRequirement(requirement.id)}
                          />
                          <span>{requirement.item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {drivers.map((driver) => {
              const selection = selections[driver.id] || emptySelection();
              const classIds = selectedClassIds(selection);
              return (
                <section key={driver.id} className="rounded-lg border border-surfaceBorder p-4 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{driver.first_name} {driver.last_name}</h3>
                    <span className="text-sm font-semibold">{money(driverTotal(driver))}</span>
                  </div>

                  {/* DAYS + CLASSES */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Days Racing & Classes</p>
                    {event.is_multi_day
                      ? days.map((day, dayIndex) => {
                          const dayClassIds = (event.classes_by_day?.[dayIndex]?.classes || []);
                          const slotsPerDay = multiDaySlotsPerDay(event);
                          const daySlots = getDayClassSlots(selection.classesByDay, dayIndex, slotsPerDay);
                          return (
                            <div key={dayIndex} className="space-y-2">
                              <p className="text-xs font-medium">
                                {day.label || `Day ${dayIndex + 1}`}{day.date ? ` — ${new Date(day.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}` : ""}
                              </p>
                              {daySlots.map((currentValue, slotIndex) => (
                                <label key={slotIndex} className="block text-xs font-medium">
                                  {slotsPerDay > 1 ? `Class ${slotIndex + 1}` : "Class"}
                                  <select
                                    className="mt-1 w-full rounded-md border border-surfaceBorder bg-white px-3 py-2 text-sm"
                                    value={currentValue}
                                    onChange={(e) => setDayClass(driver.id, dayIndex, e.target.value, slotIndex)}
                                  >
                                    <option value="">{slotsPerDay > 1 ? "No class selected" : "Not racing this day"}</option>
                                    {dayClassIds.map((id) => (
                                      <option key={id} value={id} disabled={classOptionDisabled(id, currentValue)}>
                                        {classOptionLabel(id)}{classOptionDisabled(id, currentValue) ? " - FULL" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                          );
                        })
                      : Array.from({ length: classLimit }, (_, slotIndex) => {
                          const currentValue = selection.classSlots[slotIndex] || "";
                          return (
                            <label key={slotIndex} className="block text-xs font-medium">
                              {`Class ${slotIndex + 1}`}
                              <select className="mt-1 w-full rounded-md border border-surfaceBorder bg-white px-3 py-2 text-sm" value={currentValue} onChange={(e) => setClassSlot(driver.id, slotIndex, e.target.value)}>
                                <option value="">No class selected</option>
                                {clubClasses.map((item) => (
                                  <option key={item.id} value={item.id} disabled={classOptionDisabled(item.id, currentValue)}>
                                    {classOptionLabel(item.id)}{classOptionDisabled(item.id, currentValue) ? " - FULL" : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })}

                    {preferenceEnabled && (
                      <label className="block text-xs font-medium">
                        Preference
                        <select className="mt-1 w-full rounded-md border border-surfaceBorder bg-white px-3 py-2 text-sm" value={selection.preference} onChange={(e) => updateSelection(driver.id, { preference: e.target.value })}>
                          <option value="">No preference</option>
                          {classIds.map((id) => <option key={id} value={id}>{classMap.get(id) || id}</option>)}
                        </select>
                      </label>
                    )}
                  </div>

                  {/* MERCHANDISE */}
                  {merchandise.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Merchandise</p>
                      {merchandise.map((item) => {
                        const entry = selection.merch[item.id];
                        const locked = item.included || item.compulsory;
                        const qty = locked ? 1 : Number(entry?.qty || 0);
                        return (
                          <div key={item.id} className="rounded-md border border-surfaceBorder p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-sm font-medium">{item.name}</span>
                                {item.included && <span className="ml-2 text-xs font-semibold text-green-700">Included</span>}
                                {item.compulsory && <span className="ml-2 text-xs font-semibold text-red-700">Compulsory</span>}
                                {!item.included && <span className="ml-2 text-xs text-text-muted">{money(item.price)} each</span>}
                              </div>
                              {locked ? (
                                <span className="text-xs text-text-muted">Qty: 1</span>
                              ) : (
                                <input type="number" min="0" max={item.max_qty || 1} className="w-16 rounded-md border border-surfaceBorder px-2 py-1 text-sm" value={qty} onChange={(e) => updateMerchQty(driver.id, item.id, e.target.value, item.max_qty)} />
                              )}
                            </div>
                            {qty > 0 && <OptionGroups groups={item.options} selected={entry?.options} onChange={(group, value) => updateMerchOption(driver.id, item.id, group, value)} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ADD-ONS */}
                  {addonsFor(selection).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Class Add-Ons</p>
                      {addonsFor(selection).map((addon) => {
                        const entry = selection.addons[addon.id];
                        const locked = !!addon.required;
                        const qty = locked ? 1 : Number(entry?.qty || 0);
                        return (
                          <div key={addon.id} className="rounded-md border border-surfaceBorder p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-sm font-medium">{addon.name}</span>
                                {addon.required && <span className="ml-2 text-xs font-semibold text-red-700">Compulsory</span>}
                                <span className="ml-2 text-xs text-text-muted">{money(addon.price)} each</span>
                              </div>
                              {locked ? (
                                <span className="text-xs text-text-muted">Qty: 1</span>
                              ) : (
                                <input type="number" min="0" max={addon.max_qty || 1} className="w-16 rounded-md border border-surfaceBorder px-2 py-1 text-sm" value={qty} onChange={(e) => updateAddonQty(driver.id, addon.id, e.target.value, addon.max_qty)} />
                              )}
                            </div>
                            {qty > 0 && <OptionGroups groups={addon.options} selected={entry?.options} onChange={(group, value) => updateAddonOption(driver.id, addon.id, group, value)} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {/* PAYMENT */}
            <div className="rounded-lg border border-surfaceBorder p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">Household total</p>
                <p className="text-xl font-semibold">{money(householdTotal)}</p>
              </div>

              {!paymentConfirmed ? (
                <div className="flex flex-wrap gap-3">
                  <Button className="flex-1" style={{ backgroundColor: brand }} onClick={() => startPayment("stripe")}>Pay with Stripe</Button>
                  <Button variant="secondary" className="flex-1" onClick={() => startPayment("paypal")}>Pay with PayPal</Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-green-700">Payment via {paymentMethod === "stripe" ? "Stripe" : "PayPal"} confirmed.</p>
                  <Button className="w-full" style={{ backgroundColor: brand }} disabled={saving || saved} onClick={confirmPaymentAndNominations}>
                    {saving ? "Saving..." : "Confirm Payment & Nominations"}
                  </Button>
                </>
              )}
            </div>

            {requiresRcraClub && (
              <div className="rounded-lg border border-surfaceBorder p-4 space-y-3">
                <p className="text-sm font-medium">RCRA Club Affiliation</p>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={clubAffiliationConfirmed}
                    onChange={(e) => setClubAffiliationConfirmed(e.target.checked)}
                  />
                  <span>I confirm that I am affiliated with an RCRA club.</span>
                </label>

                {!clubAffiliationConfirmed && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    You must confirm your RCRA club affiliation.
                  </div>
                )}

<label className="block text-sm">
  Club
  <SearchableClubSelect
    clubs={rcraClubs}
    selectedClubId={affiliatedClubId}
    onSelectClub={setAffiliatedClubId}
  />
</label>

                {clubAffiliationConfirmed && !affiliatedClubId && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Select your RCRA club.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}