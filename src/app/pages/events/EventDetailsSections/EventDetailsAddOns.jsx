// src/app/pages/events/EventDetailsSections/EventDetailsAddOns.jsx

import Card from "@/components/ui/Card";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function EventDetailsAddOns({ event }) {
  const { t } = useTranslation();
  const addOns = Array.isArray(event.class_add_ons)
    ? event.class_add_ons
    : [];

  if (addOns.length === 0) return null;

  const requiredAddOns = addOns.filter((a) => a.required === true);
  const optionalAddOns = addOns.filter((a) => !a.required);

  return (
    <section className="mb-8">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("events.classAddOnsTitle")}</h2>

        <div className="space-y-6">

          {requiredAddOns.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">{t("events.requiredAddOns")}</h3>
              <div className="space-y-3">
                {requiredAddOns.map((item) => (
                  <AddOnItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {optionalAddOns.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">{t("events.optionalAddOns")}</h3>
              <div className="space-y-3">
                {optionalAddOns.map((item) => (
                  <AddOnItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function AddOnItem({ item }) {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
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

          <div>
            <strong>{t("nominate.price")}</strong>{" "}
            {item.price ? `$${Number(item.price).toFixed(2)}` : "$0.00"}
          </div>

          {item.max_qty && (
            <div>
              <strong>{t("nominate.maxQty")}</strong> {item.max_qty}
            </div>
          )}

          {Array.isArray(item.options) && item.options.length > 0 && (
            <div className="mt-2">
              <strong>{t("events.merchOptions")}</strong>
              <ul className="ml-4 list-disc text-xs mt-1">
                {item.options.map((group, gi) => (
                  <li key={gi}>
                    <span className="font-medium">{group.name}</span>
                    <ul className="ml-4 list-disc">
                      {group.values.map((val, vi) => (
                        <li key={vi}>
                          {val.label}
                          {val.photo_url && (
                            <img
                              src={val.photo_url}
                              alt={val.label}
                              className="w-10 h-10 mt-1 rounded border border-gray-200 object-cover"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.class_rules && Object.keys(item.class_rules).length > 0 && (
            <div className="mt-2">
              <strong>{t("events.appliesToClasses")}</strong>
              <ul className="ml-4 list-disc text-xs mt-1">
                {Object.entries(item.class_rules).map(([className, rule]) => (
                  <li key={className}>
                    {className}: {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
