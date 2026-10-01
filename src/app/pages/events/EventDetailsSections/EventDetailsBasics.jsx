// src/app/pages/events/EventDetailsSections/EventDetailsBasics.jsx
import { richTextToPlainText } from "@/app/lib/richText";
import { useTranslation } from "@/app/i18n/I18nContext";

/* ===========================
   DATE HELPERS
   =========================== */

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateRange(event) {
  if (!event.is_multi_day) {
    return formatDate(event.event_date);
  }

  if (!Array.isArray(event.days) || event.days.length === 0) {
    return "";
  }

  const first = event.days[0];
  const last = event.days[event.days.length - 1];

  const firstDate = formatDate(first.date);
  const lastDate = formatDate(last.date);

  if (first.date === last.date) return firstDate;

  return `${firstDate} → ${lastDate}`;
}

/* ===========================
   TYPE COLORS
   =========================== */

const typeColors = {
  racing: "#00438A",
  practice: "#008A2E",
  club_meet: "#8A0043",
  championship_round: "#7B3F00",
  state_titles: "#9C27B0",
  national_titles: "#B71C1C",
};

const typeLabelKeys = {
  racing: "events.typeRacing",
  practice: "events.typePractice",
  club_meet: "events.typeClubMeet",
  championship_round: "events.typeChampionshipRound",
  state_titles: "events.typeStateTitles",
  national_titles: "events.typeNationalTitles",
};

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsBasics({ event, brand }) {
  const { t } = useTranslation();
  const logo = event.logourl || null;
  const type = (event.event_type || "").toLowerCase();
  const typeColor = typeColors[type] || brand;
  const typeLabel = typeLabelKeys[type]
    ? t(typeLabelKeys[type])
    : event.event_type || t("eventCard.event");

  const track = event.track || "Unknown";
  const dateDisplay = getDateRange(event);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">

      {/* LOGO */}
      <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
        {logo && (
          <img
            src={logo}
            alt={t("events.detailsTitle")}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* METADATA */}
      <div className="flex-1 space-y-3">

        {/* NAME */}
        <div className="text-xl font-bold leading-snug">
          {richTextToPlainText(event.name)}
        </div>

        {/* TYPE BADGE */}
        <div
          style={{
            background: typeColor,
            color: "white",
            padding: "4px 10px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "capitalize",
            display: "inline-block",
          }}
        >
          {typeLabel}
        </div>

        {/* DETAILS */}
        <div className="text-sm text-text-muted leading-tight space-y-1">
          <div>
            <strong>{t("events.eventDates")}:</strong> {dateDisplay}
          </div>
          <div>
            <strong>{t("events.trackLabel")}:</strong> {track}
          </div>
        </div>

        {/* DESCRIPTION PREVIEW */}
        {event.description && (
          <div className="text-sm text-text-muted leading-relaxed mt-2">
            {event.description.length > 180
              ? event.description.slice(0, 180) + "…"
              : event.description}
          </div>
        )}
      </div>
    </div>
  );
}
