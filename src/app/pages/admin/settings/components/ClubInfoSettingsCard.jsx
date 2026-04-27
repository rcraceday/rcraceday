import { useState } from "react";
import { supabase } from "@/supabaseClient";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";

export default function ClubInfoSettingsCard({ club }) {
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
        label="Club Name"
        name="name"
        value={form.name}
        onChange={(e) => updateField("name", e.target.value)}
      />

      <CMSInput
        label="Short Name"
        name="short_name"
        value={form.short_name}
        onChange={(e) => updateField("short_name", e.target.value)}
      />

      <CMSInput
        label="Description"
        name="description"
        type="textarea"
        value={form.description}
        onChange={(e) => updateField("description", e.target.value)}
      />

      <CMSInput
        label="Contact Email"
        name="contact_email"
        value={form.contact_email}
        onChange={(e) => updateField("contact_email", e.target.value)}
      />

      <CMSInput
        label="Website"
        name="website"
        value={form.website}
        onChange={(e) => updateField("website", e.target.value)}
      />

      <CMSInput
        label="Phone"
        name="phone"
        value={form.phone}
        onChange={(e) => updateField("phone", e.target.value)}
      />

      <CMSInput
        label="Facebook"
        name="facebook"
        value={form.facebook}
        onChange={(e) => updateField("facebook", e.target.value)}
      />

      <CMSInput
        label="Instagram"
        name="instagram"
        value={form.instagram}
        onChange={(e) => updateField("instagram", e.target.value)}
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
