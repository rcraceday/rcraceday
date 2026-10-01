import { Link, useParams } from "react-router-dom";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function ClubMessagesNavLink({
  variant = "user",
  compact = false,
  className = "",
}) {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { membership } = useMembership();
  const { profile } = useProfile();
  const isAdmin = (profile?.role || "").toLowerCase() === "admin";
  const audience = variant === "admin" && isAdmin ? "admin" : "member";

  const { unreadCount } = useClubMessageUnreadCount({
    clubId: club?.id,
    membershipId: membership?.id,
    audience,
  });

  const to =
    variant === "admin" && isAdmin
      ? `/${clubSlug}/app/admin/messages`
      : `/${clubSlug}/app/messages`;

  const badgeAccent =
    variant === "admin" ? "var(--admin-accent, #c20a0a)" : "#0A66C2";
  const iconColor = variant === "admin" ? "#111827" : undefined;

  return (
    <Link
      to={to}
      className={`relative inline-flex items-center justify-center rounded-md transition-colors hover:bg-black/5 ${
        compact ? "p-1" : "p-2"
      } ${className}`}
      aria-label={
        unreadCount > 0
          ? t("messagesNav.unreadAria", { count: unreadCount })
          : t("messagesNav.title")
      }
      title={t("messagesNav.title")}
    >
      <ChatBubbleLeftRightIcon
        className={compact ? "h-4 w-4" : "h-6 w-6"}
        style={iconColor ? { color: iconColor } : undefined}
      />
      {unreadCount > 0 && (
        <span
          className={`absolute flex items-center justify-center rounded-full font-semibold text-white ${
            compact
              ? "-top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 text-[9px]"
              : "-top-0.5 -right-0.5 h-5 min-w-5 px-1 text-[11px]"
          }`}
          style={{ background: badgeAccent }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
