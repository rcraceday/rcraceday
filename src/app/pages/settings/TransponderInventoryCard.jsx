import { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useUserTransponders } from "@/app/providers/UserTranspondersProvider";
import {
  isValidTransponderNumber,
  sanitizeTransponderNumber,
} from "@/app/lib/userTransponders";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SettingsCard from "./SettingsCard";
import { settingsStyles as s } from "./settingsStyles";

export default function TransponderInventoryCard() {
  const { t } = useTranslation();
  const {
    transponders,
    loadingTransponders,
    transpondersAvailable,
    addTransponder,
    updateTransponderLabel,
    removeTransponder,
  } = useUserTransponders();

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [labelEdits, setLabelEdits] = useState({});

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    const number = sanitizeTransponderNumber(newNumber);
    if (!isValidTransponderNumber(number)) {
      setFormError(t("settings.transponders.invalidNumber"));
      return;
    }
    setSaving(true);
    const { error } = await addTransponder({ number, label: newLabel });
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        setFormError(t("settings.transponders.duplicate"));
      } else {
        setFormError(error.message || t("settings.transponders.saveFailed"));
      }
      return;
    }
    setNewNumber("");
    setNewLabel("");
  }

  async function handleSaveLabel(id) {
    const label = labelEdits[id] ?? "";
    await updateTransponderLabel(id, label);
  }

  async function handleRemove(id) {
    const { error } = await removeTransponder(id);
    if (error) {
      console.warn("[TransponderInventoryCard] remove", error.message);
    }
  }

  if (!transpondersAvailable) {
    return (
      <SettingsCard
        title={t("settings.transponders.title")}
        hint={t("settings.transponders.schemaMissing")}
      />
    );
  }

  return (
    <SettingsCard
      title={t("settings.transponders.title")}
      hint={t("settings.transponders.hint")}
    >
      {loadingTransponders ? (
        <p style={s.muted}>{t("loading.loading")}</p>
      ) : transponders.length === 0 ? (
        <p style={s.muted}>{t("settings.transponders.empty")}</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-3">
          {transponders.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-end gap-2 border border-gray-200 rounded-md p-3"
            >
              <span className="text-sm font-semibold tabular-nums min-w-[4rem]">
                {row.number}
              </span>
              <div className="flex-1 min-w-[8rem]">
                <Input
                  label={t("settings.transponders.labelOptional")}
                  value={labelEdits[row.id] ?? row.label ?? ""}
                  onChange={(e) =>
                    setLabelEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleSaveLabel(row.id)}
              >
                {t("settings.transponders.saveLabel")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleRemove(row.id)}
              >
                {t("settings.transponders.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3">
        <div className="settings-field-grid-2">
          <Input
            label={t("settings.transponders.number")}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={newNumber}
            onChange={(e) => setNewNumber(sanitizeTransponderNumber(e.target.value))}
          />
          <Input
            label={t("settings.transponders.labelOptional")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t("settings.transponders.labelPlaceholder")}
          />
        </div>
        {formError ? <p style={s.statusError}>{formError}</p> : null}
        <div style={s.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("settings.transponders.add")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
