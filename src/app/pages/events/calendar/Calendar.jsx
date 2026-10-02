import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import { CalendarIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import FilterDropdown from "@/components/ui/FilterDropdown";
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

  const [allEvents, setAllEvents] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [trackFilter, setTrackFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(today.getFullYear());

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

  return (
    <>
      <PageTitle icon={CalendarIcon} title={t("calendar.title")} style={{ color: brand }} />

      <main className="app-page-main !py-4 sm:!py-6 px-1 sm:px-0">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4 sm:mb-6">
          <FilterDropdown
            value={activeYear}
            onChange={(value) => setYear(Number(value))}
            ariaLabel={t("calendarUi.filterYear")}
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
          />
          {tracks.length > 1 && (
            <FilterDropdown
              value={trackFilter}
              onChange={setTrackFilter}
              ariaLabel={t("calendarUi.filterTrack")}
              options={[
                { value: "all", label: t("calendarUi.allTracks") },
                ...tracks.map((track) => ({ value: track.id, label: track.name })),
              ]}
            />
          )}
        </div>

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
