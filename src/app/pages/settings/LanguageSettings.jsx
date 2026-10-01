import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { USER_LANGUAGES } from "@/app/lib/userLanguages";
import SettingsPage from "./SettingsPage";
import SettingsCard from "./SettingsCard";
import { settingsStyles as s } from "./settingsStyles";

export default function LanguageSettings() {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { t, setLocale } = useTranslation();
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLanguage(profile?.preferred_language || "en");
  }, [profile?.preferred_language]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError("");
    setMessage("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ preferred_language: language })
      .eq("id", user.id);

    if (saveError) {
      setSaving(false);
      setError(
        saveError.message?.includes("column")
          ? t("settings.language.setupRequired")
          : saveError.message || t("settings.language.title")
      );
      return;
    }

    setLocale(language);
    await refreshProfile?.();
    setSaving(false);
    setMessage(t("settings.language.saved"));
  }

  return (
    <SettingsPage
      title={t("settings.language.title")}
      subtitle={t("settings.language.subtitle")}
    >
      <SettingsCard hint={t("settings.language.hint")}>
        <Select
          label={t("settings.language.preferred")}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {USER_LANGUAGES.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </Select>
        {error ? <p style={s.statusError}>{error}</p> : null}
        {message ? <p style={s.statusOk}>{message}</p> : null}
        <div style={s.actions}>
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? t("common.saving") : t("settings.language.save")}
          </Button>
        </div>
      </SettingsCard>
    </SettingsPage>
  );
}
