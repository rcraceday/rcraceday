import React, { useEffect, useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
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
import { supabase } from "@/supabaseClient";
import DOMPurify from "dompurify";

// ---------------------------------------------
// PAGE HEADER
// ---------------------------------------------
function PageHeader({ brand, clubSlug }) {
  const navigate = useNavigate();

  return (
    <section
      style={{
        width: "100%",
        borderBottom: "1px solid #ddd",
        background: "white",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">
            Event Details
          </h1>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
          onClick={() => navigate(`/${clubSlug}/app/events`)}
        >
          <ArrowLeftIcon className="h-3 w-3" />
          Back
        </Button>
      </div>
    </section>
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

function formatDateTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function formatDayTime(dayDate, timeStr) {
  if (!dayDate || !timeStr || timeStr.trim() === "") return null;
  const iso = `${dayDate}T${timeStr}:00`;
  return formatDateTime(iso) || `${dayDate} ${timeStr}`;
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

// ---------------------------------------------
// SECTION
// ---------------------------------------------
function Section({ title, Icon, brand, children }) {
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
        <Icon className="h-5 w-5" style={{ color: brand }} />
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------
export default function EventDetails() {
  const { id } = useParams();
  const outlet = useOutletContext() || {};
  const club = outlet.club;

  const clubSlug = club?.slug;
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [classMap, setClassMap] = useState({});

  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoSrc, setLogoSrc] = useState(null);

  // Load event
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from("events")
        .select("*")
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

    if (event.classes_by_day) {
      event.classes_by_day.forEach((info) => {
        (info.classes || []).forEach((cid) => ids.add(cid));
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
  }

  loadClasses();
}, [event]);


// ---------------------------------------------
// FIXED LOGO LOADER (club-assets bucket)
// ---------------------------------------------
useEffect(() => {
  if (!event) return;

  let src = null;

  if (event.logourl) {
    if (event.logourl.startsWith("http")) {
      src = event.logourl;
    } else {
      src = `https://mvcttnmclrvaatdgzhpb.supabase.co/storage/v1/object/public/club-assets/${event.logourl}`;
    }
  }

  setLogoSrc(src);
  setLogoLoaded(false);

  if (!src) return;

  const img = new Image();
  img.src = src;
  img.onload = () => setLogoLoaded(true);
  img.onerror = () => setLogoLoaded(false);
}, [event]);

if (loading) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
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
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
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

const isSingleDay = !event.is_multi_day;
const primaryDate = isSingleDay
  ? formatDate(event.event_date)
  : event.days?.[0]?.date
  ? formatDate(event.days[0].date)
  : null;

const now = new Date();
const nominationsOpen = event.nominations_open
  ? new Date(event.nominations_open)
  : null;
const nominationsClose = event.nominations_close
  ? new Date(event.nominations_close)
  : null;

const nominationsAreOpen =
  nominationsOpen &&
  now >= nominationsOpen &&
  (!nominationsClose || now <= nominationsClose);

return (
  
  <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
    <PageHeader brand={brand} clubSlug={clubSlug} />

<main
  style={{
    padding: "40px 16px",
    display: "flex",
    justifyContent: "center",
  }}
>
  <div
    style={{
      width: "100%",
      maxWidth: "800px",
      background: "white",
      borderRadius: "8px",
      border: `2px solid ${brand}`,
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}
  >

    {/* ⭐ REAL GRADIENT LAYER — inset 8px, tall, bottom only */}
    <div
      style={{
        position: "absolute",
        left: "8px",
        right: "8px",
        bottom: "8px",
        height: "180px",               // how far up the card it goes
        background: "linear-gradient(0deg, #003366 0%, #ffffff 85%)",
        borderRadius: "8px",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />

    {/* ⭐ ALL EXISTING CONTENT ABOVE THE GRADIENT */}
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* your entire card content stays exactly the same */}

{/* --------------------------------------------- */}
{/* EVENT NAME & LOGO HEADER BLOCK (with gradient) */}
{/* --------------------------------------------- */}
<div
  className="flex flex-col items-center mb-4"
  style={{
    background: "linear-gradient(180deg, #003366 0%, #ffffff 70%)",
    padding: "24px 0",
    borderRadius: "8px",
  }}
>
  <div
    className="
      bg-white border border-gray-200 rounded-[10px] overflow-hidden flex items-center justify-center
      w-[200px] h-[200px]    /* ⭐ mobile */
      sm:w-[260px] sm:h-[260px] /* ⭐ desktop unchanged */
      mb-3
    "
  >
    {!logoLoaded && (
      <div className="w-full h-full bg-[#f0f0f0]" />
    )}

    {logoLoaded && (
      <img
        src={logoSrc}
        alt={event.name}
        className="w-full h-full object-contain"
      />
    )}
  </div>

  <div
    className="
      font-semibold text-center leading-tight
      text-[18px]      /* ⭐ mobile */
      sm:text-[30px]   /* ⭐ desktop unchanged */
    "
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

    {/* Nominations (single line, full width) */}
    {(event.nominations_open || event.nominations_close) && (
      <div className="text-[14px] leading-[1.5] mb-1">
        <strong>Nominations:</strong>{" "}
        {event.nominations_open &&
          `Open – ${new Date(event.nominations_open).toLocaleDateString("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })} ${new Date(event.nominations_open).toLocaleTimeString("en-AU", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`
        }

        {(event.nominations_open && event.nominations_close) && "   |   "}

        {event.nominations_close &&
          `Close – ${new Date(event.nominations_close).toLocaleDateString("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })} ${new Date(event.nominations_close).toLocaleTimeString("en-AU", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`
        }
      </div>
    )}
  </div>

  {/* RIGHT SIDE — Buttons horizontal OR Notify */}
  <div className="event-details-right w-full md:w-auto flex flex-col items-start md:items-end gap-2">

    {nominationsAreOpen ? (
      /* NOMINATIONS OPEN → Nominate + Add to Calendar */
      <div className="event-details-right-buttons flex flex-row gap-2 w-full md:w-auto justify-start md:justify-end">
        <Button variant="success" size="sm" className="px-2 py-1 text-[12px]">
          Nominate
        </Button>
        <Button variant="primary" size="sm" className="px-2 py-1 text-[12px]">
          Add to Calendar
        </Button>
      </div>
    ) : (
      /* NOMINATIONS CLOSED → Notify replaces Nominate */
      <div className="event-details-right-buttons event-details-right-closed flex flex-row gap-2 w-full md:w-auto justify-start md:justify-end">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" />
          Notify When Nominations Open
        </label>

        <Button variant="primary" size="sm" className="px-2 py-1 text-[12px]">
          Add to Calendar
        </Button>
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
    border border-gray-300
    rounded-md
    p-4
    bg-gray-50
  "
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(event.description || "")
  }}
/>

{/* Schedule */}
<Section
  title="Schedule"
  Icon={ClockIcon}
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
                color: "#000",
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
                color: "#000",
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
  Icon={FlagIcon}
  brand={brand}
  style={{ marginTop: "-18px" }}   // MATCH SCHEDULE POSITIONING
>
  <div style={{ marginTop: "-6px" }}>   {/* MATCH SCHEDULE HEADER GAP */}

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
          const classes = Array.isArray(info.classes) ? info.classes : [];

          return (
            <div key={idx}>
              {/* DAY NAME */}
              {dayName && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: "#000",
                  }}
                >
                  {dayName}
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
                        color: "#000",
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

{/* Pricing */}

{has(event.pricing) && (
  <Section title="Pricing" Icon={BanknotesIcon} brand={brand}>
    {event.pricing.mode === "per_entry" && (
      <TwoColumnList
        items={[
          event.pricing.global && {
            label: "Global",
            value: [
              event.pricing.global.free && "Free",
              has(event.pricing.global.member) &&
                `Member $${event.pricing.global.member}`,
              has(event.pricing.global.non_member) &&
                `Non‑Member $${event.pricing.global.non_member}`,
              has(event.pricing.global.junior) &&
                `Junior $${event.pricing.global.junior}`,
            ]
              .filter(Boolean)
              .join(" · "),
          },
          has(event.pricing.late_fee) && {
            label: "Late Fee",
            value: `$${event.pricing.late_fee}`,
          },
        ].filter(Boolean)}
      />
    )}

    {event.pricing.mode === "tiered" && (
      <TwoColumnList
        items={[
          {
            label: "Member",
            value: `First $${event.pricing.tiered.member.first_class} · Additional $${event.pricing.tiered.member.additional_class}`,
          },
          {
            label: "Non‑Member",
            value: `First $${event.pricing.tiered.non_member.first_class} · Additional $${event.pricing.tiered.non_member.additional_class}`,
          },
          {
            label: "Junior",
            value: `First $${event.pricing.tiered.junior.first_class} · Additional $${event.pricing.tiered.junior.additional_class}`,
          },
          has(event.pricing.late_fee) && {
            label: "Late Fee",
            value: `$${event.pricing.late_fee}`,
          },
        ].filter(Boolean)}
      />
    )}

    {event.pricing.mode === "per_class" && (
      <TwoColumnList
        items={[
          ...Object.entries(event.pricing.class_prices || {}).map(
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
          has(event.pricing.late_fee) && {
            label: "Late Fee",
            value: `$${event.pricing.late_fee}`,
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
    Icon={ShoppingBagIcon}
    brand={brand}
  >
    <div className="flex flex-col gap-4 w-full mx-auto">

      {event.merchandise.map((m, idx) => (
        <div
          key={idx}
          className="
            text-[14px]
            leading-[1.5]
            mb-6
            border border-gray-300
            rounded-md
            p-4
            bg-gray-200
            flex flex-col gap-4
          "
        >
          {/* MAIN PHOTO */}
          <div className="w-full h-56 bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
            {m.photo_url ? (
              <img
                src={m.photo_url}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
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
              <div className="text-sm text-gray-700">
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

            {Array.isArray(m.options) && m.options.length > 0 && (
              <div className="mt-2 space-y-4">
                {m.options.map((group, gi) => (
                  <div key={gi} className="border border-gray-200 rounded-md p-3 bg-white">
                    
                    <div className="font-semibold text-base mb-2">
                      {group.name || "Option Group"}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {group.values.map((v, vi) => (
                        <div
                          key={vi}
                          className="
                            flex flex-col items-center gap-2
                            border border-gray-200 rounded-md p-2 bg-gray-50
                          "
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
  <Section title="Add‑Ons" Icon={PlusCircleIcon} brand={brand}>
    <div className="flex flex-col gap-4 w-full mx-auto">

      {event.class_add_ons.map((a, idx) => (
        <div
          key={idx}
          className="
            text-[14px]
            leading-[1.5]
            mb-6
            border border-gray-300
            rounded-md
            p-4
            bg-gray-200
            flex flex-col gap-4
          "
        >
          {/* PHOTO */}
          <div className="w-full h-56 bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
            {a.photo_url ? (
              <img
                src={a.photo_url}
                alt={a.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
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
              <div className="text-sm text-gray-700">
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
                  <div key={gi} className="border border-gray-200 rounded-md p-3 bg-white">
                    
                    <div className="font-semibold text-base mb-2">
                      {group.name || "Option Group"}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                      {group.values.map((v, vi) => (
                        <div
                          key={vi}
                          className="
                            flex flex-col items-center gap-2
                            border border-gray-200 rounded-md p-2 bg-gray-50
                          "
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
        </div>
        </div>
      </main>
    </div>
  );
}
