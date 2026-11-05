import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import DirectoryDisciplinePicker from "@/app/components/clubs/DirectoryDisciplinePicker";
import { useTranslation } from "@/app/i18n/I18nContext";
import { parseDirectoryProfile } from "@/app/lib/primaryClub";
import { fetchPlatformDisciplineTags } from "@/app/lib/platformDisciplines";

function parseDirectoryCoord(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function directoryFormFromClub(club) {
  const directory = parseDirectoryProfile(club?.directory_profile);
  return {
    platform_subscribed: !!club?.platform_subscribed,
    directory_tagline: directory.tagline,
    directory_formal_name: directory.formal_name,
    directory_scales: directory.scales_offered.join(", "),
    directory_classes: directory.classes_offered,
    directory_env_land: directory.environments.includes("land"),
    directory_env_air: directory.environments.includes("air"),
    directory_env_water: directory.environments.includes("water"),
    directory_suburb: directory.location.suburb,
    directory_state: directory.location.state,
    directory_postcode: directory.location.postcode,
    directory_country: directory.location.country,
    directory_lat:
      directory.location.lat != null ? String(directory.location.lat) : "",
    directory_lng:
      directory.location.lng != null ? String(directory.location.lng) : "",
  };
}

export default function ClubInfoSettingsCard({ club }) {
  const { t } = useTranslation();
  const initialDirectory = parseDirectoryProfile(club?.directory_profile);
  const [disciplineTags, setDisciplineTags] = useState([]);
  const [disciplineSlugs, setDisciplineSlugs] = useState(initialDirectory.discipline_slugs);
  const [disciplineSuggestion, setDisciplineSuggestion] = useState(
    initialDirectory.discipline_suggestion
  );
  const [form, setForm] = useState({
    name: club?.name || "",
    short_name: club?.short_name || "",
    description: club?.description || "",
    contact_email: club?.contact_email || "",
    website: club?.website || "",
    phone: club?.phone || "",
    facebook: club?.facebook || "",
    instagram: club?.instagram || "",
    ...directoryFormFromClub(club),
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tags = await fetchPlatformDisciplineTags(supabase);
      if (!cancelled) setDisciplineTags(tags);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    const scales = String(form.directory_scales || "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const directory_profile = {
      tagline: String(form.directory_tagline || "").trim(),
      formal_name: String(form.directory_formal_name || "").trim(),
      scales_offered: scales,
      classes_offered: String(form.directory_classes || "").trim(),
      environments: [
        form.directory_env_land ? "land" : null,
        form.directory_env_air ? "air" : null,
        form.directory_env_water ? "water" : null,
      ].filter(Boolean),
      location: {
        suburb: String(form.directory_suburb || "").trim(),
        state: String(form.directory_state || "").trim(),
        postcode: String(form.directory_postcode || "").trim(),
        country: String(form.directory_country || "").trim(),
        lat: parseDirectoryCoord(form.directory_lat),
        lng: parseDirectoryCoord(form.directory_lng),
      },
      discipline_slugs: disciplineSlugs,
      discipline_suggestion: String(disciplineSuggestion || "").trim(),
    };

    const payload = {
      name: form.name,
      short_name: form.short_name,
      description: form.description,
      contact_email: form.contact_email,
      website: form.website,
      phone: form.phone,
      facebook: form.facebook,
      instagram: form.instagram,
      platform_subscribed: !!form.platform_subscribed,
      directory_profile,
    };

    const { error } = await supabase.from("clubs").update(payload).eq("id", club.id);

    setSaving(false);

    if (error) {
      console.error("Failed to save club info:", error);
      alert(t("admin.clubInfo.saveFailed"));
    } else {
      alert(t("admin.clubInfo.saveSuccess"));
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
      <p style={{ margin: "-12px 0 0", fontSize: 12, color: "#6b7280" }}>{t("admin.clubInfo.shortNameHint")}</p>

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

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />

      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("admin.clubInfo.directorySectionTitle")}</h3>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
        {t("admin.clubInfo.directorySectionHint")}
      </p>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
        <input
          type="checkbox"
          checked={!!form.platform_subscribed}
          onChange={(e) => updateField("platform_subscribed", e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>{t("admin.clubInfo.platformSubscribed")}</span>
      </label>

      <CMSInput
        label={t("admin.clubInfo.directoryFormalName")}
        name="directory_formal_name"
        value={form.directory_formal_name}
        onChange={(value) => updateField("directory_formal_name", value)}
      />

      <CMSInput
        label={t("admin.clubInfo.directoryTagline")}
        name="directory_tagline"
        value={form.directory_tagline}
        onChange={(value) => updateField("directory_tagline", value)}
      />

      <DirectoryDisciplinePicker
        tags={disciplineTags}
        selectedSlugs={disciplineSlugs}
        onChangeSelectedSlugs={setDisciplineSlugs}
        suggestion={disciplineSuggestion}
        onChangeSuggestion={setDisciplineSuggestion}
      />

      <CMSInput
        label={t("admin.clubInfo.directoryScales")}
        name="directory_scales"
        value={form.directory_scales}
        onChange={(value) => updateField("directory_scales", value)}
      />

      <CMSInput
        label={t("admin.clubInfo.directoryClasses")}
        name="directory_classes"
        type="textarea"
        value={form.directory_classes}
        onChange={(value) => updateField("directory_classes", value)}
      />

      <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {t("admin.clubInfo.directoryEnvironmentTitle")}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
        {t("admin.clubInfo.directoryEnvironmentHint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.directory_env_land}
            onChange={(e) => updateField("directory_env_land", e.target.checked)}
          />
          {t("admin.clubInfo.directoryEnvLand")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.directory_env_air}
            onChange={(e) => updateField("directory_env_air", e.target.checked)}
          />
          {t("admin.clubInfo.directoryEnvAir")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={!!form.directory_env_water}
            onChange={(e) => updateField("directory_env_water", e.target.checked)}
          />
          {t("admin.clubInfo.directoryEnvWater")}
        </label>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {t("admin.clubInfo.directoryLocationTitle")}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>
        {t("admin.clubInfo.directoryLocationHint")}
      </p>

      <CMSInput
        label={t("admin.clubInfo.directorySuburb")}
        name="directory_suburb"
        value={form.directory_suburb}
        onChange={(value) => updateField("directory_suburb", value)}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CMSInput
          label={t("admin.clubInfo.directoryState")}
          name="directory_state"
          value={form.directory_state}
          onChange={(value) => updateField("directory_state", value)}
        />
        <CMSInput
          label={t("admin.clubInfo.directoryPostcode")}
          name="directory_postcode"
          value={form.directory_postcode}
          onChange={(value) => updateField("directory_postcode", value)}
        />
      </div>

      <CMSInput
        label={t("admin.clubInfo.directoryCountry")}
        name="directory_country"
        value={form.directory_country}
        onChange={(value) => updateField("directory_country", value)}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CMSInput
          label={t("admin.clubInfo.directoryLat")}
          name="directory_lat"
          value={form.directory_lat}
          onChange={(value) => updateField("directory_lat", value)}
        />
        <CMSInput
          label={t("admin.clubInfo.directoryLng")}
          name="directory_lng"
          value={form.directory_lng}
          onChange={(value) => updateField("directory_lng", value)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
        <CMSButton onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("admin.clubInfo.saveChanges")}
        </CMSButton>
      </div>
    </div>
  );
}
