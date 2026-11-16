import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";
import { extractYearsFromEvents, TYPE_LABELS } from "./events-sections/helpers";
import MyResultsYearDashboard from "./MyResultsYearDashboard";
import EventResultsPanel from "./EventResultsPanel";

const CHAMPIONSHIP_TYPE = "championship_round";

function eventYear(event) {
  if (!event?.event_date) return null;
  const y = new Date(event.event_date).getFullYear();
  return Number.isFinite(y) ? y : null;
}

function formatEventDateLabel(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export default function ResultsIndex() {
  const { clubSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();
  const [events, setEvents] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [trackNames, setTrackNames] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState(
    Number(searchParams.get("year")) || currentYear
  );
  const [trackFilter, setTrackFilter] = useState(searchParams.get("track") || "all");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get("event") || "");
  const [compareDriver, setCompareDriver] = useState(searchParams.get("compare") || "");
  const [dashboardClass, setDashboardClass] = useState(searchParams.get("class") || "");

  useEffect(() => {
    async function load() {
      if (!club?.id) return;
      setLoading(true);

      const [{ data: eventRows = [] }, { data: trackRows = [] }, { data: champRows = [] }] =
        await Promise.all([
          supabase
            .from("events")
            .select("id, name, event_date, track, event_type, championship_id")
            .eq("club_id", club.id)
            .eq("is_published", true)
            .order("event_date", { ascending: false }),
          supabase
            .from("club_tracks")
            .select("id, name")
            .eq("club_id", club.id)
            .order("name", { ascending: true }),
          supabase
            .from("championships")
            .select("id, name, season, logo_url")
            .eq("club_id", club.id)
            .order("season", { ascending: false }),
        ]);

      const withResults = await loadPublishedResultEventIds(
        eventRows.map((event) => event.id)
      );
      const published = eventRows.filter((event) => withResults.has(event.id));

      setEvents(published);
      setTracks(trackRows || []);
      setTrackNames(
        (trackRows || []).reduce((acc, row) => {
          acc[row.id] = row.name;
          return acc;
        }, {})
      );
      setChampionships(champRows || []);
      setLoading(false);
    }
    load();
  }, [club?.id]);

  const years = useMemo(() => extractYearsFromEvents(events), [events]);
  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || currentYear;

  const eventTypesInData = useMemo(() => {
    const keys = new Set();
    events.forEach((event) => {
      const type = (event.event_type || "").toLowerCase();
      if (type) keys.add(type);
    });
    return Array.from(keys).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const year = eventYear(event);
        if (year !== activeYear) return false;
        if (trackFilter !== "all" && event.track !== trackFilter) return false;
        const type = (event.event_type || "").toLowerCase();
        if (typeFilter === "all") return true;
        return type === typeFilter.toLowerCase();
      })
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }, [events, activeYear, trackFilter, typeFilter]);

  const eventOptions = useMemo(() => {
    return filteredEvents.map((event) => {
      const name = richTextToPlainText(event.name) || t("eventCard.event");
      const date = formatEventDateLabel(event.event_date);
      const track = event.track && trackNames[event.track] ? ` · ${trackNames[event.track]}` : "";
      return {
        value: event.id,
        label: `${name} (${date})${track}`,
      };
    });
  }, [filteredEvents, trackNames, t]);

  const activeEventId = useMemo(() => {
    if (!filteredEvents.length) return "";
    if (selectedEventId && filteredEvents.some((e) => e.id === selectedEventId)) {
      return selectedEventId;
    }
    const fromUrl = searchParams.get("event");
    if (fromUrl && filteredEvents.some((e) => e.id === fromUrl)) return fromUrl;
    return filteredEvents[0].id;
  }, [filteredEvents, selectedEventId, searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeYear) next.set("year", String(activeYear));
    if (trackFilter && trackFilter !== "all") next.set("track", trackFilter);
    if (typeFilter && typeFilter !== "all") next.set("type", typeFilter);
    if (activeEventId) next.set("event", activeEventId);
    if (compareDriver) next.set("compare", compareDriver);
    if (dashboardClass) next.set("class", dashboardClass);
    setSearchParams(next, { replace: true });
  }, [activeYear, trackFilter, typeFilter, activeEventId, compareDriver, dashboardClass, setSearchParams]);

  const promoChampionships = useMemo(() => {
    if (typeFilter !== CHAMPIONSHIP_TYPE) return [];
    const seasonKey = String(activeYear);
    const fromSeason = championships.filter((row) => String(row.season) === seasonKey);
    if (fromSeason.length) return fromSeason;
    const ids = new Set(
      filteredEvents.map((event) => event.championship_id).filter(Boolean)
    );
    return championships.filter((row) => ids.has(row.id));
  }, [typeFilter, activeYear, championships, filteredEvents]);

  const typeOptions = useMemo(() => {
    const options = [{ value: "all", label: t("results.filterAllTypes") }];
    eventTypesInData.forEach((key) => {
      options.push({
        value: key,
        label: TYPE_LABELS[key] || key.replace(/_/g, " "),
      });
    });
    if (!eventTypesInData.includes(CHAMPIONSHIP_TYPE)) {
      options.push({
        value: CHAMPIONSHIP_TYPE,
        label: TYPE_LABELS.championship_round || "Championship",
      });
    }
    return options;
  }, [eventTypesInData, t]);

  const dashboardEvents = useMemo(
    () =>
      [...filteredEvents].sort(
        (a, b) => new Date(a.event_date) - new Date(b.event_date)
      ),
    [filteredEvents]
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageTitle icon={TrophyIcon} title={t("results.title")} style={{ color: palette.primary }} />

      <div className="flex flex-wrap items-center justify-center gap-3">
        {(years.length > 1 || years.length === 1) && (
          <FilterDropdown
            value={activeYear}
            onChange={(year) => setSelectedYear(Number(year))}
            ariaLabel={t("results.filterYear")}
            options={(years.length ? years : [currentYear]).map((year) => ({
              value: year,
              label: String(year),
            }))}
          />
        )}
        {tracks.length > 1 && (
          <FilterDropdown
            value={trackFilter}
            onChange={setTrackFilter}
            ariaLabel={t("results.filterTrack")}
            options={[
              { value: "all", label: t("results.filterAllTracks") },
              ...tracks.map((track) => ({ value: track.id, label: track.name })),
            ]}
          />
        )}
        <FilterDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          ariaLabel={t("results.filterEventType")}
          options={typeOptions}
          hideSelectedOption={false}
        />
      </div>

      {!loading && dashboardEvents.length > 0 && (
        <MyResultsYearDashboard
          year={activeYear}
          events={dashboardEvents}
          championships={championships}
          clubId={club?.id}
          clubSlug={clubSlug}
          dashboardClass={dashboardClass}
          onDashboardClassChange={(value) => {
            setDashboardClass(value);
            setCompareDriver("");
          }}
          compareDriver={compareDriver}
          onCompareDriverChange={setCompareDriver}
        />
      )}

      <div className="flex flex-col gap-4">
        {loading && <p className="text-text-muted m-0">{t("loading.loading")}</p>}

        {!loading && typeFilter === CHAMPIONSHIP_TYPE && promoChampionships.length > 0 && (
          <p className="text-sm text-center m-0">
            <Link
              to={`/${clubSlug}/app/championships`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("results.championshipStandingsLink")}
            </Link>
          </p>
        )}

        {!loading && filteredEvents.length === 0 && (
          <p className="text-text-muted m-0">{t("results.noneYet")}</p>
        )}

        {!loading && filteredEvents.length > 0 && activeEventId ? (
          <EventResultsPanel
            embedded
            eventId={activeEventId}
            showDraftBanner={false}
            compareDriver={compareDriver}
            onCompareDriverChange={setCompareDriver}
            preferredClass={dashboardClass}
            eventOptions={eventOptions}
            onEventChange={setSelectedEventId}
          />
        ) : null}
      </div>
    </div>
  );
}