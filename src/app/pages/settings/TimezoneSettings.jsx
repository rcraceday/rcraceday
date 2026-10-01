import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  detectTimezone,
  formatTimezoneLabel,
  listTimezones,
} from "@/app/lib/userTimezones";
import SettingsPage from "./SettingsPage";
import SettingsCard from "./SettingsCard";
import { settingsStyles as s } from "./settingsStyles";

export default function TimezoneSettings() {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { t } = useTranslation();
  const zones = useMemo(() => listTimezones(), []);
  const detected = useMemo(() => detectTimezone(), []);
  const [timezone, setTimezone] = useState(detected);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTimezone(profile?.timezone || detected);
  }, [profile?.timezone, detected]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError("");
    setMessage("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", user.id);

    if (saveError) {
      setSaving(false);
      setError(
        saveError.message?.includes("column")
          ? t("settings.timezone.setupRequired")
          : saveError.message || t("settings.timezone.title")
      );
      return;
    }

    await refreshProfile?.();
    setSaving(false);
    setMessage(t("settings.timezone.saved"));
  }

  return (
    <SettingsPage
      title={t("settings.timezone.title")}
      subtitle={t("settings.timezone.subtitle")}
    >
      <SettingsCard hint={t("settings.timezone.detected", { label: formatTimezoneLabel(detected) })}>
        <Select
          label={t("settings.timezone.label")}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {formatTimezoneLabel(tz)}
            </option>
          ))}
        </Select>
        {error ? <p style={s.statusError}>{error}</p> : null}
        {message ? <p style={s.statusOk}>{message}</p> : null}
        <div style={s.actions}>
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? t("common.saving") : t("settings.timezone.save")}
          </Button>
        </div>
      </SettingsCard>
    </SettingsPage>
  );
}
