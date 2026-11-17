import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { normalizeResultClassName } from "@/app/lib/results/classNames.js";
import { enrichOverallRowsFromRaces } from "@/app/lib/results/aggregateDriverStats.js";

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

export async function loadPublishedResultImportsForEvents(eventIds) {
  if (!eventIds?.length) return [];
  const { data = [], error } = await supabase
    .from("event_results")
    .select("id, event_id, result_day_index, result_day_date, imported_at")
    .eq("published", true)
    .in("event_id", eventIds)
    .order("result_day_index", { ascending: true, nullsFirst: true });
  if (error) {
    const legacy = await loadPublishedResultEventIds(eventIds);
    return [...legacy].map((eventId) => ({
      event_id: eventId,
      result_day_index: null,
      result_day_date: null,
    }));
  }
  return data;
}

export async function listEventResultImports(eventId, options = {}) {
  let query = supabase.from("event_results").select("*").eq("event_id", eventId);
  if (!options.includeUnpublished) {
    query = query.eq("published", true);
  }
  const { data = [], error } = await query.order("result_day_index", {
    ascending: true,
    nullsFirst: true,
  });
  if (error) throw error;
  return data;
}

async function fetchBundleForResultRow(result) {
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

  const mappedRaces = races.map((race) => ({
    ...race,
    className: normalizeResultClassName(race.class_name) || race.class_name,
    mainLetter: race.main_letter,
    mainNumber: race.main_number,
    roundLabel: race.round_label,
    raceKind: race.race_kind,
    qualifyingRankMethod: race.qualifying_rank_method,
    qualifyingRankLabel: race.qualifying_rank_label,
    entries: (entriesByRace.get(race.id) || []).map(mapEntry),
  }));
  const mappedOverall = overall.map(mapOverall);
  return {
    result,
    races: mappedRaces,
    overall: enrichOverallRowsFromRaces(mappedOverall, mappedRaces),
  };
}

export async function loadEventResultBundle(eventId, options = {}) {
  const { resultDayIndex, resultId } = options;
  let result = null;

  if (resultId) {
    const { data, error } = await supabase.from("event_results").select("*").eq("id", resultId).maybeSingle();
    if (error) throw error;
    result = data;
  } else if (resultDayIndex !== undefined && resultDayIndex !== null) {
    let query = supabase
      .from("event_results")
      .select("*")
      .eq("event_id", eventId)
      .eq("result_day_index", resultDayIndex);
    if (!options.includeUnpublished) {
      query = query.eq("published", true);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    result = data;
  } else if (eventId) {
    const imports = await listEventResultImports(eventId, options);
    result = imports[0] || null;
  }

  if (!result) return null;
  if (!options.includeUnpublished && result.published === false) return null;

  return fetchBundleForResultRow(result);
}

export async function loadAllEventResultBundles(eventId, options = {}) {
  const imports = await listEventResultImports(eventId, options);
  const bundles = [];
  for (const row of imports) {
    const bundle = await fetchBundleForResultRow(row);
    if (bundle) bundles.push(bundle);
  }
  return bundles;
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
    const bundles = await loadAllEventResultBundles(event.id);
    const primary = bundles[bundles.length - 1] || bundles[0];
    if (!primary) continue;
    rounds.push({
      eventId: event.id,
      eventName: richTextToPlainText(event.name) || event.name,
      eventDate: event.event_date,
      overall: primary.overall,
    });
  }
  return rounds;
}