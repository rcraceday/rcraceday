import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import FilterDropdown from "@/components/ui/FilterDropdown";
import Button from "@/components/ui/Button";
import {
  buildInitialClassMappings,
  driverDisplayLabel,
  fetchImportableDriversFromOtherClubs,
  fetchTargetClubClasses,
  filterAlreadyAtClub,
  importDriverFromOtherClub,
} from "@/app/lib/crossClubDriverImport";
import { resolveDriverHouseholdRules } from "@/app/lib/driverClubSettings";

export default function ImportDriverFromOtherClubs({
  user,
  club,
  membership,
  membershipType,
  isNonMember,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
  onImported,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sourceDrivers, setSourceDrivers] = useState([]);
  const [targetClasses, setTargetClasses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [classMappings, setClassMappings] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!club?.id) return;
      setLoading(true);
      setError("");

      const [{ drivers: raw, error: loadErr }, { classes }] = await Promise.all([
        fetchImportableDriversFromOtherClubs(club.id),
        fetchTargetClubClasses(club.id),
      ]);

      if (cancelled) return;

      if (loadErr) {
        setError(loadErr);
        setSourceDrivers([]);
      } else {
        const filtered = await filterAlreadyAtClub(raw, club.id, club);
        if (!cancelled) setSourceDrivers(filtered);
      }

      setTargetClasses(classes || []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [club?.id, club]);

  const selectedDriver = useMemo(
    () => sourceDrivers.find((d) => d.id === selectedId) || null,
    [sourceDrivers, selectedId]
  );

  useEffect(() => {
    if (!selectedDriver) {
      setClassMappings([]);
      return;
    }
    setClassMappings(buildInitialClassMappings(selectedDriver, targetClasses));
  }, [selectedDriver, targetClasses]);

  const driverOptions = useMemo(
    () => [
      { value: "", label: t("drivers.importSelectDriver") },
      ...sourceDrivers.map((d) => ({
        value: d.id,
        label: driverDisplayLabel(d),
      })),
    ],
    [sourceDrivers, t]
  );

  const classOptions = useMemo(
    () => [
      { value: "", label: t("drivers.importSelectClass") },
      ...targetClasses.map((c) => ({ value: c.id, label: c.name })),
    ],
    [targetClasses, t]
  );

  async function handleImport() {
    if (!selectedDriver || !user?.id) return;
    setImporting(true);
    setError("");

    const householdRules = resolveDriverHouseholdRules(club);
    const result = await importDriverFromOtherClub({
      user,
      club,
      membership,
      membershipType,
      isNonMember,
      sourceDriver: selectedDriver,
      classMappings,
      drivers,
      clubMembers,
      maxAdults,
      maxJuniors,
      householdRules,
    });

    setImporting(false);

    if (!result.ok) {
      const key = `drivers.importError.${result.error}`;
      const msg = t(key);
      setError(msg !== key ? msg : String(result.error));
      if (result.driverId) {
        await onImported?.();
      }
      return;
    }

    await onImported?.();
  }

  if (loading) {
    return (
      <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
        {t("drivers.importLoading")}
      </p>
    );
  }

  if (!sourceDrivers.length) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingBottom: 8,
        borderBottom: "1px solid #e5e7eb",
        marginBottom: 8,
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
          {t("drivers.importSectionTitle")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          {t("drivers.importSectionHint")}
        </p>
      </div>

      <FilterDropdown
        value={selectedId}
        onChange={setSelectedId}
        options={driverOptions}
        ariaLabel={t("drivers.importSelectDriver")}
        fullWidth
      />

      {selectedDriver && classMappings.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#374151" }}>
            {t("drivers.importMapClasses")}
          </p>
          {classMappings.map((row, index) => (
            <div
              key={row.sourceDriverClassId || index}
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
                  setClassMappings((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, targetClassId: classId } : item
                    )
                  );
                }}
                options={classOptions}
                ariaLabel={t("drivers.importSelectClass")}
                fullWidth
              />
            </div>
          ))}
        </div>
      ) : null}

      {selectedDriver && !classMappings.length ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("drivers.importNoClasses")}
        </p>
      ) : null}

      {error ? (
        <div style={{ padding: 10, borderRadius: 6, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {selectedDriver ? (
        <Button
          type="button"
          disabled={importing}
          onClick={handleImport}
          className="w-full py-2"
        >
          {importing ? t("drivers.importing") : t("drivers.importSubmit")}
        </Button>
      ) : null}
    </div>
  );
}
