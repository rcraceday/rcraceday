import { Link } from "react-router-dom";
import {
  CalendarIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/solid";

import { cmsStyles as styles } from "../../cms/styles";

export default function EventRow({ event, clubSlug }) {
  return (
    <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
      {/* EVENT NAME */}
      <td
        style={{
          ...styles.td,
          whiteSpace: "normal",
          fontSize: "15px",
        }}
      >
        {event.name}
      </td>

      {/* DATE */}
      <td
        style={{
          ...styles.td,
          whiteSpace: "normal",
          fontSize: "15px",
        }}
      >
        {new Date(event.event_date).toLocaleDateString("en-AU", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </td>

      {/* TRACK */}
      <td
        style={{
          ...styles.td,
          whiteSpace: "normal",
          fontSize: "15px",
        }}
      >
        {event.track || "—"}
      </td>

      {/* STATUS BADGE */}
      <td style={{ ...styles.td, whiteSpace: "normal" }}>
        {event.is_published ? (
          <span
            style={{
              ...styles.badgePublished,
              fontSize: "13px",
            }}
          >
            Published
          </span>
        ) : (
          <span
            style={{
              ...styles.badgeDraft,
              fontSize: "13px",
            }}
          >
            Draft
          </span>
        )}
      </td>

      {/* ACTION BUTTONS */}
      <td style={{ ...styles.td, whiteSpace: "normal" }}>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            to={`/${clubSlug}/app/admin/events/${event.id}`}
            style={{
              ...styles.actionButton,
              fontSize: "14px",
            }}
          >
            <PencilSquareIcon
              style={{
                ...styles.actionIcon,
                width: "16px",
                height: "16px",
              }}
            />
            Edit
          </Link>

          <Link
            to={`/${clubSlug}/app/admin/events/${event.id}/nominations`}
            style={{
              ...styles.actionButton,
              fontSize: "14px",
            }}
          >
            <CalendarIcon
              style={{
                ...styles.actionIcon,
                width: "16px",
                height: "16px",
              }}
            />
            Nominations
          </Link>
        </div>
      </td>
    </tr>
  );
}
