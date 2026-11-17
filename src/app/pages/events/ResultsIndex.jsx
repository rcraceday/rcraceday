import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import BackNavButton from "@/components/ui/BackNavButton";
import FilterDropdown from "@/components/ui/FilterDropdown";
import PageFilterBar from "@/components/ui/PageFilterBar";
import { filterSummaryFromParts, readPageFilterPrefs } from "@/app/lib/pageFilterPrefs";
import { usePageFilterPrefs } from "@/app/lib/usePageFilterPrefs";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadPublishedResultImportsForEvents } from "@/app/lib/results/loadEventResults";
import {
  eventDaySelectLabel,
  getEventDayRecords,
} from "@/app/lib/results/eventResultDays";
import {
  formatResultSelectionKey,
  parseResultSelectionKey,
} from "@/app/lib/results/resultSelectionKey";
import {
  extractYearsFromEvents,
  isMajorEventType,
} from "./events-sections/helpers";
import MyResultsYearDashboard from "./MyResultsYearDashboard";
import EventResultsPanel from "./EventResultsPanel";

const CHAMPIONSHIP_TYPE = "championship_round";

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

function yearFromDateString(date) {
  if (!date) return null;
  const y = new Date(date).getFullYear();
  return Number.isFinite(y) ? y : null;
}

function eventYear(event) {
  return yearFromDateString(event?.event_date);
}

function resultEntryYear(event, importRow) {
  return yearFromDateString(importRow?.result_day_date || event?.event_date);
}

export default function ResultsIndex() {
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();
  const savedResultsFilters = useMemo(
    () => readPageFilterPrefs(clubSlug, "results"),
    [clubSlug]
  );

  const initialResultsFilters = useMemo(() => {
    const urlYear = searchParams.get("year");
    const urlTrack = searchParams.get("track");
    const urlEvent = searchParams.get("event");
    const urlCompare = searchParams.get("compare");
    const urlClass = searchParams.get("class");
    return {
      year: urlYear ? Number(urlYear) : savedResultsFilters?.year ?? currentYear,
      track: urlTrack || savedResultsFilters?.track || "all",
      event: urlEvent || savedResultsFilters?.event || "",
      compare: urlCompare || savedResultsFilters?.compare || "",
      class: urlClass || savedResultsFilters?.class || "",
    };
  }, [clubSlug, currentYear, savedResultsFilters, searchParams]);

  const [events, setEvents] = useState([]);
  const [publishedImports, setPublishedImports] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState(() => initialResultsFilters.year);
  const [trackFilter, setTrackFilter] = useState(() => initialResultsFilters.track);
  const [selectedEventId, setSelectedEventId] = useState(() => initialResultsFilters.event);
  const [compareDriver, setCompareDriver] = useState(() => initialResultsFilters.compare);
  const [dashboardClass, setDashboardClass] = useState(() => initialResultsFilters.class);
  const [activeHouseholdDriver, setActiveHouseholdDriver] = useState("");

  const resultsFilterPrefs = useMemo(
    () => ({
      year: selectedYear,
      track: trackFilter,
      event: selectedEventId,
      compare: compareDriver,
      class: dashboardClass,
    }),
    [selectedYear, trackFilter, selectedEventId, compareDriver, dashboardClass]
  );
  usePageFilterPrefs(clubSlug, "results", resultsFilterPrefs);

  useEffect(() => {
    async function load() {
      if (!club?.id) return;
      setLoading(true);

      const [{ data: eventRows = [] }, { data: trackRows = [] }, { data: champRows = [] }] =
        await Promise.all([
          supabase
            .from("events")
            .select(
              "id, name, event_date, track, event_type, championship_id, is_multi_day, days, classes_by_day"
            )
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

      const eventIds = eventRows.map((event) => event.id);
      const importRows = await loadPublishedResultImportsForEvents(eventIds);
      const eventIdsWithResults = new Set(importRows.map((row) => row.event_id).filter(Boolean));
      const published = eventRows.filter((event) => eventIdsWithResults.has(event.id));

      setEvents(published);
      setPublishedImports(importRows);
      setTracks(trackRows || []);
      setChampionships(champRows || []);
      setLoading(false);
    }
    load();
  }, [club?.id]);

  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const resultEntries = useMemo(() => {
    return publishedImports
      .map((importRow) => {
        const event = eventById.get(importRow.event_id);
        if (!event) return null;
        const isMulti = Boolean(event.is_multi_day);
        const dayIndex =
          importRow.result_day_index != null
            ? importRow.result_day_index
            : isMulti
              ? null
              : null;
        const showAsDay = isMulti && importRow.result_day_index != null;
        const key = formatResultSelectionKey(
          event.id,
          showAsDay ? importRow.result_day_index : null
        );
        const sortDate =
          importRow.result_day_date ||
          (showAsDay
            ? getEventDayRecords(event)[importRow.result_day_index]?.date
            : null) ||
          event.event_date;
        return {
          key,
          eventId: event.id,
          dayIndex: showAsDay ? importRow.result_day_index : null,
          event,
          importRow,
          sortDate,
          entryYear: resultEntryYear(event, importRow),
        };
      })
      .filter(Boolean);
  }, [publishedImports, eventById]);

  const years = useMemo(() => {
    const yearSet = new Set();
    resultEntries.forEach((entry) => {
      if (entry.entryYear != null) yearSet.add(entry.entryYear);
    });
    if (!yearSet.size) extractYearsFromEvents(events).forEach((y) => yearSet.add(y));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [resultEntries, events]);

  const activeYear = years.includes(selectedYear) ? selectedYear : years[0] || currentYear;

  const filteredResultEntries = useMemo(() => {
    return resultEntries
      .filter((entry) => {
        if (entry.entryYear !== activeYear) return false;
        if (trackFilter !== "all" && entry.event.track !== trackFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
  }, [resultEntries, activeYear, trackFilter]);

  const filteredEvents = useMemo(() => {
    const seen = new Set();
    const out = [];
    filteredResultEntries.forEach((entry) => {
      if (seen.has(entry.eventId)) return;
      seen.add(entry.eventId);
      out.push(entry.event);
    });
    return out.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }, [filteredResultEntries]);

  const eventOptions = useMemo(() => {
    const brand = palette?.primary || "#2563eb";
    const accent = {
      club: brand,
      championship: "#CA8A04",
      major: "#DC2626",
    };
    return filteredResultEntries.map((entry) => {
      const event = entry.event;
      const baseName = richTextToPlainText(event.name) || t("eventCard.event");
      let menuLabel = baseName;
      if (entry.dayIndex != null) {
        const days = getEventDayRecords(event);
        const dayLabel = eventDaySelectLabel(
          days[entry.dayIndex] || { date: entry.importRow.result_day_date },
          entry.dayIndex,
          formatEventDateLabel
        );
        menuLabel = `${baseName} — ${dayLabel}`;
      }
      const date = formatEventDateLabel(entry.sortDate || event.event_date);
      const type = (event.event_type || "").toLowerCase();
      const isChampionshipRound =
        type === CHAMPIONSHIP_TYPE || Boolean(event.championship_id);
      const barColor = isMajorEventType(event)
        ? accent.major
        : isChampionshipRound
          ? accent.championship
          : accent.club;
      return {
        value: entry.key,
        label: `${menuLabel} (${date})`,
        menuLabel,
        optionStyle: {
          borderLeft: `3px solid ${barColor}`,
          paddingLeft: "0.5rem",
        },
      };
    });
  }, [filteredResultEntries, palette?.primary, t]);

  const activeResultKey = useMemo(() => {
    if (!filteredResultEntries.length) return "";
    const keys = new Set(filteredResultEntries.map((entry) => entry.key));
    if (selectedEventId && keys.has(selectedEventId)) return selectedEventId;
    const fromUrl = searchParams.get("event");
    if (fromUrl) {
      if (keys.has(fromUrl)) return fromUrl;
      const { eventId, dayIndex } = parseResultSelectionKey(fromUrl);
      if (eventId && dayIndex == null) {
        const match = filteredResultEntries.find((entry) => entry.eventId === eventId);
        if (match) return match.key;
      }
    }
    return filteredResultEntries[filteredResultEntries.length - 1]?.key || "";
  }, [filteredResultEntries, selectedEventId, searchParams]);

  const activeSelection = useMemo(
    () => parseResultSelectionKey(activeResultKey),
    [activeResultKey]
  );

  const dashboardEvents = useMemo(
    () =>
      [...filteredEvents].sort(
        (a, b) => new Date(a.event_date) - new Date(b.event_date)
      ),
    [filteredEvents]
  );

  useEffect(() => {
    if (!activeResultKey) return;
    const keys = new Set(filteredResultEntries.map((entry) => entry.key));
    if (selectedEventId && !keys.has(selectedEventId)) {
      setSelectedEventId(activeResultKey);
    }
  }, [activeResultKey, filteredResultEntries, selectedEventId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeYear) next.set("year", String(activeYear));
    if (trackFilter && trackFilter !== "all") next.set("track", trackFilter);
    if (activeResultKey) next.set("event", activeResultKey);
    if (compareDriver) next.set("compare", compareDriver);
    if (dashboardClass) next.set("class", dashboardClass);
    setSearchParams(next, { replace: true });
  }, [activeYear, trackFilter, activeResultKey, compareDriver, dashboardClass, setSearchParams]);

  const appHomePath = clubSlug ? `/${clubSlug}/app` : null;

  /** Championship with rounds in the current year + track filter (from event links). */
  const trackChampionship = useMemo(() => {
    const champIds = new Set(
      filteredEvents.map((event) => event.championship_id).filter(Boolean)
    );
    if (!champIds.size) return null;

    const matches = championships.filter(
      (row) => champIds.has(row.id) && String(row.season) === String(activeYear)
    );
    if (!matches.length) return null;

    if (trackFilter !== "all") {
      return matches[0] || null;
    }

    if (matches.length === 1) return matches[0];
    const seasonOnly = championships.filter((row) => String(row.season) === String(activeYear));
    if (seasonOnly.length === 1 && champIds.has(seasonOnly[0].id)) return seasonOnly[0];
    return null;
  }, [filteredEvents, championships, activeYear, trackFilter]);

  const trackFilterOptions = useMemo(
    () => [
      { value: "all", label: t("results.filterAllTracks") },
      ...tracks.map((track) => ({ value: track.id, label: track.name })),
    ],
    [tracks, t]
  );

  const filterSummaryText = useMemo(() => {
    const trackLabel =
      tracks.length > 1
        ? trackFilterOptions.find((o) => o.value === trackFilter)?.label
        : null;
    return filterSummaryFromParts([String(activeYear), trackLabel]);
  }, [activeYear, trackFilter, trackFilterOptions, tracks.length]);

  const renderResultsFilters = ({ fullWidth }) => {
    const dropdownProps = {
      compact: true,
      fullWidth,
      className: fullWidth ? "min-w-0 w-full" : "shrink-0",
    };
    return (
      <>
        {(years.length > 1 || years.length === 1) && (
          <FilterDropdown
            {...dropdownProps}
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
            {...dropdownProps}
            value={trackFilter}
            onChange={setTrackFilter}
            ariaLabel={t("results.filterTrack")}
            options={trackFilterOptions}
          />
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageTitle
        icon={TrophyIcon}
        title={t("results.title")}
        style={{ color: palette.primary }}
        actions={<BackNavButton to={appHomePath} />}
      />

      <PageFilterBar
        brand={palette.primary}
        filterLabel={t("events.filtersLabel")}
        summaryText={filterSummaryText}
        mobileFilters={renderResultsFilters({ fullWidth: true })}
        desktopFilters={renderResultsFilters({ fullWidth: false })}
      />

      {!loading && trackChampionship && clubSlug ? (
        <div className="flex justify-center w-full">
          <button
            type="button"
            className="inline-flex w-auto max-w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-center shadow-sm transition-[box-shadow,filter] hover:shadow-md hover:brightness-[0.98] cursor-pointer"
            style={{
              backgroundColor: `${palette.primary}12`,
              border: `1px solid ${palette.primary}`,
              color: palette.primary,
            }}
            onClick={() =>
              navigate(`/${clubSlug}/app/championships/${trackChampionship.id}`)
            }
          >
            {trackChampionship.logo_url ? (
              <img
                src={trackChampionship.logo_url}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-contain p-0.5"
                style={{ border: `1px solid color-mix(in srgb, ${palette.primary} 35%, transparent)` }}
              />
            ) : (
              <TrophyIcon className="h-5 w-5 shrink-0" style={{ color: palette.primary }} aria-hidden />
            )}
            <span className="text-sm font-semibold leading-snug whitespace-nowrap">
              {t("results.viewChampionshipPoints")}
            </span>
          </button>
        </div>
      ) : null}

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
          onActiveHouseholdDriverChange={setActiveHouseholdDriver}
        />
      )}

      <div className="flex flex-col gap-4">
        {loading && <p className="text-text-muted m-0">{t("loading.loading")}</p>}

        {!loading && filteredResultEntries.length === 0 && (
          <p className="text-text-muted m-0">{t("results.noneYet")}</p>
        )}

        {!loading && filteredResultEntries.length > 0 && activeResultKey ? (
          <EventResultsPanel
            embedded
            eventId={activeSelection.eventId}
            initialResultDayIndex={activeSelection.dayIndex}
            hideResultDayPicker
            showDraftBanner={false}
            compareDriver={compareDriver}
            onCompareDriverChange={setCompareDriver}
            preferredClass={dashboardClass}
            compareExcludeDriver={activeHouseholdDriver}
            eventOptions={eventOptions}
            resultSelectionKey={activeResultKey}
            onEventChange={setSelectedEventId}
          />
        ) : null}
      </div>
    </div>
  );
}