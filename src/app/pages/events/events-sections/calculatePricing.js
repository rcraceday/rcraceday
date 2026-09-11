export function calculateUserPricing({
  event,
  pricing,
  selectedClasses,
  membershipType, // "member" | "non_member" | "junior"
  preferenceMap = {} // { classId: true/false }
}) {
  if (!pricing || !event) return { total: 0 };

  const mode = pricing.mode || "per_entry";
  const now = new Date();

  // -----------------------------
  // 1. Determine Late Entry Status
  // -----------------------------
  const nominationsClose = new Date(event.nominations_close);
  const lateEnabled = !!event.late_entries_enabled;

  let isLate = false;

  if (lateEnabled) {
    const lateStart = event.late_fee_activation
      ? new Date(event.late_fee_activation)
      : new Date(nominationsClose.getTime() + 1000);

    const lateEnd = event.late_entries_close
      ? new Date(event.late_entries_close)
      : null;

    if (now >= lateStart && (!lateEnd || now <= lateEnd)) {
      isLate = true;
    }
  }

  // If late entries disabled AND nominations closed → no nomination allowed
  if (!lateEnabled && now > nominationsClose) {
    return { error: "Nominations are closed", total: 0 };
  }

  // -----------------------------
  // 2. Global Free Entry
  // -----------------------------
  if (pricing.global?.free) {
    return { total: 0, isLate };
  }

  // -----------------------------
  // 3. Pricing Modes
  // -----------------------------
  let total = 0;

  // ============================================================
  // MODE: PER ENTRY PRICING
  // ============================================================
  if (mode === "per_entry") {
    const base = Math.max(0, Number(pricing.global?.[membershipType] || 0));
    total += base;

    const chargePrefs = pricing.charge_preferences;

    for (const classId of selectedClasses) {
      const isPref = preferenceMap[classId] === true;
      if (isPref && !chargePrefs) continue;
    }
  }

  // ============================================================
  // MODE: TIERED PRICING
  // ============================================================
  if (mode === "tiered") {
    const tier = pricing.tiered?.[membershipType] || {};

    const firstClassPrice = Math.max(0, Number(tier.first_class || 0));
    const additionalClassPrice = Math.max(0, Number(tier.additional_class || 0));

    const chargePrefs = pricing.charge_preferences;

    let classCount = 0;

    for (const classId of selectedClasses) {
      const isPref = preferenceMap[classId] === true;

      if (isPref && !chargePrefs) continue;

      if (classCount === 0) {
        total += firstClassPrice;
      } else {
        total += additionalClassPrice;
      }

      classCount++;
    }
  }

  // ============================================================
  // MODE: PER-CLASS PRICING
  // ============================================================
  if (mode === "per_class") {
    const classPrices = pricing.class_prices || {};
    const chargePrefs = pricing.charge_preferences;

    for (const classId of selectedClasses) {
      const isPref = preferenceMap[classId] === true;

      if (isPref && !chargePrefs) continue;

      const override = classPrices[classId];

      if (override?.free) continue;

      if (override) {
        const price = Math.max(
          0,
          Number(override[membershipType] || 0)
        );
        total += price;
      }
    }
  }

  // ============================================================
  // 4. Late Fee
  // ============================================================
  if (isLate && pricing.late_fee) {
    total += Math.max(0, Number(pricing.late_fee));
  }

  return { total, isLate };
}
