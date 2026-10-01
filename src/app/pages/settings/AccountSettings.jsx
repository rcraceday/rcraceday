import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import SettingsPage from "./SettingsPage";
import SettingsCard from "./SettingsCard";
import { settingsStyles as s } from "./settingsStyles";

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const emptyDetails = {
  first_name: "",
  last_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "Australia",
};

export default function AccountSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { membership, refreshMembership } = useMembership();

  const [details, setDetails] = useState(emptyDetails);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDetails({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone: profile.phone || "",
      address_line1: profile.address_line1 || "",
      address_line2: profile.address_line2 || "",
      suburb: profile.suburb || "",
      state: profile.state || "",
      postcode: profile.postcode || "",
      country: profile.country || "Australia",
    });
  }, [profile]);

  function updateDetail(field, value) {
    setDetails((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveDetails() {
    if (!user?.id) return;
    setSavingDetails(true);
    setDetailsError("");
    setDetailsMessage("");

    const names = {
      first_name: details.first_name.trim(),
      last_name: details.last_name.trim(),
    };
    const contact = {
      phone: details.phone.trim() || null,
      address_line1: details.address_line1.trim() || null,
      address_line2: details.address_line2.trim() || null,
      suburb: details.suburb.trim() || null,
      state: details.state.trim() || null,
      postcode: details.postcode.trim() || null,
      country: details.country.trim() || null,
    };

    if (!names.first_name || !names.last_name) {
      setSavingDetails(false);
      setDetailsError(t("settings.account.nameRequired"));
      return;
    }

    let { error } = await supabase
      .from("profiles")
      .update({ ...names, ...contact })
      .eq("id", user.id);

    if (error?.message?.includes("column")) {
      const nameOnly = await supabase.from("profiles").update(names).eq("id", user.id);
      if (nameOnly.error) {
        setSavingDetails(false);
        setDetailsError(nameOnly.error.message || t("settings.account.title"));
        return;
      }
      if (membership?.id) {
        await supabase
          .from("household_memberships")
          .update({
            primary_first_name: names.first_name,
            primary_last_name: names.last_name,
          })
          .eq("id", membership.id);
        refreshMembership?.();
      }
      await refreshProfile?.();
      setSavingDetails(false);
      setDetailsError(t("settings.account.nameSavedPartial"));
      return;
    }

    if (error) {
      setSavingDetails(false);
      setDetailsError(error.message || t("settings.account.title"));
      return;
    }

    if (membership?.id) {
      await supabase
        .from("household_memberships")
        .update({
          primary_first_name: names.first_name,
          primary_last_name: names.last_name,
        })
        .eq("id", membership.id);
      refreshMembership?.();
    }

    await refreshProfile?.();
    setSavingDetails(false);
    setDetailsMessage(t("settings.account.detailsSaved"));
  }

  async function handleUpdateEmail() {
    setEmailError("");
    setEmailMessage("");
    setSavingEmail(true);

    if (!newEmail || !emailPassword) {
      setSavingEmail(false);
      setEmailError(t("settings.account.emailPasswordRequired"));
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: emailPassword,
    });

    if (signInError) {
      setSavingEmail(false);
      setEmailError(t("settings.account.wrongPassword"));
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);

    if (error) {
      setEmailError(error.message || t("settings.account.updateEmail"));
      return;
    }

    setEmailMessage(t("settings.account.emailConfirmSent"));
    setNewEmail("");
    setEmailPassword("");
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordMessage("");
    setSavingPassword(true);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setSavingPassword(false);
      setPasswordError(t("settings.account.passwordFieldsRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setSavingPassword(false);
      setPasswordError(t("settings.account.passwordMismatch"));
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: oldPassword,
    });

    if (signInError) {
      setSavingPassword(false);
      setPasswordError(t("settings.account.wrongCurrentPassword"));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message || t("settings.account.updatePassword"));
      return;
    }

    setPasswordMessage(t("settings.account.passwordUpdated"));
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <SettingsPage
      title={t("settings.account.title")}
      subtitle={t("settings.account.subtitle")}
    >
      <style>
        {`
          .settings-field-grid-2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }
          @media (min-width: 600px) {
            .settings-field-grid-2 {
              grid-template-columns: 1fr 1fr;
            }
          }
        `}
      </style>

      <SettingsCard title={t("settings.account.personalDetails")}>
        <div className="settings-field-grid-2">
          <Input
            label={t("settings.account.firstName")}
            value={details.first_name}
            onChange={(e) => updateDetail("first_name", e.target.value)}
          />
          <Input
            label={t("settings.account.lastName")}
            value={details.last_name}
            onChange={(e) => updateDetail("last_name", e.target.value)}
          />
        </div>
        <Input
          label={t("settings.account.phone")}
          type="tel"
          value={details.phone}
          onChange={(e) => updateDetail("phone", e.target.value)}
        />
      </SettingsCard>

      <SettingsCard title={t("settings.account.address")}>
        <Input
          label={t("settings.account.street")}
          value={details.address_line1}
          onChange={(e) => updateDetail("address_line1", e.target.value)}
        />
        <Input
          label={t("settings.account.addressLine2")}
          value={details.address_line2}
          onChange={(e) => updateDetail("address_line2", e.target.value)}
        />
        <div className="settings-field-grid-2">
          <Input
            label={t("settings.account.suburb")}
            value={details.suburb}
            onChange={(e) => updateDetail("suburb", e.target.value)}
          />
          <Select
            label={t("settings.account.state")}
            value={details.state}
            onChange={(e) => updateDetail("state", e.target.value)}
          >
            <option value="">{t("common.select")}</option>
            {AU_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
          <Input
            label={t("settings.account.postcode")}
            value={details.postcode}
            onChange={(e) => updateDetail("postcode", e.target.value)}
          />
          <Input
            label={t("settings.account.country")}
            value={details.country}
            onChange={(e) => updateDetail("country", e.target.value)}
          />
        </div>
        {detailsError ? <p style={s.statusError}>{detailsError}</p> : null}
        {detailsMessage ? <p style={s.statusOk}>{detailsMessage}</p> : null}
        <div style={s.actions}>
          <Button type="button" disabled={savingDetails} onClick={handleSaveDetails}>
            {savingDetails ? t("common.saving") : t("settings.account.saveDetails")}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.account.email")}
        hint={t("settings.account.emailHint", { email: profile?.email || "—" })}
      >
        <Input
          label={t("settings.account.newEmail")}
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Input
          label={t("settings.account.currentPassword")}
          type="password"
          value={emailPassword}
          onChange={(e) => setEmailPassword(e.target.value)}
        />
        {emailError ? <p style={s.statusError}>{emailError}</p> : null}
        {emailMessage ? <p style={s.statusOk}>{emailMessage}</p> : null}
        <div style={s.actions}>
          <Button type="button" disabled={savingEmail} onClick={handleUpdateEmail}>
            {savingEmail ? t("common.updating") : t("settings.account.updateEmail")}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title={t("settings.account.password")}>
        <Input
          label={t("settings.account.currentPassword")}
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <Input
          label={t("settings.account.newPassword")}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label={t("settings.account.confirmPassword")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {passwordError ? <p style={s.statusError}>{passwordError}</p> : null}
        {passwordMessage ? <p style={s.statusOk}>{passwordMessage}</p> : null}
        <div style={s.actions}>
          <Button type="button" disabled={savingPassword} onClick={handleChangePassword}>
            {savingPassword ? t("common.updating") : t("settings.account.updatePassword")}
          </Button>
        </div>
      </SettingsCard>
    </SettingsPage>
  );
}
