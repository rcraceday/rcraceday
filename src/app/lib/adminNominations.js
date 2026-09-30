import { getAllEventAssignedClassIds, getEffectiveDayClassIds } from "@/app/lib/eventClassLimit";
import { parseStoredTimestamp } from "@/app/lib/eventDatetime";
import {
  isLateEntryWindow,
  isNominationsOpen,
} from "@/app/pages/events/events-sections/helpers";

export function driverDisplayName(driver) {
  return [driver?.first_name, driver?.last_name].filter(Boolean).join(" ").trim() || "Unnamed driver";
}

export function formatEventDate(value) {
  if (!value) return "—";
  const dateOnly = String(value).slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)
    ? new Date(`${dateOnly}T00:00:00`)
    : parseStoredTimestamp(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function nominationWindowStatus(event, now = new Date()) {
  if (!event?.nominations_open && !event?.nominations_close) {
    return { id: "unset", label: "No window" };
  }
  const open = parseStoredTimestamp(event.nominations_open);
  if (open && now < open) return { id: "upcoming", label: "Not open" };
  if (isLateEntryWindow(event, now)) return { id: "late", label: "Late entries" };
  if (isNominationsOpen(event, now)) return { id: "open", label: "Open" };
  return { id: "closed", label: "Closed" };
}

export function collectEventClassIds(event, trackClassIds = []) {
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  if (Array.isArray(event?.classes_by_day) && event.classes_by_day.length > 0) {
    event.classes_by_day.forEach((_, index) => {
      getEffectiveDayClassIds(event, index, trackClassIds).forEach(add);
    });
  }

  getAllEventAssignedClassIds(event).forEach(add);
  return ids;
}

export function racingEntriesOf(entries = []) {
  return (entries || []).filter((entry) => !entry.is_preference);
}

export function classEntryCounts(entries = []) {
  const counts = {};
  racingEntriesOf(entries).forEach((entry) => {
    if (!entry.class_id) return;
    counts[entry.class_id] = (counts[entry.class_id] || 0) + 1;
  });
  return counts;
}

export function classMaxLimit(event, classId) {
  const raw = event?.class_entry_limits?.[classId];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function policyHint(message) {
  const text = (message || "").toLowerCase();
  if (text.includes("policy") || text.includes("row-level") || text.includes("rls")) {
    return " Run scripts/add-admin-nominations-write.sql in Supabase.";
  }
  return "";
}
