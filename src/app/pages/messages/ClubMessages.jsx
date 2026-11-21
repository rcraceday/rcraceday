import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import useTheme from "@/app/providers/useTheme";
import MessageThreadPanel from "@/app/pages/messages/MessageThreadPanel";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { markAllAdminMessagesReadForMember } from "@/app/lib/clubMessages";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";

export default function ClubMessages() {
  const { club } = useClub();
  const { membership } = useMembership();
  const { user } = useAuth();
  const { palette } = useTheme() || {};
  const brand = palette?.primary || "#0A66C2";
  const { t } = useTranslation();
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { unreadCount, refreshUnreadCount } = useClubMessageUnreadCount({
    clubId: club?.id,
    membershipId: membership?.id,
    audience: "member",
  });

  async function handleMarkAllRead() {
    if (!club?.id || !membership?.id || markingAllRead || unreadCount < 1) return;
    setMarkingAllRead(true);
    await markAllAdminMessagesReadForMember({
      clubId: club.id,
      membershipId: membership.id,
    });
    setMarkingAllRead(false);
    refreshUnreadCount();
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: palette?.background || "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageTitle
        icon={ChatBubbleLeftRightIcon}
        title={t("messages.title")}
        style={{ color: brand }}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="!py-1 !px-3 !text-xs !rounded-sm"
              disabled={markingAllRead}
              onClick={handleMarkAllRead}
            >
              {markingAllRead ? "…" : t("messages.markAllRead")}
            </Button>
          ) : null
        }
      />
      <main className="app-page-main gap-5 club-messages-member-page">
        <p className="text-sm mb-4" style={{ color: palette?.textMuted || "#6b7280", flexShrink: 0 }}>
          Private conversation with the club. Other members cannot see these messages.
        </p>
        {club?.id && membership?.id ? (
          <MessageThreadPanel
            fillHeight
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
