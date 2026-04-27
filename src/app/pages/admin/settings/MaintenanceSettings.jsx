// src/app/pages/admin/settings/MaintenanceSettings.jsx

import { useState } from "react";
import CMSPage from "@cms/CMSPage";
import SaveActions from "./components/SaveActions";

export default function MaintenanceSettings() {
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    maintenance_message: "",
  });

  const onSave = () => {
    console.log("Saving maintenance settings:", settings);
  };

  return (
    <CMSPage>
      <MaintenanceSettingsCard settings={settings} setSettings={setSettings} />
      <SaveActions onSave={onSave} />
    </CMSPage>
  );
}
