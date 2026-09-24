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
  countSelectionsForDay,
  countMultiDaySelectionsForEventLimit,
  validateDriverClassSelections,
} from "@/app/lib/eventClassLimit";

const money = (value) => Number(value || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const emptySelection = () => ({
  classSlots: [],
  classesByDay: {},
  racingDays: {},
  preference: "",
  preferencesByDay: {},
  merch: {},
  addons: {},
  transponders: {},
  visibleClassSlotsByDay: {},
});

function nominateDraftKey(eventId, membershipId) {
  return `rcraceday:nominate-draft:${eventId}:${membershipId}`;
}

function readNominateDraft(eventId, membershipId) {
  if (!eventId || !membershipId) return null;
  try {
    const raw = sessionStorage.getItem(nominateDraftKey(eventId, membershipId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeNominateDraft(eventId, membershipId, draft) {
  if (!eventId || !membershipId) return;
  try {
    sessionStorage.setItem(nominateDraftKey(eventId, membershipId), JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearNominateDraft(eventId, membershipId) {
  if (!eventId || !membershipId) return;
  try {
    sessionStorage.removeItem(nominateDraftKey(eventId, membershipId));
  } catch {
    /* ignore */
  }
}

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

function optionSignature(options = {}) {
  return Object.entries(options)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function itemUnitPrice(item, options) {
  const base = item?.included ? 0 : Number(item?.price || 0);
  const extras = Array.isArray(item?.options)
    ? item.options.reduce((sum, group) => sum + optionExtra(group, options?.[group.name]), 0)
    : 0;
  return base + extras;
}

function itemSelectionLabel(item, options) {
  const parts = (item?.options || []).map((group) => options?.[group.name]).filter(Boolean);
  return parts.length ? `${item.name} - ${parts.join(" / ")}` : item?.name || "";
}

function numericMaxQty(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 99;
}

function normalizePurchaseLines(entry) {
  if (Array.isArray(entry?.lines)) {
    const fromLines = entry.lines.filter((line) => Number(line?.qty || 0) > 0);
    if (fromLines.length) return fromLines;
  }
  const qty = Number(entry?.qty || 0);
  if (qty <= 0) return [];
  return [{ options: entry?.options || {}, qty }];
}

function totalLineQty(lines) {
  return (lines || []).reduce((sum, line) => sum + Number(line?.qty || 0), 0);
}

function preferenceOrdinalLabel(slotsPerDay) {
  const n = Number(slotsPerDay) + 1;
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix} Class preference`;
}

function optionsComplete(groups, options) {
  if (!Array.isArray(groups) || groups.length === 0) return true;
  return groups.every((group) => !!options?.[group.name]);
}

function preferenceMapForSelection(event, selection) {
  const map = {};
  if (event?.is_multi_day) {
    Object.values(selection.preferencesByDay || {}).forEach((classId) => {
      if (classId) map[classId] = true;
    });
  } else if (selection.preference) {
    map[selection.preference] = true;
  }
  return map;
}

function commitCurrentPurchaseLine(entry, groups, maxQty) {
  if (!optionsComplete(groups, entry?.options)) return entry;
  const lines = normalizePurchaseLines(entry).map((line) => ({ ...line }));
  const max = maxQty || 99;
  if (totalLineQty(lines) >= max) return entry;
  const sig = optionSignature(entry.options);
  const idx = lines.findIndex((line) => optionSignature(line.options) === sig);
  if (idx >= 0) {
    lines[idx] = { ...lines[idx], qty: Number(lines[idx].qty || 0) + 1 };
  } else {
    lines.push({ options: { ...(entry.options || {}) }, qty: 1 });
  }
  const nextTotal = totalLineQty(lines);
  return { ...entry, lines, qty: nextTotal, options: {}, selected: nextTotal > 0 };
}

function removePurchaseLine(entry, lineIndex) {
  const lines = normalizePurchaseLines(entry).filter((_, idx) => idx !== lineIndex);
  const nextTotal = totalLineQty(lines);
  return { ...entry, lines, qty: nextTotal, options: entry?.options || {}, selected: nextTotal > 0 };
}

function setPurchaseLineQty(entry, lineIndex, qty, maxQty) {
  let lines = normalizePurchaseLines(entry).map((line) => ({ ...line }));
  if (!lines.length) {
    lines = [{ options: entry?.options || {}, qty: 0 }];
    lineIndex = 0;
  } else if (lineIndex < 0 || lineIndex >= lines.length) {
    lineIndex = 0;
  }
  const otherQty = lines.reduce(
    (sum, line, idx) => (idx === lineIndex ? sum : sum + Number(line.qty || 0)),
    0
  );
  const max = numericMaxQty(maxQty);
  const clamped = Math.max(0, Math.min(Number(qty) || 0, max - otherQty));
  if (clamped <= 0) lines.splice(lineIndex, 1);
  else lines[lineIndex] = { ...lines[lineIndex], qty: clamped };
  const nextTotal = totalLineQty(lines);
  return { ...entry, lines, qty: nextTotal, options: entry?.options || {}, selected: nextTotal > 0 };
}

function purchaseMapEntry(map, id) {
  if (!map || id == null) return {};
  if (map[id]) return map[id];
  const matchKey = Object.keys(map).find((key) => String(key) === String(id));
  return matchKey ? map[matchKey] : {};
}

function dayClassCapacity(event, dayIndex) {
  const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
  if (isPracticeDay(event, dayIndex)) return slotsPerDay;
  const dayLimit = getDayClassLimit(event);
  if (dayLimit != null) return Math.min(slotsPerDay, dayLimit);
  return slotsPerDay;
}

function remainingClassAddsForDay(event, selection, dayIndex) {
  const dayCount = countSelectionsForDay(selection.classesByDay, dayIndex);
  const capacity = dayClassCapacity(event, dayIndex);
  if (isPracticeDay(event, dayIndex)) return Math.max(0, capacity - dayCount);
  const eventCount = countMultiDaySelectionsForEventLimit(event, selection.classesByDay);
  const eventLimit = getEventClassLimit(event);
  let remaining = capacity - dayCount;
  if (eventLimit != null) {
    remaining = Math.min(remaining, eventLimit - eventCount);
  }
  return Math.max(0, remaining);
}

function shouldShowMultiDayPreference(event, selection, dayIndex) {
  if (isPracticeDay(event, dayIndex)) return false;
  const dayCount = countSelectionsForDay(selection.classesByDay, dayIndex);
  if (dayCount === 0) return false;
  const dayLimit = getDayClassLimit(event) ?? multiDaySlotsPerDay(event, dayIndex);
  const eventLimit = getEventClassLimit(event);
  const eventCount = countMultiDaySelectionsForEventLimit(event, selection.classesByDay);
  if (dayCount >= dayLimit) return true;
  if (eventLimit != null && eventCount >= eventLimit) return true;
  return false;
}

function preferenceSlotCountForDay(event, dayIndex) {
  return getDayClassLimit(event) ?? multiDaySlotsPerDay(event, dayIndex);
}

function formatDayDate(iso) {
  if (!iso) return "";
  try {
    const date = String(iso).includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
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
  const cap = Number(max);
  const limit = Number.isFinite(cap) ? cap : 99;
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
        disabled={disabled || value >= limit}
        className="h-8 w-8 rounded-md border text-sm font-semibold disabled:opacity-40"
        style={{ borderColor: brand, color: "#fff", background: brand }}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function OptionPicker({ groups, selected, committed = [], onChange, palette, brand }) {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const committedMaps = Array.isArray(committed) ? committed : [];
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
              const isSelected =
                selected?.[group.name] === v.label ||
                committedMaps.some((options) => options?.[group.name] === v.label);
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
                  onClick={() => onChange(group.name, isSelected && selected?.[group.name] === v.label ? "" : v.label)}
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

function PurchaseLineEditor({
  label,
  amount,
  qty,
  minQty = 0,
  maxQty = 99,
  onQtyChange,
  onRemove,
  brand,
  palette,
  qtyEditable = true,
  removable = true,
}) {
  return (
    <div
      className="rounded-md p-3 space-y-2"
      style={{
        background: palette?.surface || "#ffffff",
        border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 text-sm">
        <span>
          {label}
          {qty > 1 ? ` × ${qty}` : ""}
        </span>
        <span className="font-medium whitespace-nowrap">{money(amount)}</span>
      </div>
      {(qtyEditable || removable) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {qtyEditable && (
            <QtyControl value={qty} min={minQty} max={maxQty} brand={brand} onChange={onQtyChange} />
          )}
          {removable && (
            <Button type="button" variant="secondary" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
      )}
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
  const [draftScope, setDraftScope] = useState("");

  const logoSrc = event?.logourl
    ? event.logourl.startsWith("http")
      ? event.logourl
      : `https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/${event.logourl}`
    : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: eventRow, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (cancelled) return;
      if (eventError) setError("Unable to load this event nomination.");
      setEvent(eventRow || null);

      if (eventRow?.track) {
        const { data: trackRow } = await supabase.from("club_tracks").select("name").eq("id", eventRow.track).maybeSingle();
        if (cancelled) return;
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
        if (cancelled) return;
        if (classError) setError("Unable to load this event nomination.");
        setClubClasses(classRows || []);
      } else if (!cancelled) {
        setClubClasses([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    const refetch = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
    };
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

  function racingSelectionIds(selection) {
    if (!selection) return [];
    if (!event?.is_multi_day) return (selection.classSlots || []).filter(Boolean);
    const ids = [];
    Object.entries(selection.classesByDay || {}).forEach(([dayIndex, value]) => {
      if (isPracticeDay(event, dayIndex)) return;
      if (Array.isArray(value)) ids.push(...value.filter(Boolean));
      else if (value) ids.push(value);
    });
    return ids;
  }

  function localSelectionCount(classId) {
    return Object.values(selections).reduce(
      (count, selection) => count + racingSelectionIds(selection).filter((id) => id === classId).length,
      0
    );
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
    if (!eventId || !membership?.id) return;
    const draft = readNominateDraft(eventId, membership.id);
    if (draft?.selections && typeof draft.selections === "object") setSelections(draft.selections);
    if (draft?.requirementSelections && typeof draft.requirementSelections === "object") {
      setRequirementSelections(draft.requirementSelections);
    }
    if (typeof draft?.clubAffiliationConfirmed === "boolean") {
      setClubAffiliationConfirmed(draft.clubAffiliationConfirmed);
    }
    if (typeof draft?.affiliatedClubId === "string") setAffiliatedClubId(draft.affiliatedClubId);
    if (typeof draft?.selectedDriverId === "string") setSelectedDriverId(draft.selectedDriverId);
    setDraftScope(`${eventId}:${membership.id}`);
  }, [eventId, membership?.id]);

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
        if (!existing.visibleClassSlotsByDay) existing.visibleClassSlotsByDay = {};
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
    const scope = eventId && membership?.id ? `${eventId}:${membership.id}` : "";
    if (!scope || draftScope !== scope) return;
    writeNominateDraft(eventId, membership.id, {
      selections,
      requirementSelections,
      clubAffiliationConfirmed,
      affiliatedClubId,
      selectedDriverId,
    });
  }, [
    eventId,
    membership?.id,
    draftScope,
    selections,
    requirementSelections,
    clubAffiliationConfirmed,
    affiliatedClubId,
    selectedDriverId,
  ]);

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
    const preferencesByDay = { ...(current.preferencesByDay || {}) };
    if (!racing) {
      nextByDay[dayIndex] = Array.from({ length: slotsPerDay }, () => "");
      delete preferencesByDay[dayIndex];
    }
    const visibleClassSlotsByDay = { ...(current.visibleClassSlotsByDay || {}) };
    if (!racing) delete visibleClassSlotsByDay[dayIndex];
    updateSelection(driverId, { racingDays, classesByDay: nextByDay, preferencesByDay, visibleClassSlotsByDay });
  }

  function setDayClass(driverId, dayIndex, classId, slotIndex = 0) {
    const current = selections[driverId] || emptySelection();
    const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
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
    const slots = getDayClassSlots(nextByDay, dayIndex, slotsPerDay);
    slots[slotIndex] = classId || "";
    const visibleClassSlotsByDay = { ...(current.visibleClassSlotsByDay || {}) };
    if (!classId) {
      const packed = slots.filter(Boolean);
      nextByDay[dayIndex] = Array.from({ length: slotsPerDay }, (_, i) => packed[i] || "");
      visibleClassSlotsByDay[dayIndex] = packed.length;
    } else {
      nextByDay[dayIndex] = slots;
      visibleClassSlotsByDay[dayIndex] = Math.max(
        Number(current.visibleClassSlotsByDay?.[dayIndex] || 0),
        slots.filter(Boolean).length
      );
    }
    const packedForPref = (nextByDay[dayIndex] || []).filter(Boolean);
    const flat = flattenMultiDaySelections(nextByDay);
    const stillSelected = flat.includes(current.preference);
    const preferencesByDay = { ...(current.preferencesByDay || {}) };
    const dayPref = preferencesByDay[dayIndex];
    if (dayPref && packedForPref.includes(dayPref)) {
      preferencesByDay[dayIndex] = "";
    }
    if (!shouldShowMultiDayPreference(event, { ...current, classesByDay: nextByDay, preferencesByDay }, dayIndex)) {
      preferencesByDay[dayIndex] = "";
    }
    const newTransponders = fillTransponder(driverId, classId, current.transponders);
    updateSelection(driverId, {
      classesByDay: nextByDay,
      racingDays: { ...current.racingDays, [dayIndex]: true },
      preference: stillSelected ? current.preference : "",
      preferencesByDay,
      transponders: newTransponders,
      visibleClassSlotsByDay,
    });
  }

  function setDayPreference(driverId, dayIndex, value) {
    updateSelection(driverId, (current) => ({
      preferencesByDay: { ...(current.preferencesByDay || {}), [dayIndex]: value },
    }));
  }

  function removeMerchLine(driverId, itemId, lineIndex) {
    updateSelection(driverId, (current) => ({
      merch: {
        ...current.merch,
        [itemId]: removePurchaseLine(current.merch[itemId] || {}, lineIndex),
      },
    }));
  }

  function removeAddonLine(driverId, addonId, lineIndex) {
    updateSelection(driverId, (current) => ({
      addons: {
        ...current.addons,
        [addonId]: removePurchaseLine(current.addons[addonId] || {}, lineIndex),
      },
    }));
  }

  function updateMerchLineQty(driverId, itemId, lineIndex, qty, maxQty) {
    updateSelection(driverId, (current) => ({
      merch: {
        ...current.merch,
        [itemId]: setPurchaseLineQty(purchaseMapEntry(current.merch, itemId), lineIndex, qty, maxQty),
      },
    }));
  }

  function updateAddonLineQty(driverId, addonId, lineIndex, qty, maxQty) {
    updateSelection(driverId, (current) => ({
      addons: {
        ...current.addons,
        [addonId]: setPurchaseLineQty(purchaseMapEntry(current.addons, addonId), lineIndex, qty, maxQty),
      },
    }));
  }

  function setClassSlot(driverId, slotIndex, classId) {
    const current = selections[driverId] || emptySelection();
    const slots = current.classSlots.slice();
    slots[slotIndex] = classId;
    const stillSelected = slots.includes(current.preference);
    const newTransponders = fillTransponder(driverId, classId, current.transponders);
    updateSelection(driverId, { classSlots: slots, preference: stillSelected ? current.preference : "", transponders: newTransponders });
  }

  function removeClassEntry(driverId, row) {
    if (event?.is_multi_day) {
      const dayIndex = row.dayIndex;
      if (dayIndex == null) return;
      const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
      const slots = getDayClassSlots(
        (selections[driverId] || emptySelection()).classesByDay,
        dayIndex,
        slotsPerDay
      );
      const slotIndex =
        row.slotIndex != null && row.slotIndex >= 0
          ? row.slotIndex
          : slots.findIndex((id) => id === row.classId);
      if (slotIndex < 0) return;
      setDayClass(driverId, dayIndex, "", slotIndex);
      return;
    }
    const slots = (selections[driverId] || emptySelection()).classSlots || [];
    const slotIndex =
      row.slotIndex != null && row.slotIndex >= 0
        ? row.slotIndex
        : slots.findIndex((id) => id === row.classId);
    if (slotIndex < 0) return;
    setClassSlot(driverId, slotIndex, "");
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
        .map((classId, slotIndex) => ({ classId, isPractice: false, slotIndex }))
        .filter((entry) => entry.classId);
    }
    const dayCount = (event.days || event.classes_by_day || []).length;
    const entries = [];
    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      if (!selection.racingDays?.[dayIndex]) continue;
      if (isOpenPracticeDay(event, dayIndex)) {
        entries.push({ classId: null, isPractice: true, openPractice: true, dayIndex });
        continue;
      }
      const isPractice = isPracticeDay(event, dayIndex);
      const slots = selection.classesByDay?.[dayIndex];
      if (!Array.isArray(slots)) continue;
      slots.forEach((classId, slotIndex) => {
        if (!classId) return;
        entries.push({ classId, isPractice, dayIndex, slotIndex });
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

  function setPurchaseQty(entry, qty, maxQty, currentOptions) {
    const options = currentOptions || entry?.options || {};
    const sig = optionSignature(options);
    const lines = normalizePurchaseLines(entry);
    const otherQty = lines.reduce(
      (sum, line) => (optionSignature(line.options) === sig ? sum : sum + Number(line.qty || 0)),
      0
    );
    const clamped = Math.max(0, Math.min(Number(qty) || 0, (maxQty || 99) - otherQty));
    const nextLines = lines.filter((line) => optionSignature(line.options) !== sig);
    if (clamped > 0) nextLines.push({ options, qty: clamped });
    const total = totalLineQty(nextLines);
    return { ...entry, options, qty: total, lines: nextLines, selected: total > 0 };
  }

  function setPurchaseOption(entry, groupName, value, maxQty, groups) {
    const options = { ...(entry?.options || {}), [groupName]: value };
    const max = maxQty || 99;
    const hasGroups = Array.isArray(groups) && groups.length > 0;
    if (hasGroups && max > 1 && optionsComplete(groups, options) && value) {
      return commitCurrentPurchaseLine({ ...entry, options }, groups, max);
    }
    const lines = normalizePurchaseLines(entry).map((line) => ({ ...line }));
    const total = totalLineQty(lines);
    const sig = optionSignature(options);
    if (max === 1) {
      const nextLines = value || Object.values(options).some(Boolean) ? [{ options, qty: Math.max(1, total || 1) }] : [];
      const nextTotal = totalLineQty(nextLines);
      return { ...entry, options, qty: nextTotal, lines: nextLines, selected: nextTotal > 0 };
    }
    const existingIndex = lines.findIndex((line) => optionSignature(line.options) === sig);
    const blankIndex = lines.findIndex((line) => !optionSignature(line.options));
    if (existingIndex < 0 && blankIndex >= 0 && value) {
      lines[blankIndex] = { ...lines[blankIndex], options };
    } else if (existingIndex < 0 && total === 0 && value && max > 0) {
      lines.push({ options, qty: 1 });
    }
    const nextTotal = totalLineQty(lines);
    return { ...entry, options, qty: nextTotal, lines, selected: nextTotal > 0 };
  }

  function purchaseQtyForOptions(entry, options, hasOptionGroups) {
    const lines = normalizePurchaseLines(entry);
    if (!hasOptionGroups) return totalLineQty(lines) || Number(entry?.qty || 0);
    const match = lines.find((line) => optionSignature(line.options) === optionSignature(options || {}));
    return Number(match?.qty || 0);
  }

  function updateMerchQty(driverId, itemId, qty, maxQty, currentOptions) {
    updateSelection(driverId, (current) => ({
      merch: {
        ...current.merch,
        [itemId]: setPurchaseQty(current.merch[itemId] || {}, qty, maxQty, currentOptions),
      },
    }));
  }

  function updateMerchOption(driverId, itemId, groupName, value, maxQty, groups) {
    updateSelection(driverId, (current) => ({
      merch: {
        ...current.merch,
        [itemId]: setPurchaseOption(current.merch[itemId] || {}, groupName, value, maxQty, groups),
      },
    }));
  }

  function updateAddonQty(driverId, addonId, qty, maxQty, currentOptions) {
    updateSelection(driverId, (current) => ({
      addons: {
        ...current.addons,
        [addonId]: setPurchaseQty(current.addons[addonId] || {}, qty, maxQty, currentOptions),
      },
    }));
  }

  function updateAddonOption(driverId, addonId, groupName, value, maxQty, groups) {
    updateSelection(driverId, (current) => ({
      addons: {
        ...current.addons,
        [addonId]: setPurchaseOption(current.addons[addonId] || {}, groupName, value, maxQty, groups),
      },
    }));
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
      if (item.included) return sum;
      const lines = item.compulsory && !normalizePurchaseLines(entry).length
        ? [{ options: entry?.options || {}, qty: 1 }]
        : normalizePurchaseLines(entry);
      return sum + lines.reduce((lineSum, line) => lineSum + itemUnitPrice(item, line.options) * Number(line.qty || 0), 0);
    }, 0);
  }

  function addonsFor(selection) {
    const classIds = selectedClassIds(selection);
    return addOns.filter((addon) => {
      const classes = Array.isArray(addon.classes) ? addon.classes : [];
      if (classes.length === 0) return true;
      return classes.some((cid) => classIds.includes(typeof cid === "string" ? cid : cid?.id));
    });
  }

  function addonCostFor(selection) {
    return addonsFor(selection).reduce((sum, addon, idx) => {
      const entry = selection.addons[addon.id || `addon-${idx}`] || selection.addons[addon.id];
      const lines = addon.required && !normalizePurchaseLines(entry).length
        ? [{ options: entry?.options || {}, qty: 1 }]
        : normalizePurchaseLines(entry);
      return sum + lines.reduce((lineSum, line) => lineSum + itemUnitPrice(addon, line.options) * Number(line.qty || 0), 0);
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
      preferenceMap: preferenceMapForSelection(event, selection),
    });
    return (classResult.total || 0) + merchandiseCostFor(selection) + addonCostFor(selection);
  }

  function purchaseLinesForItem(item, entry, { locked }) {
    if (locked && !normalizePurchaseLines(entry).length) {
      return [{ options: entry?.options || {}, qty: 1 }];
    }
    return normalizePurchaseLines(entry);
  }

  function validatePurchaseSelection(selection) {
    for (let idx = 0; idx < merchandise.length; idx += 1) {
      const item = merchandise[idx];
      const itemId = item.id || `merch-${idx}`;
      const entry = selection.merch[itemId] || selection.merch[item.id];
      const locked = item.included || item.compulsory;
      const hasOptions = Array.isArray(item.options) && item.options.length > 0;
      const lines = purchaseLinesForItem(item, entry, { locked });
      if (locked) {
        if (hasOptions && !lines.every((line) => optionsComplete(item.options, line.options))) {
          return `Choose options for ${item.name}.`;
        }
        if (!hasOptions && totalLineQty(lines) < 1) {
          return `${item.name} is required.`;
        }
        continue;
      }
      if (totalLineQty(lines) <= 0) continue;
      if (hasOptions && !lines.every((line) => optionsComplete(item.options, line.options))) {
        return `Choose options for ${item.name}.`;
      }
    }

    const addons = addonsFor(selection);
    for (let idx = 0; idx < addons.length; idx += 1) {
      const addon = addons[idx];
      const addonId = addon.id || `addon-${idx}`;
      const entry = selection.addons[addonId] || selection.addons[addon.id];
      const locked = !!addon.required;
      const hasOptions = Array.isArray(addon.options) && addon.options.length > 0;
      const lines = purchaseLinesForItem(addon, entry, { locked });
      if (locked) {
        if (hasOptions && !lines.every((line) => optionsComplete(addon.options, line.options))) {
          return `Choose options for ${addon.name}.`;
        }
        if (!hasOptions && totalLineQty(lines) < 1) {
          return `${addon.name} is required.`;
        }
        continue;
      }
      if (totalLineQty(lines) <= 0) continue;
      if (hasOptions && !lines.every((line) => optionsComplete(addon.options, line.options))) {
        return `Choose options for ${addon.name}.`;
      }
    }
    return "";
  }

  function validateActiveDriversPurchases(active) {
    for (const { driver, selection } of active) {
      const purchaseErr = validatePurchaseSelection(selection);
      if (purchaseErr) return `${driver.first_name} ${driver.last_name}: ${purchaseErr}`;
    }
    return "";
  }

  function checkoutBreakdownFor(driver, selection) {
    const membershipType = driver.is_junior ? "junior" : membership?.isMember ? "member" : "non_member";
    const preferenceMap = preferenceMapForSelection(event, selection);
    const classResult = calculateUserPricing({
      event,
      pricing,
      selectedClasses: selectedClassIds(selection),
      selectedClassEntries: selectedClassEntries(selection),
      membershipType,
      preferenceMap,
    });
    const rows = [];
    const mode = pricing.mode || "per_entry";
    const entries = selectedClassEntries(selection);
    const chargePrefs = pricing.charge_preferences;

    if (mode === "per_class") {
      const classPrices = pricing.class_prices || {};
      entries.forEach((entry) => {
        if (entry?.openPractice) {
          rows.push({ kind: "class", driverId: driver.id, label: "Open practice day", amount: 0, dayIndex: entry.dayIndex });
          return;
        }
        const classId = entry?.classId;
        if (!classId) return;
        if (preferenceMap[classId] && !chargePrefs) return;
        const override = classPrices[classId];
        let amount = 0;
        if (override) {
          if (entry.isPractice) {
            const practicePrice = override.practice?.[membershipType];
            amount = practicePrice != null && practicePrice !== "" ? Math.max(0, Number(practicePrice)) : 0;
          } else if (!override.free) {
            amount = Math.max(0, Number(override[membershipType] || 0));
          }
        }
        const suffix = entry.isPractice ? " (practice)" : preferenceMap[classId] ? " (preference)" : "";
        rows.push({
          kind: "class",
          driverId: driver.id,
          classId,
          dayIndex: entry.dayIndex,
          slotIndex: entry.slotIndex,
          label: `${classMap.get(classId) || classId}${suffix}`,
          amount,
        });
      });
    } else if (mode === "tiered") {
      const tier = pricing.tiered?.[membershipType] || {};
      const firstClassPrice = Math.max(0, Number(tier.first_class || 0));
      const additionalClassPrice = Math.max(0, Number(tier.additional_class || 0));
      let racingClassCount = 0;
      entries.forEach((entry) => {
        if (entry?.openPractice) {
          const practicePrice = tier.practice;
          const amount =
            practicePrice != null && practicePrice !== "" ? Math.max(0, Number(practicePrice)) : 0;
          rows.push({ kind: "class", driverId: driver.id, label: "Open practice day", amount, dayIndex: entry.dayIndex });
          return;
        }
        const classId = entry?.classId;
        if (!classId) return;
        if (preferenceMap[classId] && !chargePrefs) return;
        if (entry.isPractice) {
          const practicePrice = tier.practice;
          const amount =
            practicePrice != null && practicePrice !== "" ? Math.max(0, Number(practicePrice)) : 0;
          rows.push({
            kind: "class",
            driverId: driver.id,
            classId,
            dayIndex: entry.dayIndex,
            slotIndex: entry.slotIndex,
            label: `${classMap.get(classId) || classId} (practice)`,
            amount,
          });
          return;
        }
        const amount = racingClassCount === 0 ? firstClassPrice : additionalClassPrice;
        racingClassCount += 1;
        const suffix = preferenceMap[classId] ? " (preference)" : "";
        rows.push({
          kind: "class",
          driverId: driver.id,
          classId,
          dayIndex: entry.dayIndex,
          slotIndex: entry.slotIndex,
          label: `${classMap.get(classId) || classId}${suffix}`,
          amount,
        });
      });
    } else {
      const billable = entries.filter((entry) => {
        if (entry?.openPractice) return true;
        if (!entry?.classId) return false;
        const isPref = preferenceMap[entry.classId] === true;
        return !(isPref && !chargePrefs);
      });
      const hasRacing = billable.some((entry) => !entry.isPractice && !entry.openPractice);
      const hasPractice = billable.some((entry) => entry.isPractice || entry.openPractice);
      if (hasRacing) {
        rows.push({
          kind: "fee",
          label: "Event entry",
          amount: Math.max(0, Number(pricing.global?.[membershipType] || 0)),
        });
      }
      if (hasPractice) {
        const practicePrice = pricing.global?.practice?.[membershipType];
        if (practicePrice != null && practicePrice !== "") {
          rows.push({ label: "Practice", amount: Math.max(0, Number(practicePrice)) });
        }
      }
    }

    const appendPreferenceRow = (classId) => {
      if (!classId) return;
      let amount = 0;
      if (chargePrefs) {
        if (mode === "per_class") {
          const override = pricing.class_prices?.[classId];
          if (override && !override.free) {
            amount = Math.max(0, Number(override[membershipType] || 0));
          }
        } else if (mode === "tiered") {
          const tier = pricing.tiered?.[membershipType] || {};
          const racingCount = entries.filter(
            (entry) => entry?.classId && !entry.isPractice && !entry.openPractice && !(preferenceMap[entry.classId] && !chargePrefs)
          ).length;
          amount = racingCount === 0 ? Math.max(0, Number(tier.first_class || 0)) : Math.max(0, Number(tier.additional_class || 0));
        }
      }
        rows.push({
          kind: "class",
          driverId: driver.id,
          classId,
          dayIndex: event?.is_multi_day ? Number(dayIndex) : undefined,
          slotIndex: event?.is_multi_day ? undefined : (selection.classSlots || []).indexOf(classId),
          label: `${classMap.get(classId) || classId} (preference)`,
          amount,
        });
    };

    if (event?.is_multi_day) {
      Object.entries(selection.preferencesByDay || {}).forEach(([dayIndex, classId]) => {
        if (!selection.racingDays?.[dayIndex]) return;
        appendPreferenceRow(classId);
      });
    } else {
      appendPreferenceRow(selection.preference);
    }

    merchandise.forEach((item, idx) => {
      const itemId = item.id || `merch-${idx}`;
      const entry = selection.merch[itemId] || selection.merch[item.id];
      const lines = normalizePurchaseLines(entry);
      lines.forEach((line, lineIndex) => {
        const qty = Number(line.qty || 0);
        if (qty <= 0) return;
        const unit = item.included ? 0 : itemUnitPrice(item, line.options);
        const totalQty = totalLineQty(lines);
        const maxQty = numericMaxQty(item.max_qty);
        rows.push({
          kind: "merch",
          driverId: driver.id,
          itemId,
          lineIndex,
          qty,
          maxQty,
          remainingQty: Math.max(0, maxQty - (totalQty - qty)),
          included: !!item.included,
          label: itemSelectionLabel(item, line.options),
          amount: unit * qty,
        });
      });
    });

    addonsFor(selection).forEach((addon, idx) => {
      const addonId = addon.id || `addon-${idx}`;
      const entry = selection.addons[addonId] || selection.addons[addon.id];
      const lines = normalizePurchaseLines(entry);
      lines.forEach((line, lineIndex) => {
        const qty = Number(line.qty || 0);
        if (qty <= 0) return;
        const unit = itemUnitPrice(addon, line.options);
        const totalQty = totalLineQty(lines);
        const maxQty = numericMaxQty(addon.max_qty);
        rows.push({
          kind: "addon",
          driverId: driver.id,
          itemId: addonId,
          lineIndex,
          qty,
          maxQty,
          remainingQty: Math.max(0, maxQty - (totalQty - qty)),
          included: false,
          label: itemSelectionLabel(addon, line.options),
          amount: unit * qty,
        });
      });
    });

    if (classResult.isLate && pricing.late_fee) {
      rows.push({ label: "Late entry fee", amount: Math.max(0, Number(pricing.late_fee)) });
    }

    return rows;
  }

  const householdTotal = drivers.reduce((sum, driver) => sum + driverTotal(driver), 0);
  const flatRequirements = useMemo(() => flattenRequirements(event?.club_requirements), [event?.club_requirements]);

  function startPayment(method) {
    const active = drivers
      .map((driver) => ({ driver, selection: selections[driver.id] || emptySelection() }))
      .filter(({ selection }) => hasNominationActivity(selection));
    const purchaseErr = validateActiveDriversPurchases(active);
    if (purchaseErr) {
      setError(purchaseErr);
      return;
    }
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
    const purchaseErr = validateActiveDriversPurchases(active);
    if (purchaseErr) return setError(purchaseErr);
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
      if (preferenceEnabled && !event.is_multi_day && selection.preference) {
        entries.push({
          nomination_id: nomination.id,
          class_id: selection.preference,
          is_preference: true,
          order_index: classRows.length + 1,
        });
      }
      if (preferenceEnabled && event.is_multi_day) {
        const dayCount = (event.days || event.classes_by_day || []).length;
        let prefOrder = classRows.length + 1;
        for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
          const classId = selection.preferencesByDay?.[dayIndex];
          if (!classId || !selection.racingDays?.[dayIndex]) continue;
          entries.push({
            nomination_id: nomination.id,
            class_id: classId,
            is_preference: true,
            order_index: prefOrder,
          });
          prefOrder += 1;
        }
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
    clearNominateDraft(eventId, membership.id);
    setSaved(true);
    navigate(`/${clubSlug}/app/events/${eventId}/nominations`);
  }

  function classOptions(ids, currentValue, takenIds = [], { ignoreEntryLimits } = {}) {
    return [
      { value: "", label: "No class selected" },
      ...ids
        .filter((id) => id === currentValue || !takenIds.includes(id))
        .filter((id) => ignoreEntryLimits || !classOptionDisabled(id, currentValue))
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
  const currentDriverTotal = selectedDriver ? driverTotal(selectedDriver) : 0;
  const pricingBreakdownRows = isFamily
    ? drivers.flatMap((driver) => {
        const driverSelection = selections[driver.id] || emptySelection();
        if (!hasNominationActivity(driverSelection)) return [];
        const prefix = `${driver.first_name} ${driver.last_name}`;
        return checkoutBreakdownFor(driver, driverSelection).map((row) => ({
          ...row,
          label: `${prefix}: ${row.label}`,
        }));
      })
    : selectedDriver
      ? checkoutBreakdownFor(selectedDriver, selection)
      : [];
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
                        <div className="flex flex-col gap-3">
                          {days.map((day, dayIndex) => {
                            const selected = !!selection.racingDays?.[dayIndex];
                            const dateLabel = formatDayDate(day?.date);
                            const nameLabel = day?.label?.trim() || "";
                            const openPractice = isOpenPracticeDay(event, dayIndex);
                            const dayClassIds = getEffectiveDayClassIds(event, dayIndex, trackClassIds);
                            const slotsPerDay = multiDaySlotsPerDay(event, dayIndex);
                            const daySlots = getDayClassSlots(selection.classesByDay, dayIndex, slotsPerDay);
                            const chosen = daySlots.filter(Boolean);
                            const capacity = dayClassCapacity(event, dayIndex);
                            const visibleFromState = selection.visibleClassSlotsByDay?.[dayIndex] || 0;
                            const visibleSlotCount = Math.max(visibleFromState, chosen.length);
                            const practiceDay = isPracticeDay(event, dayIndex);
                            const canAddClass =
                              remainingClassAddsForDay(event, selection, dayIndex) > 0 &&
                              visibleSlotCount < capacity &&
                              chosen.length >= visibleSlotCount &&
                              chosen.length > 0;
                            const showPreference = preferenceEnabled && shouldShowMultiDayPreference(event, selection, dayIndex);
                            const prefSlotCount = preferenceSlotCountForDay(event, dayIndex);
                            return (
                              <div
                                key={dayIndex}
                                className="rounded-md border p-3 space-y-3"
                                style={{
                                  background: palette?.surfaceAlt || "#f9fafb",
                                  borderColor: palette?.surfaceBorder || "#e5e7eb",
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 shrink-0"
                                    checked={selected}
                                    onChange={() => {
                                      const next = !selected;
                                      setDayRacing(selectedDriver.id, dayIndex, next);
                                    }}
                                  />
                                  <div className="min-w-0">
                                    {dateLabel ? <div className="text-sm font-semibold">{dateLabel}</div> : null}
                                    {nameLabel ? (
                                      <div
                                        className="text-sm"
                                        style={{ color: dateLabel ? palette?.textMuted || "#6b7280" : contentText }}
                                      >
                                        {nameLabel}
                                      </div>
                                    ) : !dateLabel ? (
                                      <div className="text-sm font-semibold">{`Day ${dayIndex + 1}`}</div>
                                    ) : null}
                                  </div>
                                </div>

                                {selected && openPractice && (
                                  <div className="text-sm" style={{ color: contentText }}>
                                    <p>
                                      Practice day — all track classes. No class selection is required. This day is not
                                      included in the LiveTime export.
                                    </p>
                                    {dayClassIds.length > 0 && (
                                      <p className="mt-2 text-xs opacity-80">
                                        Classes: {dayClassIds.map((id) => classMap.get(id) || id).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {selected && !openPractice && visibleSlotCount === 0 && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      updateSelection(selectedDriver.id, (current) => ({
                                        visibleClassSlotsByDay: {
                                          ...(current.visibleClassSlotsByDay || {}),
                                          [dayIndex]: 1,
                                        },
                                      }))
                                    }
                                  >
                                    Select classes
                                  </Button>
                                )}

                                {selected && !openPractice && visibleSlotCount > 0 && (
                                  <div className="space-y-3">
                                    {Array.from({ length: visibleSlotCount }, (_, slotIndex) => {
                                      const currentValue = daySlots[slotIndex] || "";
                                      return (
                                        <div key={slotIndex} className="space-y-1">
                                          <div className="text-sm font-medium">
                                            {visibleSlotCount > 1 ? `Class ${slotIndex + 1}` : "Class"}
                                          </div>
                                          <div className="flex w-full min-w-0 items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                              <FilterDropdown
                                                variant="cms"
                                                value={currentValue}
                                                onChange={(value) =>
                                                  setDayClass(selectedDriver.id, dayIndex, value, slotIndex)
                                                }
                                                onClose={() => {
                                                  if (!currentValue) {
                                                    setDayClass(selectedDriver.id, dayIndex, "", slotIndex);
                                                  }
                                                }}
                                                options={classOptions(
                                                  dayClassIds,
                                                  currentValue,
                                                  chosen.filter((id) => id !== currentValue),
                                                  { ignoreEntryLimits: practiceDay }
                                                )}
                                                ariaLabel={
                                                  visibleSlotCount > 1 ? `Class ${slotIndex + 1}` : "Class"
                                                }
                                                triggerStyleOverrides={{ fontSize: "0.875rem" }}
                                              />
                                            </div>
                                            {currentValue && (
                                              <TransponderCombobox
                                                variant="cms"
                                                value={transponderFor(selectedDriver.id, currentValue)}
                                                suggestions={savedTranspondersFor(selectedDriver.id)}
                                                onChange={(value) =>
                                                  updateTransponder(selectedDriver.id, currentValue, value)
                                                }
                                                ariaLabel="Transponder number"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {canAddClass && (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                          updateSelection(selectedDriver.id, (current) => ({
                                            visibleClassSlotsByDay: {
                                              ...(current.visibleClassSlotsByDay || {}),
                                              [dayIndex]: Math.max(
                                                current.visibleClassSlotsByDay?.[dayIndex] || 0,
                                                visibleSlotCount
                                              ) + 1,
                                            },
                                          }))
                                        }
                                      >
                                        Add class
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {selected && !openPractice && showPreference &&
                                  (() => {
                                    const prefOptions = dayClassIds.filter((id) => !chosen.includes(id));
                                    if (prefOptions.length === 0) return null;
                                    const dayPref = selection.preferencesByDay?.[dayIndex] || "";
                                    return (
                                      <div>
                                        <div className="text-sm font-medium mb-1">
                                          {preferenceOrdinalLabel(prefSlotCount)}
                                        </div>
                                        <FilterDropdown
                                          variant="cms"
                                          value={dayPref}
                                          onChange={(value) => setDayPreference(selectedDriver.id, dayIndex, value)}
                                          options={[
                                            { value: "", label: "No preference" },
                                            ...prefOptions.map((id) => ({
                                              value: id,
                                              label: classMap.get(id) || id,
                                            })),
                                          ]}
                                          ariaLabel={preferenceOrdinalLabel(prefSlotCount)}
                                          triggerStyleOverrides={{ fontSize: "0.875rem" }}
                                        />
                                      </div>
                                    );
                                  })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!event.is_multi_day &&
                      Array.from({ length: classLimit }, (_, slotIndex) => {
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
                                    options={classOptions(
                                      clubClasses.map((item) => item.id),
                                      currentValue,
                                      (selection.classSlots || []).filter((id) => id && id !== currentValue)
                                    )}
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

                    {preferenceEnabled && !event.is_multi_day && (() => {
                      const chosenSlots = (selection.classSlots || []).filter(Boolean);
                      if (chosenSlots.length < classLimit) return null;
                      const prefOptions = clubClasses.map((item) => item.id).filter((id) => !chosenSlots.includes(id));
                      if (prefOptions.length === 0) return null;
                      const slotsPerDay = classLimit || 1;
                      return (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">{preferenceOrdinalLabel(slotsPerDay)}</div>
                        <FilterDropdown
                          variant="cms"
                          value={selection.preference}
                          onChange={(value) => updateSelection(selectedDriver.id, { preference: value })}
                          options={[
                            { value: "", label: "No preference" },
                            ...prefOptions.map((id) => ({ value: id, label: classMap.get(id) || id })),
                          ]}
                          ariaLabel={preferenceOrdinalLabel(slotsPerDay)}
                          triggerStyleOverrides={{ fontSize: "0.875rem" }}
                        />
                      </div>
                      );
                    })()}
                  </div>
                </Section>

                {merchandise.length > 0 && (
                  <Section title="Merchandise" icon={ShoppingBagIcon} brand={brand}>
                    <div className="flex flex-col gap-4 w-full mx-auto">
                      {merchandise.map((item, idx) => {
                        const itemId = item.id || `merch-${idx}`;
                        const entry = selection.merch[itemId] || selection.merch[item.id];
                        const locked = item.included || item.compulsory;
                        const hasOptions = Array.isArray(item.options) && item.options.length > 0;
                        const maxQty = numericMaxQty(item.max_qty);
                        const multiOption = hasOptions && maxQty > 1;
                        const storedLines = normalizePurchaseLines(entry);
                        const completeLines = storedLines.filter((line) => optionsComplete(item.options, line.options));
                        const currentOptionsReady = optionsComplete(item.options, entry?.options);
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
                              {hasOptions && (
                                <>
                                  <OptionPicker
                                    groups={item.options}
                                    selected={entry?.options}
                                    committed={completeLines.map((line) => line.options)}
                                    onChange={(group, value) =>
                                      updateMerchOption(selectedDriver.id, itemId, group, value, item.max_qty, item.options)
                                    }
                                    palette={palette}
                                    brand={brand}
                                  />
                                  {((locked && completeLines.length === 0) ||
                                    (Object.values(entry?.options || {}).some(Boolean) && !currentOptionsReady)) && (
                                    <p className="text-sm text-red-600">Choose all options before checkout.</p>
                                  )}
                                </>
                              )}
                              {storedLines.map((line, lineIndex) => {
                                if (!optionsComplete(item.options, line.options) && hasOptions) return null;
                                const qty = Number(line.qty || 0);
                                const unit = item.included ? 0 : itemUnitPrice(item, line.options);
                                const lineRemaining = Math.max(0, maxQty - (totalLineQty(storedLines) - qty));
                                return (
                                  <PurchaseLineEditor
                                    key={`${optionSignature(line.options)}-${lineIndex}`}
                                    label={itemSelectionLabel(item, line.options)}
                                    amount={unit * qty}
                                    qty={qty}
                                    maxQty={lineRemaining}
                                    brand={brand}
                                    palette={palette}
                                    qtyEditable={!item.included}
                                    removable={!item.included}
                                    onQtyChange={(next) =>
                                      updateMerchLineQty(selectedDriver.id, itemId, lineIndex, next, maxQty)
                                    }
                                    onRemove={() => removeMerchLine(selectedDriver.id, itemId, lineIndex)}
                                  />
                                );
                              })}
                              {multiOption && totalLineQty(storedLines) < maxQty && (
                                <p className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  Select options to add another ({totalLineQty(storedLines)}/{maxQty})
                                </p>
                              )}
                              {!hasOptions && !item.included && storedLines.length === 0 && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-medium">Quantity</span>
                                  <QtyControl
                                    value={0}
                                    min={0}
                                    max={maxQty}
                                    brand={brand}
                                    onChange={(next) =>
                                      updateMerchQty(selectedDriver.id, itemId, next, item.max_qty, entry?.options)
                                    }
                                  />
                                </div>
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
                        const hasOptions = Array.isArray(addon.options) && addon.options.length > 0;
                        const maxQty = numericMaxQty(addon.max_qty);
                        const multiOption = hasOptions && maxQty > 1;
                        const storedLines = normalizePurchaseLines(entry);
                        const completeLines = storedLines.filter((line) => optionsComplete(addon.options, line.options));
                        const currentOptionsReady = optionsComplete(addon.options, entry?.options);
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
                              {hasOptions && (
                                <>
                                  <OptionPicker
                                    groups={addon.options}
                                    selected={entry?.options}
                                    committed={completeLines.map((line) => line.options)}
                                    onChange={(group, value) =>
                                      updateAddonOption(selectedDriver.id, addonId, group, value, addon.max_qty, addon.options)
                                    }
                                    palette={palette}
                                    brand={brand}
                                  />
                                  {((locked && completeLines.length === 0) ||
                                    (Object.values(entry?.options || {}).some(Boolean) && !currentOptionsReady)) && (
                                    <p className="text-sm text-red-600">Choose all options before checkout.</p>
                                  )}
                                </>
                              )}
                              {storedLines.map((line, lineIndex) => {
                                if (!optionsComplete(addon.options, line.options) && hasOptions) return null;
                                const qty = Number(line.qty || 0);
                                const unit = itemUnitPrice(addon, line.options);
                                const lineRemaining = Math.max(0, maxQty - (totalLineQty(storedLines) - qty));
                                return (
                                  <PurchaseLineEditor
                                    key={`${optionSignature(line.options)}-${lineIndex}`}
                                    label={itemSelectionLabel(addon, line.options)}
                                    amount={unit * qty}
                                    qty={qty}
                                    maxQty={lineRemaining}
                                    brand={brand}
                                    palette={palette}
                                    onQtyChange={(next) =>
                                      updateAddonLineQty(selectedDriver.id, addonId, lineIndex, next, maxQty)
                                    }
                                    onRemove={() => removeAddonLine(selectedDriver.id, addonId, lineIndex)}
                                  />
                                );
                              })}
                              {multiOption && totalLineQty(storedLines) < maxQty && (
                                <p className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
                                  Select options to add another ({totalLineQty(storedLines)}/{maxQty})
                                </p>
                              )}
                              {!hasOptions && storedLines.length === 0 && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-medium">{locked ? "Qty: 1" : "Quantity"}</span>
                                  {!locked && (
                                    <QtyControl
                                      value={0}
                                      min={0}
                                      max={maxQty}
                                      brand={brand}
                                      onChange={(next) =>
                                        updateAddonQty(selectedDriver.id, addonId, next, addon.max_qty, entry?.options)
                                      }
                                    />
                                  )}
                                </div>
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
                    {pricingBreakdownRows.length > 0 && (
                      <div className="space-y-2">
                        {pricingBreakdownRows.map((row, rowIndex) => {
                          const editablePurchase = (row.kind === "merch" || row.kind === "addon") && !row.included;
                          const removableClass = row.kind === "class" && !!row.classId;
                          return (
                            <div key={`${row.kind || row.label}-${row.itemId || row.classId || ""}-${row.lineIndex ?? row.slotIndex ?? rowIndex}-${rowIndex}`}>
                              {editablePurchase ? (
                                <PurchaseLineEditor
                                  label={row.label}
                                  amount={row.amount}
                                  qty={row.qty}
                                  maxQty={row.remainingQty ?? numericMaxQty(row.maxQty)}
                                  brand={brand}
                                  palette={palette}
                                  onQtyChange={(next) => {
                                    if (row.kind === "merch") {
                                      updateMerchLineQty(row.driverId, row.itemId, row.lineIndex, next, numericMaxQty(row.maxQty));
                                    } else {
                                      updateAddonLineQty(row.driverId, row.itemId, row.lineIndex, next, numericMaxQty(row.maxQty));
                                    }
                                  }}
                                  onRemove={() => {
                                    if (row.kind === "merch") removeMerchLine(row.driverId, row.itemId, row.lineIndex);
                                    else removeAddonLine(row.driverId, row.itemId, row.lineIndex);
                                  }}
                                />
                              ) : (
                                <PurchaseLineEditor
                                  label={row.label}
                                  amount={row.amount}
                                  qty={1}
                                  brand={brand}
                                  palette={palette}
                                  qtyEditable={false}
                                  removable={removableClass}
                                  onRemove={() => removeClassEntry(row.driverId, row)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                      <p className="text-xl text-text-muted">{isFamily ? "Household total" : "Total"}</p>
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
