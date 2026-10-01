import { normalizeDriverName } from "./driverName.js";

function driverMatchesRow(entry, row) {
  if (row.driverId && entry.driverId === row.driverId) return true;
  return normalizeDriverName(entry.driverNameRaw) === normalizeDriverName(row.driverNameRaw);
}

function isScoredMain(race) {
  return race?.raceKind !== "qualifying" && race?.mainNumber != null;
}

/** Race result rows for this driver in the same class main (e.g. A1, A2, A3). */
export function driverMainEntries(row, races) {
  const letter = row.mainLetter || "A";
  return (races || []).flatMap((race) => {
    if (!isScoredMain(race)) return [];
    if ((race.mainLetter || "A") !== letter) return [];
    return (race.entries || [])
      .filter((entry) => driverMatchesRow(entry, row))
      .map((entry) => ({ ...entry, race }));
  });
}

/** Fastest lap, lap-weighted avg lap & consistency across all mains for the day. */
export function aggregateDriverMainStats(row, races) {
  const pool = driverMainEntries(row, races);
  if (!pool.length) {
    return { fastLapMs: null, avgLapMs: null, consistencyPct: null };
  }

  const fastLaps = pool.map((item) => item.fastLapMs).filter((ms) => ms != null && ms > 0);
  const fastLapMs = fastLaps.length ? Math.min(...fastLaps) : null;

  let lapWeightSum = 0;
  let avgWeighted = 0;
  let consWeighted = 0;
  let consWeight = 0;

  pool.forEach((entry) => {
    const laps = entry.laps;
    if (entry.avgLapMs != null && laps != null && laps > 0) {
      avgWeighted += entry.avgLapMs * laps;
      lapWeightSum += laps;
    }
    if (entry.consistencyPct != null && laps != null && laps > 0) {
      consWeighted += entry.consistencyPct * laps;
      consWeight += laps;
    }
  });

  let avgLapMs = lapWeightSum > 0 ? Math.round(avgWeighted / lapWeightSum) : null;
  if (avgLapMs == null) {
    const avgs = pool.map((item) => item.avgLapMs).filter((ms) => ms != null);
    avgLapMs = avgs.length ? Math.round(avgs.reduce((sum, ms) => sum + ms, 0) / avgs.length) : null;
  }

  let consistencyPct = consWeight > 0 ? Math.round((consWeighted / consWeight) * 10) / 10 : null;
  if (consistencyPct == null) {
    const values = pool.map((item) => item.consistencyPct).filter((pct) => pct != null);
    consistencyPct = values.length
      ? Math.round((values.reduce((sum, pct) => sum + pct, 0) / values.length) * 10) / 10
      : null;
  }

  return { fastLapMs, avgLapMs, consistencyPct };
}

/** Latest main row for seed / TQ (e.g. A3). */
export function formatOverallMainsColumn(row, races) {
  const letter = String(row.mainLetter || "A").toUpperCase();
  let mains = Array.isArray(row.mains) ? row.mains : [];
  if (!mains.length && races?.length) {
    mains = driverMainEntries(row, races)
      .sort((a, b) => (a.race.mainNumber || 0) - (b.race.mainNumber || 0))
      .map((entry) => ({
        mainNumber: entry.race.mainNumber,
        finish: entry.position,
      }));
  }
  if (!mains.length) return "—";
  return mains
    .map((main) => {
      const segment = main.mainNumber ?? main.main_number;
      const finish = main.finish ?? main.position ?? "—";
      return `${letter}${segment}: ${finish}`;
    })
    .join(" · ");
}

export function latestMainEntry(row, races) {
  const pool = driverMainEntries(row, races);
  if (!pool.length) {
    return (races || [])
      .flatMap((race) =>
        (race.entries || [])
          .filter((entry) => driverMatchesRow(entry, row))
          .map((entry) => ({ ...entry, race }))
      )
      .sort((a, b) => (b.race.mainNumber || 0) - (a.race.mainNumber || 0))[0] || null;
  }
  return pool.sort((a, b) => (b.race.mainNumber || 0) - (a.race.mainNumber || 0))[0];
}
