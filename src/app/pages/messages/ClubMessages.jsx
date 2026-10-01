import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import useTheme from "@/app/providers/useTheme";
import MessageThreadPanel from "@/app/pages/messages/MessageThreadPanel";
import { useEffect } from "react";
import { markAdminMessagesReadForMember } from "@/app/lib/clubMessages";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";

export default function ClubMessages() {
  const { club } = useClub();
  const { membership } = useMembership();
  const { user } = useAuth();
  const { palette } = useTheme() || {};
  const brand = palette?.primary || "#0A66C2";
  const { t } = useTranslation();
  const { refreshUnreadCount } = useClubMessageUnreadCount({
    clubId: club?.id,
    membershipId: membership?.id,
    audience: "member",
  });

  useEffect(() => {
    if (!club?.id || !membership?.id) return;
    markAdminMessagesReadForMember({
      clubId: club.id,
      membershipId: membership.id,
    });
  }, [club?.id, membership?.id]);

  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#fff" }}>
      <PageTitle
        icon={ChatBubbleLeftRightIcon}
        title={t("messages.title")}
        style={{ color: brand }}
      />
      <main className="app-page-main gap-5">
        <p className="text-sm mb-4" style={{ color: palette?.textMuted || "#6b7280" }}>
          Private conversation with the club. Other members cannot see these messages.
        </p>
        {club?.id && membership?.id ? (
          <MessageThreadPanel
            key={`${club.id}-${membership.id}`}
            clubId={club.id}
            membershipId={membership.id}
            viewerRole="member"
            senderUserId={user?.id}
            brand={brand}
            onSent={refreshUnreadCount}
          />
        ) : (
          <p className="text-sm" style={{ color: palette?.textMuted || "#6b7280" }}>
            Membership not available.
          </p>
        )}
      </main>
    </div>
  );
}
