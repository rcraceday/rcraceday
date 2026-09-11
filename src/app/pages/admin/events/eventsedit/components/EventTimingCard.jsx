// src/app/pages/admin/events/eventsedit/components/EventTimingCard.jsx
import React, { useMemo } from "react";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import { cmsLayout } from "@cms/layout";

export default function EventTimingCard({ event = {}, onChange }) {
  const isMulti = !!event.is_multi_day;

  const days = useMemo(() => {
    if (Array.isArray(event.days) && event.days.length > 0) {
      return event.days.map((d) => ({
        date: d.date || "",
        label: d.label || "",
        gates_open_at: d.gates_open_at || "",
        practice_at: d.practice_at || "",
        drivers_brief_at: d.drivers_brief_at || "",
        race_start_at: d.race_start_at || "",
      }));
    }

    return [
      {
        date: event.event_date || "",
        label: "",
        gates_open_at: "",
        practice_at: "",
        drivers_brief_at: "",
        race_start_at: "",
      },
    ];
  }, [event]);

  const updateDayField = (index, field, value) => {
    const next = [...days];
    next[index] = { ...next[index], [field]: value };
    onChange("days", next);
  };

  const updateDayDate = (index, value) => {
    const next = [...days];
    next[index] = { ...next[index], date: value };
    onChange("days", next);
    if (!isMulti) onChange("event_date", value);
  };

  const copyTimingToAllDays = () => {
    if (days.length < 2) return;

    const first = days[0];
    const next = days.map((d, i) =>
      i === 0
        ? d
        : {
            ...d,
            gates_open_at: first.gates_open_at,
            practice_at: first.practice_at,
            drivers_brief_at: first.drivers_brief_at,
            race_start_at: first.race_start_at,
          }
    );

    onChange("days", next);
  };

  const renderDayRow = (day, i) => {
    const displayLabel =
      day.label || (isMulti ? `Day ${i + 1}` : "Single Day");

    return (
      <div
        key={i}
        style={{
          padding: "12px",
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600 }}>{displayLabel}</div>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            {isMulti ? `Day ${i + 1}` : "Single day"}
          </div>
        </div>

        {/* TIMING GRID WITH CLEAR BUTTONS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {/* Gates Open */}
          <div>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Gates Open
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CMSInput
                type="time"
                value={day.gates_open_at || ""}
                onChange={(v) => updateDayField(i, "gates_open_at", v)}
              />
              <button
                onClick={() => updateDayField(i, "gates_open_at", null)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "#E5E7EB",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Practice */}
          <div>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Practice
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CMSInput
                type="time"
                value={day.practice_at || ""}
                onChange={(v) => updateDayField(i, "practice_at", v)}
              />
              <button
                onClick={() => updateDayField(i, "practice_at", null)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "#E5E7EB",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Drivers Brief */}
          <div>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Drivers Brief
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CMSInput
                type="time"
                value={day.drivers_brief_at || ""}
                onChange={(v) => updateDayField(i, "drivers_brief_at", v)}
              />
              <button
                onClick={() => updateDayField(i, "drivers_brief_at", null)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "#E5E7EB",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Race Start */}
          <div>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Race Start
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CMSInput
                type="time"
                value={day.race_start_at || ""}
                onChange={(v) => updateDayField(i, "race_start_at", v)}
              />
              <button
                onClick={() => updateDayField(i, "race_start_at", null)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "#E5E7EB",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* DATE + LABEL */}
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Date
            </label>
            <CMSInput
              type="date"
              value={day.date || ""}
              onChange={(v) => updateDayDate(i, v)}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 6, fontSize: 13 }}>
              Day name (optional)
            </label>
            <CMSInput
              value={day.label || ""}
              onChange={(v) => {
                const next = [...days];
                next[i] = { ...next[i], label: v };
                onChange("days", next);
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: cmsLayout.spacing.lg,
      }}
    >
      {days.length === 0 ? (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#FEF3C7",
            color: "#92400E",
          }}
        >
          No event date selected.
        </div>
      ) : (
        <>
          {isMulti && (
            <CMSButton
              onClick={copyTimingToAllDays}
              style={{
                alignSelf: "flex-start",
                marginBottom: 8,
                background: "#E5E7EB",
                color: "#111827",
              }}
            >
              Copy timing to all days
            </CMSButton>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {days.map((d, i) => renderDayRow(d, i))}
          </div>
        </>
      )}
    </div>
  );
}
