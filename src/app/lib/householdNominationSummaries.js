import { supabase } from "@/supabaseClient";

function driverLabel(driver) {
  const name = [driver?.first_name, driver?.last_name].filter(Boolean).join(" ").trim();
  return name || "Driver";
}

/**
 * @returns {Promise<{ nominatedEventIds: Set<string>, summariesByEventId: Map<string, string> }>}
 */
export async function loadHouseholdNominationSummaries(membershipId, eventIds) {
  const nominatedEventIds = new Set();
  const summariesByEventId = new Map();

  if (!membershipId) {
    return { nominatedEventIds, summariesByEventId };
  }

  let nominationsQuery = supabase
    .from("nominations")
    .select("id, event_id, driver_id")
    .eq("group_id", membershipId);

  if (Array.isArray(eventIds) && eventIds.length > 0) {
    nominationsQuery = nominationsQuery.in("event_id", eventIds);
  }

  const { data: nominationRows = [] } = await nominationsQuery;
  if (!nominationRows.length) {
    return { nominatedEventIds, summariesByEventId };
  }

  nominationRows.forEach((row) => {
    if (row.event_id) nominatedEventIds.add(row.event_id);
  });

  const nominationIds = nominationRows.map((row) => row.id).filter(Boolean);
  const driverIds = [...new Set(nominationRows.map((row) => row.driver_id).filter(Boolean))];

  const { data: entryRows = [] } = nominationIds.length
    ? await supabase
        .from("nomination_entries")
        .select("nomination_id, class_id, is_preference, order_index")
        .in("nomination_id", nominationIds)
        .order("order_index", { ascending: true })
    : { data: [] };

  const classIds = [...new Set((entryRows || []).map((e) => e.class_id).filter(Boolean))];
  const { data: classRows = [] } = classIds.length
    ? await supabase.from("club_classes").select("id, name").in("id", classIds)
    : { data: [] };

  const { data: driverRows = [] } = driverIds.length
    ? await supabase.from("drivers").select("id, first_name, last_name").in("id", driverIds)
    : { data: [] };

  const driverMap = new Map((driverRows || []).map((d) => [d.id, d]));
  const classMap = new Map((classRows || []).map((c) => [c.id, c.name]));

  const entriesByNomination = new Map();
  (entryRows || []).forEach((entry) => {
    if (entry.is_preference) return;
    if (!entry.nomination_id) return;
    const list = entriesByNomination.get(entry.nomination_id) || [];
    list.push(entry);
    entriesByNomination.set(entry.nomination_id, list);
  });

  const byEvent = new Map();
  nominationRows.forEach((nomination) => {
    if (!nomination.event_id) return;
    const list = byEvent.get(nomination.event_id) || [];
    list.push(nomination);
    byEvent.set(nomination.event_id, list);
  });

  byEvent.forEach((eventNominations, eventId) => {
    const driverLines = eventNominations
      .map((nomination) => {
        const driver = driverMap.get(nomination.driver_id);
        const seen = new Set();
        const classNames = [];
        (entriesByNomination.get(nomination.id) || []).forEach((entry) => {
          if (!entry.class_id || seen.has(entry.class_id)) return;
          seen.add(entry.class_id);
          classNames.push(classMap.get(entry.class_id) || "Class");
        });
        if (!classNames.length) return null;
        return `${driverLabel(driver)}: ${classNames.join(", ")}`;
      })
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (driverLines.length) {
      summariesByEventId.set(eventId, driverLines.join(" · "));
    }
  });

  return { nominatedEventIds, summariesByEventId };
}