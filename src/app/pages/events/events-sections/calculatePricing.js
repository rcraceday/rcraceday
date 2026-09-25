import { isNominationsOpen } from "./helpers";

export function calculateUserPricing({
  event,
  pricing,
  selectedClasses,
  selectedClassEntries,
  membershipType, // "member" | "non_member" | "junior"
  preferenceMap = {} // { classId: true/false }
}) {
  if (!pricing || !event) return { total: 0 };

  const mode = pricing.mode || "per_entry";
  const now = new Date();

  // -----------------------------
  // 1. Determine Late Entry Status
  // -----------------------------
  const nominationsClose = event.nominations_close
    ? new Date(event.nominations_close)
    : null;
  const lateEnabled = !!event.late_entries_enabled;

  let isLate = false;

  if (lateEnabled && nominationsClose) {
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

  if (!isNominationsOpen(event, now)) {
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
    const entries =
      Array.isArray(selectedClassEntries) && selectedClassEntries.length > 0
        ? selectedClassEntries
        : (selectedClasses || []).map((classId) => ({
            classId,
            isPractice: false,
          }));

    const chargePrefs = pricing.charge_preferences;
    const billable = entries.filter((entry) => {
      if (entry?.openPractice) return true;
      if (!entry?.classId) return false;
      const isPref = preferenceMap[entry.classId] === true;
      return !(isPref && !chargePrefs);
    });

    const hasRacing = billable.some(
      (entry) => !entry.isPractice && !entry.openPractice
    );
    const hasPractice = billable.some(
      (entry) => entry.isPractice || entry.openPractice
    );

    if (hasRacing) {
      total += Math.max(0, Number(pricing.global?.[membershipType] || 0));
    }

    if (hasPractice) {
      const practicePrice = pricing.global?.practice?.[membershipType];
      if (practicePrice != null && practicePrice !== "") {
        total += Math.max(0, Number(practicePrice));
      }
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

    const entries =
      Array.isArray(selectedClassEntries) && selectedClassEntries.length > 0
        ? selectedClassEntries
        : (selectedClasses || []).map((classId) => ({
            classId,
            isPractice: false,
          }));

    let racingClassCount = 0;

    for (const entry of entries) {
      if (entry?.openPractice) {
        const practicePrice = tier.practice;
        if (practicePrice != null && practicePrice !== "") {
          total += Math.max(0, Number(practicePrice));
        }
        continue;
      }

      const classId = entry?.classId;
      if (!classId) continue;

      const isPref = preferenceMap[classId] === true;

      if (isPref && !chargePrefs) continue;

      if (entry.isPractice) {
        const practicePrice = tier.practice;
        if (practicePrice != null && practicePrice !== "") {
          total += Math.max(0, Number(practicePrice));
        }
        continue;
      }

      if (racingClassCount === 0) {
        total += firstClassPrice;
      } else {
        total += additionalClassPrice;
      }

      racingClassCount++;
    }
  }

  // ============================================================
  // MODE: PER-CLASS PRICING
  // ============================================================
  if (mode === "per_class") {
    const classPrices = pricing.class_prices || {};
    const chargePrefs = pricing.charge_preferences;

    const entries =
      Array.isArray(selectedClassEntries) && selectedClassEntries.length > 0
        ? selectedClassEntries
        : (selectedClasses || []).map((classId) => ({
            classId,
            isPractice: false,
          }));

    for (const entry of entries) {
      const classId = entry?.classId;
      if (!classId) continue;

      const isPref = preferenceMap[classId] === true;

      if (isPref && !chargePrefs) continue;

      const override = classPrices[classId];
      if (!override) continue;

      if (entry.isPractice) {
        const practicePrice = override.practice?.[membershipType];
        if (practicePrice != null && practicePrice !== "") {
          total += Math.max(0, Number(practicePrice));
        }
        continue;
      }

      if (override.free) continue;

      total += Math.max(0, Number(override[membershipType] || 0));
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
