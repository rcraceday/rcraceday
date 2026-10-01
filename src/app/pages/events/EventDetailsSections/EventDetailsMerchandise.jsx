// src/app/pages/events/EventDetailsSections/EventDetailsMerchandise.jsx

import { useTranslation } from "@/app/i18n/I18nContext";

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsMerchandise({ event }) {
  const { t } = useTranslation();
  const merchandise = Array.isArray(event.merchandise)
    ? event.merchandise
    : [];

  if (merchandise.length === 0) return null;

  const includedItems = merchandise.filter((m) => m.included === true);
  const compulsoryItems = merchandise.filter((m) => m.compulsory === true);
  const optionalItems = merchandise.filter(
    (m) => !m.included && !m.compulsory
  );

  return (
    <div className="space-y-6">

      {includedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">{t("events.merchIncluded")}</h3>
          {includedItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {compulsoryItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">{t("events.merchCompulsory")}</h3>
          {compulsoryItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {optionalItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">{t("events.merchOptional")}</h3>
          {optionalItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MerchItem({ item }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-4 items-start">

      <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            {t("nominate.noImage")}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 text-sm text-text-muted leading-tight">

        <div className="font-semibold text-base text-text-base">
          {item.name}
        </div>

        {item.description && (
          <div className="text-sm">{item.description}</div>
        )}

        {!item.included && (
          <div>
            <strong>{t("nominate.price")}</strong>{" "}
            {item.price ? `$${Number(item.price).toFixed(2)}` : "$0.00"}
          </div>
        )}

        {item.max_qty && (
          <div>
            <strong>{t("nominate.maxQty")}</strong> {item.max_qty}
          </div>
        )}

        {item.max_entries != null && item.max_entries !== "" && (
          <div>
            <strong>{t("events.merchAvailability")}</strong>{" "}
            {t("events.merchAvailabilityLimit", { count: item.max_entries })}
          </div>
        )}

        {Array.isArray(item.options) && item.options.length > 0 && (
          <div className="mt-2">
            <strong>{t("events.merchOptions")}</strong>
            <ul className="ml-4 list-disc text-xs mt-1">
              {item.options.map((opt, i) => (
                <li key={i}>{opt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
