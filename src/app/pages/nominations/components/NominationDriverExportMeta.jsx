import { COUNTRIES } from "@/data/countries";
import { findManufacturerBrand } from "@/data/manufacturers";

function ChassisMark({ chassisName, textSize, logoClassName = "h-5 w-5" }) {
  const trimmed = String(chassisName ?? "").trim();
  if (!trimmed) return null;
  const brand = findManufacturerBrand(trimmed);
  if (brand?.logo) {
    return (
      <img
        src={brand.logo}
        alt=""
        title={trimmed}
        className={`${logoClassName} object-contain shrink-0`}
      />
    );
  }
  return <span className={`truncate max-w-[10rem] ${textSize}`}>{trimmed}</span>;
}

export function resolveDriverCountry(driver) {
  const raw = String(driver?.country || "").trim();
  if (!raw) return null;
  return COUNTRIES.find((c) => c.name === raw || c.code === raw) || { name: raw, flag: null };
}

const FLAG_SLOT_CLASS = "h-7 w-7 shrink-0 flex justify-center items-center";
const NUMBER_SLOT_CLASS = "h-7 w-10 shrink-0 flex justify-center items-center";
const FLAG_SHAPE_CLASS = "h-5 w-7 rounded-sm";
const NUMBER_SHAPE_CLASS = "h-5 min-w-[2rem] w-full max-w-[2.5rem] px-0.5 rounded-sm";
const FLAG_IMG_CLASS = `${FLAG_SHAPE_CLASS} object-cover border border-border/40`;

/** Flag only — country name on hover via `title`. Slot keeps width when flag is missing. */
export function DriverCountryFlag({ driver }) {
  const country = resolveDriverCountry(driver);
  return (
    <span className={FLAG_SLOT_CLASS} aria-hidden={!country?.flag}>
      {country?.flag ? (
        <img
          src={country.flag}
          alt=""
          title={country.name}
          className={FLAG_IMG_CLASS}
        />
      ) : null}
    </span>
  );
}

export function driverPermanentNumber(driver) {
  const permRaw = driver?.permanent_number;
  if (permRaw == null || String(permRaw).trim() === "") return null;
  return String(permRaw).trim();
}

/** Permanent number before name; club-colour circle. Slot keeps width when absent. */
export function DriverPermanentNumber({ driver, accentColor = "#2563eb" }) {
  const num = driverPermanentNumber(driver);
  return (
    <span className={NUMBER_SLOT_CLASS} aria-hidden={!num}>
      {num ? (
        <span
          className={`${NUMBER_SHAPE_CLASS} inline-flex items-center justify-center text-xs sm:text-sm font-extrabold leading-none text-white tabular-nums`}
          style={{ backgroundColor: accentColor }}
          title={`Car ${num}`}
        >
          {num}
        </span>
      ) : null}
    </span>
  );
}

export default function NominationDriverExportMeta({
  driver,
  chassisName = "",
  compact = false,
  row = false,
  hideCountry = false,
  hideNumber = false,
}) {
  const country = hideCountry ? null : resolveDriverCountry(driver);
  const perm = hideNumber ? null : driverPermanentNumber(driver);
  const chassis = String(chassisName ?? "").trim();

  if (!country && !perm && !chassis) return null;

  const gap = row ? "gap-x-2" : compact ? "gap-x-2 gap-y-0.5" : "gap-x-3 gap-y-1";
  const textSize = row ? "text-xs" : compact ? "text-[11px]" : "text-xs";
  const logoClass = row ? "h-7 w-12 max-h-7 max-w-[3.25rem]" : "h-5 w-5";
  const rowLayout = row
    ? "flex h-7 w-12 shrink-0 items-center justify-end ml-1"
    : `flex flex-wrap items-center ${compact ? "mt-0.5" : ""}`;

  return (
    <div className={`${rowLayout} ${gap} ${textSize} text-text-muted`}>
      {country ? (
        <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
          {country.flag ? (
            <img
              src={country.flag}
              alt=""
              title={country.name}
              className="h-3.5 w-5 object-cover rounded-sm shrink-0 border border-border/40"
            />
          ) : null}
          {!hideCountry ? <span className="truncate">{country.name}</span> : null}
        </span>
      ) : null}
      {perm ? (
        <span
          className={
            row
              ? "font-bold tabular-nums text-base text-text-base shrink-0"
              : "font-semibold tabular-nums shrink-0"
          }
        >
          {perm}
        </span>
      ) : null}
      {chassis ? (
        <ChassisMark chassisName={chassis} textSize={textSize} logoClassName={logoClass} />
      ) : null}
    </div>
  );
}