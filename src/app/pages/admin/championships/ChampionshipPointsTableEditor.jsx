import { useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import {
  addPositionToTable,
  buildPointsTableFromSpread,
  normalizePointsTable,
  removeLastPosition,
  sortedPositionKeys,
} from "@/app/lib/results/championshipPointsTable";
import {
  buildPresetFromCurrent,
  loadClubPointsPresets,
  saveClubPointsPresets,
} from "@/app/lib/results/championshipPointsPresets";

const DEFAULT_SPREAD = {
  firstPlace: 36,
  step: 2,
  positionCount: 20,
  belowLast: 1,
};

export default function ChampionshipPointsTableEditor({
  clubId,
  pointsTable,
  onChange,
  spreadConfig,
  onSpreadConfigChange,
}) {
  const { t } = useTranslation();
  const [spread, setSpread] = useState(() => ({
    ...DEFAULT_SPREAD,
    ...(spreadConfig || {}),
  }));
  const [presets, setPresets] = useState([]);
  const [presetPick, setPresetPick] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presetBusy, setPresetBusy] = useState(false);
  const [presetMessage, setPresetMessage] = useState("");
  const [presetsAvailable, setPresetsAvailable] = useState(true);

  useEffect(() => {
    if (spreadConfig) {
      setSpread({ ...DEFAULT_SPREAD, ...spreadConfig });
    }
  }, [spreadConfig]);

  useEffect(() => {
    if (!clubId) return;
    loadClubPointsPresets(supabase, clubId)
      .then((list) => {
        setPresets(list);
        setPresetsAvailable(true);
      })
      .catch(() => {
        setPresets([]);
        setPresetsAvailable(false);
      });
  }, [clubId]);

  const positions = sortedPositionKeys(pointsTable);

  function updateSpread(field, value) {
    const next = { ...spread, [field]: Number(value) };
    setSpread(next);
    onSpreadConfigChange?.(next);
  }

  function applySpread() {
    onChange(buildPointsTableFromSpread(spread));
  }

  function loadPreset(presetId) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    if (preset.spread) {
      const nextSpread = { ...DEFAULT_SPREAD, ...preset.spread };
      setSpread(nextSpread);
      onSpreadConfigChange?.(nextSpread);
    }
    if (preset.pointsTable && Object.keys(preset.pointsTable).length) {
      onChange({ ...preset.pointsTable });
    } else if (preset.spread) {
      onChange(buildPointsTableFromSpread({ ...DEFAULT_SPREAD, ...preset.spread }));
    }
    setPresetMessage(t("admin.championships.presetLoaded", { name: preset.name }));
  }

  async function savePreset() {
    if (!clubId || !presetName.trim()) return;
    setPresetBusy(true);
    setPresetMessage("");
    try {
      const entry = buildPresetFromCurrent({
        name: presetName.trim(),
        spread,
        pointsTable,
      });
      const next = [...presets.filter((p) => p.name !== entry.name), entry];
      await saveClubPointsPresets(supabase, clubId, next);
      setPresets(next);
      setPresetPick(entry.id);
      setPresetName("");
      setPresetMessage(t("admin.championships.presetSaved", { name: entry.name }));
    } catch (err) {
      setPresetMessage(err.message || t("admin.championships.presetSaveFailed"));
    } finally {
      setPresetBusy(false);
    }
  }

  async function deletePreset() {
    if (!clubId || !presetPick) return;
    const preset = presets.find((p) => p.id === presetPick);
    if (!preset) return;
    setPresetBusy(true);
    setPresetMessage("");
    try {
      const next = presets.filter((p) => p.id !== presetPick);
      await saveClubPointsPresets(supabase, clubId, next);
      setPresets(next);
      setPresetPick("");
      setPresetMessage(t("admin.championships.presetDeleted", { name: preset.name }));
    } catch (err) {
      setPresetMessage(err.message || t("admin.championships.presetSaveFailed"));
    } finally {
      setPresetBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          border: "1px solid #E5E7EB",
          background: "#F9FAFB",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          {t("admin.championships.pointSpreadTitle")}
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px" }}>
          {t("admin.championships.pointSpreadHelp")}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          <CMSInput
            label={t("admin.championships.firstPlacePoints")}
            type="number"
            value={String(spread.firstPlace)}
            onChange={(v) => updateSpread("firstPlace", v)}
          />
          <CMSInput
            label={t("admin.championships.stepPerPosition")}
            type="number"
            value={String(spread.step)}
            onChange={(v) => updateSpread("step", v)}
          />
          <CMSInput
            label={t("admin.championships.positionCount")}
            type="number"
            value={String(spread.positionCount)}
            onChange={(v) => updateSpread("positionCount", v)}
          />
          <CMSInput
            label={t("admin.championships.belowLastPoints")}
            type="number"
            value={String(spread.belowLast)}
            onChange={(v) => updateSpread("belowLast", v)}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <CMSButton type="button" onClick={applySpread}>
            {t("admin.championships.applySpread")}
          </CMSButton>
        </div>
      </div>

      {clubId && presetsAvailable && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            {t("admin.championships.savedPresetsTitle")}
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px" }}>
            {t("admin.championships.savedPresetsHelp")}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <CMSSelect
                label={t("admin.championships.loadPreset")}
                value={presetPick}
                onChange={(value) => {
                  setPresetPick(value);
                  if (value) loadPreset(value);
                }}
                placeholder={t("admin.championships.selectPreset")}
                options={presets.map((p) => ({ value: p.id, label: p.name }))}
                sortOptions={false}
              />
            </div>
            {presetPick && (
              <CMSButton type="button" onClick={deletePreset} disabled={presetBusy}>
                {t("admin.championships.deletePreset")}
              </CMSButton>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
              marginTop: 12,
            }}
          >
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <CMSInput
                label={t("admin.championships.presetName")}
                value={presetName}
                onChange={setPresetName}
                placeholder={t("admin.championships.presetNamePlaceholder")}
              />
            </div>
            <CMSButton
              type="button"
              onClick={savePreset}
              disabled={presetBusy || !presetName.trim()}
            >
              {t("admin.championships.savePreset")}
            </CMSButton>
          </div>
          {presetMessage && (
            <p style={{ fontSize: 12, color: "#4B5563", margin: "10px 0 0" }}>{presetMessage}</p>
          )}
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 8 }}>
          {t("admin.championships.manualPointsHelp")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <CMSButton type="button" onClick={() => onChange(addPositionToTable(pointsTable))}>
            {t("admin.championships.addPosition")}
          </CMSButton>
          {positions.length > 1 && (
            <CMSButton type="button" onClick={() => onChange(removeLastPosition(pointsTable))}>
              {t("admin.championships.removeLastPosition")}
            </CMSButton>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
            gap: 12,
            maxHeight: 320,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {positions.map((pos) => (
            <CMSInput
              key={pos}
              label={`${t("results.pos")} ${pos}`}
              type="number"
              value={String(normalizePointsTable(pointsTable)[pos])}
              onChange={(value) =>
                onChange({
                  ...normalizePointsTable(pointsTable),
                  [pos]: Number(value),
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
