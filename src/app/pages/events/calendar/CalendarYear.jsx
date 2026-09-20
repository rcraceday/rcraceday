import React from "react";
import CalendarEventCard from "./CalendarEventCard";

export default function CalendarYear({ year, events, brand, onEventClick }) {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const safeEvents = Array.isArray(events) ? events : [];

  const lighten = (hex) => {
    try {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.min(255, (num >> 16) + 30);
      const g = Math.min(255, ((num >> 8) & 0xff) + 30);
      const b = Math.min(255, (num & 0xff) + 30);
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return hex;
    }
  };

  const monthHeaderColor = lighten(brand);

  const parseLocalDate = (value) => {
    if (!value) return null;

    const candidate = new Date(value);
    if (Number.isNaN(candidate.getTime())) return null;

    return new Date(`${value.slice(0, 10)}T12:00:00`);
  };

  const getEventCalendarDate = (event) => {
    if (event.event_date) return parseLocalDate(event.event_date);

    const scheduledDays = [
      ...(Array.isArray(event.classes_by_day) ? event.classes_by_day : []),
      ...(Array.isArray(event.days) ? event.days : []),
    ];

    return scheduledDays
      .map((day) => parseLocalDate(day?.date))
      .filter(Boolean)
      .sort((first, second) => first - second)[0] || null;
  };

  const formatDate = (value) => {
    const d = value instanceof Date ? value : parseLocalDate(value);
    if (!d) return "Date TBD";

    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    return `${weekday} ${day} ${month}`;
  };

  return (
    <div
      style={{
        width: "100%",
        border: `3px solid ${brand}`,
        borderRadius: "16px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* BLUE HEADER FOR THE YEAR */}
      <div
        style={{
          background: brand,
          color: "white",
          padding: "16px 20px",
          fontSize: "20px",
          fontWeight: 700,
          borderBottom: `3px solid ${brand}`,
        }}
      >
        {year}
      </div>

      {/* MONTH GRID (unchanged) */}
      <div
        style={{
          width: "100%",
          display: "grid",
          justifyItems: "center",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          padding: "20px 12px 24px",
          boxSizing: "border-box",
        }}
      >
        {MONTHS.map((label, monthIndex) => {
          const monthEvents = safeEvents.filter((e) => {
            const d = getEventCalendarDate(e);
            return d && d.getFullYear() === year && d.getMonth() === monthIndex;
          });

          return (
            <div
              key={monthIndex}
              className="rounded-md shadow-sm overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "420px",
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* BLUE HEADER BAR FOR MONTH */}
              <div
                style={{
                  background: monthHeaderColor,
                  color: "white",
                  padding: "12px 16px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {label}
              </div>

              {/* CARD BODY */}
              <div
                style={{
                  padding: "16px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxSizing: "border-box",
                }}
              >
                {monthEvents.length === 0 && (
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#999",
                      padding: "4px 0",
                    }}
                  >
                    No events
                  </div>
                )}

                {monthEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      width: "100%",
                      padding: "0 2px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#333",
                        textAlign: "left",
                      }}
                    >
                      {formatDate(getEventCalendarDate(event))}
                    </div>

                    <CalendarEventCard
                      event={event}
                      brand={brand}
                      onNavigate={() => onEventClick?.(event)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
