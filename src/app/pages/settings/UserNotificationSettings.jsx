import { useEffect, useMemo, useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "@/app/lib/notificationPreferences";

export default function UserNotificationSettings() {
  const { club } = useClub();
  const { membership, refreshMembership } = useMembership();
  const { palette } = useTheme() || {};
  const brand = palette?.primary || "#0A66C2";

  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [tracks, setTracks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!membership) return;
    setPrefs(normalizeNotificationPreferences(membership.notification_preferences));
  }, [membership]);

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
    if (allTracksSelected) {
      setPrefs((p) => ({ ...p, track_ids: [trackId] }));
      return;
    }
    const next = new Set(selectedTrackSet);
    if (next.has(trackId)) next.delete(trackId);
    else next.add(trackId);
    setPrefs((p) => ({ ...p, track_ids: Array.from(next) }));
  }

  async function handleSave() {
    if (!membership?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    const normalized = normalizeNotificationPreferences(prefs);
    const { error: saveError } = await supabase
      .from("household_memberships")
      .update({ notification_preferences: normalized })
      .eq("id", membership.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || "Could not save settings.");
      return;
    }
    setMessage("Settings saved.");
    refreshMembership?.();
  }

  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#fff" }}>
      <PageTitle icon={Cog6ToothIcon} title="Settings" style={{ color: brand }} />
      <main className="app-page-main gap-5 max-w-[720px] mx-auto w-full px-4 pb-12">
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-text-muted">
            In-app alerts appear in the app when enabled. Email uses the address on your account.
            Club messages always appear in Messages.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.in_app_enabled}
              onChange={(e) => setPrefs((p) => ({ ...p, in_app_enabled: e.target.checked }))}
            />
            In-app notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.email_enabled}
              onChange={(e) => setPrefs((p) => ({ ...p, email_enabled: e.target.checked }))}
            />
            Email notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.nominations_open_enabled}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, nominations_open_enabled: e.target.checked }))
              }
            />
            Nominations open (default for new events)
          </label>
          <p className="text-xs text-text-muted pl-6">
            Clubs can still send a one-off “notify when nominations open” for a specific event; that
            overrides these settings.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.membership_renewal_enabled}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, membership_renewal_enabled: e.target.checked }))
              }
            />
            Membership renewal reminders
          </label>

          {tracks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-surfaceBorder">
              <p className="text-sm font-medium">Event tracks</p>
              <p className="text-xs text-text-muted">
                Choose which tracks you want event notifications for. Select all, one, or none.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allTracksSelected}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      track_ids: e.target.checked ? null : [],
                    }))
                  }
                />
                All tracks
              </label>
              {!allTracksSelected &&
                tracks.map((track) => (
                  <label key={track.id} className="flex items-center gap-2 text-sm pl-4">
                    <input
                      type="checkbox"
                      checked={selectedTrackSet.has(track.id)}
                      onChange={() => toggleTrack(track.id)}
                    />
                    {track.name}
                  </label>
                ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </Card>

        <Card className="p-4 space-y-2 text-sm text-text-muted">
          <h3 className="font-semibold text-text-base">More settings you may add later</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Preferred contact language and time zone</li>
            <li>SMS / push notifications (PWA)</li>
            <li>Marketing and newsletter opt-in</li>
            <li>Default nomination or payment preferences</li>
            <li>Privacy: show name on public results / leaderboards</li>
            <li>Linked accounts and sign-in security (passkeys, 2FA)</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
