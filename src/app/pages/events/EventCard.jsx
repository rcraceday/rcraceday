import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDate, isNominationsOpen } from "./events-sections/helpers";
import { sanitizeRichTextHtml } from "@/app/lib/richText";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function EventCard({
  event,
  clubSlug,
  trackNames,
  showResults,
  hasNomination = false,
  hasReceivedNominations = false,
}) {
  const { t, locale } = useTranslation();
  const track =
    trackNames?.[event.track] ||
    event.track_type ||
    event.track ||
    t("eventCard.trackNotSet");
  const logoSrc = event.logo_preview_url ||
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
  const eventDateLabel = event.is_multi_day && eventDate
    ? eventDate === eventEndDate
      ? formatRangeDate(eventDate)
      : `${formatRangeDate(eventDate)} - ${formatRangeDate(eventEndDate)}`
    : eventDate
      ? formatDate(eventDate)
      : t("eventCard.dateTbd");
  const nominationsOpen = isNominationsOpen(event);
  const nominationStatusLabel = hasNomination
    ? t("eventCard.nominated")
    : event.nominations_open
      ? t("eventCard.nominationsOpenOn", {
          date: formatDate(event.nominations_open),
        })
      : null;
  const nominationStatusHighlight = hasNomination || nominationsOpen;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-stretch">
        <Link
          to={`/${clubSlug}/app/events/${event.id}`}
          className="block min-w-0 flex-1 no-underline"
        >
          <div className="flex flex-col items-center text-center md:min-h-[76px] md:flex-row md:items-stretch md:text-left">
            <div className="my-[3px] mx-[3px] w-24 shrink-0 overflow-hidden rounded-[14px] bg-white p-[6px_14px] flex items-center justify-center md:ml-[3px] md:mr-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="max-h-full max-w-full rounded-[10px] object-contain"
                />
              ) : (
                <span className="text-xs text-text-muted">{t("eventCard.event")}</span>
              )}
            </div>

            <div className="min-w-0 w-full flex-1 px-4 py-2 md:pl-5 md:pr-4">
              <h3 className="min-w-0 break-words font-semibold leading-tight text-text-base">
                <div
                  className="tiptap !min-h-0 [&_p]:my-0 [&_p+p]:mt-0.5 [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichTextHtml(event.name),
                  }}
                />
              </h3>
              <p className="flex min-w-0 flex-col items-center gap-y-0.5 text-sm font-semibold leading-tight text-text-muted md:items-start sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5 sm:gap-y-1 md:flex-col md:gap-x-0">
                <span className="min-w-0 max-w-full truncate sm:w-auto">{track}</span>
                <span className="min-w-0 max-w-full break-words sm:w-auto">{eventDateLabel}</span>
                {nominationStatusLabel && (
                  <span
                    className={`min-w-0 max-w-full break-words font-bold sm:w-auto ${
                      nominationStatusHighlight ? "text-green-600" : ""
                    }`}
                  >
                    {nominationStatusLabel}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Link>

        <div className="box-border grid w-full grid-cols-1 justify-items-center gap-2 px-0 py-3 md:flex md:w-auto md:flex-col md:items-stretch md:justify-start md:p-3 md:pl-0">
          <Link
            to={`/${clubSlug}/app/events/${event.id}`}
            className="block w-[120px] justify-self-center no-underline"
          >
            <Button className="!py-1.5 !text-xs w-full">{t("eventCard.viewEvent")}</Button>
          </Link>
          {nominationsOpen && (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/nominate`}
              className="block w-[120px] justify-self-center no-underline"
            >
              <Button
                variant={hasNomination ? "secondary" : "success"}
                className="!py-1.5 !text-xs w-full"
              >
                {hasNomination ? t("eventCard.updateNominations") : t("eventCard.nominate")}
              </Button>
            </Link>
          )}
          {hasReceivedNominations && (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/nominations`}
              className="block w-[120px] justify-self-center no-underline"
            >
              <Button variant="secondary" className="!py-1.5 !text-xs w-full">
                {t("eventCard.viewNominations")}
              </Button>
            </Link>
          )}
          {showResults && (
            <Link
              to={`/${clubSlug}/app/events/${event.id}/results`}
              className="block w-[120px] justify-self-center no-underline"
            >
              <Button className="!py-1.5 !text-xs w-full">{t("eventCard.viewResults")}</Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
