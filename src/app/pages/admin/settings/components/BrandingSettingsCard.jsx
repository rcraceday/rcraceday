import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import CMSButton from "@cms/CMSButton";
import CMSColorPicker from "@cms/CMSColorPicker";
import CMSCard from "@cms/CMSCard";

const getFormFromClub = (club) => ({
  logo_url: club?.logo_url || "",
  admin_logo_url: club?.admin_logo_url || "",
  use_club_logo_for_admin: !club?.admin_logo_url,
  primary_color: club?.primary_color || "#005BBB",
  text_color: club?.text_color || "#FFFFFF",
  button_color: club?.button_color || "",
  button_text_color: club?.button_text_color || "#FFFFFF",
});

const getStoragePath = (url) => {
  if (!url) return null;

  const marker = "/club-assets/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
};

export default function BrandingSettingsCard({ club }) {
  const { refreshClub } = useClub();
  const [form, setForm] = useState(() => getFormFromClub(club));

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    setForm(getFormFromClub(club));
  }, [club]);

  // -------------------------------------------------------
  // FILE UPLOAD HELPERS
  // -------------------------------------------------------
  const uploadImage = async (file, fieldName, oldUrl, maxSizeMB, label) => {
    if (!file) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`${label} must be under ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const filePath = `clubs/${club.id}-${fieldName}.${ext}`;
      const oldPath = getStoragePath(oldUrl);

      const { error: uploadError } = await supabase.storage
        .from("club-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert("Upload failed.");
        return;
      }

      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from("club-assets").remove([oldPath]);
      }

      const { data: publicUrl } = supabase.storage
        .from("club-assets")
        .getPublicUrl(filePath);

      updateField(fieldName, `${publicUrl.publicUrl}?v=${Date.now()}`);
    } catch (error) {
      console.error(`Failed to upload ${label.toLowerCase()}:`, error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    uploadImage(file, "logo_url", form.logo_url, 1, "Club logo");
  };

  const handleAdminLogoUpload = (e) => {
    const file = e.target.files?.[0];
    uploadImage(file, "admin_logo_url", form.admin_logo_url, 1, "Admin logo");
  };

  // -------------------------------------------------------
  // SAVE
  // -------------------------------------------------------
  const handleSave = async () => {
    if (!club?.id) return;

    setSaving(true);

    const payload = {
      logo_url: form.logo_url,
      admin_logo_url: form.use_club_logo_for_admin
        ? form.logo_url
        : form.admin_logo_url,

      primary_color: form.primary_color,
      text_color: form.text_color,

      button_color: form.button_color || form.primary_color,
      button_text_color: form.button_text_color,
    };

    try {
      const { data: savedClub, error } = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", club.id)
        .select("id, logo_url, admin_logo_url, primary_color, text_color, button_color, button_text_color")
        .maybeSingle();

      if (error || !savedClub) {
        console.error("Failed to save branding settings:", error || "No club row was updated");
        alert("Failed to save branding settings.");
        return;
      }

      await refreshClub();
      alert("Branding settings saved.");
    } catch (error) {
      console.error("Failed to save branding settings:", error);
      alert("Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------
  // PREVIEW VALUES
  // -------------------------------------------------------
  const previewPrimary = form.primary_color;
  const previewHeaderText = form.text_color;

  const previewButton = form.button_color || form.primary_color;
  const previewButtonText = form.button_text_color;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ------------------------------------------------------- */}
      {/* CLUB LOGO */}
      {/* ------------------------------------------------------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "14px", fontWeight: 600 }}>Club Logo</label>

        {form.logo_url && (
          <img
            src={form.logo_url}
            alt="Club Logo"
            style={{
              height: "80px",
              objectFit: "contain",
              border: "1px solid #ddd",
              borderRadius: "6px",
            }}
          />
        )}

        <input type="file" accept="image/*" onChange={handleLogoUpload} />

        <div style={{ fontSize: "12px", color: "#666" }}>
          Recommended: 400×400px • Max 1MB
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* ADMIN LOGO */}
      {/* ------------------------------------------------------- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "14px", fontWeight: 600 }}>Admin Logo</label>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={form.use_club_logo_for_admin}
            onChange={(e) =>
              updateField("use_club_logo_for_admin", e.target.checked)
            }
          />
          <span style={{ fontSize: "13px", color: "#555" }}>
            Use club logo for admin area
          </span>
        </div>

        {!form.use_club_logo_for_admin && (
          <>
            {form.admin_logo_url && (
              <img
                src={form.admin_logo_url}
                alt="Admin Logo"
                style={{
                  height: "80px",
                  objectFit: "contain",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                }}
              />
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleAdminLogoUpload}
            />

            <div style={{ fontSize: "12px", color: "#666" }}>
              Recommended: 400×400px • Max 1MB
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------- */}
      {/* PRIMARY COLOUR */}
      {/* ------------------------------------------------------- */}
      <CMSColorPicker
        label="Primary Colour"
        value={form.primary_color}
        onChange={(val) => updateField("primary_color", val)}
      />

      {/* ------------------------------------------------------- */}
      {/* HEADER TEXT COLOUR (under primary) */}
      {/* ------------------------------------------------------- */}
      <CMSColorPicker
        label="Text Colour"
        value={form.text_color}
        onChange={(val) => updateField("text_color", val)}
      />

      {/* ------------------------------------------------------- */}
      {/* BUTTON COLOUR */}
      {/* ------------------------------------------------------- */}
      <CMSColorPicker
        label="Button Colour"
        value={form.button_color || form.primary_color}
        onChange={(val) => updateField("button_color", val)}
      />

      {/* ------------------------------------------------------- */}
      {/* BUTTON TEXT COLOUR */}
      {/* ------------------------------------------------------- */}
      <CMSColorPicker
        label="Button Text Colour"
        value={form.button_text_color}
        onChange={(val) => updateField("button_text_color", val)}
      />

      {/* ------------------------------------------------------- */}
      {/* PREVIEW CARD (360px) */}
      {/* ------------------------------------------------------- */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "360px",
            border: `2px solid ${previewPrimary}`,
            borderRadius: "6px",
          }}
        >
          <CMSCard noPadding>

            {/* Header bar */}
            <div
              style={{
                width: "100%",
                height: "48px",
                backgroundColor: previewPrimary,
                borderTopLeftRadius: "6px",
                borderTopRightRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: previewHeaderText,
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              Preview Title
            </div>

            {/* Body */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                textAlign: "left",
                color: "#444",
              }}
            >
              <div style={{ fontSize: "14px" }}>
                This is how your colours will look.
              </div>

              <CMSButton
                style={{
                  backgroundColor: previewButton,
                  color: previewButtonText,
                  border: "none",
                }}
              >
                Preview Button
              </CMSButton>
            </div>
          </CMSCard>
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* SAVE BUTTON */}
      {/* ------------------------------------------------------- */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CMSButton onClick={handleSave} disabled={saving || uploading}>
          {saving || uploading ? "Saving…" : "Save Changes"}
        </CMSButton>
      </div>
    </div>
  );
}
