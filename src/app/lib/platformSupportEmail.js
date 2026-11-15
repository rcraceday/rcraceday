export const PLATFORM_SUPPORT_EMAIL = "info@rcraceday.com";

export function resolveSupportEmailForClub(club) {
  return (
    club?.system_support_email ||
    club?.support_email ||
    club?.club_email ||
    PLATFORM_SUPPORT_EMAIL
  );
}