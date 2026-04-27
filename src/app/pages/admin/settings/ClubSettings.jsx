// src/app/pages/admin/settings/ClubSettings.jsx

import { useState } from "react";
import CMSPage from "@cms/CMSPage";
import SaveActions from "./components/SaveActions";

export default function ClubSettings() {
  const [settings, setSettings] = useState({
    club_name: "",
    club_short_name: "",
    club_contact_email: "",
    club_phone: "",
    club_website: "",
    club_default_language: "",
    club_location: "",
    club_timezone: "",
    enable_club_public_page: false,
    enable_club_membership: false,
    enable_club_announcements: false,

    // ⭐ REQUIRED — without this, the app crashes
    supported_languages: ["en", "fr", "de", "es", "zh", "ja"],
  });

  const onSave = () => {
    console.log("Saving club settings:", settings);
  };

  return (
    <CMSPage>
      <ClubSettingsCard settings={settings} setSettings={setSettings} />
      <SaveActions onSave={onSave} />
    </CMSPage>
  );
}
