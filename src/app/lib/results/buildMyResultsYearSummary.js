import { loadEventResultBundle } from "@/app/lib/results/loadEventResults";
import { driverFullName, normalizeDriverName } from "@/app/lib/results/driverName";
import { aggregateDriverMainStats } from "@/app/lib/results/aggregateDriverStats";
import {
  aggregateFinishesByMonth,
  aggregateLapsByMonth,
} from "@/app/lib/results/aggregateResultsByMonth";

function isMyRow(row, driverIds, driverNameKeys) {
  if (row?.driverId && driverIds.has(row.driverId)) return true;
  return driverNameKeys.has(normalizeDriverName(row?.driverNameRaw));
}

function buildHouseholdDisplayNameLookup(householdDrivers) {
  const byId = new Map();
  const byKey = new Map();
  (householdDrivers || []).forEach((driver) => {
    const label =
      driverFullName(driver) ||
      driver.display_name ||
      driver.name ||
      "";
    if (!label) return;
    const key = normalizeDriverName(label);
    if (driver.id) byId.set(driver.id, label);
    if (!byKey.has(key)) byKey.set(key, label);
  });
  return { byId, byKey };
}

function householdDisplayName(row, lookup) {
  if (row?.driverId && lookup.byId.has(row.driverId)) {
    return lookup.byId.get(row.driverId);
  }
  const raw = row?.driverNameRaw;
  if (!raw) return null;
  const key = normalizeDriverName(raw);
  if (lookup.byKey.has(key)) return lookup.byKey.get(key);
  return raw;
}

function rememberDriverName(bucket, row, lookup) {
  const label = householdDisplayName(row, lookup);
  if (!label) return;
  const key = normalizeDriverName(label);
  bucket.driverNameKeys.set(key, label);
}

/** Household driver results across published events for one season, grouped by class. */
export async function buildMyResultsYearSummary(
  events,
  driverIds,
  driverNameKeys,
  householdDrivers = []
) {
  const nameLookup = buildHouseholdDisplayNameLookup(householdDrivers);
  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(a.event_date) - new Date(b.event_date)
  );

  const classMap = new Map();
  let eventsWithResults = 0;

  for (const event of sortedEvents) {
    const bundle = await loadEventResultBundle(event.id);
    if (!bundle) continue;
    eventsWithResults += 1;
    const races = bundle.races || [];

    (bundle.overall || []).forEach((row) => {
      if (!isMyRow(row, driverIds, driverNameKeys)) return;
      const className = row.className;
      const finish = row.overallPosition || row.position;
      const driverNameRaw = row.driverNameRaw;

      if (!classMap.has(className)) {
        classMap.set(className, {
          className,
          finishes: [],
          laps: [],
          rivalCounts: new Map(),
          matchupsByRival: new Map(),
          driverNameKeys: new Map(),
        });
      }
      const bucket = classMap.get(className);
      rememberDriverName(bucket, row, nameLookup);

      if (finish != null) {
        bucket.finishes.push({
          eventId: event.id,
          eventDate: event.event_date,
          eventName: event.name,
          className,
          finish,
          driverNameRaw: householdDisplayName(row, nameLookup) || driverNameRaw,
        });
      }

      const classRaces = races.filter((race) => race.className === className);
      const lapStats = aggregateDriverMainStats(row, classRaces);
      if (lapStats.fastLapMs) {
        bucket.laps.push({
          eventId: event.id,
          eventDate: event.event_date,
          eventName: event.name,
          className,
          fastLapMs: lapStats.fastLapMs,
          driverNameRaw: householdDisplayName(row, nameLookup) || driverNameRaw,
        });
      }

      const classRows = (bundle.overall || []).filter((r) => r.className === className);
      classRows.forEach((other) => {
        if (isMyRow(other, driverIds, driverNameKeys)) return;
        const otherPos = other.overallPosition || other.position;
        const rivalName = other.driverNameRaw || "Unknown";
        const rivalKey = normalizeDriverName(rivalName);
        if (finish != null && otherPos != null) {
          if (!bucket.matchupsByRival.has(rivalKey)) bucket.matchupsByRival.set(rivalKey, []);
          bucket.matchupsByRival.get(rivalKey).push({
            eventId: event.id,
            eventDate: event.event_date,
            eventName: event.name,
            className,
            myFinish: finish,
            rivalName,
            rivalFinish: otherPos,
            myDriverName: householdDisplayName(row, nameLookup) || driverNameRaw,
          });
        }
        if (finish == null || otherPos == null) return;
        if (Math.abs(otherPos - finish) <= 2) {
          bucket.rivalCounts.set(rivalName, (bucket.rivalCounts.get(rivalName) || 0) + 1);
        }
      });
    });
  }

  const classBundles = [...classMap.values()].map((bucket) => {
    const finishes = bucket.finishes.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    const laps = bucket.laps.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    const finishValues = finishes.map((p) => p.finish).filter((n) => n != null);
    const bestFinish = finishValues.length ? Math.min(...finishValues) : null;
    const avgFinish = finishValues.length
      ? Math.round((finishValues.reduce((s, n) => s + n, 0) / finishValues.length) * 10) / 10
      : null;
    const lapMs = laps.map((p) => p.fastLapMs).filter(Boolean);
    const bestLapMs = lapMs.length ? Math.min(...lapMs) : null;
    const lapTrendMs =
      laps.length >= 2 ? laps[laps.length - 1].fastLapMs - laps[0].fastLapMs : null;

    const rivals = [...bucket.rivalCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, closeRaces]) => ({ name, closeRaces }));

    const matchupsByRivalKey = Object.fromEntries(
      [...bucket.matchupsByRival.entries()].map(([key, rows]) => [
        key,
        rows.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)),
      ])
    );

    return {
      className: bucket.className,
      starts: finishValues.length,
      bestFinish,
      avgFinish,
      bestLapMs,
      lapTrendMs,
      driverNames: [...bucket.driverNameKeys.values()],
      eventFinishes: finishes,
      eventLaps: laps,
      monthlyFinishes: aggregateFinishesByMonth(finishes),
      monthlyLaps: aggregateLapsByMonth(laps),
      rivals,
      matchupsByRivalKey,
    };
  });

  classBundles.sort((a, b) => b.starts - a.starts || a.className.localeCompare(b.className));

  const classEntries = classBundles.reduce((sum, row) => sum + row.starts, 0);

  return {
    eventsWithResults,
    classEntries,
    classBundles,
  };
}