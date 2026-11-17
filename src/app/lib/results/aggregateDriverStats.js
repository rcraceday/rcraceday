import { normalizeDriverName } from "./driverName.js";
import { looksLikeOverallResultCell, parseOverallResultFinishes } from "./resultTime.js";

function driverMatchesRow(entry, row) {
  if (row.driverId && entry.driverId === row.driverId) return true;
  return normalizeDriverName(entry.driverNameRaw) === normalizeDriverName(row.driverNameRaw);
}

function isScoredMain(race) {
  return race?.raceKind !== "qualifying";
}

function mainLetterForRace(race) {
  return String(race?.mainLetter || "A").toUpperCase();
}

/** All main finishes for this driver in class (any main letter). */
export function allMainFinishesForDriver(row, races) {
  const grouped = new Map();
  (races || []).forEach((race) => {
    if (!isScoredMain(race)) return;
    const letter = mainLetterForRace(race);
    const mainNumber = race.mainNumber ?? 1;
    const entry = (race.entries || []).find((item) => driverMatchesRow(item, row));
    if (!entry) return;
    const key = `${letter}::${mainNumber}`;
    const finish = entry.position;
    const prev = grouped.get(key);
    if (!prev || (finish != null && prev.finish == null)) {
      grouped.set(key, { letter, mainNumber, finish });
    }
  });
  return [...grouped.values()].sort((a, b) => {
    const letterCmp = a.letter.localeCompare(b.letter);
    if (letterCmp !== 0) return letterCmp;
    return (a.mainNumber || 0) - (b.mainNumber || 0);
  });
}

/** Race result rows for this driver in the same class main (e.g. A1, A2, A3). */
export function driverMainEntries(row, races) {
  const letter = String(row.mainLetter || "A").toUpperCase();
  return (races || []).flatMap((race) => {
    if (!isScoredMain(race)) return [];
    if (mainLetterForRace(race) !== letter) return [];
    return (race.entries || [])
      .filter((entry) => driverMatchesRow(entry, row))
      .map((entry) => ({ ...entry, race }));
  });
}

/** Fastest lap, lap-weighted avg lap & consistency across all mains for the day. */
export function aggregateDriverMainStats(row, races) {
  let pool = driverMainEntries(row, races);
  if (!pool.length) {
    pool = (races || [])
      .filter((race) => isScoredMain(race))
      .flatMap((race) =>
        (race.entries || [])
          .filter((entry) => driverMatchesRow(entry, row))
          .map((entry) => ({ ...entry, race }))
      );
  }
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

function sortMainFinishes(mains) {
  return [...mains].sort((a, b) => {
    const letterCmp = a.letter.localeCompare(b.letter);
    if (letterCmp !== 0) return letterCmp;
    return (a.mainNumber || 0) - (b.mainNumber || 0);
  });
}

/** All main finishes for a driver (imported overall JSON + main race pages). */
export function mergedMainFinishesForDriver(row, races, options = {}) {
  const map = new Map();
  const groupLetter = String(row.mainLetter || "A").toUpperCase();
  const sameLetterOnly = options.sameLetterOnly !== false;
  const add = ({ letter, mainNumber, finish, overwrite = true }) => {
    if (finish == null || finish === "") return;
    const group = String(letter || groupLetter).toUpperCase();
    if (sameLetterOnly && group !== groupLetter) return;
    const segment = mainNumber ?? 1;
    const key = `${group}::${segment}`;
    if (!overwrite && map.has(key)) return;
    map.set(key, { letter: group, mainNumber: segment, finish });
  };

  (row.mains || []).forEach((main, index) => {
    add({
      letter: main.letter || main.main_letter || groupLetter,
      mainNumber: main.mainNumber ?? main.main_number ?? index + 1,
      finish: main.finish ?? main.position,
    });
  });

  allMainFinishesForDriver(row, races).forEach((main) => add(main));

  // Overall Result is often `[total] [counting] [counting]`, not A1/A2/A3 positions.
  if (map.size === 0) {
    const finishes = parseOverallResultFinishes(row.tieBreaker || row.resultLabel);
    const countingSum = finishes.slice(1).reduce((sum, value) => sum + value, 0);
    const positions =
      finishes.length >= 2 && finishes[0] === countingSum ? finishes.slice(1) : finishes;
    positions.forEach((finish, index) => {
      add({ letter: groupLetter, mainNumber: index + 1, finish, overwrite: false });
    });
  }

  return sortMainFinishes([...map.values()]);
}

/** Recover a driver name when overall import stored a Result cell as the name. */
export function displayOverallDriverName(row, races) {
  const raw = row?.driverNameRaw;
  if (!looksLikeOverallResultCell(raw)) return raw;
  const letter = String(row.mainLetter || "A").toUpperCase();
  const finish =
    parseOverallResultFinishes(row.tieBreaker || row.resultLabel || raw)[0] ??
    row.position;
  const classRaces = (races || []).filter(
    (race) =>
      race.raceKind !== "qualifying" &&
      String(race.mainLetter || "A").toUpperCase() === letter
  );
  const preferred =
    classRaces.find((race) => (race.mainNumber ?? 1) === 1) || classRaces[0];
  const entry = (preferred?.entries || []).find((item) => item.position === finish);
  return entry?.driverNameRaw || raw;
}

/** Final Results column: only the main group this driver finished in (A1–A3, C1, …). */
export function formatOverallMainsColumn(row, races) {
  const mains = mergedMainFinishesForDriver(row, races, { sameLetterOnly: true });
  if (!mains.length) return "—";

  return mains
    .map((main) => {
      const segment = main.mainNumber ?? 1;
      const finish = main.finish ?? "—";
      return `${main.letter}${segment}: ${finish}`;
    })
    .join(" · ");
}

function mainFinishPoints(mains) {
  return (mains || [])
    .map((main) => Number(main.finish ?? main.points))
    .filter((value) => Number.isFinite(value));
}

export function computeIfmarPoints(mains, dropWorstCount = 0) {
  const pts = mainFinishPoints(mains);
  if (!pts.length) return null;
  const drop = Math.min(Math.max(0, dropWorstCount), Math.max(0, pts.length - 1));
  const kept = [...pts].sort((a, b) => a - b).slice(0, pts.length - drop);
  return kept.reduce((sum, value) => sum + value, 0);
}

/** Match LiveRC IFMAR drop (usually drop 1 of 3 A-mains) from rows that already have points. */
export function inferIfmarDropCount(rows) {
  for (const row of rows || []) {
    if (row.ifmarPoints == null || row.ifmarPoints === "") continue;
    const pts = mainFinishPoints(row.mains);
    if (pts.length < 2) continue;
    const sumAll = pts.reduce((sum, value) => sum + value, 0);
    const drop1 = sumAll - Math.max(...pts);
    if (Number(row.ifmarPoints) === drop1 && drop1 !== sumAll) return 1;
    if (Number(row.ifmarPoints) === sumAll) return 0;
  }
  const maxMains = Math.max(0, ...(rows || []).map((row) => (row.mains || []).length));
  return maxMains >= 3 ? 1 : 0;
}

/** Fill empty overall mains / main letter from imported main race result pages. */
export function enrichOverallRowsFromRaces(overall, races) {
  const withMains = (overall || []).map((row) => {
    const finishes = mergedMainFinishesForDriver(row, races, { sameLetterOnly: true });
    if (!finishes.length) return row;
    return {
      ...row,
      mains: finishes.map((item) => ({
        letter: item.letter,
        mainNumber: item.mainNumber,
        finish: item.finish,
      })),
    };
  });
  const dropWorst = inferIfmarDropCount(withMains);
  return withMains.map((row) => {
    if (row.ifmarPoints != null && row.ifmarPoints !== "") return row;
    const ifmarPoints = computeIfmarPoints(row.mains, dropWorst);
    return ifmarPoints == null ? row : { ...row, ifmarPoints };
  });
}

export function latestMainEntry(row, races) {
  const pool = driverMainEntries(row, races);
  if (pool.length) {
    return pool.sort((a, b) => (b.race.mainNumber || 0) - (a.race.mainNumber || 0))[0];
  }
  const finishes = allMainFinishesForDriver(row, races);
  if (!finishes.length) return null;
  const last = finishes[finishes.length - 1];
  return (
    (races || [])
      .flatMap((race) =>
        (race.entries || [])
          .filter((entry) => driverMatchesRow(entry, row))
          .map((entry) => ({ ...entry, race }))
      )
      .find(
        (item) =>
          mainLetterForRace(item.race) === last.letter &&
          (item.race.mainNumber ?? 1) === (last.mainNumber ?? 1)
      ) || null
  );
}