import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  assignNumberToDriver,
  removeNumberFromPool,
  unassignDriverNumber,
  updateNumberPoolFlags,
} from "@/app/lib/driverNumberAdmin";

export default function DriverNumberPoolCard({ club }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [poolStatus, setPoolStatus] = useState(null);
  const [poolError, setPoolError] = useState(null);
  const [savingRow, setSavingRow] = useState(null);
  const [poolSearch, setPoolSearch] = useState("");
  const [assignDriverByNumber, setAssignDriverByNumber] = useState({});

  async function reload() {
    if (!club?.id) return;
    setLoading(true);
    const [{ data: numberRows, error: numbersError }, { data: driverRows }] =
      await Promise.all([
        supabase
          .from("numbers")
          .select("*")
          .eq("club_id", club.id)
          .order("number", { ascending: true }),
        supabase
          .from("drivers")
          .select("id, first_name, last_name, permanent_number")
          .eq("club_id", club.id)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
      ]);

    if (numbersError) {
      setPoolError(numbersError.message);
      setRows([]);
    } else {
      setRows(numberRows || []);
      setPoolError(null);
    }
    setDrivers(driverRows || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!club?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: numberRows, error: numbersError }, { data: driverRows }] =
        await Promise.all([
          supabase
            .from("numbers")
            .select("*")
            .eq("club_id", club.id)
            .order("number", { ascending: true }),
          supabase
            .from("drivers")
            .select("id, first_name, last_name, permanent_number")
            .eq("club_id", club.id)
            .order("last_name", { ascending: true })
            .order("first_name", { ascending: true }),
        ]);
      if (cancelled) return;
      if (numbersError) {
        setPoolError(numbersError.message);
        setRows([]);
      } else {
        setRows(numberRows || []);
        setPoolError(null);
      }
      setDrivers(driverRows || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [club?.id]);

  const driverOptions = useMemo(
    () => [
      { value: "", label: t("admin.driverSettings.poolSelectDriver") },
      ...drivers.map((d) => ({
        value: d.id,
        label: `${d.first_name} ${d.last_name}${
          d.permanent_number != null && d.permanent_number !== ""
            ? ` (#${d.permanent_number})`
            : ""
        }`,
      })),
    ],
    [drivers, t]
  );

  const driversWithNumbers = useMemo(
    () =>
      drivers
        .filter((d) => d.permanent_number != null && d.permanent_number !== "")
        .sort((a, b) => Number(a.permanent_number) - Number(b.permanent_number)),
    [drivers]
  );

  const filteredRows = useMemo(() => {
    const q = poolSearch.trim();
    if (!q) return rows;
    return rows.filter((row) => String(row.number).includes(q));
  }, [rows, poolSearch]);

  const handleAddRange = async () => {
    if (!club?.id) return;
    const min = Number(rangeMin);
    const max = Number(rangeMax);
    if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
      setPoolError(t("admin.driverSettings.poolInvalidRange"));
      return;
    }

    setPoolStatus(null);
    setPoolError(null);

    const existing = new Set(rows.map((r) => r.number));
    const toInsert = [];
    for (let n = min; n <= max; n += 1) {
      if (!existing.has(n)) {
        toInsert.push({
          club_id: club.id,
          number: n,
          status: "available",
          is_admin_only: false,
          reserved_for_membership: false,
        });
      }
    }

    if (toInsert.length === 0) {
      setPoolStatus(t("admin.driverSettings.poolNoNewNumbers"));
      return;
    }

    const { error } = await supabase.from("numbers").insert(toInsert);
    if (error) {
      setPoolError(error.message);
      return;
    }

    setRangeMin("");
    setRangeMax("");
    setPoolStatus(t("admin.driverSettings.poolRangeAdded", { count: toInsert.length }));
    await reload();
  };

  const handleToggleFlag = async (row, field, value) => {
    if (!club?.id) return;
    setSavingRow(row.id);
    const { error } = await updateNumberPoolFlags(club.id, row.id, { [field]: value });
    setSavingRow(null);
    if (error) {
      setPoolError(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, [field]: value } : r))
    );
  };

  const handleUnassign = async (row) => {
    if (!club?.id || !row.assigned_to_driver) return;
    if (!window.confirm(t("admin.driverSettings.poolUnassignConfirm"))) return;
    setSavingRow(row.id);
    const { error } = await unassignDriverNumber(club.id, row.assigned_to_driver);
    setSavingRow(null);
    if (error) {
      setPoolError(error.message);
      return;
    }
    await reload();
  };

  const handleAssign = async (row) => {
    const driverId = assignDriverByNumber[row.id];
    if (!club?.id || !driverId) return;
    setSavingRow(row.id);
    setPoolError(null);
    const { error } = await assignNumberToDriver(club.id, driverId, row.number);
    setSavingRow(null);
    if (error) {
      setPoolError(error.message || t("admin.driverSettings.poolAssignFailed"));
      return;
    }
    setPoolStatus(t("admin.driverSettings.poolAssignSuccess"));
    setAssignDriverByNumber((prev) => ({ ...prev, [row.id]: "" }));
    await reload();
  };

  const handleRemoveFromList = async (row) => {
    if (!window.confirm(t("admin.driverSettings.poolRemoveConfirm"))) return;
    setSavingRow(row.id);
    const { error } = await removeNumberFromPool(club.id, row);
    setSavingRow(null);
    if (error?.message === "ASSIGNED") {
      setPoolError(t("admin.driverSettings.poolRemoveAssigned"));
      return;
    }
    if (error) {
      setPoolError(error.message);
      return;
    }
    setPoolStatus(t("admin.driverSettings.poolRemoved"));
    await reload();
  };

  return (
    <CMSCard titleKey="admin.driverSettings.poolTitle">
      <div style={cmsLayout.stack}>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
          {t("admin.driverSettings.poolHint")}
        </p>

        {poolError && (
          <div style={{ padding: 12, background: "#FEE2E2", color: "#991B1B", borderRadius: 6 }}>
            {poolError}
          </div>
        )}
        {poolStatus && (
          <div style={{ padding: 12, background: "#DCFCE7", color: "#166534", borderRadius: 6 }}>
            {poolStatus}
          </div>
        )}

        <div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>
            {t("admin.driverSettings.poolDriverNumbersTitle")}
          </p>
          {loading ? (
            <p style={{ color: "#6B7280", fontSize: 13 }}>{t("admin.driverSettings.poolLoading")}</p>
          ) : driversWithNumbers.length === 0 ? (
            <p style={{ color: "#6B7280", fontSize: 13 }}>
              {t("admin.driverSettings.poolNoDriverNumbers")}
            </p>
          ) : (
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>#</th>
                    <th style={{ padding: "8px 12px" }}>{t("admin.drivers.editDriver")}</th>
                    <th style={{ padding: "8px 12px" }} />
                  </tr>
                </thead>
                <tbody>
                  {driversWithNumbers.map((d) => (
                    <tr key={d.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{d.permanent_number}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {d.first_name} {d.last_name}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Link
                          to={`/${club?.slug}/app/admin/drivers/${d.id}`}
                          style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}
                        >
                          {t("admin.common.edit")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
          {t("admin.driverSettings.poolPickListTitle")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <CMSInput
            label={t("admin.driverSettings.poolRangeMin")}
            value={rangeMin}
            onChange={setRangeMin}
            type="number"
          />
          <CMSInput
            label={t("admin.driverSettings.poolRangeMax")}
            value={rangeMax}
            onChange={setRangeMax}
            type="number"
          />
          <CMSButton variant="secondary" onClick={handleAddRange}>
            {t("admin.driverSettings.poolAddRange")}
          </CMSButton>
        </div>

        <CMSInput
          label={t("admin.driverSettings.poolSearch")}
          value={poolSearch}
          onChange={setPoolSearch}
          placeholder={t("admin.driverSettings.poolSearchPlaceholder")}
        />

        {loading ? (
          <p style={{ color: "#6B7280" }}>{t("admin.driverSettings.poolLoading")}</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ color: "#6B7280" }}>{t("admin.driverSettings.poolEmpty")}</p>
        ) : (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 420,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>{t("admin.driverSettings.poolColNumber")}</th>
                  <th style={{ padding: "8px 12px" }}>{t("admin.driverSettings.poolColAssigned")}</th>
                  <th style={{ padding: "8px 12px" }}>{t("admin.driverSettings.poolColHidden")}</th>
                  <th style={{ padding: "8px 12px" }}>{t("admin.driverSettings.poolColAdminAssign")}</th>
                  <th style={{ padding: "8px 12px" }} />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{row.number}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {row.assigned_driver_name ||
                        (row.assigned_to_driver ? "—" : t("admin.driverSettings.poolAvailable"))}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <CMSToggle
                          label={t("admin.driverSettings.poolHideAdminOnly")}
                          checked={!!row.is_admin_only}
                          onChange={(checked) =>
                            handleToggleFlag(row, "is_admin_only", checked)
                          }
                          disabled={savingRow === row.id}
                        />
                        <CMSToggle
                          label={t("admin.driverSettings.poolHideReserved")}
                          checked={!!row.reserved_for_membership}
                          onChange={(checked) =>
                            handleToggleFlag(row, "reserved_for_membership", checked)
                          }
                          disabled={savingRow === row.id}
                        />
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", minWidth: 200 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <CMSSelect
                          label=""
                          value={assignDriverByNumber[row.id] || ""}
                          onChange={(value) =>
                            setAssignDriverByNumber((prev) => ({
                              ...prev,
                              [row.id]: value,
                            }))
                          }
                          options={driverOptions}
                        />
                        <CMSButton
                          variant="secondary"
                          onClick={() => handleAssign(row)}
                          disabled={savingRow === row.id || !assignDriverByNumber[row.id]}
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          {row.assigned_to_driver
                            ? t("admin.driverSettings.poolChangeDriver")
                            : t("admin.driverSettings.poolAssignDriver")}
                        </CMSButton>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {row.assigned_to_driver ? (
                          <CMSButton
                            variant="secondary"
                            onClick={() => handleUnassign(row)}
                            disabled={savingRow === row.id}
                            style={{ padding: "4px 8px", fontSize: 12 }}
                          >
                            {t("admin.driverSettings.poolUnassign")}
                          </CMSButton>
                        ) : null}
                        <CMSButton
                          variant="secondary"
                          onClick={() => handleRemoveFromList(row)}
                          disabled={savingRow === row.id}
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          {t("admin.driverSettings.poolRemoveFromList")}
                        </CMSButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CMSCard>
  );
}
