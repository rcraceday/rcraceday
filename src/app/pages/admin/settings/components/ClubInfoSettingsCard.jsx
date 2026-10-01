import { useState } from "react";
import { supabase } from "@/supabaseClient";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function ClubInfoSettingsCard({ club }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: club?.name || "",
    short_name: club?.short_name || "",
    description: club?.description || "",
    contact_email: club?.contact_email || "",
    website: club?.website || "",
    phone: club?.phone || "",
    facebook: club?.facebook || "",
    instagram: club?.instagram || "",
  });

  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = { ...form };

    const { error } = await supabase
      .from("clubs")
      .update(payload)
      .eq("id", club.id);

    setSaving(false);

    if (error) {
      console.error("Failed to save club info:", error);
      alert("Failed to save club info.");
    } else {
      alert("Club info saved.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <CMSInput
        labelKey="cms.clubName"
        name="name"
        value={form.name}
        onChange={(value) => updateField("name", value)}
      />

      <CMSInput
        labelKey="cms.shortName"
        name="short_name"
        value={form.short_name}
        onChange={(value) => updateField("short_name", value)}
      />

      <CMSInput
        labelKey="cms.description"
        name="description"
        type="textarea"
        value={form.description}
        onChange={(value) => updateField("description", value)}
      />

      <CMSInput
        labelKey="cms.contactEmail"
        name="contact_email"
        value={form.contact_email}
        onChange={(value) => updateField("contact_email", value)}
      />

      <CMSInput
        labelKey="cms.website"
        name="website"
        value={form.website}
        onChange={(value) => updateField("website", value)}
      />

      <CMSInput
        labelKey="cms.phone"
        name="phone"
        value={form.phone}
        onChange={(value) => updateField("phone", value)}
      />

      <CMSInput
        labelKey="cms.facebook"
        name="facebook"
        value={form.facebook}
        onChange={(value) => updateField("facebook", value)}
      />

      <CMSInput
        labelKey="cms.instagram"
        name="instagram"
        value={form.instagram}
        onChange={(value) => updateField("instagram", value)}
      />

      {/* CENTERED SAVE BUTTON */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
        <CMSButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </CMSButton>
      </div>
    </div>
  );
}
