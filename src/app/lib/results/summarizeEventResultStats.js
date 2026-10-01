import { normalizeDriverName } from "./driverName.js";

function driverKey(row) {
  if (row.driver_id) return `id:${row.driver_id}`;
  const name = normalizeDriverName(row.driver_name_raw);
  return name ? `name:${name}` : null;
}

export function summarizeEventResultStats({ overall = [], entries = [] }) {
  const mainEntries = entries.filter((entry) => entry.race_kind === "main");

  let entriesCount = overall.length;
  if (!entriesCount && mainEntries.length) {
    const classDriver = new Set();
    mainEntries.forEach((entry) => {
      const key = driverKey(entry);
      if (!key) return;
      classDriver.add(`${entry.class_name || ""}::${key}`);
    });
    entriesCount = classDriver.size;
  }

  const drivers = new Set();
  overall.forEach((row) => {
    const key = driverKey(row);
    if (key) drivers.add(key);
  });
  if (!drivers.size) {
    mainEntries.forEach((entry) => {
      const key = driverKey(entry);
      if (key) drivers.add(key);
    });
  }

  return {
    entries: entriesCount,
    drivers: drivers.size,
  };
}

export async function loadEventResultSummariesForEvents(supabase, eventIds) {
  if (!supabase || !eventIds?.length) return {};

  const { data: results, error } = await supabase
    .from("event_results")
    .select("id, event_id")
    .in("event_id", eventIds);

  if (error || !results?.length) return {};

  const resultIds = results.map((row) => row.id);
  const eventIdByResultId = new Map(results.map((row) => [row.id, row.event_id]));

  const [{ data: overallRows = [] }, { data: raceRows = [] }] = await Promise.all([
    supabase
      .from("event_result_overall")
      .select("result_id, driver_id, driver_name_raw")
      .in("result_id", resultIds),
    supabase
      .from("event_result_races")
      .select("id, result_id, race_kind, class_name")
      .in("result_id", resultIds),
  ]);

  const raceMeta = new Map((raceRows || []).map((race) => [race.id, race]));
  const raceIds = (raceRows || []).map((race) => race.id);

  const { data: entryRows = [] } = raceIds.length
    ? await supabase
        .from("event_result_entries")
        .select("race_id, driver_id, driver_name_raw")
        .in("race_id", raceIds)
    : { data: [] };

  const grouped = new Map();
  results.forEach((row) => {
    grouped.set(row.event_id, { overall: [], entries: [] });
  });

  (overallRows || []).forEach((row) => {
    const eventId = eventIdByResultId.get(row.result_id);
    const bucket = grouped.get(eventId);
    if (bucket) bucket.overall.push(row);
  });

  (entryRows || []).forEach((entry) => {
    const race = raceMeta.get(entry.race_id);
    if (!race) return;
    const eventId = eventIdByResultId.get(race.result_id);
    const bucket = grouped.get(eventId);
    if (!bucket) return;
    bucket.entries.push({
      ...entry,
      race_kind: race.race_kind,
      class_name: race.class_name,
    });
  });

  const summaries = {};
  grouped.forEach((data, eventId) => {
    summaries[eventId] = summarizeEventResultStats(data);
  });
  return summaries;
}
