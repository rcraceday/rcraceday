import React from "react";
import CalendarEventCard from "./CalendarEventCard";

export default function CalendarYear({ year, events, brand, onEventClick }) {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const safeEvents = Array.isArray(events) ? events : [];

  const formatDate = (iso) => {
    const d = new Date(iso);
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
            const d = new Date(e.event_date);
            return d.getFullYear() === year && d.getMonth() === monthIndex;
          });

          return (
            <div
              key={monthIndex}
              className="rounded-md shadow-sm overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "420px",
                border: `2px solid ${brand}`,
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* BLUE HEADER BAR FOR MONTH */}
              <div
                style={{
                  background: brand,
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
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
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
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#333",
                      }}
                    >
                      {formatDate(event.event_date)}
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
