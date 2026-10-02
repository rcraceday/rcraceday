import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import FilterDropdown from "@/components/ui/FilterDropdown";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";
import { extractYearsFromEvents, TYPE_LABELS } from "./events-sections/helpers";
import ChampionshipPromoCard from "./ChampionshipPromoCard";

const CHAMPIONSHIP_TYPE = "championship_round";

function eventYear(event) {
  if (!event?.event_date) return null;
  const y = new Date(event.event_date).getFullYear();
  return Number.isFinite(y) ? y : null;
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
  const [typeFilter, setTypeFilter] = useState(
    searchParams.get("type") || "all"
  );

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

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeYear) next.set("year", String(activeYear));
    if (trackFilter && trackFilter !== "all") next.set("track", trackFilter);
    if (typeFilter && typeFilter !== "all") next.set("type", typeFilter);
    setSearchParams(next, { replace: true });
  }, [activeYear, trackFilter, typeFilter, setSearchParams]);

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

  const promoChampionships = useMemo(() => {
    if (typeFilter !== CHAMPIONSHIP_TYPE) return [];
    const seasonKey = String(activeYear);
    const fromSeason = championships.filter(
      (row) => String(row.season) === seasonKey
    );
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

  return (
    <div className="space-y-4 pb-8">
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

      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}

      {!loading && typeFilter === CHAMPIONSHIP_TYPE && promoChampionships.length > 0 && (
        <section className="space-y-2">
          {promoChampionships.map((champ) => (
            <ChampionshipPromoCard key={champ.id} clubSlug={clubSlug} championship={champ} />
          ))}
        </section>
      )}

      {!loading && filteredEvents.length === 0 && (
        <p className="text-text-muted">{t("results.noneYet")}</p>
      )}

      {!loading &&
        filteredEvents.map((event) => (
          <Link
            key={event.id}
            to={`/${clubSlug}/app/events/${event.id}/results`}
            className="no-underline"
          >
            <Card className="p-4 mb-2">
              <div className="font-semibold text-slate-900">
                {richTextToPlainText(event.name) || t("eventCard.event")}
              </div>
              <div className="text-sm text-slate-500">{event.event_date}</div>
              {event.track && trackNames[event.track] ? (
                <div className="text-sm text-slate-500 mt-1">{trackNames[event.track]}</div>
              ) : null}
            </Card>
          </Link>
        ))}
    </div>
  );
}
