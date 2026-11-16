import { findManufacturerBrand } from "@/data/manufacturers";

export default function ChassisManufacturerBadge({ name, logoClassName = "h-8 w-8", textClassName = "text-xs text-text-muted" }) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;
  const brand = findManufacturerBrand(trimmed);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {brand?.logo ? (
        <img src={brand.logo} alt="" className={`${logoClassName} object-contain shrink-0`} />
      ) : null}
      <span className={`${textClassName} truncate`}>{trimmed}</span>
    </div>
  );
}