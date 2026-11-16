import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import { CalendarIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import FilterDropdown from "@/components/ui/FilterDropdown";
import PageFilterBar from "@/components/ui/PageFilterBar";
import { filterSummaryFromParts, readPageFilterPrefs } from "@/app/lib/pageFilterPrefs";
import { usePageFilterPrefs } from "@/app/lib/usePageFilterPrefs";
import { useTranslation } from "@/app/i18n/I18nContext";
import { extractYearsFromEvents } from "../events-sections/helpers";
import { eventTouchesYear } from "./calendarHelpers";
import YearOverview from "./YearOverview";

export default function Calendar() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme() || {};
  const { t } = useTranslation();

  const brand = palette?.primary ?? "#0A66C2";
  const today = new Date();

  const savedCalendarFilters = useMemo(
    () => readPageFilterPrefs(clubSlug, "calendar"),
    [clubSlug]
  );

  const [allEvents, setAllEvents] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [trackFilter, setTrackFilter] = useState(() => savedCalendarFilters?.trackFilter ?? "all");
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => savedCalendarFilters?.year ?? today.getFullYear());

  const calendarFilterPrefs = useMemo(
    () => ({ year, trackFilter }),
    [year, trackFilter]
  );
  usePageFilterPrefs(clubSlug, "calendar", calendarFilterPrefs);

  useEffect(() => {
    async function loadData() {
      if (!club?.id) return;
      setLoading(true);

      const [{ data: eventRows = [] }, { data: trackRows = [] }] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("club_id", club.id)
          .eq("is_published", true)
          .order("event_date", { ascending: true }),
        supabase
          .from("club_tracks")
          .select("id, name")
          .eq("club_id", club.id)
          .order("name", { ascending: true }),
      ]);

      setAllEvents(eventRows);
      setTracks(trackRows || []);
      setLoading(false);
    }

    loadData();
  }, [club?.id]);

  const yearOptions = useMemo(() => {
    const fromEvents = extractYearsFromEvents(allEvents);
    const set = new Set([
      today.getFullYear() - 1,
      today.getFullYear(),
      today.getFullYear() + 1,
    ]);
    fromEvents.forEach((y) => set.add(y));
    return [...set].sort((a, b) => b - a);
  }, [allEvents, today]);

  const activeYear = yearOptions.includes(year) ? year : yearOptions[0] || today.getFullYear();

  const eventsForYear = useMemo(() => {
    return allEvents
      .filter((event) => eventTouchesYear(event, activeYear))
      .filter((event) => trackFilter === "all" || event.track === trackFilter);
  }, [allEvents, activeYear, trackFilter]);

  const trackOptions = useMemo(
    () => [
      { value: "all", label: t("calendarUi.allTracks") },
      ...tracks.map((track) => ({ value: track.id, label: track.name })),
    ],
    [tracks, t]
  );

  const filterSummaryText = useMemo(() => {
    const yearLabel = String(activeYear);
    const trackLabel =
      tracks.length > 1
        ? trackOptions.find((o) => o.value === trackFilter)?.label
        : null;
    return filterSummaryFromParts([yearLabel, trackLabel]);
  }, [activeYear, trackFilter, trackOptions, tracks.length]);

  const calendarDropdownProps = { compact: true };
  const renderCalendarFilters = ({ fullWidth }) => (
    <>
      <FilterDropdown
        {...calendarDropdownProps}
        fullWidth={fullWidth}
        className={fullWidth ? "min-w-0 w-full" : "shrink-0"}
        value={activeYear}
        onChange={(value) => setYear(Number(value))}
        ariaLabel={t("calendarUi.filterYear")}
        options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
      />
      {tracks.length > 1 && (
        <FilterDropdown
          {...calendarDropdownProps}
          fullWidth={fullWidth}
          className={fullWidth ? "min-w-0 w-full" : "shrink-0"}
          value={trackFilter}
          onChange={setTrackFilter}
          ariaLabel={t("calendarUi.filterTrack")}
          options={trackOptions}
        />
      )}
    </>
  );

  return (
    <>
      <PageTitle icon={CalendarIcon} title={t("calendar.title")} style={{ color: brand }} />

      <main className="app-page-main !py-4 sm:!py-6 px-1 sm:px-0">
        <PageFilterBar
          brand={brand}
          filterLabel={t("events.filtersLabel")}
          summaryText={filterSummaryText}
          mobileFilters={renderCalendarFilters({ fullWidth: true })}
          desktopFilters={renderCalendarFilters({ fullWidth: false })}
        />

        {loading && (
          <p className="text-center text-sm text-text-muted m-0">{t("calendarUi.loading")}</p>
        )}

        {!loading && (
          <YearOverview year={activeYear} events={eventsForYear} clubSlug={clubSlug} />
        )}
      </main>
    </>
  );
}
