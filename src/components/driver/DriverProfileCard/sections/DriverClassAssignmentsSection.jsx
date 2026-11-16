import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import ChassisManufacturerBadge from "@/components/driver/ChassisManufacturerBadge";

export default function DriverClassAssignmentsSection({ driverId, clubId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!driverId || !clubId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_classes")
      .select("id, class_id, transponder_number, chassis_manufacturer, club_classes(name)")
      .eq("driver_id", driverId)
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading driver class assignments:", error);
      setRows([]);
    } else {
      const sorted = (data || []).slice().sort((a, b) =>
        (a.club_classes?.name || "").localeCompare(b.club_classes?.name || "", undefined, {
          sensitivity: "base",
          numeric: true,
        })
      );
      setRows(sorted);
    }
    setLoading(false);
  }, [driverId, clubId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return null;

  if (!rows.length) {
    return (
      <div className="space-y-1">
        <h3 className="text-sm font-semibold m-0">{t("driverProfile.classAssignments")}</h3>
        <p className="text-xs text-text-muted m-0">{t("driverProfile.noClassAssignments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold m-0">{t("driverProfile.classAssignments")}</h3>
      <ul className="space-y-2 m-0 p-0 list-none">
        {rows.map((row) => {
          const className = row.club_classes?.name || t("nominate.class");
          const transponder = String(row.transponder_number || "").trim();
          const chassis = String(row.chassis_manufacturer || "").trim();
          return (
            <li
              key={row.id}
              className="rounded-md border border-border bg-surface-alt/50 px-3 py-2 space-y-1.5"
            >
              <div className="text-sm font-medium">{className}</div>
              {transponder ? (
                <p className="text-xs text-text-muted m-0">
                  {t("driverProfile.transponderLabel")} {transponder}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-text-muted shrink-0">
                  {t("driverProfile.chassisManufacturer")}
                </span>
                {chassis ? (
                  <ChassisManufacturerBadge name={chassis} logoClassName="h-6 w-6" textClassName="text-xs" />
                ) : (
                  <span className="text-xs text-text-muted">{t("driverUi.chassisNotSet")}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-muted m-0 leading-relaxed">{t("driverProfile.chassisSetWhenNominating")}</p>
    </div>
  );
}