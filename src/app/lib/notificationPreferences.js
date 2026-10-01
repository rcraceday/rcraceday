export const DEFAULT_NOTIFICATION_PREFERENCES = {
  in_app_enabled: true,
  email_enabled: true,
  push_enabled: true,
  nominations_open_enabled: true,
  membership_renewal_enabled: true,
  club_news_enabled: true,
  /** null = all club tracks; [] = none; [uuid, ...] = only those tracks */
  track_ids: null,
};

export function normalizeNotificationPreferences(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const trackIds = source.track_ids;
  return {
    in_app_enabled:
      typeof source.in_app_enabled === "boolean"
        ? source.in_app_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.in_app_enabled,
    email_enabled:
      typeof source.email_enabled === "boolean"
        ? source.email_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.email_enabled,
    push_enabled:
      typeof source.push_enabled === "boolean"
        ? source.push_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.push_enabled,
    nominations_open_enabled:
      typeof source.nominations_open_enabled === "boolean"
        ? source.nominations_open_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.nominations_open_enabled,
    membership_renewal_enabled:
      typeof source.membership_renewal_enabled === "boolean"
        ? source.membership_renewal_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.membership_renewal_enabled,
    club_news_enabled:
      typeof source.club_news_enabled === "boolean"
        ? source.club_news_enabled
        : DEFAULT_NOTIFICATION_PREFERENCES.club_news_enabled,
    track_ids:
      trackIds === null || trackIds === undefined
        ? null
        : Array.isArray(trackIds)
          ? trackIds.filter(Boolean)
          : null,
  };
}

/**
 * Whether to send nominations-open alerts for this member/event.
 * event.notify_nominations_open forces in-app, push, and email regardless of user opt-out.
 */
export function shouldNotifyNominationsOpen(preferences, event) {
  if (event?.notify_nominations_open) {
    return { inApp: true, email: true, push: true, forced: true };
  }
  const prefs = normalizeNotificationPreferences(preferences);
  const nom = prefs.nominations_open_enabled;
  return {
    inApp: prefs.in_app_enabled && nom,
    email: prefs.email_enabled && nom,
    push: prefs.push_enabled && nom,
    forced: false,
  };
}

export function shouldNotifyForEventTrack(preferences, eventTrackId) {
  const prefs = normalizeNotificationPreferences(preferences);
  if (!eventTrackId) return true;
  if (prefs.track_ids === null) return true;
  if (!Array.isArray(prefs.track_ids) || prefs.track_ids.length === 0) return false;
  return prefs.track_ids.includes(eventTrackId);
}

export function shouldNotifyMembershipRenewal(preferences) {
  const prefs = normalizeNotificationPreferences(preferences);
  const renewal = prefs.membership_renewal_enabled;
  return {
    inApp: prefs.in_app_enabled && renewal,
    email: prefs.email_enabled && renewal,
    push: prefs.push_enabled && renewal,
  };
}

export function shouldNotifyClubNews(preferences) {
  const prefs = normalizeNotificationPreferences(preferences);
  const news = prefs.club_news_enabled;
  return {
    inApp: prefs.in_app_enabled && news,
    email: prefs.email_enabled && news,
    push: prefs.push_enabled && news,
  };
}
