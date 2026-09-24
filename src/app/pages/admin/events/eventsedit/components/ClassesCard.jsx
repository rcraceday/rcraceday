// src/app/pages/admin/events/eventsedit/components/ClassesCard.jsx
import React, { useMemo, useCallback } from "react";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import CMSToggle from "@cms/CMSToggle";
import { cmsLayout } from "@cms/layout";
import SortableClassItem from "./SortableClassItem";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const formatDateDisplay = (isoDate) => {
  if (!isoDate) return "";
  const s =
    typeof isoDate === "string"
      ? isoDate
      : isoDate.toISOString?.().slice(0, 10);
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export default function ClassesCard({ event = {}, onChange, onClassesChange }) {
  const availableClasses = event.available_classes || [];
  const isMulti = !!event.is_multi_day;

  // Build days array
  const days = useMemo(
    () =>
      isMulti
        ? Array.isArray(event.days)
          ? event.days
          : []
        : [{ date: event.event_date, label: "" }],
    [event.days, event.event_date, isMulti]
  );

  // ALWAYS build classes_by_day as an array aligned with days
  const classesByDay = days.map((d, index) => {
    const existing = event.classes_by_day?.[index];
    return {
      date: d.date,
      label: d.label,
      classes: Array.isArray(existing?.classes) ? existing.classes : [],
      is_practice: !!(existing?.is_practice ?? d?.is_practice),
    };
  });

  const normalizeArray = (arr) =>
    Array.from(new Set(Array.isArray(arr) ? arr : []));

  // PATCHED: update classes_by_day using array structure
  const setDayClasses = useCallback(
    (dayIndex, classes) => {
      const deduped = normalizeArray(classes);

      const next = days.map((d, index) => {
        if (index === dayIndex) {
          return {
            date: d.date,
            label: d.label,
            classes: deduped,
            is_practice: !!(
              event.classes_by_day?.[dayIndex]?.is_practice ?? days[dayIndex]?.is_practice
            ),
          };
        }
        const existing = event.classes_by_day?.[index];
        return {
          date: d.date,
          label: d.label,
          classes: Array.isArray(existing?.classes)
            ? existing.classes
            : [],
          is_practice: !!(existing?.is_practice ?? d?.is_practice),
        };
      });

      onClassesChange(next);
    },
    [days, event.classes_by_day, onClassesChange]
  );

  const setDayPractice = useCallback(
    (dayIndex, isPractice) => {
      const next = days.map((d, index) => {
        const existing = event.classes_by_day?.[index];
        return {
          date: d.date,
          label: d.label,
          classes: Array.isArray(existing?.classes) ? existing.classes : [],
          is_practice: index === dayIndex ? isPractice : !!(existing?.is_practice ?? d?.is_practice),
        };
      });
      onClassesChange(next);

      if (isMulti && Array.isArray(event.days)) {
        const nextDays = event.days.map((d, index) =>
          typeof d === "string"
            ? d
            : index === dayIndex
              ? { ...d, is_practice: isPractice }
              : d
        );
        onChange("days", nextDays);
      }
    },
    [days, event.classes_by_day, event.days, isMulti, onClassesChange, onChange]
  );

  const addClassToDay = (dayIndex, classId = "") => {
    const existing = classesByDay[dayIndex].classes.slice();
    if (classId && existing.includes(classId)) return;
    existing.push(classId);
    setDayClasses(dayIndex, existing);
  };

  const updateClassInDay = (dayIndex, idx, classId) => {
    const existing = classesByDay[dayIndex].classes.slice();

    if (existing[idx] === classId) return;

    const alreadyElsewhere = existing.some(
      (c, i) => c === classId && i !== idx
    );
    if (classId && alreadyElsewhere) return;

    existing[idx] = classId;
    setDayClasses(dayIndex, existing);
  };

  const removeClassFromDay = (dayIndex, idx) => {
    const existing = classesByDay[dayIndex].classes.slice();
    existing.splice(idx, 1);
    setDayClasses(dayIndex, existing);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (eventDrag) => {
    const { active, over } = eventDrag;
    if (!over) return;

    const [activeIndexStr] = String(active.id).split("::");
    const [overIndexStr] = String(over.id).split("::");

    const dayIndex = Number(activeIndexStr.split("-")[0]);
    const from = Number(activeIndexStr.split("-")[1]);
    const to = Number(overIndexStr.split("-")[1]);

    if (isNaN(dayIndex) || isNaN(from) || isNaN(to) || from === to) return;

    const list = classesByDay[dayIndex].classes.slice();
    const next = arrayMove(list, from, to);
    setDayClasses(dayIndex, next);
  };

  const classOptions = (availableClasses || []).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const entryLimits = event.class_entry_limits || {};

  const setEntryLimit = (classId, value) => {
    if (!classId) return;
    const next = { ...entryLimits };
    if (value === null || value === "") {
      delete next[classId];
    } else {
      next[classId] = Math.max(0, Number(value));
    }
    onChange("class_entry_limits", next);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: cmsLayout.spacing.lg,
      }}
    >
      {/* Max Classes Per Event */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 220 }}>
          <CMSInput
            type="number"
            label={isMulti ? "Max Entries Per Event" : "Max Classes Per Driver Per Day"}
            value={event.class_limit == null ? "" : String(event.class_limit)}
            onChange={(v) => {
              const next = v === "" ? null : Math.max(0, Number(v));
              onChange("class_limit", next);
              if (next != null && event.preference_enabled) {
                const pref = event.preference_limit;
                if (pref != null && pref > next) {
                  onChange("preference_limit", next);
                }
              }
            }}
          />
        </div>
        {isMulti && (
          <div style={{ width: 220 }}>
            <CMSInput
              type="number"
              label="Max Classes per Day"
              value={event.class_limit_per_day == null ? "" : String(event.class_limit_per_day)}
              onChange={(v) =>
                onChange("class_limit_per_day", v === "" ? null : Math.max(0, Number(v)))
              }
            />
          </div>
        )}
      </div>

      {/* Preferences */}
      <div style={{ width: 260 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontWeight: 600 }}>Preferences Allowed</label>
          <CMSToggle
            label=""
            checked={!!event.preference_enabled}
            onChange={(checked) => onChange("preference_enabled", checked)}
          />
        </div>

        {event.preference_enabled && (
          <div style={{ marginTop: 8 }}>
            <CMSInput
              type="number"
              label="Preference Limit"
              value={
                event.preference_limit == null
                  ? ""
                  : String(event.preference_limit)
              }
              onChange={(v) =>
                onChange(
                  "preference_limit",
                  v === "" ? null : Math.max(0, Number(v))
                )
              }
              placeholder="e.g., 1"
            />
          </div>
        )}
      </div>

      {/* Per-day class assignments */}
      {days.length === 0 ? (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#FEF3C7",
            color: "#92400E",
          }}
        >
          No event days available. Add an Event Date in Event Details to
          configure classes per day.
        </div>
      ) : (
        days.map((d, dayIndex) => {
          const dayLabel = d?.label
            ? `${d.label} — ${formatDateDisplay(d.date)}`
            : formatDateDisplay(d.date) || `Day ${dayIndex + 1}`;

          const classList = classesByDay[dayIndex].classes.slice();
          const sortableIds = classList.map(
            (c, idx) => `${dayIndex}-${idx}`
          );

          const selectedSet = new Set(classList.filter(Boolean));

          return (
            <div
              key={dayIndex}
              style={{
                padding: 12,
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                background: "#FFFFFF",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{dayLabel}</div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#374151",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="Practice day: class picks do not count toward max entries. Empty class list means all track classes are practicing (excluded from LiveTime export)."
                  >
                    <input
                      type="checkbox"
                      checked={!!classesByDay[dayIndex]?.is_practice}
                      onChange={(e) => setDayPractice(dayIndex, e.target.checked)}
                    />
                    Practice
                  </label>
                </div>
                <div style={{ color: "#6B7280", fontSize: 13 }}>
                  {isMulti ? `Day ${dayIndex + 1}` : "Single day"}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {classList.length === 0 ? (
                      <div style={{ color: "#6B7280", padding: 8 }}>
                        No classes added for this day.
                      </div>
                    ) : (
                      classList.map((cId, idx) => {
                        const itemId = `${dayIndex}-${idx}`;

                        const optionsForRow = (availableClasses || []).filter(
                          (c) => !selectedSet.has(c.id) || c.id === cId
                        );

                        return (
                          <div key={itemId} style={{ marginBottom: 8 }}>
                            <SortableClassItem
                              id={itemId}
                              value={cId}
                              availableClasses={optionsForRow}
                              onChange={(v) =>
                                updateClassInDay(dayIndex, idx, v)
                              }
                              onRemove={() =>
                                removeClassFromDay(dayIndex, idx)
                              }
                              label={`Class ${idx + 1}`}
                              maxEntries={cId ? entryLimits[cId] ?? "" : ""}
                              onMaxEntriesChange={(v) => setEntryLimit(cId, v)}
                            />
                          </div>
                        );
                      })
                    )}
                  </SortableContext>
                </DndContext>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <CMSButton
                  type="button"
                  onClick={() => addClassToDay(dayIndex, "")}
                  title="Add class"
                >
                  Add Class
                </CMSButton>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
