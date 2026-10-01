import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import Button from "@/components/ui/Button";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/app/lib/notificationPreferences";
import {
  getPushDeviceStatus,
  isWebPushConfigured,
  isWebPushSupported,
  subscribeWebPush,
  unsubscribeWebPush,
} from "@/app/lib/webPushClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import SettingsPage from "./SettingsPage";
import SettingsCard from "./SettingsCard";
import SettingsToggleRow from "./SettingsToggleRow";
import { settingsStyles as s } from "./settingsStyles";

export default function UserNotificationSettings() {
  const { t } = useTranslation();
  const { club } = useClub();
  const { user } = useAuth();
  const { membership, refreshMembership } = useMembership();

  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [tracks, setTracks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [enablingDevice, setEnablingDevice] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deviceStatus, setDeviceStatus] = useState(null);

  useEffect(() => {
    if (!membership) return;
    setPrefs(normalizeNotificationPreferences(membership.notification_preferences));
  }, [membership]);

  async function refreshDeviceStatus() {
    const status = await getPushDeviceStatus();
    setDeviceStatus(status);
    return status;
  }

  useEffect(() => {
    refreshDeviceStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshDeviceStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!club?.id) return;
    supabase
      .from("club_tracks")
      .select("id, name")
      .eq("club_id", club.id)
      .order("name")
      .then(({ data }) => setTracks(data || []));
  }, [club?.id]);

  const allTracksSelected = prefs.track_ids === null;
  const selectedTrackSet = useMemo(() => new Set(prefs.track_ids || []), [prefs.track_ids]);

  function toggleTrack(trackId) {
    const allIds = tracks.map((track) => track.id);
    if (allTracksSelected) {
      setPrefs((p) => ({
        ...p,
        track_ids: allIds.filter((id) => id !== trackId),
      }));
      return;
    }
    const next = new Set(selectedTrackSet);
    if (next.has(trackId)) next.delete(trackId);
    else next.add(trackId);
    const selectedAll = allIds.length > 0 && allIds.every((id) => next.has(id));
    setPrefs((p) => ({
      ...p,
      track_ids: selectedAll ? null : Array.from(next),
    }));
  }

  async function handleSave() {
    if (!membership?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    const normalized = normalizeNotificationPreferences(prefs);

    if (!normalized.push_enabled) {
      await unsubscribeWebPush(supabase);
    }

    const { error: saveError } = await supabase
      .from("household_memberships")
      .update({ notification_preferences: normalized })
      .eq("id", membership.id);

    if (saveError) {
      setSaving(false);
      setError(saveError.message || "Could not save settings.");
      return;
    }

    if (normalized.push_enabled && user?.id && isWebPushConfigured() && isWebPushSupported()) {
      const { error: pushError } = await subscribeWebPush(supabase, {
        userId: user.id,
        clubId: club?.id ?? null,
        requestPermission: true,
      });
      if (pushError) {
        setSaving(false);
        setError(pushError.message || "Settings saved, but this device is not registered for push.");
        refreshMembership?.();
        await refreshDeviceStatus();
        return;
      }
    }

    setSaving(false);
    setMessage(
      normalized.push_enabled ? t("settings.notifications.savedPush") : t("settings.notifications.saved")
    );
    refreshMembership?.();
    await refreshDeviceStatus();
  }

  async function handleEnableThisDevice() {
    if (!membership?.id || !user?.id) return;
    setEnablingDevice(true);
    setError("");
    setMessage("");
    const next = normalizeNotificationPreferences({ ...prefs, push_enabled: true });
    setPrefs(next);

    const { error: saveError } = await supabase
      .from("household_memberships")
      .update({ notification_preferences: next })
      .eq("id", membership.id);

    if (saveError) {
      setEnablingDevice(false);
      setError(saveError.message || "Could not save settings.");
      return;
    }

    const { error: pushError } = await subscribeWebPush(supabase, {
      userId: user.id,
      clubId: club?.id ?? null,
      requestPermission: true,
    });

    setEnablingDevice(false);
    refreshMembership?.();
    await refreshDeviceStatus();

    if (pushError) {
      setError(pushError.message || "Could not register this device for push.");
      return;
    }
    setMessage(t("settings.notifications.deviceRegisteredMsg"));
  }

  const deviceHint = !deviceStatus
    ? ""
    : deviceStatus.subscribed
      ? t("settings.notifications.deviceRegistered")
      : deviceStatus.permission === "denied"
        ? t("settings.notifications.deviceBlocked")
        : deviceStatus.iosNeedsHomeScreen
          ? t("settings.notifications.deviceIosHome")
          : t("settings.notifications.deviceNotRegistered");

  return (
    <SettingsPage
      title={t("settings.notifications.title")}
      subtitle={t("settings.notifications.subtitle")}
    >
      <SettingsCard title={t("settings.notifications.delivery")}>
        <SettingsToggleRow
          label={t("settings.notifications.inApp")}
          description={t("settings.notifications.inAppDesc")}
          checked={prefs.in_app_enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, in_app_enabled: checked }))}
        />
        <SettingsToggleRow
          label={t("settings.notifications.email")}
          description={t("settings.notifications.emailDesc")}
          checked={prefs.email_enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, email_enabled: checked }))}
        />
        <SettingsToggleRow
          label={t("settings.notifications.push")}
          description={t("settings.notifications.pushDesc")}
          checked={prefs.push_enabled}
          disabled={!isWebPushConfigured() || !isWebPushSupported()}
          onChange={(checked) => setPrefs((p) => ({ ...p, push_enabled: checked }))}
          last
        />
        {!isWebPushConfigured() ? (
          <p style={s.cardHint}>{t("settings.notifications.pushNotConfigured")}</p>
        ) : null}
        {isWebPushConfigured() && !isWebPushSupported() ? (
          <p style={s.cardHint}>{t("settings.notifications.pushUnsupported")}</p>
        ) : null}
        {deviceStatus ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={s.cardHint}>{deviceHint}</p>
            <div style={s.actions}>
              <Button
                type="button"
                size="sm"
                disabled={
                  enablingDevice ||
                  !isWebPushConfigured() ||
                  !isWebPushSupported() ||
                  deviceStatus.subscribed
                }
                onClick={handleEnableThisDevice}
              >
                {enablingDevice
                  ? t("settings.notifications.enabling")
                  : deviceStatus.subscribed
                    ? t("settings.notifications.deviceEnabled")
                    : t("settings.notifications.enableDevice")}
              </Button>
            </div>
          </div>
        ) : null}
      </SettingsCard>

      <SettingsCard title={t("settings.notifications.whatToNotify")}>
        <SettingsToggleRow
          label={t("settings.notifications.nominationsOpen")}
          description={t("settings.notifications.nominationsOpenDesc")}
          checked={prefs.nominations_open_enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, nominations_open_enabled: checked }))}
        />
        <SettingsToggleRow
          label={t("settings.notifications.membershipRenewal")}
          description={t("settings.notifications.membershipRenewalDesc")}
          checked={prefs.membership_renewal_enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, membership_renewal_enabled: checked }))}
        />
        <SettingsToggleRow
          label={t("settings.notifications.clubNews")}
          description={t("settings.notifications.clubNewsDesc")}
          checked={prefs.club_news_enabled}
          onChange={(checked) => setPrefs((p) => ({ ...p, club_news_enabled: checked }))}
          last
        />
      </SettingsCard>

      {tracks.length > 0 ? (
        <SettingsCard
          title={t("settings.notifications.tracks")}
          hint={t("settings.notifications.tracksHint")}
        >
          <SettingsToggleRow
            label={t("settings.notifications.allTracks")}
            checked={allTracksSelected}
            onChange={(checked) =>
              setPrefs((p) => ({
                ...p,
                track_ids: checked ? null : [],
              }))
            }
          />
          {tracks.map((track, index) => (
            <SettingsToggleRow
              key={track.id}
              label={track.name}
              checked={allTracksSelected || selectedTrackSet.has(track.id)}
              onChange={() => toggleTrack(track.id)}
              last={index === tracks.length - 1}
            />
          ))}
        </SettingsCard>
      ) : null}

      {error ? <p style={s.statusError}>{error}</p> : null}
      {message ? <p style={s.statusOk}>{message}</p> : null}
      <div style={s.actions}>
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? t("common.saving") : t("settings.notifications.save")}
        </Button>
      </div>
    </SettingsPage>
  );
}
