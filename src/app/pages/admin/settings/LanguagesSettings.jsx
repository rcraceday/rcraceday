// src/app/pages/admin/settings/LanguagesSettings.jsx

import { useState } from "react";
import CMSPage from "@cms/CMSPage";
import SaveActions from "./components/SaveActions";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function LanguagesSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    supported_languages: ["en", "fr", "de", "es", "zh", "ja"],
    default_language: "en",
  });

  const onSave = () => {
    console.log("Saving languages settings:", settings);
  };

  return (
    <CMSPage>
      <LanguagesSettingsCard settings={settings} setSettings={setSettings} />
      <SaveActions onSave={onSave} />
    </CMSPage>
  );
}
