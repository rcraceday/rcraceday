import CMSCard from "../../cms/CMSCard";
import CMSButton from "../../cms/CMSButton";

import {
  CalendarIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

import { cmsStyles as styles } from "../../cms/styles";

export default function EventsTable({ loading, events, clubSlug }) {
  const text = styles.eventCardText;

  const smallButton = {
    padding: "4px 8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    color: "#111827",
    cursor: "pointer",
    whiteSpace: "nowrap",
    width: "130px",
    transition: "background-color 0.15s ease",
  };

  const redIcon = { width: 14, height: 14, color: "#DC2626" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {loading && (
        <CMSCard>
          <div style={{ padding: "12px", textAlign: "center" }}>
            Loading events…
          </div>
        </CMSCard>
      )}

      {!loading && events.length === 0 && (
        <CMSCard>
          <div style={{ padding: "12px", textAlign: "center" }}>
            No events found.
          </div>
        </CMSCard>
      )}

      {!loading &&
        events.map((event) => (
          <CMSCard key={event.id} title={event.name}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "flex-start",
                rowGap: "10px",
                columnGap: "12px",
                fontSize: text.valueSize,
                color: "#374151",
              }}
            >
              {/* LEFT SIDE */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  flex: "1 1 250px",
                }}
              >
                {/* DATE */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CalendarIcon
                    style={{
                      width: text.iconSize,
                      height: text.iconSize,
                      color: "#6B7280",
                    }}
                  />
                  <strong style={{ fontSize: text.labelSize }}>Date:</strong>
                  {new Date(event.event_date).toLocaleDateString("en-AU")}
                </div>

                {/* TRACK */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPinIcon
                    style={{
                      width: text.iconSize,
                      height: text.iconSize,
                      color: "#6B7280",
                    }}
                  />
                  <strong style={{ fontSize: text.labelSize }}>Track:</strong>
                  {event.track || "—"}
                </div>

                {/* STATUS */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {event.is_published ? (
                    <CheckCircleIcon
                      style={{
                        width: text.iconSize,
                        height: text.iconSize,
                        color: "#16A34A",
                      }}
                    />
                  ) : (
                    <XCircleIcon
                      style={{
                        width: text.iconSize,
                        height: text.iconSize,
                        color: "#DC2626",
                      }}
                    />
                  )}
                  <strong style={{ fontSize: text.labelSize }}>Status:</strong>
                  {event.is_published ? "Published" : "Draft"}
                </div>

                {/* ⭐ NOMINATED COUNT */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserGroupIcon
                    style={{
                      width: text.iconSize,
                      height: text.iconSize,
                      color: "#6B7280",
                    }}
                  />
                  <strong style={{ fontSize: text.labelSize }}>Nominations:</strong>
                  {event.nomination_count}
                </div>
              </div>

              {/* RIGHT SIDE BUTTONS */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: "flex-end",
                  flex: "0 0 130px",
                }}
              >
                <button
                  style={smallButton}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#E5E7EB")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#F3F4F6")
                  }
                  onClick={() =>
                    (window.location.href = `/${clubSlug}/app/admin/events/${event.id}`)
                  }
                >
                  <PencilSquareIcon style={redIcon} />
                  Edit
                </button>

                <button
                  style={smallButton}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#E5E7EB")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#F3F4F6")
                  }
                  onClick={() =>
                    (window.location.href = `/${clubSlug}/app/admin/events/${event.id}/nominations`)
                  }
                >
                  <UserGroupIcon style={redIcon} />
                  Nominations
                </button>
              </div>
            </div>
          </CMSCard>
        ))}
    </div>
  );
}
