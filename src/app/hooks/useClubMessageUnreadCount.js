import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import {
  CLUB_MESSAGES_INBOX_CHANGED,
  countUnreadForAdmin,
  countUnreadForMember,
} from "@/app/lib/clubMessages";

export function useClubMessageUnreadCount({ clubId, membershipId, audience }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!clubId) {
      setCount(0);
      return;
    }
    if (audience === "admin") {
      setCount(await countUnreadForAdmin(clubId));
      return;
    }
    if (audience === "member" && membershipId) {
      setCount(await countUnreadForMember(clubId, membershipId));
      return;
    }
    setCount(0);
  }, [audience, clubId, membershipId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onInboxChanged = () => {
      refresh();
    };
    window.addEventListener(CLUB_MESSAGES_INBOX_CHANGED, onInboxChanged);
    return () => window.removeEventListener(CLUB_MESSAGES_INBOX_CHANGED, onInboxChanged);
  }, [refresh]);

  useEffect(() => {
    if (!clubId) return undefined;
    const channel = supabase
      .channel(`club_messages_unread_${audience}_${clubId}_${membershipId || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_messages" },
        () => {
          refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [audience, clubId, membershipId, refresh]);

  return { unreadCount: count, refreshUnreadCount: refresh };
}
