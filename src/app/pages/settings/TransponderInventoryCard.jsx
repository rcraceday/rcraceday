import { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useUserTransponders } from "@/app/providers/UserTranspondersProvider";
import {
  isValidTransponderNumber,
  sanitizeTransponderNumber,
} from "@/app/lib/userTransponders";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
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
  const [addFormOpen, setAddFormOpen] = useState(false);

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
    setAddFormOpen(false);
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
      <Card className="w-full p-6 space-y-4">
        <h2 className="text-lg font-semibold m-0 text-gray-900">
          {t("settings.transponders.title")}
        </h2>
        <p className="text-sm text-gray-600 m-0">{t("settings.transponders.schemaMissing")}</p>
      </Card>
    );
  }

  return (
    <Card className="w-full p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold m-0 text-gray-900">
          {t("settings.transponders.title")}
        </h2>
        <p className="text-sm text-gray-600 m-0 leading-relaxed">{t("settings.transponders.hint")}</p>
      </div>

      {loadingTransponders ? (
        <p className="text-sm text-gray-600 m-0">{t("loading.loading")}</p>
      ) : transponders.length === 0 ? (
        <p className="text-sm text-gray-600 m-0">{t("settings.transponders.empty")}</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-4">
          {transponders.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <span className="text-sm font-semibold tabular-nums text-gray-900 min-w-[4rem]">
                {row.number}
              </span>
              <div className="flex-1 min-w-[8rem] w-full sm:w-auto">
                <Input
                  label={t("settings.transponders.labelOptional")}
                  value={labelEdits[row.id] ?? row.label ?? ""}
                  onChange={(e) =>
                    setLabelEdits((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button type="button" size="sm" onClick={() => handleSaveLabel(row.id)}>
                  {t("settings.transponders.saveLabel")}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleRemove(row.id)}>
                  {t("settings.transponders.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-gray-200 flex flex-col gap-4">
        {!addFormOpen ? (
          <Button type="button" variant="secondary" onClick={() => setAddFormOpen(true)}>
            {t("settings.transponders.add")}
          </Button>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
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
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("settings.transponders.add")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setAddFormOpen(false);
                  setFormError("");
                }}
              >
                {t("settings.roster.closeAddRacer")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
