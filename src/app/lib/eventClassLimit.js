export function getEventClassLimit(event) {
  if (!event?.is_multi_day) {
    if (event?.class_limit == null || event.class_limit === "") return 3;
    return Number(event.class_limit);
  }
  if (
    (event.class_limit_per_day == null || event.class_limit_per_day === "") &&
    event.class_limit_scope === "per_day"
  ) {
    return null;
  }
  if (event.class_limit == null || event.class_limit === "") return null;
  return Number(event.class_limit);
}

export function getDayClassLimit(event) {
  if (!event?.is_multi_day) return null;
  if (event.class_limit_per_day != null && event.class_limit_per_day !== "") {
    return Number(event.class_limit_per_day);
  }
  if (event.class_limit_scope === "per_day") return Number(event.class_limit ?? 3);
  return null;
}

export function getClassLimitNumber(event) {
  return getEventClassLimit(event) ?? getDayClassLimit(event) ?? 3;
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
  return getDayClassLimit(event) ?? getEventClassLimit(event) ?? 1;
}

export function multiDayClassLimitError({ event, classesByDay, dayIndex, classId, currentValue }) {
  if (!classId || classId === currentValue) return null;
  const dayLimit = getDayClassLimit(event);
  const eventLimit = getEventClassLimit(event);
  const nextDay = countSelectionsForDay(classesByDay, dayIndex) + (currentValue ? 0 : 1);
  const nextTotal = countMultiDaySelections(classesByDay) + (currentValue ? 0 : 1);
  if (dayLimit != null && nextDay > dayLimit) {
    return `You can select up to ${dayLimit} classes per day.`;
  }
  if (eventLimit != null && nextTotal > eventLimit) {
    return `You can select up to ${eventLimit} classes for this event.`;
  }
  return null;
}

export function canSetMultiDayClass(args) {
  return !multiDayClassLimitError(args);
}

export function validateDriverClassSelections(event, selection) {
  if (!event?.is_multi_day) return null;
  const classesByDay = selection?.classesByDay || {};
  const dayLimit = getDayClassLimit(event);
  const eventLimit = getEventClassLimit(event);
  if (dayLimit != null) {
    for (const dayIndex of Object.keys(classesByDay)) {
      if (countSelectionsForDay(classesByDay, dayIndex) > dayLimit) {
        return `You can select up to ${dayLimit} classes per day.`;
      }
    }
  }
  if (eventLimit != null && countMultiDaySelections(classesByDay) > eventLimit) {
    return `You can select up to ${eventLimit} classes for this event.`;
  }
  return null;
}

export function classLimitLabel(event) {
  if (!event?.is_multi_day) {
    return `${getEventClassLimit(event)} per driver`;
  }
  const eventLimit = getEventClassLimit(event);
  const dayLimit = getDayClassLimit(event);
  const parts = [];
  if (eventLimit != null) parts.push(`${eventLimit} per driver (event)`);
  if (dayLimit != null) parts.push(`${dayLimit} per driver per day`);
  return parts.join(" · ") || "No class limit";
}
