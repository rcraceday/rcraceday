export const TRANSPONDER_MAX_LENGTH = 8;

export function sanitizeTransponderNumber(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, TRANSPONDER_MAX_LENGTH);
}

export function isValidTransponderNumber(value) {
  const n = sanitizeTransponderNumber(value);
  return n.length > 0 && /^[0-9]{1,8}$/.test(n);
}

/** Sorted unique suggestion strings (global inventory + per-driver/class values). */
export function mergeTransponderSuggestions(globalNumbers = [], extraNumbers = []) {
  const values = new Set();
  globalNumbers.forEach((item) => {
    const n = sanitizeTransponderNumber(item);
    if (n) values.add(n);
  });
  extraNumbers.forEach((item) => {
    const n = sanitizeTransponderNumber(item);
    if (n) values.add(n);
  });
  return Array.from(values).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

export function findTransponderIdByNumber(rows, number) {
  const target = sanitizeTransponderNumber(number);
  if (!target) return null;
  const row = rows.find((r) => sanitizeTransponderNumber(r.number) === target);
  return row?.id ?? null;
}

/** Payload for driver_classes update (keeps denormalized number + optional FK). */
export function driverClassTransponderUpdatePayload(number, inventoryRows) {
  const sanitized = sanitizeTransponderNumber(number);
  const user_transponder_id = findTransponderIdByNumber(inventoryRows, sanitized);
  return {
    transponder_number: sanitized,
    user_transponder_id,
  };
}

export function isMissingUserTranspondersTable(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("user_transponders") &&
    (msg.includes("does not exist") || msg.includes("could not find"))
  );
}

function isMissingDriverClassTransponderFk(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("user_transponder_id");
}

/**
 * Save class transponder text + optional inventory FK (Phase 1).
 */
export async function persistDriverClassTransponder(
  supabase,
  {
    driverClassId = null,
    driverId = null,
    classId = null,
    number,
    inventoryRows = [],
    ensureTransponderNumber = null,
  }
) {
  const sanitized = sanitizeTransponderNumber(number);
  let invId = findTransponderIdByNumber(inventoryRows, sanitized);
  if (!invId && ensureTransponderNumber && sanitized) {
    invId = await ensureTransponderNumber(sanitized);
    if (invId) {
      const match = inventoryRows.find((r) => r.id === invId);
      if (!match) {
        inventoryRows = [
          ...inventoryRows,
          { id: invId, number: sanitized },
        ];
      }
    }
  }
  if (!invId && sanitized) {
    invId = findTransponderIdByNumber(inventoryRows, sanitized);
  }

  const fullPayload = {
    transponder_number: sanitized,
    user_transponder_id: invId,
  };

  let query = supabase.from("driver_classes").update(fullPayload);
  if (driverClassId) {
    query = query.eq("id", driverClassId);
  } else if (driverId && classId) {
    query = query.eq("driver_id", driverId).eq("class_id", classId);
  } else {
    return { error: new Error("Missing driver class keys") };
  }

  let { error } = await query;
  if (error && isMissingDriverClassTransponderFk(error)) {
    ({ error } = await supabase
      .from("driver_classes")
      .update({ transponder_number: sanitized })
      .match(
        driverClassId
          ? { id: driverClassId }
          : { driver_id: driverId, class_id: classId }
      ));
  }
  return { error: error ?? null, sanitized, user_transponder_id: invId };
}
