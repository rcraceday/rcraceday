// src/app/pages/events/EventDetailsSections/EventDetailsPricing.jsx

import { useTranslation } from "@/app/i18n/I18nContext";

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
  const { t } = useTranslation();
  const pricing = event.pricing;
  if (!pricing) return null;

  const mode = pricing.mode;
  const hasLateFee = pricing.late_fee && Number(pricing.late_fee) > 0;
  const chargePreferences = pricing.charge_preferences === true;

  return (
    <div className="space-y-6 text-sm text-text-muted leading-tight">

      {mode === "per_entry" && (
        <div className="space-y-2">
          {pricing.global?.free ? (
            <p className="font-semibold text-base">{t("events.eventFree")}</p>
          ) : (
            <>
              <p>
                <strong>{t("events.memberShort")}:</strong> {money(pricing.global?.member)}
              </p>
              <p>
                <strong>{t("events.nonMemberShort")}:</strong> {money(pricing.global?.non_member)}
              </p>
              <p>
                <strong>{t("events.juniorShort")}:</strong> {money(pricing.global?.junior)}
              </p>
            </>
          )}

          {chargePreferences && (
            <p>
              <strong>{t("events.preferencesLabel")}</strong> {t("events.preferencesExtra")}
            </p>
          )}
        </div>
      )}

      {mode === "tiered" && (
        <div className="space-y-4">

          <div>
            <strong className="block mb-1">{t("events.memberShort")}</strong>
            <p>{t("events.firstClass")} {money(pricing.tiered?.member?.first_class)}</p>
            <p>
              {t("events.additionalClass")} {money(pricing.tiered?.member?.additional_class)}
            </p>
          </div>

          <div>
            <strong className="block mb-1">{t("events.nonMemberShort")}</strong>
            <p>{t("events.firstClass")} {money(pricing.tiered?.non_member?.first_class)}</p>
            <p>
              {t("events.additionalClass")} {money(pricing.tiered?.non_member?.additional_class)}
            </p>
          </div>

          <div>
            <strong className="block mb-1">{t("events.juniorShort")}</strong>
            <p>{t("events.firstClass")} {money(pricing.tiered?.junior?.first_class)}</p>
            <p>
              {t("events.additionalClass")} {money(pricing.tiered?.junior?.additional_class)}
            </p>
          </div>

          {chargePreferences && (
            <p>
              <strong>{t("events.preferencesLabel")}</strong> {t("events.preferencesExtra")}
            </p>
          )}
        </div>
      )}

      {mode === "per_class" && (
        <div className="space-y-4">
          {Object.entries(pricing.class_prices || {}).map(([classId, cp]) => (
            <div key={classId} className="space-y-1">

              <strong className="block">{t("events.classIdLabel", { id: classId })}</strong>

              {cp.free ? (
                <p>{t("events.freeLabel")}</p>
              ) : (
                <>
                  <p>{t("events.memberShort")}: {money(cp.member)}</p>
                  <p>{t("events.nonMemberShort")}: {money(cp.non_member)}</p>
                  <p>{t("events.juniorShort")}: {money(cp.junior)}</p>
                </>
              )}
            </div>
          ))}

          {chargePreferences && (
            <p>
              <strong>{t("events.preferencesLabel")}</strong> {t("events.preferencesExtra")}
            </p>
          )}
        </div>
      )}

      {hasLateFee && (
        <div className="text-sm text-text-muted">
          <strong>{t("events.lateFeeLabel")}</strong> {money(pricing.late_fee)}
        </div>
      )}
    </div>
  );
}
