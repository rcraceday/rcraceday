import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";
import { useDrivers } from "@/app/providers/DriverProvider";
import { useUserTransponders } from "@/app/providers/UserTranspondersProvider";
import useTheme from "@/app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import {
  loadClubAccessClassMap,
  saveClubAccessClassMap,
} from "@/app/lib/clubAccessClassMap";
import Card from "@/components/ui/Card";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import FilterDropdown from "@/components/ui/FilterDropdown";

export default function ClubAccessClassMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { club } = useClub();
  const { drivers, loadingDrivers, refreshDrivers } = useDrivers();
  const { transponders } = useUserTransponders();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const clubSlug = club?.slug;
  const brand = palette?.primary || "#00438a";
  const safeReturnTo = sanitizeClubAppReturnPath(returnToFromSearch(searchParams), clubSlug);
  const afterPath = () => safeReturnTo || `/${clubSlug}/app`;

  const [groups, setGroups] = useState([]);
  const [targetClasses, setTargetClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const driverList = useMemo(
    () => (Array.isArray(drivers) ? drivers : []),
    [drivers]
  );
  const driverKey = useMemo(
    () => driverList.map((d) => d.id).join(","),
    [driverList]
  );

  useEffect(() => {
    if (!club?.id || loadingDrivers) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const result = await loadClubAccessClassMap({
        clubId: club.id,
        driversAtClub: driverList,
      });
      if (cancelled) return;
      if (!result.groups.length) {
        navigate(afterPath(), { replace: true });
        return;
      }
      setGroups(result.groups);
      setTargetClasses(result.targetClasses);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [club?.id, loadingDrivers, driverKey, navigate]);

  const classOptions = useMemo(
    () => [
      { value: "", label: t("drivers.importSelectClass") },
      ...targetClasses.map((c) => ({ value: c.id, label: c.name })),
    ],
    [targetClasses, t]
  );

  async function handleSave() {
    if (!club?.id) return;
    setSaving(true);
    setError("");
    const result = await saveClubAccessClassMap({
      clubId: club.id,
      groups,
      inventoryRows: transponders || [],
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error || t("drivers.welcomeGenericError"));
      return;
    }
    await refreshDrivers?.();
    navigate(afterPath());
  }

  function handleSkip() {
    navigate(afterPath());
  }

  if (loading || loadingDrivers || !clubSlug) {
    return (
      <div className="p-6 w-full" aria-live="polite">
        <p className="text-gray-600">{t("loading.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle title={t("drivers.setupTitle")} style={{ color: brand }} centered />
      <main className="app-page-main space-y-8 flex flex-col !pt-8 !pb-16">
        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">{t("drivers.setupLead", { club: club?.name || "" })}</h2>
          <p className="text-sm text-gray-700">{t("drivers.setupHint")}</p>
        </Card>

        {groups.map((group, groupIndex) => (
          <Card key={group.driverId} className="p-6 space-y-4">
            <h3 className="text-md font-semibold">{group.name}</h3>
            {group.mappings.map((row, index) => (
              <div
                key={row.sourceDriverClassId || `${group.driverId}-${index}`}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <strong>{row.sourceClassName}</strong>
                  {row.transponder ? (
                    <span style={{ color: "#64748b" }}>
                      {" "}
                      · {t("drivers.importTransponder")} {row.transponder}
                    </span>
                  ) : null}
                </div>
                <FilterDropdown
                  value={row.targetClassId || ""}
                  onChange={(classId) => {
                    setGroups((prev) =>
                      prev.map((g, gi) =>
                        gi === groupIndex
                          ? {
                              ...g,
                              mappings: g.mappings.map((item, i) =>
                                i === index ? { ...item, targetClassId: classId } : item
                              ),
                            }
                          : g
                      )
                    );
                  }}
                  options={classOptions}
                  ariaLabel={t("drivers.importSelectClass")}
                  fullWidth
                />
              </div>
            ))}
          </Card>
        ))}

        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button type="button" disabled={saving} onClick={handleSave} className="w-full py-2">
            {saving ? t("common.saving") : t("drivers.setupSave")}
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={handleSkip} className="w-full py-2">
            {t("drivers.setupSkip")}
          </Button>
        </div>
      </main>
    </div>
  );
}
