import { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { usePlatformPeople } from "@/app/providers/usePlatformPeople";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SettingsCard from "./SettingsCard";
import { settingsStyles as s } from "./settingsStyles";

export default function PlatformRosterCard() {
  const { t } = useTranslation();
  const {
    people,
    loadingPeople,
    rosterAvailable,
    addPerson,
    updatePerson,
    removePerson,
  } = usePlatformPeople();

  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newJunior, setNewJunior] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});

  function rowEdits(row) {
    const e = edits[row.id];
    return {
      first_name: e?.first_name ?? row.first_name ?? "",
      last_name: e?.last_name ?? row.last_name ?? "",
      is_junior: e?.is_junior ?? !!row.is_junior,
    };
  }

  function setRowField(id, field, value) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...rowEdits(people.find((p) => p.id === id)), [field]: value },
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    const first = newFirst.trim();
    const last = newLast.trim();
    if (!first || !last) {
      setFormError(t("settings.roster.nameRequired"));
      return;
    }
    setSaving(true);
    const { error } = await addPerson({
      firstName: first,
      lastName: last,
      isJunior: newJunior,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        setFormError(t("settings.roster.duplicate"));
      } else {
        setFormError(error.message || t("settings.roster.saveFailed"));
      }
      return;
    }
    setNewFirst("");
    setNewLast("");
    setNewJunior(false);
  }

  async function handleSave(row) {
    const r = rowEdits(row);
    const { error } = await updatePerson(row.id, {
      firstName: r.first_name,
      lastName: r.last_name,
      isJunior: r.is_junior,
    });
    if (error) {
      if (error.code === "23505") {
        setFormError(t("settings.roster.duplicate"));
      } else {
        setFormError(error.message || t("settings.roster.saveFailed"));
      }
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    setFormError("");
  }

  async function handleRemove(id) {
    const { error } = await removePerson(id);
    if (error) {
      console.warn("[PlatformRosterCard] remove", error.message);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  if (!rosterAvailable) {
    return (
      <SettingsCard title={t("settings.roster.title")} hint={t("settings.roster.schemaMissing")} />
    );
  }

  return (
    <SettingsCard title={t("settings.roster.title")} hint={t("settings.roster.hint")}>
      {loadingPeople ? (
        <p style={s.muted}>{t("loading.loading")}</p>
      ) : people.length === 0 ? (
        <p style={s.muted}>{t("settings.roster.empty")}</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-3">
          {people.map((row) => {
            const r = rowEdits(row);
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 border border-gray-200 rounded-md p-3"
              >
                <div className="settings-field-grid-2">
                  <Input
                    label={t("settings.roster.firstName")}
                    value={r.first_name}
                    onChange={(e) => setRowField(row.id, "first_name", e.target.value)}
                  />
                  <Input
                    label={t("settings.roster.lastName")}
                    value={r.last_name}
                    onChange={(e) => setRowField(row.id, "last_name", e.target.value)}
                  />
                </div>
                <label
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "#475569" }}
                >
                  <input
                    type="checkbox"
                    checked={r.is_junior}
                    onChange={(e) => setRowField(row.id, "is_junior", e.target.checked)}
                  />
                  {t("settings.roster.junior")}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleSave(row)}>
                    {t("settings.roster.save")}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleRemove(row.id)}>
                    {t("settings.roster.remove")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3">
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#64748b" }}>
          {t("settings.roster.addSection")}
        </p>
        <div className="settings-field-grid-2">
          <Input
            label={t("settings.roster.firstName")}
            value={newFirst}
            onChange={(e) => setNewFirst(e.target.value)}
          />
          <Input
            label={t("settings.roster.lastName")}
            value={newLast}
            onChange={(e) => setNewLast(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: "#475569" }}>
          <input
            type="checkbox"
            checked={newJunior}
            onChange={(e) => setNewJunior(e.target.checked)}
          />
          {t("settings.roster.junior")}
        </label>
        {formError ? <p style={s.statusError}>{formError}</p> : null}
        <div style={s.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("settings.roster.add")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}
