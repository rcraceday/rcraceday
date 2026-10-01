// src/components/DriverList.jsx
import { useTranslation } from "@/app/i18n/I18nContext";

export default function DriverList({ membership, drivers }) {
  const { t } = useTranslation();
  const items = [];

  const primaryIsDriver = drivers.some(
    (d) =>
      d.first_name === membership.primary_first_name &&
      d.last_name === membership.primary_last_name
  );

  if (membership.membership_type === "family" || primaryIsDriver) {
    items.push({
      id: "primary",
      first_name: membership.primary_first_name,
      last_name: membership.primary_last_name,
      is_junior: false,
    });
  }

  drivers.forEach((d) => items.push(d));

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{t("driverUi.noDriversYet")}</p>;
  }

  return (
    <ul className="space-y-0.5">
      {items.map((d) => (
        <li key={d.id || "primary"} className="text-sm text-text-base">
          {d.first_name} {d.last_name}
          {d.is_junior && <span className="text-text-muted"> {t("driverUi.juniorSuffix")}</span>}
        </li>
      ))}
    </ul>
  );
}
