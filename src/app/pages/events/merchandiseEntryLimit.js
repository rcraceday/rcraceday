function normalizePurchaseLines(entry) {
  if (Array.isArray(entry?.lines)) {
    const fromLines = entry.lines.filter((line) => Number(line?.qty || 0) > 0);
    if (fromLines.length) return fromLines;
  }
  const qty = Number(entry?.qty || 0);
  if (qty <= 0) return [];
  return [{ options: entry?.options || {}, qty }];
}

function totalLineQty(lines) {
  return (lines || []).reduce((sum, line) => sum + Number(line?.qty || 0), 0);
}

export function getMerchItemId(item, index) {
  return item?.id || `merch-${index}`;
}

export function numericEntryLimit(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function driverClaimsMerchItem(item, itemId, selection, hasRacingClasses) {
  if (!hasRacingClasses) return false;
  if (item.included || item.compulsory) return true;
  const entry = selection?.merch?.[itemId] ?? selection?.merch?.[item.id];
  return totalLineQty(normalizePurchaseLines(entry)) > 0;
}

export function aggregateMerchEntryCounts(merchandise, nominations, excludeGroupId) {
  const totals = {};
  const items = Array.isArray(merchandise) ? merchandise : [];

  (nominations || []).forEach((row) => {
    if (excludeGroupId && row.group_id === excludeGroupId) return;
    const merchMap =
      row.merchandise?.merch && typeof row.merchandise.merch === "object"
        ? row.merchandise.merch
        : {};

    items.forEach((item, idx) => {
      if (!numericEntryLimit(item.max_entries)) return;
      const itemId = getMerchItemId(item, idx);
      let claimed = false;
      if (item.included || item.compulsory) {
        claimed = true;
      } else {
        const entry = merchMap[itemId] ?? merchMap[item.id];
        claimed = totalLineQty(normalizePurchaseLines(entry)) > 0;
      }
      if (claimed) totals[itemId] = (totals[itemId] || 0) + 1;
    });
  });

  return totals;
}

export function isMerchItemVisibleForDriver(item, itemIndex, driverId, ctx) {
  const limit = numericEntryLimit(item.max_entries);
  if (!limit) return true;

  const itemId = getMerchItemId(item, itemIndex);
  const selection = ctx.selections?.[driverId];
  const hasRacingClasses = ctx.hasRacingClasses?.(selection);
  if (!hasRacingClasses) return false;

  const external = ctx.externalCounts?.[itemId] || 0;
  let otherLocalClaims = 0;
  let selfClaims = false;

  (ctx.drivers || []).forEach((driver) => {
    const driverSelection = ctx.selections?.[driver.id];
    const claims = driverClaimsMerchItem(
      item,
      itemId,
      driverSelection,
      ctx.hasRacingClasses?.(driverSelection)
    );
    if (!claims) return;
    if (driver.id === driverId) selfClaims = true;
    else otherLocalClaims += 1;
  });

  if (selfClaims) return external + otherLocalClaims + 1 <= limit;
  return external + otherLocalClaims < limit;
}

export function sanitizeSelectionMerch(merchandise, selection, driverId, ctx) {
  const merch = { ...(selection?.merch || {}) };
  (merchandise || []).forEach((item, idx) => {
    if (isMerchItemVisibleForDriver(item, idx, driverId, ctx)) return;
    const itemId = getMerchItemId(item, idx);
    delete merch[itemId];
    if (item.id) delete merch[item.id];
  });
  return merch;
}

export function remainingMerchEntrySlots(item, itemIndex, ctx, driverId) {
  const limit = numericEntryLimit(item.max_entries);
  if (!limit) return null;
  const itemId = getMerchItemId(item, itemIndex);
  const external = ctx.externalCounts?.[itemId] || 0;
  let localClaims = 0;
  (ctx.drivers || []).forEach((driver) => {
    const driverSelection = ctx.selections?.[driver.id];
    if (
      driverClaimsMerchItem(
        item,
        itemId,
        driverSelection,
        ctx.hasRacingClasses?.(driverSelection)
      )
    ) {
      localClaims += 1;
    }
  });
  return Math.max(0, limit - external - localClaims);
}
