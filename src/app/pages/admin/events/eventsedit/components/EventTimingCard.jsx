// src/app/pages/admin/events/eventsedit/components/EventTimingCard.jsx
import React, { useMemo } from "react";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import { ClearFieldButton } from "@cms/CMSButtonSet";
import { cmsLayout } from "@cms/layout";
import { cmsStyles } from "@cms/styles";

const timeFieldLabelStyle = { ...cmsStyles.label, display: "block", marginBottom: 6 };

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
        is_practice: !!d.is_practice,
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

  const renderTimeField = (dayIndex, field, label) => (
    <div style={{ minWidth: 0 }}>
      <label style={timeFieldLabelStyle}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CMSInput
            type="time"
            value={days[dayIndex][field] || ""}
            onChange={(v) => updateDayField(dayIndex, field, v)}
          />
        </div>
        <ClearFieldButton onClick={() => updateDayField(dayIndex, field, null)} />
      </div>
    </div>
  );

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
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600 }}>{displayLabel}</div>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            {isMulti ? `Day ${i + 1}` : "Single day"}
          </div>
        </div>

        <div className="event-timing-grid">
          {renderTimeField(i, "gates_open_at", "Gates Open")}
          {renderTimeField(i, "practice_at", "Practice")}
          {renderTimeField(i, "drivers_brief_at", "Drivers Brief")}
          {renderTimeField(i, "race_start_at", "Race Start")}
        </div>

        <div style={{ marginTop: 12 }}>
          <CMSInput
            label="Day name (optional)"
            value={day.label || ""}
            onChange={(v) => {
              const next = [...days];
              next[i] = { ...next[i], label: v };
              onChange("days", next);
            }}
          />
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
