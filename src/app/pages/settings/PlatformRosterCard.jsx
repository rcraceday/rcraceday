import { useState } from "react";
import { useTranslation } from "@/app/i18n/I18nContext";
import { usePlatformPeople } from "@/app/providers/usePlatformPeople";
import { useClub } from "@/app/providers/ClubProvider";
import { getJuniorCheckboxLabel } from "@/app/lib/driverClubSettings";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { settingsStyles as s } from "./settingsStyles";

function RosterCardShell({ title, hint, children }) {
  return (
    <Card className="w-full p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold m-0 text-gray-900">{title}</h2>
        {hint ? <p className="text-sm text-gray-600 m-0 leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export default function PlatformRosterCard() {
  const { t } = useTranslation();
  const { club } = useClub();
  const juniorCheckboxLabel = getJuniorCheckboxLabel(club);
  const [addFormOpen, setAddFormOpen] = useState(false);
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
    setAddFormOpen(false);
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
      <RosterCardShell title={t("settings.roster.title")} hint={t("settings.roster.schemaMissing")} />
    );
  }

  return (
    <RosterCardShell title={t("settings.roster.title")} hint={t("settings.roster.hint")}>
      {loadingPeople ? (
        <p className="text-sm text-gray-600 m-0">{t("loading.loading")}</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-gray-600 m-0">{t("settings.roster.empty")}</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-4">
          {people.map((row) => {
            const r = rowEdits(row);
            return (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3"
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
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={r.is_junior}
                    onChange={(e) => setRowField(row.id, "is_junior", e.target.checked)}
                  />
                  {juniorCheckboxLabel}
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" onClick={() => handleSave(row)}>
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

      <div className="pt-2 border-t border-gray-200 flex flex-col gap-4">
        {!addFormOpen ? (
          <Button type="button" variant="secondary" onClick={() => setAddFormOpen(true)}>
            {t("settings.roster.addRacerButton")}
          </Button>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <h3 className="text-base font-semibold m-0 text-gray-900">
              {t("settings.roster.addSection")}
            </h3>
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
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={newJunior}
                onChange={(e) => setNewJunior(e.target.checked)}
              />
              {juniorCheckboxLabel}
            </label>
            {formError ? <p style={s.statusError}>{formError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("settings.roster.add")}
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
    </RosterCardShell>
  );
}
