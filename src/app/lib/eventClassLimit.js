export function getClassLimitScope(event) {
  if (!event?.is_multi_day) return "per_event";
  return event.class_limit_scope === "per_day" ? "per_day" : "per_event";
}

export function getClassLimitNumber(event) {
  return event?.class_limit ?? 3;
}

export function flattenMultiDaySelections(classesByDay) {
  if (!classesByDay || typeof classesByDay !== "object") return [];
  return Object.values(classesByDay).flatMap((value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value) return [value];
    return [];
  });
}

export function countMultiDaySelections(classesByDay) {
  return flattenMultiDaySelections(classesByDay).length;
}

export function countSelectionsForDay(classesByDay, dayIndex) {
  const raw = classesByDay?.[dayIndex];
  if (Array.isArray(raw)) return raw.filter(Boolean).length;
  if (typeof raw === "string" && raw) return 1;
  return 0;
}

export function getDayClassSlots(classesByDay, dayIndex, slotCount) {
  const raw = classesByDay?.[dayIndex];
  if (Array.isArray(raw)) {
    const slots = raw.slice();
    while (slots.length < slotCount) slots.push("");
    return slots.slice(0, slotCount);
  }
  if (typeof raw === "string" && raw) {
    const slots = [raw];
    while (slots.length < slotCount) slots.push("");
    return slots.slice(0, slotCount);
  }
  return Array.from({ length: slotCount }, () => "");
}

export function multiDaySlotsPerDay(event) {
  return getClassLimitScope(event) === "per_day" ? getClassLimitNumber(event) : 1;
}

export function canSetMultiDayClass({ event, classesByDay, dayIndex, classId, currentValue }) {
  if (!classId || classId === currentValue) return true;
  const limit = getClassLimitNumber(event);
  if (getClassLimitScope(event) === "per_day") {
    const filled = countSelectionsForDay(classesByDay, dayIndex);
    if (currentValue) return true;
    return filled < limit;
  }
  let total = countMultiDaySelections(classesByDay);
  if (currentValue) total -= 1;
  return total + 1 <= limit;
}

export function validateDriverClassSelections(event, selection) {
  if (!event?.is_multi_day) return null;
  const classesByDay = selection?.classesByDay || {};
  const limit = getClassLimitNumber(event);
  if (getClassLimitScope(event) === "per_day") {
    for (const dayIndex of Object.keys(classesByDay)) {
      if (countSelectionsForDay(classesByDay, dayIndex) > limit) {
        return `You can select up to ${limit} classes per day.`;
      }
    }
    return null;
  }
  if (countMultiDaySelections(classesByDay) > limit) {
    return `You can select up to ${limit} classes for this event.`;
  }
  return null;
}

export function classLimitLabel(event) {
  const limit = getClassLimitNumber(event);
  if (!event?.is_multi_day) return `${limit} per driver`;
  if (getClassLimitScope(event) === "per_day") return `${limit} per driver per day`;
  return `${limit} per driver (across all days)`;
}
