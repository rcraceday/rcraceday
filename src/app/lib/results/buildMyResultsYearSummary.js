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

const TOP_RIVALS_LIMIT = 5;

function topRivalsByAverageGap(matchupsByRival, limit = TOP_RIVALS_LIMIT) {
  const stats = [];
  for (const rows of matchupsByRival.values()) {
    if (!rows?.length) continue;
    const gaps = rows
      .filter((row) => row.myFinish != null && row.rivalFinish != null)
      .map((row) => Math.abs(row.rivalFinish - row.myFinish));
    if (!gaps.length) continue;
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    stats.push({
      name: rows[0].rivalName,
      avgGap: Math.round(avgGap * 10) / 10,
      sharedEvents: gaps.length,
    });
  }
  stats.sort(
    (a, b) =>
      a.avgGap - b.avgGap ||
      b.sharedEvents - a.sharedEvents ||
      a.name.localeCompare(b.name)
  );
  return stats.slice(0, limit);
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
  const competitorSnapshotKeys = new Set();
  let eventsWithResults = 0;

  function pushCompetitorFinish(bucket, name, point) {
    if (!name) return;
    if (!bucket.competitorFinishes.has(name)) bucket.competitorFinishes.set(name, []);
    bucket.competitorFinishes.get(name).push(point);
  }

  function pushCompetitorLap(bucket, name, point) {
    if (!name || !point.fastLapMs) return;
    if (!bucket.competitorLaps.has(name)) bucket.competitorLaps.set(name, []);
    bucket.competitorLaps.get(name).push(point);
  }

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
          matchupsByRival: new Map(),
          driverNameKeys: new Map(),
          competitorFinishes: new Map(),
          competitorLaps: new Map(),
        });
      }
      const bucket = classMap.get(className);
      rememberDriverName(bucket, row, nameLookup);

      const snapKey = `${event.id}|${className}`;
      if (!competitorSnapshotKeys.has(snapKey)) {
        competitorSnapshotKeys.add(snapKey);
        const classRacesSnap = races.filter((race) => race.className === className);
        const classRowsSnap = (bundle.overall || []).filter((r) => r.className === className);
        classRowsSnap.forEach((other) => {
          if (isMyRow(other, driverIds, driverNameKeys)) return;
          const rivalName = other.driverNameRaw || "Unknown";
          const otherFinish = other.overallPosition || other.position;
          if (otherFinish != null) {
            pushCompetitorFinish(bucket, rivalName, {
              eventId: event.id,
              eventDate: event.event_date,
              eventName: event.name,
              className,
              finish: otherFinish,
              driverNameRaw: rivalName,
            });
          }
          const otherLap = aggregateDriverMainStats(other, classRacesSnap);
          pushCompetitorLap(bucket, rivalName, {
            eventId: event.id,
            eventDate: event.event_date,
            eventName: event.name,
            className,
            fastLapMs: otherLap.fastLapMs,
            driverNameRaw: rivalName,
          });
        });
      }

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

    const rivals = topRivalsByAverageGap(bucket.matchupsByRival);

    const matchupsByRivalKey = Object.fromEntries(
      [...bucket.matchupsByRival.entries()].map(([key, rows]) => [
        key,
        rows.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)),
      ])
    );

    const competitors = Object.fromEntries(
      [...bucket.competitorFinishes.keys()].map((name) => {
        const compFinishes = (bucket.competitorFinishes.get(name) || []).sort(
          (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
        );
        const compLaps = (bucket.competitorLaps.get(name) || []).sort(
          (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
        );
        return [
          name,
          {
            name,
            eventFinishes: compFinishes,
            eventLaps: compLaps.filter((row) => row.fastLapMs),
            monthlyFinishes: aggregateFinishesByMonth(compFinishes),
            monthlyLaps: aggregateLapsByMonth(compLaps),
          },
        ];
      })
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
      competitors,
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

function rowMatchesDriver(row, driverName) {
  if (!driverName) return true;
  return normalizeDriverName(row?.driverNameRaw) === normalizeDriverName(driverName);
}

/** One class bundle filtered to a single household driver (multi-driver families). */
export function sliceClassBundleForDriver(bundle, driverName) {
  if (!bundle) return null;
  if (!driverName) return bundle;

  const finishes = (bundle.eventFinishes || []).filter((row) => rowMatchesDriver(row, driverName));
  const laps = (bundle.eventLaps || []).filter((row) => rowMatchesDriver(row, driverName));
  const finishValues = finishes.map((p) => p.finish).filter((n) => n != null);
  const bestFinish = finishValues.length ? Math.min(...finishValues) : null;
  const avgFinish = finishValues.length
    ? Math.round((finishValues.reduce((s, n) => s + n, 0) / finishValues.length) * 10) / 10
    : null;
  const lapMs = laps.map((p) => p.fastLapMs).filter(Boolean);
  const bestLapMs = lapMs.length ? Math.min(...lapMs) : null;
  const lapTrendMs = laps.length >= 2 ? laps[laps.length - 1].fastLapMs - laps[0].fastLapMs : null;

  const matchupsByRivalKey = Object.fromEntries(
    Object.entries(bundle.matchupsByRivalKey || {})
      .map(([key, rows]) => [
        key,
        rows.filter(
          (row) => normalizeDriverName(row.myDriverName) === normalizeDriverName(driverName)
        ),
      ])
      .filter(([, rows]) => rows.length > 0)
  );

  const matchupsByRival = new Map(Object.entries(matchupsByRivalKey));
  const rivals = topRivalsByAverageGap(matchupsByRival);

  return {
    ...bundle,
    starts: finishValues.length,
    bestFinish,
    avgFinish,
    bestLapMs,
    lapTrendMs,
    driverNames: [driverName],
    eventFinishes: finishes,
    eventLaps: laps,
    monthlyFinishes: aggregateFinishesByMonth(finishes),
    monthlyLaps: aggregateLapsByMonth(laps),
    rivals,
    matchupsByRivalKey,
    competitors: bundle.competitors,
  };
}

export function competitorSeriesPoints(competitor, field, { monthlyFirst, formatShortDate }) {
  if (!competitor) return [];
  const monthly = field === "lap" ? competitor.monthlyLaps : competitor.monthlyFinishes;
  const events = field === "lap" ? competitor.eventLaps : competitor.eventFinishes;
  if (monthlyFirst && monthly?.length > 0) {
    return monthly.map((row) => ({
      id: row.monthKey,
      sortKey: row.monthKey,
      monthLabel: row.monthLabel,
      value: field === "lap" ? row.fastLapMs : row.finish,
    }));
  }
  return (events || []).map((row, i) => ({
    id: `${row.eventId}-${i}`,
    sortKey: row.eventDate,
    monthLabel: formatShortDate?.(row.eventDate) || row.eventDate,
    value: field === "lap" ? row.fastLapMs : row.finish,
  }));
}