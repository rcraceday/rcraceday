import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { normalizeResultClassName } from "@/app/lib/results/classNames.js";

export async function loadPublishedResultEventIds(eventIds) {
  if (!eventIds?.length) return new Set();
  const { data = [], error } = await supabase
    .from("event_results")
    .select("event_id")
    .eq("published", true)
    .in("event_id", eventIds);
  if (error) return new Set();
  return new Set(data.map((row) => row.event_id).filter(Boolean));
}

export async function loadEventResultBundle(eventId, options = {}) {
  let resultQuery = supabase.from("event_results").select("*").eq("event_id", eventId);
  if (!options.includeUnpublished) {
    resultQuery = resultQuery.eq("published", true);
  }
  const { data: result, error } = await resultQuery.maybeSingle();
  if (error) throw error;
  if (!result) return null;

  const { data: races = [] } = await supabase
    .from("event_result_races")
    .select("*")
    .eq("result_id", result.id)
    .order("sort_index", { ascending: true });

  const raceIds = races.map((race) => race.id);
  const { data: entries = [] } = raceIds.length
    ? await supabase.from("event_result_entries").select("*").in("race_id", raceIds).order("sort_index")
    : { data: [] };

  const { data: overall = [] } = await supabase
    .from("event_result_overall")
    .select("*")
    .eq("result_id", result.id)
    .order("overall_position", { ascending: true });

  const entriesByRace = new Map();
  entries.forEach((entry) => {
    if (!entriesByRace.has(entry.race_id)) entriesByRace.set(entry.race_id, []);
    entriesByRace.get(entry.race_id).push(entry);
  });

  return {
    result,
    races: races.map((race) => ({
      ...race,
      className: normalizeResultClassName(race.class_name) || race.class_name,
      mainLetter: race.main_letter,
      mainNumber: race.main_number,
      roundLabel: race.round_label,
      raceKind: race.race_kind,
      qualifyingRankMethod: race.qualifying_rank_method,
      qualifyingRankLabel: race.qualifying_rank_label,
      entries: (entriesByRace.get(race.id) || []).map(mapEntry),
    })),
    overall: overall.map(mapOverall),
  };
}

function mapEntry(entry) {
  return {
    ...entry,
    driverNameRaw: entry.driver_name_raw,
    driverId: entry.driver_id,
    isTq: entry.is_tq,
    carNumber: entry.car_number,
    lapsTimeLabel: entry.laps_time_label,
    fastLapMs: entry.fast_lap_ms,
    avgLapMs: entry.avg_lap_ms,
    top3ConMs: entry.top3_con_ms,
    top2ConMs: entry.top2_con_ms,
    top5AvgMs: entry.top5_avg_ms,
    qualHeatLabel: entry.qual_heat_label,
    consistencyPct: entry.consistency_pct,
  };
}

function mapOverall(row) {
  return {
    ...row,
    className: normalizeResultClassName(row.class_name) || row.class_name,
    mainLetter: row.main_letter,
    overallPosition: row.overall_position,
    driverNameRaw: row.driver_name_raw,
    driverId: row.driver_id,
    isTq: row.is_tq,
    ifmarPoints: row.ifmar_points,
    tieBreaker: row.tie_breaker,
    mains: row.mains || [],
  };
}

export async function loadChampionshipRounds(championshipId) {
  const { data: events = [] } = await supabase
    .from("events")
    .select("id, name, event_date, championship_id")
    .eq("championship_id", championshipId)
    .order("event_date", { ascending: true });

  const rounds = [];
  for (const event of events) {
    const bundle = await loadEventResultBundle(event.id);
    if (!bundle) continue;
    rounds.push({
      eventId: event.id,
      eventName: richTextToPlainText(event.name) || event.name,
      eventDate: event.event_date,
      overall: bundle.overall,
    });
  }
  return rounds;
}
