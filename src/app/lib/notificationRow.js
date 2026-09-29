/** Unread when either legacy is_read or read says unread. */
export function isNotificationUnread(row) {
  if (!row) return false;
  if (typeof row.read === "boolean") return !row.read;
  if (typeof row.is_read === "boolean") return !row.is_read;
  return false;
}
