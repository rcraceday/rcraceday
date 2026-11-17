import { Link } from "react-router-dom";
import useTheme from "@/app/providers/useTheme";
import Button from "@/components/ui/Button";
import { formatDate, isEventCancelled, isEventCompleted, isNominationsOpen } from "./events-sections/helpers";
import { sanitizeRichTextHtml } from "@/app/lib/richText";
import { useTranslation } from "@/app/i18n/I18nContext";
import CalendarEventTypeChip from "./calendar/CalendarEventTypeChip";

export default function EventCard({
  event,
  clubSlug,
  trackNames,
  showResults,
  hasNomination = false,
  hasHouseholdInResults = false,
  nominationSummary = null,
  hasReceivedNominations = false,
  isPast = false,
}) {
  const { t, locale } = useTranslation();
  const { palette } = useTheme();
  const primaryColor = palette?.primary || "#2563eb";

  const track =
    trackNames?.[event.track] ||
    event.track_type ||
    event.track ||
    t("eventCard.trackNotSet");
  const logoSrc =
    event.logo_preview_url ||
    (event.logourl?.startsWith("http")
      ? event.logourl
      : event.logourl
        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/club-assets/${event.logourl}`
        : null);
  const scheduledDays = [
    ...(Array.isArray(event.classes_by_day) ? event.classes_by_day : []),
    ...(Array.isArray(event.days) ? event.days : []),
  ];
  const scheduledDates = scheduledDays
    .map((day) => day?.date)
    .filter((date) => date && !Number.isNaN(new Date(date).getTime()))
    .sort();
  const eventDate = event.event_date || scheduledDates[0] || null;
  const eventEndDate = scheduledDates.at(-1) || eventDate;
  const formatRangeDate = (date) => {
    const localDate = new Date(`${date.slice(0, 10)}T12:00:00`);
    const day = localDate.getDate();
    const suffix = [11, 12, 13].includes(day % 100)
      ? "th"
      : ["th", "st", "nd", "rd"][day % 10] || "th";
    const weekday = localDate.toLocaleDateString(locale, { weekday: "short" });
    const month = localDate.toLocaleDateString(locale, { month: "short" });
    return `${weekday} ${month} ${day}${suffix}`;
  };
  const eventDateLabel =
    event.is_multi_day && eventDate
      ? eventDate === eventEndDate
        ? formatRangeDate(eventDate)
        : `${formatRangeDate(eventDate)} – ${formatRangeDate(eventEndDate)}`
      : eventDate
        ? formatDate(eventDate)
        : t("eventCard.dateTbd");
  const cancelled = isEventCancelled(event);
  const nominationsOpen = !cancelled && isNominationsOpen(event);
  const isCompleted = !cancelled && (isEventCompleted(event) || Boolean(isPast));
  const showNominatedBadge = hasNomination || hasHouseholdInResults;
  const nominationStatusLabel = hasNomination
    ? nominationSummary || t("eventCard.nominated")
    : cancelled
    ? null
    : event.nominations_open
    ? t("eventCard.nominationsOpenOn", {
        date: formatDate(event.nominations_open),
      })
    : null;

  return (
    <article className="event-list-card text-text-base">
      <div
        className="event-list-card-header px-3 py-2 flex items-start justify-between gap-3 border-b border-border/60"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}12 0%, transparent 70%)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <CalendarEventTypeChip eventType={event.event_type} />
          <span className="text-[11px] font-semibold tabular-nums text-text-muted">
            {eventDateLabel}
          </span>
          {showResults ? (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border text-white"
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              }}
            >
              {t("eventCard.results")}
            </span>
          ) : null}
        </div>
        {cancelled || isCompleted || showNominatedBadge ? (
          <div className="flex flex-col items-end gap-1 shrink-0 md:flex-row md:items-center md:gap-2">
            {cancelled ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-500 text-white">
                {t("eventCard.cancelledBadge")}
              </span>
            ) : null}
            {isCompleted ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-red-600 text-white">
                {t("eventCard.completedBadge")}
              </span>
            ) : null}
            {showNominatedBadge ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                {t("eventCard.nominatedBadge")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Link
        to={`/${clubSlug}/app/events/${event.id}`}
        className="flex min-w-0 gap-3 p-3 no-underline items-start md:items-center"
      >
        <div className="shrink-0 w-[4.5rem] h-[4.5rem] rounded-xl border border-border/80 bg-white flex items-center justify-center overflow-hidden p-1">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-text-muted text-center px-1">
              {t("eventCard.event")}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="m-0 text-base font-bold leading-snug text-text-base">
            <div
              className="tiptap !min-h-0 [&_p]:my-0 [&_p+p]:mt-0.5 [&_strong]:font-bold"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichTextHtml(event.name),
              }}
            />
          </h3>
          <p className="m-0 mt-1 text-sm text-text-muted font-medium">{track}</p>
          {nominationStatusLabel && !hasNomination ? (
            <p className="m-0 mt-1.5 text-xs font-medium text-emerald-700 leading-snug">
              {nominationStatusLabel}
            </p>
          ) : null}
          {hasNomination && nominationSummary ? (
            <p
              className="m-0 mt-1.5 text-xs font-semibold leading-snug rounded-lg px-2 py-1"
              style={{
                backgroundColor: `${primaryColor}0f`,
                color: primaryColor,
              }}
            >
              {nominationSummary}
            </p>
          ) : null}
        </div>
      </Link>

      <div className="event-list-card-actions flex flex-wrap gap-2 justify-center md:justify-end px-3 py-2.5 border-t border-border/60 bg-surface-alt/25">
        <Link to={`/${clubSlug}/app/events/${event.id}`} className="inline-block no-underline">
          <Button className="!py-1.5 !text-xs !text-[12px] whitespace-nowrap min-w-[7.5rem] px-3">
            {t("eventCard.viewEvent")}
          </Button>
        </Link>
        {nominationsOpen && (
          <Link
            to={`/${clubSlug}/app/events/${event.id}/nominate`}
            className="inline-block no-underline"
          >
            <Button
              variant={hasNomination ? "secondary" : "success"}
              className="!py-1.5 !text-xs !text-[12px] whitespace-nowrap min-w-[7.5rem] px-3"
            >
              {hasNomination ? t("eventCard.updateNominations") : t("eventCard.nominate")}
            </Button>
          </Link>
        )}
        {hasReceivedNominations && (
          <Link
            to={`/${clubSlug}/app/events/${event.id}/nominations`}
            className="inline-block no-underline"
          >
            <Button
              variant="secondary"
              className="!py-1.5 !text-xs !text-[12px] whitespace-nowrap min-w-[7.5rem] px-3"
            >
              {t("eventCard.viewNominations")}
            </Button>
          </Link>
        )}
        {showResults && (
          <Link
            to={`/${clubSlug}/app/events/${event.id}/results`}
            className="inline-block no-underline"
          >
            <Button className="!py-1.5 !text-xs !text-[12px] whitespace-nowrap min-w-[7.5rem] px-3">
              {t("eventCard.viewResults")}
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}