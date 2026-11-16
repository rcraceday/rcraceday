import { supabase } from "@/supabaseClient";
import { isHouseholdResultRow } from "@/app/lib/results/resultsRowHighlight";

function chunkIds(ids, size = 100) {
  const list = [...ids];
  const groups = [];
  for (let i = 0; i < list.length; i += size) {
    groups.push(list.slice(i, i + size));
  }
  return groups;
}

/**
 * Event ids where the household appears in published results (driver id or matched name).
 * @param {string[]} eventIds
 * @param {Set<string>} driverIds
 * @param {Set<string>} driverNameKeys
 * @returns {Promise<Set<string>>}
 */
export async function loadHouseholdResultEventIds(eventIds, driverIds, driverNameKeys) {
  const matchedEventIds = new Set();
  if (!eventIds?.length || (!driverIds?.size && !driverNameKeys?.size)) {
    return matchedEventIds;
  }

  const { data: results = [], error } = await supabase
    .from("event_results")
    .select("id, event_id")
    .eq("published", true)
    .in("event_id", eventIds);

  if (error || !results.length) return matchedEventIds;

  const resultIdToEventId = new Map();
  results.forEach((row) => {
    if (row.id && row.event_id) resultIdToEventId.set(row.id, row.event_id);
  });
  const resultIds = [...resultIdToEventId.keys()];
  if (!resultIds.length) return matchedEventIds;

  const noteMatch = (row, eventId) => {
    if (!eventId) return;
    if (
      isHouseholdResultRow(
        { driverId: row.driver_id, driverNameRaw: row.driver_name_raw },
        driverIds,
        driverNameKeys
      )
    ) {
      matchedEventIds.add(eventId);
    }
  };

  for (const group of chunkIds(resultIds)) {
    const { data: overall = [] } = await supabase
      .from("event_result_overall")
      .select("result_id, driver_id, driver_name_raw")
      .in("result_id", group);

    (overall || []).forEach((row) => {
      noteMatch(row, resultIdToEventId.get(row.result_id));
    });
  }

  const races = [];
  for (const group of chunkIds(resultIds)) {
    const { data: raceRows = [] } = await supabase
      .from("event_result_races")
      .select("id, result_id")
      .in("result_id", group);
    races.push(...(raceRows || []));
  }

  if (!races.length) return matchedEventIds;

  const raceToEventId = new Map();
  races.forEach((race) => {
    const eventId = resultIdToEventId.get(race.result_id);
    if (race.id && eventId) raceToEventId.set(race.id, eventId);
  });

  const raceIds = [...raceToEventId.keys()];
  for (const group of chunkIds(raceIds)) {
    const { data: entries = [] } = await supabase
      .from("event_result_entries")
      .select("race_id, driver_id, driver_name_raw")
      .in("race_id", group);

    (entries || []).forEach((row) => {
      noteMatch(row, raceToEventId.get(row.race_id));
    });
  }

  return matchedEventIds;
}