import { useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { normalizeDriverName } from "@/app/lib/results/driverName";
import { pointsForPosition } from "@/app/lib/results/championshipStandings";
import {
  addDriverAlias,
  addManualRound,
  getDriverAliases,
  getRoundPointsOverride,
  listClassResultDrivers,
  removeDriverAlias,
  removeManualRound,
  setRoundPointsOverride,
} from "@/app/lib/results/championshipAdjustments";
import CMSButton from "@cms/CMSButton";
import CMSSelect from "@cms/CMSSelect";

export default function ChampionshipDriverRoundsPanel({
  className,
  row,
  rounds,
  pointsTable,
  pointAdjustments,
  setPointAdjustments,
}) {
  const { t } = useTranslation();
  const aliases = getDriverAliases(pointAdjustments, className, row.key);
  const resultDrivers = useMemo(
    () => listClassResultDrivers(rounds, className, normalizeDriverName),
    [rounds, className]
  );
  const aliasOptions = resultDrivers.filter(
    (item) => item.key !== row.key && !aliases.includes(item.key)
  );

  const [aliasPick, setAliasPick] = useState("");
  const [manualEventId, setManualEventId] = useState(rounds[0]?.eventId || "");
  const [manualPosition, setManualPosition] = useState("");
  const [manualPoints, setManualPoints] = useState("");

  const manualForDriver = (pointAdjustments.manualRounds || []).filter(
    (mr) => mr.className === className && mr.driverKey === row.key
  );

  const eventOptions = rounds.map((round) => ({
    value: round.eventId,
    label: round.eventName,
  }));

  function updateRoundPoints(eventId, value) {
    setPointAdjustments((prev) =>
      setRoundPointsOverride(prev, eventId, className, row.key, value)
    );
  }

  function linkAlias() {
    if (!aliasPick) return;
    setPointAdjustments((prev) => addDriverAlias(prev, className, row.key, aliasPick));
    setAliasPick("");
  }

  function addManual() {
    const event = rounds.find((r) => r.eventId === manualEventId);
    if (!event) return;
    if (row.rounds.some((r) => r.eventId === event.eventId)) return;
    const position = manualPosition === "" ? null : Number(manualPosition);
    const points =
      manualPoints !== ""
        ? Number(manualPoints)
        : position
          ? pointsForPosition(pointsTable, position)
          : 0;
    setPointAdjustments((prev) =>
      addManualRound(prev, {
        className,
        driverKey: row.key,
        driverName: row.driverName,
        eventId: event.eventId,
        eventName: event.eventName,
        position,
        points,
      })
    );
    setManualPosition("");
    setManualPoints("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
          {t("admin.championships.formerNamesTitle")}
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px" }}>
          {t("admin.championships.formerNamesHelp")}
        </p>
        {aliases.length > 0 && (
          <ul style={{ fontSize: 13, margin: "0 0 8px", paddingLeft: 18 }}>
            {aliases.map((aliasKey) => {
              const label = resultDrivers.find((d) => d.key === aliasKey)?.label || aliasKey;
              return (
                <li key={aliasKey} style={{ marginBottom: 4 }}>
                  {label}
                  <button
                    type="button"
                    className="ml-2 text-red-600 text-xs"
                    onClick={() =>
                      setPointAdjustments((prev) =>
                        removeDriverAlias(prev, className, row.key, aliasKey)
                      )
                    }
                  >
                    {t("admin.championships.removeAlias")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {aliasOptions.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <div style={{ minWidth: 220, flex: 1 }}>
              <CMSSelect
                label={t("admin.championships.linkFormerName")}
                value={aliasPick}
                onChange={setAliasPick}
                placeholder={t("admin.championships.pickFormerName")}
                options={aliasOptions.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                sortOptions={false}
              />
            </div>
            <CMSButton type="button" onClick={linkAlias} disabled={!aliasPick}>
              {t("admin.championships.linkName")}
            </CMSButton>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            {t("admin.championships.noFormerNamesToLink")}
          </p>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
          {t("admin.championships.addRoundTitle")}
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px" }}>
          {t("admin.championships.addRoundHelp")}
        </p>
        {rounds.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 220px", minWidth: 0, maxWidth: "100%" }}>
              <CMSSelect
                label={t("admin.championships.round")}
                value={manualEventId}
                onChange={setManualEventId}
                placeholder={t("admin.championships.selectRound")}
                options={eventOptions}
                sortOptions={false}
              />
            </div>
            <label
              className="text-sm text-slate-700"
              style={{ flex: "0 0 auto", width: 64 }}
            >
              {t("results.pos")}
              <input
                type="number"
                className="mt-1 block border rounded px-2 py-1 text-sm"
                style={{ width: 64, boxSizing: "border-box" }}
                value={manualPosition}
                onChange={(e) => {
                  setManualPosition(e.target.value);
                  if (e.target.value !== "") {
                    setManualPoints(
                      String(pointsForPosition(pointsTable, Number(e.target.value)))
                    );
                  }
                }}
              />
            </label>
            <label
              className="text-sm text-slate-700"
              style={{ flex: "0 0 auto", width: 72 }}
            >
              {t("results.points")}
              <input
                type="number"
                className="mt-1 block border rounded px-2 py-1 text-sm"
                style={{ width: 72, boxSizing: "border-box" }}
                value={manualPoints}
                onChange={(e) => setManualPoints(e.target.value)}
              />
            </label>
            <div style={{ flex: "0 0 auto" }}>
              <CMSButton
                type="button"
                onClick={addManual}
                disabled={!manualEventId}
                style={{ whiteSpace: "nowrap" }}
              >
                {t("admin.championships.addRound")}
              </CMSButton>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            {t("admin.championships.noChampionshipEvents")}
          </p>
        )}
        {manualForDriver.length > 0 && (
          <ul style={{ fontSize: 13, marginTop: 10, paddingLeft: 18 }}>
            {manualForDriver.map((mr) => (
              <li key={mr.id}>
                {mr.eventName}: {mr.points} pts
                {mr.position != null ? ` (${t("results.pos")} ${mr.position})` : ""}
                <button
                  type="button"
                  className="ml-2 text-red-600 text-xs"
                  onClick={() =>
                    setPointAdjustments((prev) => removeManualRound(prev, mr.id))
                  }
                >
                  {t("admin.championships.removeRound")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
          {t("admin.championships.roundPointsHelp")}
        </div>
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#6B7280" }}>
              <th style={{ textAlign: "left", paddingRight: 12 }}>{t("admin.championships.round")}</th>
              <th style={{ textAlign: "left", paddingRight: 12 }}>{t("results.pos")}</th>
              <th style={{ textAlign: "left" }}>{t("results.points")}</th>
            </tr>
          </thead>
          <tbody>
            {row.rounds.map((round) => {
              const override = getRoundPointsOverride(
                pointAdjustments,
                round.eventId,
                className,
                row.key
              );
              const sourceLabel =
                round.source === "merged"
                  ? ` (${t("admin.championships.mergedRound")})`
                  : round.source === "manual"
                    ? ` (${t("admin.championships.manualRound")})`
                    : "";
              return (
                <tr key={`${round.eventId}-${round.manualId || "r"}`}>
                  <td style={{ padding: "2px 12px 2px 0" }}>
                    {round.eventName}
                    {sourceLabel}
                  </td>
                  <td style={{ padding: "2px 12px 2px 0" }}>{round.position ?? "—"}</td>
                  <td style={{ padding: "2px 0" }}>
                    {round.source === "manual" ? (
                      round.points
                    ) : (
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20 text-sm"
                        value={override != null ? String(override) : String(round.points)}
                        onChange={(e) => updateRoundPoints(round.eventId, e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
