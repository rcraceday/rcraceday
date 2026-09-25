import React, { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate, Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  ClockIcon,
  FlagIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import useTheme from "@/app/providers/useTheme";
import { supabase } from "@/supabaseClient";
import DOMPurify from "dompurify";
import {
  getDayClassLimit,
  getEffectiveDayClassIds,
  getEventClassLimit,
  isOpenPracticeDay,
} from "@/app/lib/eventClassLimit";
import { useMembership } from "@/app/providers/MembershipProvider";
import {
  isNominationsOpen,
  perEntryFeeDisplayRows,
  resolveEventPricing,
} from "@/app/pages/events/events-sections/helpers";

const EVENT_DETAIL_FIELDS =
  "*, pricing, late_entries_enabled, late_fee_activation, late_entries_close";

function formatNominationDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function formatLateFeeAmount(pricing) {
  const amount = Number(pricing?.late_fee);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `$${amount}`;
}

// ---------------------------------------------
// PAGE HEADER
// ---------------------------------------------
function PageHeader({ brand, clubSlug }) {
  const navigate = useNavigate();

  return (
    <PageTitle
      icon={CalendarDaysIcon}
      title="Event Details"
      style={{ color: brand }}
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
          onClick={() => navigate(`/${clubSlug}/app/events`)}
        >
          <ArrowLeftIcon className="h-3 w-3" />
          Back
        </Button>
      }
    />
  );
}

// ---------------------------------------------
// HELPERS
// ---------------------------------------------
function has(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatEventDate(event) {
  if (!event.is_multi_day || !Array.isArray(event.days)) {
    return formatDate(event.event_date);
  }

  const dates = event.days
    .map((day) => day?.date)
    .filter((date) => date && !Number.isNaN(new Date(date).getTime()))
    .sort();

  if (dates.length === 0) return formatDate(event.event_date);
  if (dates.length === 1 || dates[0] === dates.at(-1)) return formatDate(dates[0]);

  return `${formatDate(dates[0])} - ${formatDate(dates.at(-1))}`;
}

function formatTimeOnly(date, timeStr) {
  if (!timeStr) return null;
  try {
    const d = new Date(`${date}T${timeStr}:00`);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return timeStr;
  }
}

function normalizeRequirements(requirements) {
  return (Array.isArray(requirements) ? requirements : [])
    .map((requirement) => ({
      description: requirement?.description || "",
      items: (Array.isArray(requirement?.items) ? requirement.items : [])
        .map((item) => ({ label: item?.label || "" }))
        .filter((item) => item.label.trim()),
    }))
    .filter((requirement) => requirement.description.trim() || requirement.items.length > 0);
}


// ---------------------------------------------
// TWO-COLUMN LIST
// ---------------------------------------------
function TwoColumnList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: "16px",
        rowGap: "8px",
        fontSize: "14px",
      }}
    >
      {items.map((it, i) => (
        <div key={i}>
          <span style={{ fontWeight: 500 }}>
            {it.label}
            {it.value && (
              <span style={{ color: "#555" }}> — {it.value}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function EntryFeeList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontSize: "14px",
      }}
    >
      {items.map((it, i) => (
        <div key={i} style={{ fontWeight: 500 }}>
          {it.label}
          {it.value && (
            <span style={{ color: "#555", fontWeight: 400 }}> — {it.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------
// SECTION
// ---------------------------------------------
function Section({ title, icon: SectionIcon, brand, children }) {
  return (
    <section style={{ marginTop: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        {React.createElement(SectionIcon, {
          className: "h-5 w-5",
          style: { color: brand },
        })}
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function RequirementsDisplay({ requirements, palette }) {
  const normalized = normalizeRequirements(requirements);
  if (normalized.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="font-semibold text-base">Requirements</div>
      {normalized.map((requirement, ri) => (
        <div
          key={ri}
          className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3"
          style={{
            background: palette?.surface || "#ffffff",
            borderColor: palette?.surfaceBorder || "#e5e7eb",
          }}
        >
          <div className="font-medium text-sm">
            {requirement.description || `Requirement ${ri + 1}`}
          </div>
          <div className="flex flex-col gap-1">
            {requirement.items.map((item, ii) => (
              <label key={ii} className="flex items-start gap-2 text-sm">
                <input type="checkbox" />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------
export default function EventDetails() {
  const { palette } = useTheme();
  const { id } = useParams();
  const outlet = useOutletContext() || {};
  const club = outlet.club;

  const clubSlug = club?.slug;
  const brand = palette?.primary || "#00438a";
  const contentText = palette?.text || "#1f2937";

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [classMap, setClassMap] = useState({});
  const [trackClassIds, setTrackClassIds] = useState([]);
  const [classEntryCounts, setClassEntryCounts] = useState({});
  const [hasExistingNomination, setHasExistingNomination] = useState(false);

  const { membership } = useMembership();

  const logoSrc = event?.logourl
    ? event.logourl.startsWith("http")
      ? event.logourl
      : `https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/${event.logourl}`
    : null;

  // Load event
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from("events")
        .select(EVENT_DETAIL_FIELDS)
        .eq("id", id)
        .single();

      setEvent(data || null);
      setLoading(false);
    }

    load();
  }, [id]);

  useEffect(() => {
  async function loadClasses() {
    if (!event) return;

    const ids = new Set();
    let trackClassIds = [];

    if (event.track) {
      const { data: trackRows } = await supabase
        .from("club_track_classes")
        .select("class_id, club_classes ( id, name )")
        .eq("track_id", event.track);
      trackClassIds = (trackRows || [])
        .map((row) => row.club_classes?.id)
        .filter(Boolean);
      trackClassIds.forEach((cid) => ids.add(cid));
    }

    if (event.classes_by_day) {
      event.classes_by_day.forEach((info, index) => {
        const configured = (info.classes || []).filter(Boolean);
        if (configured.length) {
          configured.forEach((cid) => ids.add(cid));
        } else if (isOpenPracticeDay(event, index)) {
          trackClassIds.forEach((cid) => ids.add(cid));
        }
      });
    }

    if (ids.size === 0) return;

    const { data } = await supabase
      .from("club_classes")
      .select("id, name")
      .in("id", Array.from(ids));

    const map = {};
    data?.forEach((c) => {
      map[c.id] = c.name;
    });

    setClassMap(map);
    setTrackClassIds(trackClassIds);
  }

  loadClasses();
}, [event]);

// Load current entry counts per class so limits can show as "taken/max"
useEffect(() => {
  async function loadEntryCounts() {
    const limits = event?.class_entry_limits;
    if (!event?.id || !limits || Object.keys(limits).length === 0) {
      setClassEntryCounts({});
      return;
    }

    const { data: nominationRows } = await supabase
      .from("nominations")
      .select("id")
      .eq("event_id", event.id);

    const nominationIds = (nominationRows || []).map((row) => row.id);
    if (nominationIds.length === 0) {
      setClassEntryCounts({});
      return;
    }

    const { data: entryRows } = await supabase
      .from("nomination_entries")
      .select("class_id")
      .in("nomination_id", nominationIds)
      .eq("is_preference", false);

    const counts = {};
    (entryRows || []).forEach((row) => {
      counts[row.class_id] = (counts[row.class_id] || 0) + 1;
    });

    setClassEntryCounts(counts);
  }

  loadEntryCounts();
}, [event]);

useEffect(() => {
  async function loadHouseholdNomination() {
    if (!event?.id || !membership?.id) {
      setHasExistingNomination(false);
      return;
    }

    const { data } = await supabase
      .from("nominations")
      .select("id")
      .eq("event_id", event.id)
      .eq("group_id", membership.id)
      .limit(1);

    setHasExistingNomination((data?.length ?? 0) > 0);
  }

  loadHouseholdNomination();
}, [event?.id, membership?.id]);

if (loading) {
  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
      <PageHeader brand={brand} clubSlug={clubSlug} />
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
        }}
      >
        Loading event…
      </div>
    </div>
  );
}

if (!event) {
  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
      <PageHeader brand={brand} clubSlug={clubSlug} />
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
        }}
      >
        Event not found.
      </div>
    </div>
  );
}

const primaryDate = formatEventDate(event);

const nominationsAreOpen = isNominationsOpen(event);

const nominateButtonClassName =
  "!py-2.5 !px-6 !text-sm font-semibold !rounded-sm";

const nominateButtonVariant = hasExistingNomination ? "secondary" : "success";
const nominateButtonLabel = hasExistingNomination
  ? "Update Nominations"
  : "Nominate";

const entryPricing = resolveEventPricing(event);
const showEntryFees =
  entryPricing &&
  (has(event.pricing) ||
    has(event.member_price) ||
    has(event.non_member_price) ||
    has(event.junior_price));

return (
  
  <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
    <PageHeader brand={brand} clubSlug={clubSlug} />

<main
  style={{
    padding: "40px 16px",
    display: "flex",
    justifyContent: "center",
  }}
>
  <div
    className="event-details-content"
    style={{
      width: "100%",
      maxWidth: "800px",
      background: palette?.surface || "#ffffff",
      color: contentText,
      borderRadius: "8px",
      border: `2px solid ${brand}`,
      lineHeight: 1.5,
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}
  >

    {/* ⭐ ALL EXISTING CONTENT ABOVE THE GRADIENT */}
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* your entire card content stays exactly the same */}

{/* --------------------------------------------- */}
{/* EVENT NAME & LOGO HEADER BLOCK (with gradient) */}
{/* --------------------------------------------- */}
<div
  className="flex flex-col items-center mb-4"
  style={{
    background: `linear-gradient(180deg, ${brand} 0%, ${palette?.surfaceAlt || "#f9fafb"} 70%)`,
    padding: "24px 0",
    borderRadius: "8px",
  }}
>
      <div
    className="
      border rounded-[10px] overflow-hidden flex items-center justify-center
      w-[200px] h-[200px]    /* ⭐ mobile */
      sm:w-[260px] sm:h-[260px] /* ⭐ desktop unchanged */
      mb-3
      relative
    "
    style={{
      background: palette?.surface || "#ffffff",
      borderColor: palette?.surfaceBorder || "#e5e7eb",
    }}
  >
    {logoSrc ? (
      <img
        src={logoSrc}
        alt={event.name}
        className="w-full h-full object-contain"
      />
    ) : (
      <div className="w-full h-full bg-[#f0f0f0]" />
    )}
  </div>

  <div
    className="
      font-semibold text-center leading-tight
      text-[18px]      /* ⭐ mobile */
      sm:text-[30px]   /* ⭐ desktop unchanged */
    "
    style={{ color: contentText }}
  >
    {event.name}
  </div>
</div>

{/* EVENT DETAILS AREA */}
<div className="event-details flex justify-between items-start gap-3 md:gap-6 flex-wrap md:flex-nowrap mb-4 md:mb-6">

  {/* LEFT SIDE — Event Type + When + Nominations */}
  <div className="event-details-left w-full md:w-auto mt-0 mb-1 md:mt-0 md:mb-0">
    {/* Event Type */}
    <div className="text-[14px] leading-[1.5] mb-1">
      <strong>Event Type:</strong>{" "}
      {event.event_type
        ? event.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Unknown"}
    </div>

    {/* When */}
    {primaryDate && (
      <div className="text-[14px] leading-[1.5] mb-1">
        <strong>When:</strong> {primaryDate}
      </div>
    )}

    {/* Nominations */}
    {(event.nominations_open ||
      event.nominations_close ||
      event.late_entries_enabled) && (
      <div className="text-[14px] leading-[1.5] mb-1">
        <strong>Nominations:</strong>
        <div className="mt-1 space-y-0.5 font-normal">
          {event.nominations_open && (
            <div>Open – {formatNominationDateTime(event.nominations_open)}</div>
          )}
          {event.nominations_close && (
            <div>Close – {formatNominationDateTime(event.nominations_close)}</div>
          )}
          {event.late_entries_enabled && event.late_fee_activation && (
            <div>
              Late fee from – {formatNominationDateTime(event.late_fee_activation)}
            </div>
          )}
          {event.late_entries_enabled && event.late_entries_close && (
            <div>
              Late entries close –{" "}
              {formatNominationDateTime(event.late_entries_close)}
            </div>
          )}
          {event.late_entries_enabled && formatLateFeeAmount(event.pricing) && (
            <div>Late fee – {formatLateFeeAmount(event.pricing)}</div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* RIGHT SIDE — Buttons horizontal OR Notify */}
  <div className="event-details-right w-full md:w-auto flex flex-col items-start md:items-end gap-2">

    {nominationsAreOpen ? (
      <div className="event-details-right-buttons flex flex-row gap-2 w-full md:w-auto justify-start md:justify-end">
        <Link
          to={`/${clubSlug}/app/events/${id}/nominate`}
          className="no-underline"
        >
          <Button
            variant={nominateButtonVariant}
            className={nominateButtonClassName}
          >
            {nominateButtonLabel}
          </Button>
        </Link>
      </div>
    ) : (
      <div className="event-details-right-buttons event-details-right-closed flex flex-row gap-2 w-full md:w-auto justify-start md:justify-end">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" />
          Notify When Nominations Open
        </label>
      </div>
    )}

  </div>
</div>

{/* DESCRIPTION HEADING */}
<div className="text-[14px] font-semibold mb-2">
  Description:
</div>

<div
  className="
    text-[14px]
    leading-[1.5]
    mb-6
    rounded-md
    p-4
  "
  style={{
    background: palette?.surfaceAlt || "#f9fafb",
    border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
    color: contentText,
  }}
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(event.description || "", {
      ADD_ATTR: ["target", "rel"],
    }),
  }}
/>

{/* Schedule */}
<Section
  title="Schedule"
  icon={ClockIcon}
  brand={brand}
  style={{ marginTop: "-18px" }}   // MOVE SCHEDULE UP
>
  <div style={{ marginTop: "-6px" }}>   {/* REDUCE HEADER → CONTENT GAP */}

    {Array.isArray(event.days) && event.days.length > 0 ? (
      event.days.map((day, idx) => {
        const dateLabel = day.date
          ? new Date(day.date).toLocaleDateString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";

        const combinedLabel = day.label
          ? `${dateLabel} - ${day.label}`
          : dateLabel;

        const items = [];

        if (day.gates_open_at) {
          items.push(`Gates Open: ${formatTimeOnly(day.date, day.gates_open_at)}`);
        }
        if (day.practice_at) {
          items.push(`Practice Starts: ${formatTimeOnly(day.date, day.practice_at)}`);
        }
        if (day.drivers_brief_at) {
          items.push(`Drivers Brief: ${formatTimeOnly(day.date, day.drivers_brief_at)}`);
        }
        if (day.race_start_at) {
          items.push(`Racing Starts: ${formatTimeOnly(day.date, day.race_start_at)}`);
        }

        return (
          <div key={idx} style={{ marginBottom: "10px" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: "6px",
                color: contentText,
              }}
            >
              {combinedLabel}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: 14,
                color: contentText,
              }}
            >
              {items.map((text, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      backgroundColor: brand,
                      borderRadius: "50%",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  ></span>

                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })
    ) : (
      <div style={{ fontSize: 14 }}>—</div>
    )}

  </div>
</Section>


{/* Classes */}
<Section
  title="Classes"
  icon={FlagIcon}
  brand={brand}
  style={{ marginTop: "-18px" }}   // MATCH SCHEDULE POSITIONING
>
  <div style={{ marginTop: "-6px" }}>   {/* MATCH SCHEDULE HEADER GAP */}

    {event.is_multi_day && (getEventClassLimit(event) != null || getDayClassLimit(event) != null) && (
      <div style={{ fontSize: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4, color: contentText }}>
        {getEventClassLimit(event) != null && (
          <div>Max classes per driver (event): {getEventClassLimit(event)}</div>
        )}
        {getDayClassLimit(event) != null && (
          <div>Max classes per day: {getDayClassLimit(event)}</div>
        )}
      </div>
    )}

    {Array.isArray(event.classes_by_day) && event.classes_by_day.length > 0 ? (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        {event.classes_by_day.map((info, idx) => {
          const dayName = info.label?.trim() || "";
          const classes = getEffectiveDayClassIds(event, idx, trackClassIds);
          const openPractice = isOpenPracticeDay(event, idx);

          return (
            <div key={idx}>
              {/* DAY NAME */}
              {dayName && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: contentText,
                  }}
                >
                  {dayName}
                </div>
              )}

              {openPractice && (
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  Practice day — all track classes
                </div>
              )}

              {/* CLASS LIST (stacked) */}
              {classes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {classes.map((cid, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: 14,
                        color: contentText,
                      }}
                    >
                      {/* DOT */}
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          backgroundColor: brand,
                          borderRadius: "50%",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      ></span>

                      <span>{classMap[cid] || cid}</span>

                      {event.class_entry_limits?.[cid] != null && (
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          ({classEntryCounts[cid] || 0}/{event.class_entry_limits[cid]} entries)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 14 }}>—</div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div style={{ fontSize: 14 }}>—</div>
    )}

  </div>
</Section>

{/* Entry Fees */}

{showEntryFees && (
  <Section title="Entry Fees" icon={BanknotesIcon} brand={brand}>
    {entryPricing.mode === "per_entry" && (
      <EntryFeeList items={perEntryFeeDisplayRows(entryPricing)} />
    )}

    {entryPricing.mode === "tiered" && (
      <TwoColumnList
        items={[
          {
            label: "Member",
            value: `First $${entryPricing.tiered.member.first_class} · Additional $${entryPricing.tiered.member.additional_class}`,
          },
          {
            label: "Non‑Member",
            value: `First $${entryPricing.tiered.non_member.first_class} · Additional $${entryPricing.tiered.non_member.additional_class}`,
          },
          {
            label: "Junior",
            value: `First $${entryPricing.tiered.junior.first_class} · Additional $${entryPricing.tiered.junior.additional_class}`,
          },
          has(entryPricing.late_fee) && {
            label: "Late Fee",
            value: `$${entryPricing.late_fee}`,
          },
        ].filter(Boolean)}
      />
    )}

    {entryPricing.mode === "per_class" && (
      <TwoColumnList
        items={[
          ...Object.entries(entryPricing.class_prices || {}).map(
            ([classId, cp]) => ({
              label: classMap[classId] || `Class ${classId}`,
              value: cp.free
                ? "Free"
                : [
                    has(cp.member) && `Member $${cp.member}`,
                    has(cp.non_member) && `Non‑Member $${cp.non_member}`,
                    has(cp.junior) && `Junior $${cp.junior}`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
            })
          ),
          has(entryPricing.late_fee) && {
            label: "Late Fee",
            value: `$${entryPricing.late_fee}`,
          },
        ].filter(Boolean)}
      />
    )}
  </Section>
)}

{/* Merchandise */}
{has(event.merchandise) && (
  <Section
    title="Merchandise"
    icon={ShoppingBagIcon}
    brand={brand}
  >
    <div className="flex flex-col gap-4 w-full mx-auto">

      {event.merchandise.map((m, idx) => (
        <div
          key={idx}
          className="text-[14px] leading-[1.5] mb-6 rounded-md p-4 flex flex-col gap-4"
          style={{
            background: palette?.surfaceAlt || "#f9fafb",
            border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
            color: contentText,
          }}
        >
          {/* MAIN PHOTO */}
          <div
            className="w-full h-56 border rounded-md overflow-hidden"
            style={{
              background: palette?.surface || "#ffffff",
              borderColor: palette?.surfaceBorder || "#e5e7eb",
            }}
          >
            {m.photo_url ? (
              <img
                src={m.photo_url}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs"
                style={{ color: palette?.textMuted || "#6b7280" }}
              >
                No Image
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-col gap-3 text-sm leading-tight">

            <div className="font-semibold text-lg text-text-base">
              {m.name}
            </div>

            {m.description && (
              <div
                className="text-sm"
                style={{ color: palette?.textMuted || "#6b7280" }}
              >
                {m.description}
              </div>
            )}

            {m.included ? (
              <div className="text-green-700 font-medium">Included in Entry</div>
            ) : m.compulsory ? (
              <div className="text-red-700 font-medium">Compulsory Item</div>
            ) : (
              <div className="text-base">
                <strong>Price:</strong>{" "}
                {m.price ? `$${Number(m.price).toFixed(2)}` : "$0.00"}
              </div>
            )}

            {m.max_qty && (
              <div className="text-base">
                <strong>Max Qty:</strong> {m.max_qty}
              </div>
            )}

            <RequirementsDisplay requirements={m.requirements} palette={palette} />

            {Array.isArray(m.options) && m.options.length > 0 && (
              <div className="mt-2 space-y-4">
                {m.options.map((group, gi) => (
                  <div
                    key={gi}
                    className="border rounded-md p-3"
                    style={{
                      background: palette?.surface || "#ffffff",
                      borderColor: palette?.surfaceBorder || "#e5e7eb",
                    }}
                  >
                    
                    <div className="font-semibold text-base mb-2">
                      {group.name || "Option Group"}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {group.values.map((v, vi) => (
                        <div
                          key={vi}
                          className="flex flex-col items-center gap-2 border rounded-md p-2"
                          style={{
                            background: palette?.surfaceAlt || "#f9fafb",
                            borderColor: palette?.surfaceBorder || "#e5e7eb",
                          }}
                        >
                          {v.photo_url && (
                            <img
                              src={v.photo_url}
                              alt={v.label}
                              className="w-50 h-50 rounded object-cover border border-gray-200 block"
                            />
                          )}

                          <div className="text-sm font-medium text-center">
                            {v.label}
                            {typeof v.price === "number" && v.price > 0
                              ? ` (+$${v.price})`
                              : ""}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      ))}

    </div>
  </Section>
)}

{/* Class Add‑Ons */}
{has(event.class_add_ons) && (
  <Section title="Add‑Ons" icon={PlusCircleIcon} brand={brand}>
    <div className="flex flex-col gap-4 w-full mx-auto">

      {event.class_add_ons.map((a, idx) => (
        <div
          key={idx}
          className="text-[14px] leading-[1.5] mb-6 rounded-md p-4 flex flex-col gap-4"
          style={{
            background: palette?.surfaceAlt || "#f9fafb",
            border: `1px solid ${palette?.surfaceBorder || "#e5e7eb"}`,
            color: contentText,
          }}
        >
          {/* PHOTO */}
          <div
            className="w-full h-56 border rounded-md overflow-hidden"
            style={{
              background: palette?.surface || "#ffffff",
              borderColor: palette?.surfaceBorder || "#e5e7eb",
            }}
          >
            {a.photo_url ? (
              <img
                src={a.photo_url}
                alt={a.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs"
                style={{ color: palette?.textMuted || "#6b7280" }}
              >
                No Image
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-col gap-3 text-sm leading-tight">

            {/* NAME */}
            <div className="font-semibold text-lg text-text-base">
              {a.name}
            </div>

            {/* DESCRIPTION */}
            {a.description && (
              <div
                className="text-sm"
                style={{ color: palette?.textMuted || "#6b7280" }}
              >
                {a.description}
              </div>
            )}

            {/* GLOBAL PRICE / REQUIRED */}
            {a.required ? (
              <div className="text-red-700 font-medium">
                Compulsory Add‑On
              </div>
            ) : (
              <div className="text-base">
                <strong>Price:</strong>{" "}
                {a.price ? `$${Number(a.price).toFixed(2)}` : "$0.00"}
              </div>
            )}

            {/* GLOBAL MAX QTY */}
            {a.max_qty && (
              <div className="text-base">
                <strong>Max Qty:</strong> {a.max_qty}
              </div>
            )}

            <RequirementsDisplay requirements={a.requirements} palette={palette} />

            {/* ⭐ APPLIES TO CLASSES — USING classMap ⭐ */}
            {Array.isArray(a.classes) && a.classes.length > 0 && (
              <div className="text-sm mt-2">
                <strong>Applies to:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {a.classes.map((cid) => (
                    <li key={cid}>
                      {classMap[cid] || cid}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* OPTION GROUPS */}
            {Array.isArray(a.options) && a.options.length > 0 && (
              <div className="mt-2 space-y-4">
                {a.options.map((group, gi) => (
                  <div
                    key={gi}
                    className="border rounded-md p-3"
                    style={{
                      background: palette?.surface || "#ffffff",
                      borderColor: palette?.surfaceBorder || "#e5e7eb",
                    }}
                  >
                    
                    <div className="font-semibold text-base mb-2">
                      {group.name || "Option Group"}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                      {group.values.map((v, vi) => (
                        <div
                          key={vi}
                          className="flex flex-col items-center gap-2 border rounded-md p-2"
                          style={{
                            background: palette?.surfaceAlt || "#f9fafb",
                            borderColor: palette?.surfaceBorder || "#e5e7eb",
                          }}
                        >
                          {v.photo_url && (
                            <img
                              src={v.photo_url}
                              alt={v.label}
                              className="w-full h-24 object-contain rounded border border-gray-200"
                            />
                          )}

                          <div className="text-sm font-medium text-center">
                            {v.label}
                            {typeof v.price === "number" && v.price > 0
                              ? ` (+$${v.price})`
                              : ""}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      ))}

    </div>
  </Section>
)}

{nominationsAreOpen && (
  <div className="flex justify-center mt-8">
    <Link
      to={`/${clubSlug}/app/events/${id}/nominate`}
      className="no-underline"
    >
      <Button
        variant={nominateButtonVariant}
        className={nominateButtonClassName}
      >
        {nominateButtonLabel}
      </Button>
    </Link>
  </div>
)}
        </div>
        </div>
      </main>
    </div>
  );
}
