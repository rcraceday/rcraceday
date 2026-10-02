import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import {
  mergeDriverSettings,
  NOMINATE_REQUIRED_FIELD_KEYS,
} from "@/app/lib/driverClubSettings";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";
import CMSSelect from "@cms/CMSSelect";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";
import DriverNumberPoolCard from "./DriverNumberPoolCard";

const bannerStyle = (kind) => ({
  padding: "12px 16px",
  borderRadius: "6px",
  backgroundColor: kind === "error" ? "#FEE2E2" : "#DCFCE7",
  color: kind === "error" ? "#991B1B" : "#166534",
  fontSize: "14px",
});

const SECTION_KEYS = [
  "basic",
  "colors_number",
  "personal",
  "racing",
  "on_road",
  "off_road",
  "experience",
  "trivia_sponsors",
];

export default function DriverSettingsCard({ club }) {
  const { t } = useTranslation();
  const { refreshClub } = useClub();
  const [form, setForm] = useState(() => mergeDriverSettings({}));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [missingColumn, setMissingColumn] = useState(false);

  useEffect(() => {
    if (!club) return;
    setForm(mergeDriverSettings(club.driver_settings));
    setMissingColumn(false);
  }, [club?.id, club?.driver_settings]);

  const patch = useCallback((section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const patchProfileSection = (sectionKey, enabled) => {
    setForm((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        enabled_sections: {
          ...prev.profile.enabled_sections,
          [sectionKey]: enabled,
        },
      },
    }));
  };

  const toggleRequiredField = (fieldKey) => {
    setForm((prev) => {
      const list = prev.profile.required_before_nominate || [];
      const next = list.includes(fieldKey)
        ? list.filter((k) => k !== fieldKey)
        : [...list, fieldKey];
      return {
        ...prev,
        profile: { ...prev.profile, required_before_nominate: next },
      };
    });
  };

  const handleSave = async () => {
    if (!club?.id) return;
    setSaving(true);
    setStatus(null);
    setError(null);

    const { error: saveError } = await supabase
      .from("clubs")
      .update({ driver_settings: form })
      .eq("id", club.id);

    if (saveError) {
      if (saveError.message?.includes("driver_settings")) {
        setMissingColumn(true);
      }
      setError(saveError.message || t("admin.driverSettings.saveFailed"));
      setSaving(false);
      return;
    }

    await refreshClub();
    setStatus(t("admin.driverSettings.saved"));
    setSaving(false);
  };

  const membershipTypes = club?.membership_type_configs || [];

  const nonDriverOptions = [
    { value: "off", label: t("admin.driverSettings.nonDriverOff") },
    { value: "family_only", label: t("admin.driverSettings.nonDriverFamily") },
    { value: "all_member_types", label: t("admin.driverSettings.nonDriverAll") },
  ];

  const directoryAudienceOptions = [
    { value: "members_only", label: t("admin.driverSettings.dirMembersOnly") },
    { value: "authenticated", label: t("admin.driverSettings.dirAuthenticated") },
    { value: "public", label: t("admin.driverSettings.dirPublic") },
  ];

  const directoryDefaultOptions = [
    { value: "opt_out", label: t("admin.driverSettings.dirDefaultOptOut") },
    { value: "opt_in", label: t("admin.driverSettings.dirDefaultOptIn") },
  ];

  const juniorModeOptions = [
    { value: "manual_checkbox", label: t("admin.driverSettings.juniorManual") },
    { value: "auto_by_birth_year", label: t("admin.driverSettings.juniorAutoYear") },
  ];

  return (
    <div style={cmsLayout.stack}>
      {missingColumn && (
        <div style={bannerStyle("error")}>{t("admin.driverSettings.missingColumn")}</div>
      )}
      {error && <div style={bannerStyle("error")}>{error}</div>}
      {status && <div style={bannerStyle("success")}>{status}</div>}

      <CMSCard titleKey="admin.driverSettings.householdTitle">
        <div style={cmsLayout.stack}>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            {t("admin.driverSettings.membershipLinkPrefix")}{" "}
            <Link
              to={`/${club?.slug}/app/admin/settings/membership`}
              style={{ color: "#2563EB", fontWeight: 600 }}
            >
              {t("admin.settings.membership")}
            </Link>
          </p>
          <CMSSelect
            label={t("admin.driverSettings.nonDriverMembers")}
            value={form.household.non_driver_members}
            onChange={(value) => patch("household", "non_driver_members", value)}
            options={nonDriverOptions}
          />
          <div style={{ display: "grid", gap: 12 }}>
            <CMSToggle
              label={t("admin.driverSettings.allowMemberDelete")}
              checked={form.household.allow_member_delete_drivers !== false}
              onChange={(checked) =>
                patch("household", "allow_member_delete_drivers", checked)
              }
            />
            <CMSToggle
              label={t("admin.driverSettings.requireActiveMembership")}
              checked={form.household.require_active_membership_to_add !== false}
              onChange={(checked) =>
                patch("household", "require_active_membership_to_add", checked)
              }
            />
            <CMSToggle
              label={t("admin.driverSettings.allowNonMemberDrivers")}
              checked={form.household.allow_non_member_drivers !== false}
              onChange={(checked) =>
                patch("household", "allow_non_member_drivers", checked)
              }
            />
          </div>
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.namingTitle">
        <div style={cmsLayout.stack}>
          <CMSToggle
            label={t("admin.driverSettings.uniqueNames")}
            checked={form.naming.unique_name_per_club !== false}
            onChange={(checked) => patch("naming", "unique_name_per_club", checked)}
          />
          <CMSToggle
            label={t("admin.driverSettings.warnNameChange")}
            checked={form.naming.warn_on_name_change !== false}
            onChange={(checked) => patch("naming", "warn_on_name_change", checked)}
          />
          <CMSTextarea
            label={t("admin.driverSettings.nameChangeBody")}
            value={form.naming.name_change_notice_body || ""}
            onChange={(value) => patch("naming", "name_change_notice_body", value)}
            placeholder={t("admin.driverSettings.nameChangeBodyPlaceholder")}
          />
          <CMSToggle
            label={t("admin.driverSettings.allowNicknameDirectory")}
            checked={form.naming.allow_nickname_in_directory !== false}
            onChange={(checked) => patch("naming", "allow_nickname_in_directory", checked)}
          />
          <CMSToggle
            label={t("admin.driverSettings.lockNameAfterNom")}
            checked={form.naming.lock_name_after_first_nomination === true}
            onChange={(checked) =>
              patch("naming", "lock_name_after_first_nomination", checked)
            }
          />
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.numbersTitle">
        <div style={cmsLayout.stack}>
          <CMSToggle
            label={t("admin.driverSettings.membersChooseNumbers")}
            checked={form.numbers.members_can_choose !== false}
            onChange={(checked) => patch("numbers", "members_can_choose", checked)}
          />
          <CMSToggle
            label={t("admin.driverSettings.requireNumberNominate")}
            checked={form.numbers.require_before_nominate === true}
            onChange={(checked) => patch("numbers", "require_before_nominate", checked)}
          />
          <CMSToggle
            label={t("admin.driverSettings.membersChangeNumber")}
            checked={form.numbers.members_can_change_after_assign !== false}
            onChange={(checked) =>
              patch("numbers", "members_can_change_after_assign", checked)
            }
          />
          <CMSToggle
            label={t("admin.driverSettings.autoReconcile")}
            checked={form.numbers.auto_reconcile_on_create !== false}
            onChange={(checked) => patch("numbers", "auto_reconcile_on_create", checked)}
          />
        </div>
      </CMSCard>

      <DriverNumberPoolCard club={club} />

      <CMSCard titleKey="admin.driverSettings.profileTitle">
        <div style={cmsLayout.stack}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
            {t("admin.driverSettings.enabledSections")}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {SECTION_KEYS.map((key) => (
              <CMSToggle
                key={key}
                label={t(`admin.driverSettings.section.${key}`)}
                checked={form.profile.enabled_sections?.[key] !== false}
                onChange={(checked) => patchProfileSection(key, checked)}
              />
            ))}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 0" }}>
            {t("admin.driverSettings.requiredBeforeNominate")}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {NOMINATE_REQUIRED_FIELD_KEYS.map((key) => (
              <CMSToggle
                key={key}
                label={t(`admin.driverSettings.requiredField.${key}`)}
                checked={(form.profile.required_before_nominate || []).includes(key)}
                onChange={() => toggleRequiredField(key)}
              />
            ))}
          </div>
          <CMSToggle
            label={t("admin.driverSettings.requireTransponderPerClass")}
            checked={form.profile.require_transponder_per_class === true}
            onChange={(checked) =>
              patch("profile", "require_transponder_per_class", checked)
            }
          />
          <CMSSelect
            label={t("admin.driverSettings.defaultDirectoryVisibility")}
            value={form.profile.default_directory_visibility || "opt_out"}
            onChange={(value) => patch("profile", "default_directory_visibility", value)}
            options={directoryDefaultOptions}
          />
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.directoryTitle">
        <div style={cmsLayout.stack}>
          <CMSToggle
            label={t("admin.driverSettings.directoryEnabled")}
            checked={form.directory.enabled !== false}
            onChange={(checked) => patch("directory", "enabled", checked)}
          />
          <CMSSelect
            label={t("admin.driverSettings.directoryAudience")}
            value={form.directory.audience || "members_only"}
            onChange={(value) => patch("directory", "audience", value)}
            options={directoryAudienceOptions}
          />
          <CMSToggle
            label={t("admin.driverSettings.directoryShowJuniors")}
            checked={form.directory.show_juniors !== false}
            onChange={(checked) => patch("directory", "show_juniors", checked)}
          />
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.juniorsTitle">
        <div style={cmsLayout.stack}>
          <CMSSelect
            label={t("admin.driverSettings.juniorMode")}
            value={form.juniors.mode || "manual_checkbox"}
            onChange={(value) => patch("juniors", "mode", value)}
            options={juniorModeOptions}
          />
          {form.juniors.mode === "auto_by_birth_year" && (
            <CMSInput
              label={t("admin.driverSettings.juniorCutoffYear")}
              value={form.juniors.cutoff_birth_year ?? ""}
              onChange={(value) =>
                patch(
                  "juniors",
                  "cutoff_birth_year",
                  value === "" ? null : Number(value)
                )
              }
              type="number"
            />
          )}
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.livetimeTitle">
        <div style={cmsLayout.stack}>
          <CMSInput
            label={t("admin.driverSettings.livetimeClubName")}
            value={form.livetime.club_name_override || ""}
            onChange={(value) => patch("livetime", "club_name_override", value)}
          />
          <CMSToggle
            label={t("admin.driverSettings.livetimeHints")}
            checked={form.livetime.show_profile_field_hints !== false}
            onChange={(checked) => patch("livetime", "show_profile_field_hints", checked)}
          />
        </div>
      </CMSCard>

      <CMSCard titleKey="admin.driverSettings.accessTitle">
        <div style={cmsLayout.stack}>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            {t("admin.driverSettings.accessHint")}
          </p>
          {membershipTypes.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6B7280" }}>{t("admin.driverSettings.accessNone")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {membershipTypes.map((row) => (
                <li key={row.type_key}>
                  {row.display_name || row.type_key}:{" "}
                  {row.access_driver_profiles !== false
                    ? t("admin.driverSettings.accessOn")
                    : t("admin.driverSettings.accessOff")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CMSCard>

      <CMSButton onClick={handleSave} disabled={saving}>
        {saving ? t("common.saving") : t("admin.driverSettings.save")}
      </CMSButton>
    </div>
  );
}
