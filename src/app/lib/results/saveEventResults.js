import { matchDriverIdFromRoster, unmatchedResultNames } from "./resultMemberMatch.js";
import { assignOverallPositions } from "./overallOrder.js";
function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function saveEventResults({
  supabase,
  clubId,
  eventId,
  parsed,
  drivers,
  rosterIndex,
  userId,
  published = true,
}) {
  const races = parsed.races || [];
  const overall = assignOverallPositions(parsed.overall || []);

  const { data: existing } = await supabase
    .from("event_results")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.id) {
    const { error: deleteError } = await supabase.from("event_results").delete().eq("id", existing.id);
    if (deleteError) throw deleteError;
  }

  const { data: resultRow, error: resultError } = await supabase
    .from("event_results")
    .insert({
      club_id: clubId,
      event_id: eventId,
      source: parsed.source,
      source_label: parsed.sourceLabel,
      source_url: parsed.sourceUrl,
      liverc_event_id: parsed.livercEventId,
      published,
      imported_by: userId || null,
    })
    .select("id")
    .single();
  if (resultError) throw resultError;

  const raceRows = races.map((race, index) => ({
    result_id: resultRow.id,
    class_name: race.className,
    main_letter: race.mainLetter,
    main_number: race.mainNumber,
    round_label: race.roundLabel,
    race_kind: race.raceKind || "main",
    sort_index: race.sortIndex ?? index,
    source_race_id: race.sourceRaceId || null,
    qualifying_rank_method: race.qualifyingRankMethod || null,
    qualifying_rank_label: race.qualifyingRankLabel || null,
  }));

  const { data: savedRaces, error: raceError } = await supabase
    .from("event_result_races")
    .insert(raceRows)
    .select("id, sort_index, class_name, main_letter, main_number, race_kind");
  if (raceError) throw raceError;

  const raceIdByKey = new Map(
    savedRaces.map((row) => [
      `${row.class_name}|${row.main_letter || ""}|${row.main_number || ""}|${row.race_kind}|${row.sort_index}`,
      row.id,
    ])
  );

  const entryRows = [];
  races.forEach((race, index) => {
    const raceId = raceIdByKey.get(
      `${race.className}|${race.mainLetter || ""}|${race.mainNumber || ""}|${race.raceKind || "main"}|${race.sortIndex ?? index}`
    );
    (race.entries || []).forEach((entry, entryIndex) => {
      entryRows.push({
        race_id: raceId,
        driver_id: matchDriverIdFromRoster(entry.driverNameRaw, rosterIndex),
        driver_name_raw: entry.driverNameRaw,
        position: entry.position,
        car_number: entry.carNumber,
        manufacturer: entry.manufacturer || null,
        is_tq: !!entry.isTq,
        laps: entry.laps,
        total_time_ms: entry.totalTimeMs,
        laps_time_label: entry.lapsTimeLabel,
        fast_lap_ms: entry.fastLapMs,
        avg_lap_ms: entry.avgLapMs,
        seed: entry.seed,
        top3_con_ms: entry.top3ConMs,
        top2_con_ms: entry.top2ConMs ?? null,
        top5_avg_ms: entry.top5AvgMs ?? null,
        qual_heat_label: entry.qualHeatLabel ?? null,
        consistency_pct: entry.consistencyPct,
        status: entry.status,
        sort_index: entryIndex,
      });
    });
  });

  for (const group of chunk(entryRows, 200)) {
    const { error } = await supabase.from("event_result_entries").insert(group);
    if (error) throw error;
  }

  const overallRows = overall.map((row) => ({
    result_id: resultRow.id,
    class_name: row.className,
    main_letter: row.mainLetter || "A",
    position: row.position,
    overall_position: row.overallPosition || row.position,
    driver_id: matchDriverIdFromRoster(row.driverNameRaw, rosterIndex),
    driver_name_raw: row.driverNameRaw,
    is_tq: !!row.isTq,
    ifmar_points: row.ifmarPoints,
    tie_breaker: row.tieBreaker,
    mains: row.mains || [],
  }));

  for (const group of chunk(overallRows, 200)) {
    const { error } = await supabase.from("event_result_overall").insert(group);
    if (error) throw error;
  }

  return resultRow.id;
}

export function unmatchedNames(parsed, rosterIndex) {
  return unmatchedResultNames(parsed, rosterIndex);
}
