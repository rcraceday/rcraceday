// src/app/pages/events/EventDetailsSections/EventDetailsPricing.jsx

/* ===========================
   HELPERS
   =========================== */

function money(value) {
  if (value === null || value === undefined) return "$0";
  return `$${Number(value).toFixed(2)}`;
}

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsPricing({ event }) {
  const pricing = event.pricing;
  if (!pricing) return null;

  const mode = pricing.mode;
  const hasLateFee = pricing.late_fee && Number(pricing.late_fee) > 0;
  const chargePreferences = pricing.charge_preferences === true;

  return (
    <div className="space-y-6 text-sm text-text-muted leading-tight">

      {/* ===========================
          PER ENTRY
      =========================== */}
      {mode === "per_entry" && (
        <div className="space-y-2">
          {pricing.global?.free ? (
            <p className="font-semibold text-base">This event is free.</p>
          ) : (
            <>
              <p>
                <strong>Member:</strong> {money(pricing.global?.member)}
              </p>
              <p>
                <strong>Non‑Member:</strong> {money(pricing.global?.non_member)}
              </p>
              <p>
                <strong>Junior:</strong> {money(pricing.global?.junior)}
              </p>
            </>
          )}

          {chargePreferences && (
            <p>
              <strong>Preferences:</strong> Additional charges apply
            </p>
          )}
        </div>
      )}

      {/* ===========================
          TIERED PRICING
      =========================== */}
      {mode === "tiered" && (
        <div className="space-y-4">

          {/* MEMBER */}
          <div>
            <strong className="block mb-1">Member</strong>
            <p>First Class: {money(pricing.tiered?.member?.first_class)}</p>
            <p>
              Additional Class: {money(pricing.tiered?.member?.additional_class)}
            </p>
          </div>

          {/* NON-MEMBER */}
          <div>
            <strong className="block mb-1">Non‑Member</strong>
            <p>First Class: {money(pricing.tiered?.non_member?.first_class)}</p>
            <p>
              Additional Class: {money(pricing.tiered?.non_member?.additional_class)}
            </p>
          </div>

          {/* JUNIOR */}
          <div>
            <strong className="block mb-1">Junior</strong>
            <p>First Class: {money(pricing.tiered?.junior?.first_class)}</p>
            <p>
              Additional Class: {money(pricing.tiered?.junior?.additional_class)}
            </p>
          </div>

          {chargePreferences && (
            <p>
              <strong>Preferences:</strong> Additional charges apply
            </p>
          )}
        </div>
      )}

      {/* ===========================
          PER CLASS PRICING
      =========================== */}
      {mode === "per_class" && (
        <div className="space-y-4">
          {Object.entries(pricing.class_prices || {}).map(([classId, cp]) => (
            <div key={classId} className="space-y-1">

              <strong className="block">Class {classId}</strong>

              {cp.free ? (
                <p>Free</p>
              ) : (
                <>
                  <p>Member: {money(cp.member)}</p>
                  <p>Non‑Member: {money(cp.non_member)}</p>
                  <p>Junior: {money(cp.junior)}</p>
                </>
              )}
            </div>
          ))}

          {chargePreferences && (
            <p>
              <strong>Preferences:</strong> Additional charges apply
            </p>
          )}
        </div>
      )}

      {/* ===========================
          LATE FEE
      =========================== */}
      {hasLateFee && (
        <div className="text-sm text-text-muted">
          <strong>Late Fee:</strong> {money(pricing.late_fee)}
        </div>
      )}
    </div>
  );
}
