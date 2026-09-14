// src/app/pages/events/EventDetailsSections/EventDetailsICS.jsx

import Button from "@/components/ui/Button";

/* ===========================
   HELPERS
   =========================== */

function formatICSDate(date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");
}

function buildICS(event) {
  const lines = [];

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//RaceControl//Event Calendar//EN");

  if (event.is_multi_day && Array.isArray(event.days) && event.days.length > 0) {
    event.days.forEach((day, index) => {
      const start = day.gates_open_at || day.practice_at || day.drivers_brief_at || day.race_start_at;
      const end = day.race_start_at || day.drivers_brief_at || day.practice_at || day.gates_open_at;

      const startDate = start ? new Date(start) : new Date(day.date);
      const endDate = end ? new Date(end) : new Date(day.date);

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:event-${event.id}-day-${index}@racecontrol`);
      lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
      lines.push(`DTSTART:${formatICSDate(startDate)}`);
      lines.push(`DTEND:${formatICSDate(endDate)}`);
      lines.push(`SUMMARY:${event.name} — ${day.label || `Day ${index + 1}`}`);
      lines.push(`LOCATION:${event.track || "Unknown Track"}`);
      if (event.description) {
        lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
      }
      lines.push("END:VEVENT");
    });
  } else {
    const startDate = new Date(event.event_date);
    const endDate = new Date(event.event_date);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${event.id}@racecontrol`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:${event.name}`);
    lines.push(`LOCATION:${event.track || "Unknown Track"}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

function downloadICS(event) {
  const ics = buildICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.name.replace(/\s+/g, "_")}.ics`;
  a.click();

  URL.revokeObjectURL(url);
}

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsICS({ event }) {
  return (
    <div className="space-y-4 text-sm text-text-muted leading-tight">

      <p>
        Download an ICS file to add this event to your calendar.
      </p>

      <Button
        className="w-full !py-2 !rounded-md font-semibold"
        onClick={() => downloadICS(event)}
      >
        Download Calendar File
      </Button>
    </div>
  );
}
