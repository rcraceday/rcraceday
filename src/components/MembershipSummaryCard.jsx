import { IdentificationIcon } from "@heroicons/react/24/solid";
import Card from "@/components/ui/Card";

export default function MembershipSummaryCard({
  membership,
  members,
  drivers,
  brand,
  club,
}) {
  if (!membership) return null;

  const clubLogo = club?.member_badge_url || null;

  /* ------------------------------------------------------------
     MERGE DRIVERS + MEMBERS (your UI stays the same)
     ------------------------------------------------------------ */
  const unifiedMembers = (() => {
    const driverObjects = (drivers || []).map((d) => ({
      id: d.id,
      first_name: d.first_name,
      last_name: d.last_name,
      is_junior: d.is_junior,
      isDriver: true,
    }));

    const memberObjects = (members || []).map((m) => ({
      ...m,
      isDriver: false,
    }));

    return [...driverObjects, ...memberObjects];
  })();

  const adultMembers = unifiedMembers.filter((m) => !m.is_junior);
  const juniorMembers = unifiedMembers.filter((m) => m.is_junior);

  /* ------------------------------------------------------------
     TYPE LABEL
     ------------------------------------------------------------ */
  const typeLabel =
    membership.membership_type === "junior"
      ? "Junior Membership"
      : membership.membership_type === "single"
      ? "Single Membership"
      : membership.membership_type === "family"
      ? "Family Membership"
      : "Membership";

  /* ------------------------------------------------------------
     DATE FORMATTER
     ------------------------------------------------------------ */
  function formatPretty(dateString) {
    if (!dateString) return "—";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";

    return `${month} ${day}${suffix}, ${year}`;
  }

  const start = formatPretty(membership.start_date);
  const end = formatPretty(membership.end_date);

  /* ------------------------------------------------------------
     STATUS BADGE
     ------------------------------------------------------------ */
  let statusLabel = "Active";
  let statusColor = "#16a34a"; // green
  const now = new Date();

  if (membership.status === "renewing member") {
    statusLabel = "Renewing";
    statusColor = "#2563eb"; // blue
  } else if (membership.endDateObj && membership.endDateObj < now) {
    statusLabel = "Expired";
    statusColor = "#dc2626"; // red
  }

  const isHalfYear = membership.duration === "6 months";

  /* ------------------------------------------------------------
     RENDER
     ------------------------------------------------------------ */
  return (
    <Card
      className="membership-summary-card"
      style={{
        border: `2px solid ${brand}`,
        position: "relative",
        padding: "10px",
        width: "100%",
      }}
    >
      {/* ⭐ FIXED BADGE — NO MORE OVERFLOW */}
      {clubLogo && (
        <img
          src={clubLogo}
          alt={`${club?.name || "Club"} Logo`}
          className="member-badge"
          style={{
            position: "absolute",
            right: "16px",
            bottom: "16px",
            maxWidth: "96px",
            maxHeight: "96px",
            height: "auto",
            objectFit: "contain",
            opacity: 0.9,
            pointerEvents: "none",
          }}
        />
      )}

      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        <IdentificationIcon
          style={{ height: "20px", width: "20px", color: brand }}
        />
        Membership Summary
      </h2>

      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <p style={{ fontWeight: 500 }}>{typeLabel}</p>

          <span
            style={{
              backgroundColor: statusColor,
              color: "white",
              fontSize: "12px",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {statusLabel}
          </span>

          {isHalfYear && (
            <span style={{ fontSize: "12px", opacity: 0.7 }}>
              (6‑month membership)
            </span>
          )}
        </div>

        <p style={{ fontSize: "14px", opacity: 0.7 }}>Start: {start}</p>
        <p style={{ fontSize: "14px", opacity: 0.7 }}>End: {end}</p>
      </div>

      <div>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "4px",
          }}
        >
          Members
        </h3>

        {unifiedMembers.length > 0 ? (
          <ul style={{ fontSize: "14px", lineHeight: 1.4 }}>
            {adultMembers.map((m) => (
              <li key={m.id}>
                {m.first_name} {m.last_name}
              </li>
            ))}
            {juniorMembers.map((m) => (
              <li key={m.id}>
                {m.first_name} {m.last_name}
                <span style={{ opacity: 0.7 }}> (Junior)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: "14px", opacity: 0.7 }}>
            No members recorded yet.
          </p>
        )}
      </div>
    </Card>
  );
}
