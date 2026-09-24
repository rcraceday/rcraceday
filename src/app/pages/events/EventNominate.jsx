import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardDocumentCheckIcon,
  ArrowLeftIcon,
  ClockIcon,
  FlagIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  PlusCircleIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import FilterDropdown from "@/components/ui/FilterDropdown";
import TransponderCombobox from "@/components/ui/TransponderCombobox";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import useTheme from "@app/providers/useTheme";
import { calculateUserPricing } from "@app/pages/events/events-sections/calculatePricing";
import useRcraClubs from "@app/providers/useRcraClubs";
import SearchableClubSelect from "@components/SearchableClubSelect";
import {
  flattenMultiDaySelections,
  getClassLimitNumber,
  getDayClassLimit,
  getDayClassSlots,
  getEventClassLimit,
  getEffectiveDayClassIds,
  isOpenPracticeDay,
  isPracticeDay,
  multiDayClassLimitError,
  multiDaySlotsPerDay,
  validateDriverClassSelections,
} from "@/app/lib/eventClassLimit";

const money = (value) => Number(value || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const emptySelection = () => ({
  classSlots: [],
  classesByDay: {},
  racingDays: {},
  preference: "",
  merch: {},
  addons: {},
  transponders: {},
});

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatEventDate(event) {
  if (!event?.is_multi_day || !Array.isArray(event.days)) return formatDate(event?.event_date);
  const dates = event.days
    .map((day) => day?.date)
    .filter((date) => date && !Number.isNaN(new Date(date).getTime()))
    .sort();
  if (dates.length === 0) return formatDate(event.event_date);
  if (dates.length === 1 || dates[0] === dates.at(-1)) return formatDate(dates[0]);
  return `${formatDate(dates[0])} - ${formatDate(dates.at(-1))}`;
}

function formatTimeOnly(date, timeStr) {
  if (!timeStr) return null;
  try {
    const d = new Date(`${date}T${timeStr}:00`);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function dayHeading(day, index) {
  const dateLabel = day?.date
    ? new Date(day.date).toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const label = day?.label?.trim();
  if (label && dateLabel) return `${dateLabel} - ${label}`;
  return label || dateLabel || `Day ${index + 1}`;
}

function classesDifferAcrossDays(event) {
  const days = Array.isArray(event?.classes_by_day) ? event.classes_by_day : [];
  if (days.length < 2) return false;
  const signatures = days.map((day) => [...(day.classes || [])].map(String).sort().join(","));
  return signatures.some((sig) => sig !== signatures[0]);
}

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

function flattenRequirements(requirements) {
  if (!Array.isArray(requirements)) return [];
  return requirements.flatMap((requirement, groupIndex) => {
    const descriptor = typeof requirement?.descriptor === "string"
      ? requirement.descriptor.trim()
      : typeof requirement?.description === "string"
        ? requirement.description.trim()
        : "";
    const items = Array.isArray(requirement?.items)
      ? requirement.items
          .map((item) => (typeof item === "string" ? item.trim() : String(item?.label ?? "").trim()))
          .filter(Boolean)
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

function Section({ title, icon: SectionIcon, brand, children }) {
  if (!children) return null;
  return (
    <section style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <SectionIcon className="h-5 w-5" style={{ color: brand }} />
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QtyControl({ value, min = 0, max = 99, onChange, disabled, brand }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        className="h-8 w-8 rounded-md border text-sm font-semibold disabled:opacity-40"
        style={{ borderColor: brand, color: brand, background: "#fff" }}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        className="h-8 w-8 rounded-md border text-sm font-semibold disabled:opacity-40"
        style={{ borderColor: brand, color: "#fff", background: brand }}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function OptionPicker({ groups, selected, onChange, palette, brand }) {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  return (
    <div className="mt-2 space-y-4">
      {groups.map((group, gi) => (
        <div
          key={group.name || gi}
          className="border rounded-md p-3"
          style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
        >
          <div className="font-semibold text-base mb-2">{group.name || "Option Group"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(group.values || []).map((v, vi) => {
              const isSelected = selected?.[group.name] === v.label;
              return (
                <button
                  key={v.label || vi}
                  type="button"
                  className="flex flex-col items-center gap-2 border rounded-md p-2 text-left"
                  style={{
                    background: isSelected ? `${brand}14` : palette?.surfaceAlt || "#f9fafb",
                    borderColor: isSelected ? brand : palette?.surfaceBorder || "#e5e7eb",
                    borderWidth: isSelected ? 2 : 1,
                  }}
                  onClick={() => onChange(group.name, isSelected ? "" : v.label)}
                >
                  {v.photo_url && (
                    <img src={v.photo_url} alt={v.label} className="w-full h-24 object-contain rounded border border-gray-200" />
                  )}
                  <div className="text-sm font-medium text-center">
                    {v.label}
                    {typeof v.price === "number" && v.price > 0 ? ` (+$${v.price})` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
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
  const { clubs: rcraClubs } = useRcraClubs();

  const [event, setEvent] = useState(null);
  const [trackName, setTrackName] = useState("");
  const [clubClasses, setClubClasses] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignedDriverClasses, setAssignedDriverClasses] = useState([]);
  const [saved, setSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [otherEntryCounts, setOtherEntryCounts] = useState({});
  const [requirementSelections, setRequirementSelections] = useState({});
  const [clubAffiliationConfirmed, setClubAffiliationConfirmed] = useState(false);
  const [affiliatedClubId, setAffiliatedClubId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

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

      if (eventRow?.track) {
        const { data: trackRow } = await supabase.from("club_tracks").select("name").eq("id", eventRow.track).maybeSingle();
        setTrackName(trackRow?.name || "");
      } else {
        setTrackName("");
      }

      const classIdSet = new Set(
        eventRow?.is_multi_day
          ? (eventRow.classes_by_day || []).flatMap((day) => day.classes || []).filter(Boolean)
          : (eventRow?.classes || []).filter(Boolean)
      );
      if (eventRow?.track) {
        const { data: trackClassRows } = await supabase
          .from("club_track_classes")
          .select("class_id, club_classes ( id, name )")
          .eq("track_id", eventRow.track);
        (trackClassRows || []).forEach((row) => {
          if (row.club_classes?.id) classIdSet.add(row.club_classes.id);
        });
      }
      if (classIdSet.size) {
        const { data: classRows, error: classError } = await supabase
          .from("club_classes")
          .select("id, name")
          .in("id", Array.from(classIdSet));
        if (classError) setError("Unable to load this event nomination.");
        setClubClasses(classRows || []);
      } else {
        setClubClasses([]);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  useEffect(() => {
    async function fetchAssignedDriverClasses() {
      if (!drivers.length) return;
      const driverIds = drivers.map((d) => d.id);
      const { data, error: dcError } = await supabase
        .from("driver_classes")
        .select("id, driver_id, class_id, transponder_number")
        .in("driver_id", driverIds);
      if (dcError) {
        console.error("Error fetching assigned driver classes:", dcError);
        return;
      }
      setAssignedDriverClasses(data || []);
      setSelections((current) => {
        const next = { ...current };
        (data || []).forEach((dc) => {
          if (!next[dc.driver_id]) next[dc.driver_id] = emptySelection();
          next[dc.driver_id].transponders = {
            ...next[dc.driver_id].transponders,
            [dc.class_id]: dc.transponder_number || "",
          };
        });
        return next;
      });
    }
    fetchAssignedDriverClasses();
  }, [drivers]);

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
  const trackClassIds = useMemo(() => clubClasses.map((item) => item.id), [clubClasses]);
  const classLimit = getClassLimitNumber(event);
  const classLimitPerDay = getDayClassLimit(event);
  const preferenceEnabled = !!event?.preference_enabled;
  const requiresRcraClub = !!event?.requires_rcra_club;
  const merchandise = Array.isArray(event?.merchandise) ? event.merchandise : [];
  const addOns = Array.isArray(event?.class_add_ons) ? event.class_add_ons : [];
  const pricing = useMemo(() => pricingConfigFor(event), [event]);
  const entryLimits = event?.class_entry_limits || {};
  const isFamily = membership?.membership_type === "family" || drivers.length > 1;
  const daysDiffer = classesDifferAcrossDays(event);

  function localSelectionCount(classId) {
    return Object.values(selections).reduce((count, selection) => {
      const ids = event?.is_multi_day
        ? flattenMultiDaySelections(selection.classesByDay || {})
        : selection.classSlots || [];
      return count + ids.filter((id) => id === classId).length;
    }, 0);
  }

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

  function transponderFor(driverId, classId) {
    const fromSelection = selections[driverId]?.transponders?.[classId];
    if (fromSelection) return fromSelection;
    const assigned = assignedDriverClasses.find((dc) => dc.driver_id === driverId && dc.class_id === classId);
    return assigned?.transponder_number || "";
  }

  function savedTranspondersFor(driverId) {
    const values = new Set();
    assignedDriverClasses.forEach((row) => {
      if (row.driver_id !== driverId) return;
      const trimmed = (row.transponder_number || "").trim();
      if (trimmed) values.add(trimmed);
    });
    Object.values(selections[driverId]?.transponders || {}).forEach((value) => {
      const trimmed = String(value || "").trim();
      if (trimmed) values.add(trimmed);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  useEffect(() => {
    if (!event || !drivers.length) return;
    setSelections((current) => {
      const next = { ...current };
      const dayCount = event.is_multi_day ? (event.days || []).length : 0;
      drivers.forEach((driver) => {
        const existing = next[driver.id];
        if (!existing) {
          const classesByDay = {};
          const racingDays = {};
          if (event.is_multi_day) {
            for (let i = 0; i < dayCount; i += 1) {
              const slotsPerDay = multiDaySlotsPerDay(event, i);
              classesByDay[i] = Array.from({ length: slotsPerDay }, () => "");
              racingDays[i] = false;
            }
          }
          next[driver.id] = { ...emptySelection(), classesByDay, racingDays, classSlots: Array.from({ length: classLimit }, () => "") };
          return;
        }
        if (!existing.transponders) existing.transponders = {};
        if (!existing.racingDays) existing.racingDays = {};
        if (event.is_multi_day) {
          const classesByDay = { ...existing.classesByDay };
          const racingDays = { ...existing.racingDays };
          for (let i = 0; i < dayCount; i += 1) {
            const slotsPerDay = multiDaySlotsPerDay(event, i);
            classesByDay[i] = getDayClassSlots(classesByDay, i, slotsPerDay);
            if (racingDays[i] == null) racingDays[i] = (classesByDay[i] || []).some(Boolean);
          }
          next[driver.id] = { ...existing, classesByDay, racingDays };
        } else {
          const slots = (existing.classSlots || []).slice();
          while (slots.length < classLimit) slots.push("");
          next[driver.id] = { ...existing, classSlots: slots.slice(0, classLimit) };
        }
      });
      return next;
    });
  }, [event, drivers, classLimit, classLimitPerDay]);

  useEffect(() => {
    if (!drivers.length) return;
    setSelectedDriverId((current) => (current && drivers.some((d) => d.id === current) ? current : drivers[0].id));
  }, [drivers]);

  function updateSelection(driverId, update) {
    setSelections((current) => {
      const existing = { ...emptySelection(), ...current[driverId] };
      const patch = typeof update === "function" ? update(existing) : update;
      return { ...current, [driverId]: { ...existing, ...patch } };
    });
  }

  function fillTransponder(driverId, classId, currentTransponders) {
    const next = { ...currentTransponders };
    if (!classId || next[classId]) return next;
    const existingDc = assignedDriverClasses.find((dc) => dc.class_id === classId && dc.driver_id === driverId);
    next[classId] = existingDc?.transponder_number || "";
    return next;
  }

  function setDayRacing(driverId, dayIndex, racing) {
    const current = selections[driverId] || emptySelection();
    const racingDays = { ...current.racingDays, [dayIndex]: racing };
    const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
    const nextByDay = { ...current.classesByDay };
    if (!racing) {
      nextByDay[dayIndex] = Array.from({ length: slotsPerDay }, () => "");
    } else if (!daysDiffer) {
      const sourceIndex = Object.keys(racingDays).find((key) => racingDays[key] && Number(key) !== dayIndex);
      if (sourceIndex != null) {
        const sourceSlots = multiDaySlotsPerDay(event, Number(sourceIndex));
        nextByDay[dayIndex] = getDayClassSlots(nextByDay, Number(sourceIndex), sourceSlots);
      }
    }
    updateSelection(driverId, { racingDays, classesByDay: nextByDay });
    if (racing) setActiveDayIndex(dayIndex);
  }

  function setDayClass(driverId, dayIndex, classId, slotIndex = 0) {
    const current = selections[driverId] || emptySelection();
    const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
    const applyIndexes = !daysDiffer
      ? Object.keys(current.racingDays || {})
          .filter((key) => current.racingDays[key])
          .map(Number)
      : [dayIndex];
    const nextByDay = { ...current.classesByDay };
    const currentValue = getDayClassSlots(current.classesByDay, dayIndex, slotsPerDay)[slotIndex] || "";
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
    applyIndexes.forEach((idx) => {
      const daySlots = multiDaySlotsPerDay(event, idx);
      const slots = getDayClassSlots(nextByDay, idx, daySlots);
      slots[slotIndex] = classId;
      nextByDay[idx] = slots;
    });
    const flat = flattenMultiDaySelections(nextByDay);
    const stillSelected = flat.includes(current.preference);
    const newTransponders = fillTransponder(driverId, classId, current.transponders);
    updateSelection(driverId, {
      classesByDay: nextByDay,
      racingDays: { ...current.racingDays, [dayIndex]: true },
      preference: stillSelected ? current.preference : "",
      transponders: newTransponders,
    });
  }

  function setClassSlot(driverId, slotIndex, classId) {
    const current = selections[driverId] || emptySelection();
    const slots = current.classSlots.slice();
    slots[slotIndex] = classId;
    const stillSelected = slots.includes(current.preference);
    const newTransponders = fillTransponder(driverId, classId, current.transponders);
    updateSelection(driverId, { classSlots: slots, preference: stillSelected ? current.preference : "", transponders: newTransponders });
  }

  function selectedClassIds(selection) {
    if (!selection) return [];
    return Array.from(
      new Set(event?.is_multi_day ? flattenMultiDaySelections(selection.classesByDay) : (selection.classSlots || []).filter(Boolean))
    );
  }

  function selectedClassEntries(selection) {
    if (!selection) return [];
    if (!event?.is_multi_day) {
      return (selection.classSlots || [])
        .filter(Boolean)
        .map((classId) => ({ classId, isPractice: false }));
    }
    const dayCount = (event.days || event.classes_by_day || []).length;
    const entries = [];
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      if (!selection.racingDays?.[dayIndex]) continue;
      if (isOpenPracticeDay(event, dayIndex)) {
        entries.push({ classId: null, isPractice: true, openPractice: true });
        continue;
      }
      const isPractice = isPracticeDay(event, dayIndex);
      const slots = selection.classesByDay?.[dayIndex];
      if (!Array.isArray(slots)) continue;
      slots.filter(Boolean).forEach((classId) => {
        entries.push({ classId, isPractice });
      });
    }
    return entries;
  }

  function hasNominationActivity(selection) {
    if (!selection) return false;
    if (selectedClassIds(selection).length > 0) return true;
    if (!event?.is_multi_day) return false;
    const dayCount = (event.days || event.classes_by_day || []).length;
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      if (selection.racingDays?.[dayIndex] && isOpenPracticeDay(event, dayIndex)) {
        return true;
      }
    }
    return false;
  }

  function practiceMetaForSelection(selection) {
    const practice_class_ids = [];
    const practice_days = [];
    if (!event?.is_multi_day) {
      return { practice_class_ids, practice_days };
    }
    const dayCount = (event.days || event.classes_by_day || []).length;
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      if (!selection.racingDays?.[dayIndex]) continue;
      if (isOpenPracticeDay(event, dayIndex)) {
        practice_days.push(dayIndex);
        continue;
      }
      if (!isPracticeDay(event, dayIndex)) continue;
      const slots = selection.classesByDay?.[dayIndex];
      if (!Array.isArray(slots)) continue;
      slots.filter(Boolean).forEach((classId) => practice_class_ids.push(classId));
    }
    return { practice_class_ids, practice_days };
  }

  function buildNominationEntries(selection) {
    const rows = [];
    let order = 1;
    if (!event?.is_multi_day) {
      (selection.classSlots || [])
        .filter(Boolean)
        .forEach((classId) => {
          rows.push({
            class_id: classId,
            is_preference: false,
            order_index: order,
          });
          order += 1;
        });
      return rows;
    }
    const dayCount = (event.days || event.classes_by_day || []).length;
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      if (!selection.racingDays?.[dayIndex]) continue;
      if (isOpenPracticeDay(event, dayIndex)) continue;
      const slots = selection.classesByDay?.[dayIndex];
      if (!Array.isArray(slots)) continue;
      slots.filter(Boolean).forEach((classId) => {
        rows.push({
          class_id: classId,
          is_preference: false,
          order_index: order,
        });
        order += 1;
      });
    }
    return rows;
  }

  function updateMerchQty(driverId, itemId, qty, maxQty) {
    const clamped = Math.max(0, Math.min(Number(qty) || 0, maxQty || 99));
    updateSelection(driverId, (current) => ({
      merch: { ...current.merch, [itemId]: { ...(current.merch[itemId] || {}), qty: clamped } },
    }));
  }

  function updateMerchOption(driverId, itemId, groupName, value) {
    updateSelection(driverId, (current) => {
      const entry = current.merch[itemId] || { qty: 1, options: {} };
      return { merch: { ...current.merch, [itemId]: { ...entry, qty: entry.qty || 1, options: { ...entry.options, [groupName]: value } } } };
    });
  }

  function updateAddonQty(driverId, addonId, qty, maxQty) {
    const clamped = Math.max(0, Math.min(Number(qty) || 0, maxQty || 99));
    updateSelection(driverId, (current) => ({
      addons: { ...current.addons, [addonId]: { ...(current.addons[addonId] || {}), qty: clamped, selected: clamped > 0 } },
    }));
  }

  function updateAddonOption(driverId, addonId, groupName, value) {
    updateSelection(driverId, (current) => {
      const entry = current.addons[addonId] || { qty: 1, selected: true, options: {} };
      return { addons: { ...current.addons, [addonId]: { ...entry, options: { ...entry.options, [groupName]: value } } } };
    });
  }

  function updateTransponder(driverId, classId, value) {
    updateSelection(driverId, (current) => ({ transponders: { ...current.transponders, [classId]: value } }));
    supabase
      .from("driver_classes")
      .update({ transponder_number: value })
      .eq("driver_id", driverId)
      .eq("class_id", classId)
      .then(({ error: updateError }) => {
        if (updateError) console.error("Error updating transponder number:", updateError);
      });
  }

  function merchandiseCostFor(selection) {
    return merchandise.reduce((sum, item, idx) => {
      const entry = selection.merch[item.id || `merch-${idx}`] || selection.merch[item.id];
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
    return addonsFor(selection).reduce((sum, addon, idx) => {
      const entry = selection.addons[addon.id || `addon-${idx}`] || selection.addons[addon.id];
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
      selectedClassEntries: selectedClassEntries(selection),
      membershipType,
      preferenceMap: selection.preference ? { [selection.preference]: true } : {},
    });
    return (classResult.total || 0) + merchandiseCostFor(selection) + addonCostFor(selection);
  }

  const householdTotal = drivers.reduce((sum, driver) => sum + driverTotal(driver), 0);
  const flatRequirements = useMemo(() => flattenRequirements(event?.club_requirements), [event?.club_requirements]);

  function startPayment(method) {
    setPaymentMethod(method);
    setPaymentConfirmed(true);
  }

  async function confirmPaymentAndNominations() {
    if (!membership?.id) return setError("Membership information is not available.");
    const active = drivers
      .map((driver) => ({ driver, selection: selections[driver.id] || emptySelection() }))
      .filter(({ selection }) => hasNominationActivity(selection));
    if (!active.length) {
      return setError("Select at least one class or a practice day for a driver.");
    }
    if (requiresRcraClub && !clubAffiliationConfirmed) return setError("You must confirm your RCRA club affiliation.");
    if (requiresRcraClub && !affiliatedClubId) return setError("Select your RCRA club.");

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
        active.map(({ driver, selection }) => {
          const practiceMeta = practiceMetaForSelection(selection);
          return {
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
              practice_days: practiceMeta.practice_days,
              practice_class_ids: practiceMeta.practice_class_ids,
            },
          };
        })
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
      const classRows = buildNominationEntries(selection);
      classRows.forEach((row) => {
        entries.push({ nomination_id: nomination.id, ...row });
      });
      if (preferenceEnabled && selection.preference) {
        entries.push({
          nomination_id: nomination.id,
          class_id: selection.preference,
          is_preference: true,
          order_index: classRows.length + 1,
        });
      }
    });

    const { error: entryError } = await supabase.from("nomination_entries").insert(entries);

    const driverClassesToUpdate = [];
    active.forEach(({ driver, selection }) => {
      for (const classId in selection.transponders) {
        driverClassesToUpdate.push({
          driver_id: driver.id,
          class_id: classId,
          transponder_number: selection.transponders[classId],
        });
      }
    });
    if (driverClassesToUpdate.length > 0) {
      const { error: upsertError } = await supabase.from("driver_classes").upsert(driverClassesToUpdate, { onConflict: ["driver_id", "class_id"] });
      if (upsertError) console.error("Error upserting transponder numbers:", upsertError);
    }

    setSaving(false);
    if (entryError) return setError(entryError.message || "Unable to save class entries.");
    setSaved(true);
    navigate(`/${clubSlug}/app/events/${eventId}/nominations`);
  }

  function classOptions(ids, currentValue) {
    return [
      { value: "", label: "No class selected" },
      ...ids
        .filter((id) => !classOptionDisabled(id, currentValue))
        .map((id) => ({
          value: id,
          label: classOptionLabel(id),
        })),
    ];
  }

  if (loading || loadingDrivers) {
    return (
      <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
        <PageTitle icon={ClipboardDocumentCheckIcon} title="Nominate" style={{ color: brand }} />
        <div style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "14px" }}>Loading nomination form…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
        <PageTitle icon={ClipboardDocumentCheckIcon} title="Nominate" style={{ color: brand }} />
        <div style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "14px" }}>Event not found.</div>
      </div>
    );
  }

  const days = event.is_multi_day ? event.days || [] : [{ date: event.event_date, label: "" }];
  const eventClassLimit = getEventClassLimit(event);
  const dayClassLimit = getDayClassLimit(event);
  const primaryDate = formatEventDate(event);
  const eventTypeLabel = event.event_type
    ? event.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const selection = selectedDriver ? selections[selectedDriver.id] || emptySelection() : emptySelection();
  const classIds = selectedClassIds(selection);
  const racingIndexes = days.map((_, i) => i).filter((i) => selection.racingDays?.[i]);
  const visibleDayIndex = racingIndexes.includes(activeDayIndex) ? activeDayIndex : racingIndexes[0] ?? 0;
  const currentDriverTotal = selectedDriver ? driverTotal(selectedDriver) : 0;
  const availableAddOns = selectedDriver ? addonsFor(selection) : [];

  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
      <PageTitle
        icon={ClipboardDocumentCheckIcon}
        title="Nominate"
        style={{ color: brand }}
        actions={
          <Button
            variant="primary"
            size="sm"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() => navigate(`/${clubSlug}/app/events/${event.id}`)}
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        }
      />

      <main style={{ padding: "40px 16px", display: "flex", justifyContent: "center" }}>
        <div
          className="event-details-content"
          style={{
            width: "100%",
            maxWidth: "800px",
            background: palette?.surface || "#ffffff",
            color: contentText,
            borderRadius: "8px",
            border: `2px solid ${brand}`,
            lineHeight: 1.5,
            padding: "24px",
            position: "relative",
            overflow: "visible",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              className="flex flex-col items-center mb-4"
              style={{
                background: `linear-gradient(180deg, ${brand} 0%, ${palette?.surfaceAlt || "#f9fafb"} 70%)`,
                padding: "24px 0",
                borderRadius: "8px",
              }}
            >
              <div
                className="border rounded-[10px] overflow-hidden flex items-center justify-center w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] mb-3 relative"
                style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
              >
                {logoSrc ? (
                  <img src={logoSrc} alt={event.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-[#f0f0f0]" />
                )}
              </div>
              <div className="font-semibold text-center leading-tight text-[18px] sm:text-[30px]" style={{ color: contentText }}>
                {event.name}
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              {eventTypeLabel && (
                <div className="text-[14px] leading-[1.5] mb-1">
                  <strong>Event Type:</strong> {eventTypeLabel}
                </div>
              )}
              {primaryDate && (
                <div className="text-[14px] leading-[1.5] mb-1">
                  <strong>When:</strong> {primaryDate}
                </div>
              )}
              {trackName && (
                <div className="text-[14px] leading-[1.5] mb-1">
                  <strong>Track:</strong> {trackName}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">{error}</div>
            )}

            {Array.isArray(event.days) && event.days.length > 0 && (
              <Section title="Schedule" icon={ClockIcon} brand={brand}>
                <div style={{ marginTop: "-6px" }}>
                  {event.days.map((day, idx) => {
                    const items = [];
                    if (day.gates_open_at) items.push(`Gates Open: ${formatTimeOnly(day.date, day.gates_open_at)}`);
                    if (day.practice_at) items.push(`Practice Starts: ${formatTimeOnly(day.date, day.practice_at)}`);
                    if (day.drivers_brief_at) items.push(`Drivers Brief: ${formatTimeOnly(day.date, day.drivers_brief_at)}`);
                    if (day.race_start_at) items.push(`Racing Starts: ${formatTimeOnly(day.date, day.race_start_at)}`);
                    const heading = dayHeading(day, idx);
                    if (!heading && items.length === 0) return null;
                    return (
                      <div key={idx} style={{ marginBottom: "10px" }}>
                        {heading && (
                          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "6px", color: contentText }}>{heading}</div>
                        )}
                        {items.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: 14, color: contentText }}>
                            {items.map((text, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    backgroundColor: brand,
                                    borderRadius: "50%",
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                />
                                <span>{text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {selectedDriver && (
              <>
                <hr className="border-surfaceBorder my-6" />

                <Section title="Driver" icon={UserIcon} brand={brand}>
                  <div className="space-y-4">
                    {isFamily && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Select Driver</label>
                        <FilterDropdown
                          variant="cms"
                          value={selectedDriver.id}
                          onChange={(value) => {
                            setSelectedDriverId(value);
                            setActiveDayIndex(0);
                          }}
                          options={drivers.map((driver) => ({
                            value: driver.id,
                            label: `${driver.first_name} ${driver.last_name}${driver.is_junior ? " (Junior)" : ""}`,
                          }))}
                          ariaLabel="Select driver"
                          triggerStyleOverrides={{ fontSize: "0.875rem" }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="First Name" value={selectedDriver.first_name || ""} readOnly style={{ background: "#F5F5F5" }} />
                      <Input label="Last Name" value={selectedDriver.last_name || ""} readOnly style={{ background: "#F5F5F5" }} />
                    </div>
                    {selectedDriver.is_junior && (
                      <div className="text-sm font-medium" style={{ color: brand }}>
                        Junior driver — junior class pricing applies.
                      </div>
                    )}
                  </div>
                </Section>

                {flatRequirements.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="font-semibold text-base">Club Requirements</div>
                    {Object.values(
                      flatRequirements.reduce((groups, requirement) => {
                        if (!groups[requirement.requirementId]) {
                          groups[requirement.requirementId] = { descriptor: requirement.descriptor, items: [] };
                        }
                        groups[requirement.requirementId].items.push(requirement);
                        return groups;
                      }, {})
                    ).map((group) => (
                      <div
                        key={group.items[0].requirementId}
                        className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3"
                        style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
                      >
                        <div className="font-medium text-sm">{group.descriptor || "Requirement"}</div>
                        <div className="flex flex-col gap-1">
                          {group.items.map((requirement) => (
                            <label key={requirement.id} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={!!requirementSelections[requirement.id]}
                                onChange={() =>
                                  setRequirementSelections((current) => ({ ...current, [requirement.id]: !current[requirement.id] }))
                                }
                              />
                              <span>{requirement.item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Section title="Classes" icon={FlagIcon} brand={brand}>
                  <div style={{ marginTop: "-6px" }}>
                    {event.is_multi_day && (eventClassLimit != null || dayClassLimit != null) && (
                      <div style={{ fontSize: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4, color: contentText }}>
                        {eventClassLimit != null && <div>Max classes per driver (event): {eventClassLimit}</div>}
                        {dayClassLimit != null && <div>Max classes per day: {dayClassLimit}</div>}
                      </div>
                    )}

                    {event.is_multi_day && (
                      <div className="space-y-3 mb-4">
                        <div className="text-sm font-medium">Days Racing</div>
                        <div className="flex flex-wrap gap-2">
                          {days.map((day, dayIndex) => {
                            const selected = !!selection.racingDays?.[dayIndex];
                            return (
                              <button
                                key={dayIndex}
                                type="button"
                                className="rounded-md px-3 py-1.5 text-sm font-medium border"
                                style={{
                                  background: selected ? brand : palette?.surface || "#fff",
                                  color: selected ? palette?.buttonText || "#fff" : contentText,
                                  borderColor: brand,
                                }}
                                onClick={() => setDayRacing(selectedDriver.id, dayIndex, !selected)}
                              >
                                {day.label || `Day ${dayIndex + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {event.is_multi_day && racingIndexes.length > 1 && daysDiffer && (
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={racingIndexes.indexOf(visibleDayIndex) <= 0}
                          onClick={() => setActiveDayIndex(racingIndexes[Math.max(0, racingIndexes.indexOf(visibleDayIndex) - 1)])}
                        >
                          Previous Day
                        </Button>
                        <div className="text-sm font-semibold text-center">{dayHeading(days[visibleDayIndex], visibleDayIndex)}</div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={racingIndexes.indexOf(visibleDayIndex) >= racingIndexes.length - 1}
                          onClick={() =>
                            setActiveDayIndex(
                              racingIndexes[Math.min(racingIndexes.length - 1, racingIndexes.indexOf(visibleDayIndex) + 1)]
                            )
                          }
                        >
                          Next Day
                        </Button>
                      </div>
                    )}

                    {event.is_multi_day
                      ? racingIndexes.length > 0 &&
                        (daysDiffer
                          ? [visibleDayIndex]
                          : racingIndexes.some((idx) => isOpenPracticeDay(event, idx))
                            ? racingIndexes
                            : racingIndexes.length
                              ? [racingIndexes[0]]
                              : []
                        ).map((dayIndex) => {
                          const dayClassIds = getEffectiveDayClassIds(
                            event,
                            dayIndex,
                            trackClassIds
                          );
                          const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
                          if (isOpenPracticeDay(event, dayIndex)) {
                            return (
                              <div key={dayIndex} className="text-sm" style={{ color: contentText }}>
                                <div className="font-medium mb-1">
                                  {dayHeading(days[dayIndex], dayIndex)}
                                </div>
                                <p>
                                  Practice day — all track classes. No class selection is required. This
                                  day is not included in the LiveTime export.
                                </p>
                                {dayClassIds.length > 0 && (
                                  <p className="mt-2 text-xs opacity-80">
                                    Classes:{" "}
                                    {dayClassIds.map((id) => classMap.get(id) || id).join(", ")}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          const daySlots = getDayClassSlots(selection.classesByDay, dayIndex, slotsPerDay);
                          return (
                            <div key={dayIndex} className="space-y-3">
                              {!daysDiffer && (
                                <div className="text-sm font-medium mb-1" style={{ color: contentText }}>
                                  Classes for selected days
                                </div>
                              )}
                              {daySlots.map((currentValue, slotIndex) => (
                                <div key={slotIndex} className="space-y-1">
                                  <div className="text-sm font-medium">{slotsPerDay > 1 ? `Class ${slotIndex + 1}` : "Class"}</div>
                                  <div className="flex w-full min-w-0 items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                      <FilterDropdown
                                        variant="cms"
                                        value={currentValue}
                                        onChange={(value) => setDayClass(selectedDriver.id, dayIndex, value, slotIndex)}
                                        options={classOptions(dayClassIds, currentValue)}
                                        ariaLabel={slotsPerDay > 1 ? `Class ${slotIndex + 1}` : "Class"}
                                        triggerStyleOverrides={{ fontSize: "0.875rem" }}
                                      />
                                    </div>
                                    {currentValue && (
                                      <TransponderCombobox
                                        variant="cms"
                                        value={transponderFor(selectedDriver.id, currentValue)}
                                        suggestions={savedTranspondersFor(selectedDriver.id)}
                                        onChange={(value) => updateTransponder(selectedDriver.id, currentValue, value)}
                                        ariaLabel="Transponder number"
                                      />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      : Array.from({ length: classLimit }, (_, slotIndex) => {
                          const currentValue = selection.classSlots[slotIndex] || "";
                          return (
                            <div key={slotIndex} className="space-y-1 mb-3">
                              <div className="text-sm font-medium">{`Class ${slotIndex + 1}`}</div>
                              <div className="flex w-full min-w-0 items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <FilterDropdown
                                    variant="cms"
                                    value={currentValue}
                                    onChange={(value) => setClassSlot(selectedDriver.id, slotIndex, value)}
                                    options={classOptions(clubClasses.map((item) => item.id), currentValue)}
                                    ariaLabel={`Class ${slotIndex + 1}`}
                                    triggerStyleOverrides={{ fontSize: "0.875rem" }}
                                  />
                                </div>
                                {currentValue && (
                                  <TransponderCombobox
                                    variant="cms"
                                    value={transponderFor(selectedDriver.id, currentValue)}
                                    suggestions={savedTranspondersFor(selectedDriver.id)}
                                    onChange={(value) => updateTransponder(selectedDriver.id, currentValue, value)}
                                    ariaLabel="Transponder number"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}

                    {preferenceEnabled && classIds.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">Preference</div>
                        <FilterDropdown
                          variant="cms"
                          value={selection.preference}
                          onChange={(value) => updateSelection(selectedDriver.id, { preference: value })}
                          options={[
                            { value: "", label: "No preference" },
                            ...classIds.map((id) => ({ value: id, label: classMap.get(id) || id })),
                          ]}
                          ariaLabel="Preference"
                          triggerStyleOverrides={{ fontSize: "0.875rem" }}
                        />
                      </div>
                    )}
                  </div>
                </Section>

                {merchandise.length > 0 && (
                  <Section title="Merchandise" icon={ShoppingBagIcon} brand={brand}>
                    <div className="flex flex-col gap-4 w-full mx-auto">
                      {merchandise.map((item, idx) => {
                        const itemId = item.id || `merch-${idx}`;
                        const entry = selection.merch[itemId] || selection.merch[item.id];
                        const locked = item.included || item.compulsory;
                        const qty = locked ? 1 : Number(entry?.qty || 0);
                        return (
                          <div
                            key={itemId}
                            className="text-[14px] leading-[1.5] rounded-md p-4 flex flex-col gap-4"
                            style={{
                              background: palette?.surfaceAlt || "#f9fafb",
                              border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
                              color: contentText,
                            }}
                          >
                            <div
                              className="w-full h-56 border rounded-md overflow-hidden"
                              style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
                            >
                              {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 text-sm leading-tight">
                              <div className="font-semibold text-lg text-text-base">{item.name}</div>
                              {item.description && (
                                <div className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  {item.description}
                                </div>
                              )}
                              {item.included ? (
                                <div className="text-green-700 font-medium">Included in Entry</div>
                              ) : item.compulsory ? (
                                <div className="text-red-700 font-medium">Compulsory Item</div>
                              ) : (
                                <div className="text-base">
                                  <strong>Price:</strong> {item.price ? money(item.price) : "$0.00"}
                                </div>
                              )}
                              {item.max_qty != null && item.max_qty !== "" && (
                                <div className="text-base">
                                  <strong>Max Qty:</strong> {item.max_qty}
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">{locked ? "Qty: 1" : "Quantity"}</span>
                                {!locked && (
                                  <QtyControl
                                    value={qty}
                                    min={0}
                                    max={item.max_qty || 99}
                                    brand={brand}
                                    onChange={(next) => updateMerchQty(selectedDriver.id, itemId, next, item.max_qty)}
                                  />
                                )}
                              </div>
                              {(qty > 0 || locked) && (
                                <OptionPicker
                                  groups={item.options}
                                  selected={entry?.options}
                                  onChange={(group, value) => updateMerchOption(selectedDriver.id, itemId, group, value)}
                                  palette={palette}
                                  brand={brand}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {availableAddOns.length > 0 && (
                  <Section title="Add‑Ons" icon={PlusCircleIcon} brand={brand}>
                    <div className="flex flex-col gap-4 w-full mx-auto">
                      {availableAddOns.map((addon, idx) => {
                        const addonId = addon.id || `addon-${idx}`;
                        const entry = selection.addons[addonId] || selection.addons[addon.id];
                        const locked = !!addon.required;
                        const qty = locked ? 1 : Number(entry?.qty || 0);
                        return (
                          <div
                            key={addonId}
                            className="text-[14px] leading-[1.5] rounded-md p-4 flex flex-col gap-4"
                            style={{
                              background: palette?.surfaceAlt || "#f9fafb",
                              border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
                              color: contentText,
                            }}
                          >
                            <div
                              className="w-full h-56 border rounded-md overflow-hidden"
                              style={{ background: palette?.surface || "#ffffff", borderColor: palette?.surfaceBorder || "#e5e7eb" }}
                            >
                              {addon.photo_url ? (
                                <img src={addon.photo_url} alt={addon.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-3 text-sm leading-tight">
                              <div className="font-semibold text-lg text-text-base">{addon.name}</div>
                              {addon.description && (
                                <div className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  {addon.description}
                                </div>
                              )}
                              {addon.required ? (
                                <div className="text-red-700 font-medium">Compulsory Add‑On</div>
                              ) : (
                                <div className="text-base">
                                  <strong>Price:</strong> {addon.price ? money(addon.price) : "$0.00"}
                                </div>
                              )}
                              {addon.max_qty != null && addon.max_qty !== "" && (
                                <div className="text-base">
                                  <strong>Max Qty:</strong> {addon.max_qty}
                                </div>
                              )}
                              {Array.isArray(addon.classes) && addon.classes.length > 0 && (
                                <div className="text-sm">
                                  <strong>Applies to:</strong>
                                  <ul className="list-disc ml-5 mt-1">
                                    {addon.classes.map((cid) => (
                                      <li key={cid}>{classMap.get(cid) || cid}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">{locked ? "Qty: 1" : "Quantity"}</span>
                                {!locked && (
                                  <QtyControl
                                    value={qty}
                                    min={0}
                                    max={addon.max_qty || 99}
                                    brand={brand}
                                    onChange={(next) => updateAddonQty(selectedDriver.id, addonId, next, addon.max_qty)}
                                  />
                                )}
                              </div>
                              {(qty > 0 || locked) && (
                                <OptionPicker
                                  groups={addon.options}
                                  selected={entry?.options}
                                  onChange={(group, value) => updateAddonOption(selectedDriver.id, addonId, group, value)}
                                  palette={palette}
                                  brand={brand}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {requiresRcraClub && (
                  <div className="mt-6 rounded-md border p-4 space-y-3" style={{ borderColor: palette?.surfaceBorder || "#e5e7eb" }}>
                    <p className="text-sm font-medium">RCRA Club Affiliation</p>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={clubAffiliationConfirmed}
                        onChange={(e) => setClubAffiliationConfirmed(e.target.checked)}
                      />
                      <span>I confirm that I am affiliated with an RCRA club.</span>
                    </label>
                    <label className="block text-sm">
                      Club
                      <SearchableClubSelect clubs={rcraClubs} selectedClubId={affiliatedClubId} onSelectClub={setAffiliatedClubId} />
                    </label>
                  </div>
                )}

                <Section title="Pricing" icon={BanknotesIcon} brand={brand}>
                  <div className="rounded-md p-4 space-y-3" style={{ background: palette?.surfaceAlt || "#f9fafb", border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}` }}>
                    {isFamily && (
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {selectedDriver.first_name} {selectedDriver.last_name}
                          {selectedDriver.is_junior ? " (Junior)" : ""}
                        </span>
                        <span className="font-semibold">{money(currentDriverTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-text-muted">{isFamily ? "Household total" : "Total"}</p>
                      <p className="text-xl font-semibold">{money(householdTotal)}</p>
                    </div>
                    {!paymentConfirmed ? (
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Button className="flex-1" onClick={() => startPayment("stripe")}>
                          Pay with Stripe
                        </Button>
                        <Button variant="secondary" className="flex-1" onClick={() => startPayment("paypal")}>
                          Pay with PayPal
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-green-700">Payment via {paymentMethod === "stripe" ? "Stripe" : "PayPal"} confirmed.</p>
                        <Button className="w-full" disabled={saving || saved} onClick={confirmPaymentAndNominations}>
                          {saving ? "Saving..." : "Confirm Payment & Nominations"}
                        </Button>
                      </>
                    )}
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
