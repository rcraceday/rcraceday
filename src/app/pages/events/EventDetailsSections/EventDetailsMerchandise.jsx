// src/app/pages/events/EventDetailsSections/EventDetailsMerchandise.jsx

/* ===========================
   FLATTENED COMPONENT
   =========================== */

export default function EventDetailsMerchandise({ event }) {
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

      {/* INCLUDED ITEMS */}
      {includedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Included Items</h3>
          {includedItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* COMPULSORY ITEMS */}
      {compulsoryItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Compulsory Items</h3>
          {compulsoryItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* OPTIONAL ITEMS */}
      {optionalItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Optional Items</h3>
          {optionalItems.map((item) => (
            <MerchItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================
   FLATTENED MERCH ITEM
   =========================== */

function MerchItem({ item }) {
  return (
    <div className="flex gap-4 items-start">

      {/* PHOTO */}
      <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* DETAILS */}
      <div className="flex-1 space-y-1 text-sm text-text-muted leading-tight">

        <div className="font-semibold text-base text-text-base">
          {item.name}
        </div>

        {item.description && (
          <div className="text-sm">{item.description}</div>
        )}

        {/* PRICE */}
        {!item.included && (
          <div>
            <strong>Price:</strong>{" "}
            {item.price ? `$${Number(item.price).toFixed(2)}` : "$0.00"}
          </div>
        )}

        {/* MAX QTY */}
        {item.max_qty && (
          <div>
            <strong>Max Qty:</strong> {item.max_qty}
          </div>
        )}

        {/* OPTIONS */}
        {Array.isArray(item.options) && item.options.length > 0 && (
          <div className="mt-2">
            <strong>Options:</strong>
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
