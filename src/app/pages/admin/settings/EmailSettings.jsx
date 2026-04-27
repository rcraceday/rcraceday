// src/app/pages/admin/settings/EmailSettings.jsx

import { useState } from "react";
import CMSPage from "@cms/CMSPage";
import SaveActions from "./components/SaveActions";

export default function EmailSettings() {
  //
  // SAFE INITIAL STATE
  //
  const [settings, setSettings] = useState({
    system_support_email: "",
    noreply_email: "",
    reply_to_email: "",
    email_sender_name: "",
    enable_signup_emails: false,
    enable_password_reset_emails: false,
    enable_system_notifications: false,
  });

  //
  // SAVE HANDLER
  //
  const onSave = () => {
    console.log("Saving email settings:", settings);
    // TODO: Supabase update
  };

  //
  // RENDER
  //
  return (
    <CMSPage>
      <EmailSettingsCard settings={settings} setSettings={setSettings} />
      <SaveActions onSave={onSave} />
    </CMSPage>
  );
}
