export function emptyPointAdjustments() {
  return { driverDelta: {}, roundPoints: {}, mergedDrivers: {}, manualRounds: [] };
}

export function normalizePointAdjustments(raw) {
  if (!raw || typeof raw !== "object") return emptyPointAdjustments();
  return {
    driverDelta: raw.driverDelta && typeof raw.driverDelta === "object" ? raw.driverDelta : {},
    roundPoints: raw.roundPoints && typeof raw.roundPoints === "object" ? raw.roundPoints : {},
    mergedDrivers:
      raw.mergedDrivers && typeof raw.mergedDrivers === "object" ? raw.mergedDrivers : {},
    manualRounds: Array.isArray(raw.manualRounds) ? raw.manualRounds : [],
  };
}

/** Credit result rows under another name/key toward this driver (e.g. Livetime name change). */
export function canonicalDriverKey(adjustments, className, driverKey) {
  const merged = adjustments?.mergedDrivers?.[className];
  if (!merged) return driverKey;
  for (const [canonical, config] of Object.entries(merged)) {
    const aliases = config?.aliases || [];
    if (canonical === driverKey || aliases.includes(driverKey)) return canonical;
  }
  return driverKey;
}

export function getDriverAliases(adjustments, className, canonicalKey) {
  return adjustments?.mergedDrivers?.[className]?.[canonicalKey]?.aliases || [];
}

export function addDriverAlias(adjustments, className, canonicalKey, aliasKey) {
  const next = normalizePointAdjustments(adjustments);
  const alias = String(aliasKey || "").trim();
  if (!alias || alias === canonicalKey) return next;
  if (!next.mergedDrivers[className]) next.mergedDrivers[className] = {};
  const entry = next.mergedDrivers[className][canonicalKey] || { aliases: [] };
  const aliases = [...new Set([...(entry.aliases || []), alias])].filter((a) => a !== canonicalKey);
  next.mergedDrivers[className][canonicalKey] = { ...entry, aliases };
  return next;
}

export function removeDriverAlias(adjustments, className, canonicalKey, aliasKey) {
  const next = normalizePointAdjustments(adjustments);
  const entry = next.mergedDrivers[className]?.[canonicalKey];
  if (!entry) return next;
  const aliases = (entry.aliases || []).filter((a) => a !== aliasKey);
  if (!aliases.length) {
    delete next.mergedDrivers[className][canonicalKey];
    if (!Object.keys(next.mergedDrivers[className]).length) delete next.mergedDrivers[className];
  } else {
    next.mergedDrivers[className][canonicalKey] = { ...entry, aliases };
  }
  return next;
}

export function addManualRound(adjustments, round) {
  const next = normalizePointAdjustments(adjustments);
  const entry = {
    id: round.id || `mr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    className: round.className,
    driverKey: round.driverKey,
    eventId: round.eventId,
    eventName: round.eventName || "",
    position: round.position != null ? Number(round.position) : null,
    points: Number(round.points) || 0,
    note: String(round.note || "").trim(),
  };
  next.manualRounds = [...next.manualRounds.filter((r) => r.id !== entry.id), entry];
  return next;
}

export function removeManualRound(adjustments, roundId) {
  const next = normalizePointAdjustments(adjustments);
  next.manualRounds = next.manualRounds.filter((r) => r.id !== roundId);
  return next;
}

/** Names/keys seen in published results for a class (for linking former names). */
export function listClassResultDrivers(rounds, className, normalizeDriverName) {
  const map = new Map();
  (rounds || []).forEach((round) => {
    (round.overall || [])
      .filter((row) => row.className === className)
      .forEach((row) => {
        const key = row.driverId || `name:${normalizeDriverName(row.driverNameRaw)}`;
        if (!map.has(key)) map.set(key, row.driverNameRaw);
      });
  });
  return [...map.entries()].map(([key, label]) => ({ key, label }));
}

export function roundPointsKey(eventId, className, driverKey) {
  return `${eventId}|${className}|${driverKey}`;
}

export function getDriverDelta(adjustments, className, driverKey) {
  const delta = adjustments?.driverDelta?.[className]?.[driverKey]?.delta;
  return Number(delta) || 0;
}

export function getRoundPointsOverride(adjustments, eventId, className, driverKey) {
  const key = roundPointsKey(eventId, className, driverKey);
  const value = adjustments?.roundPoints?.[key];
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function setDriverDelta(adjustments, className, driverKey, delta, note = "") {
  const next = normalizePointAdjustments(adjustments);
  if (!next.driverDelta[className]) next.driverDelta[className] = {};
  const num = Number(delta) || 0;
  if (num === 0 && !String(note || "").trim()) {
    delete next.driverDelta[className][driverKey];
    if (!Object.keys(next.driverDelta[className]).length) delete next.driverDelta[className];
  } else {
    next.driverDelta[className][driverKey] = {
      delta: num,
      note: String(note || "").trim(),
    };
  }
  return next;
}

export function setRoundPointsOverride(adjustments, eventId, className, driverKey, points) {
  const next = normalizePointAdjustments(adjustments);
  const key = roundPointsKey(eventId, className, driverKey);
  if (points == null || points === "" || !Number.isFinite(Number(points))) {
    delete next.roundPoints[key];
  } else {
    next.roundPoints[key] = Number(points);
  }
  return next;
}
