import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { supabase } from "@/supabaseClient";
import { fetchSenderDisplayNameMap } from "@/app/lib/membershipDisplayName";
import {
  fetchClubMessageThread,
  markAdminMessagesReadForMember,
  markMemberMessagesReadForAdmin,
  sendAdminClubMessage,
  sendMemberClubMessage,
} from "@/app/lib/clubMessages";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function MessageThreadPanel({
  clubId,
  membershipId,
  eventId,
  viewerRole,
  senderUserId,
  onSent,
  brand = "#0A66C2",
  threadMemberName = "Member",
}) {
  const [messages, setMessages] = useState([]);
  const [senderNames, setSenderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;

  const notifySent = useCallback(() => {
    onSentRef.current?.();
  }, []);

  function labelForMessage(msg) {
    if (msg.sender_role === "admin") return "Club";
    if (viewerRole === "member") return "You";
    if (msg.sender_user_id && senderNames[msg.sender_user_id]) {
      return senderNames[msg.sender_user_id];
    }
    return threadMemberName || "Member";
  }

  async function applyThreadData(data) {
    const rows = data || [];
    setMessages(rows);
    const senderIds = rows
      .filter((m) => m.sender_role === "member" && m.sender_user_id)
      .map((m) => m.sender_user_id);
    const names = await fetchSenderDisplayNameMap(supabase, senderIds);
    setSenderNames(names);
  }

  async function loadThread() {
    if (!clubId || !membershipId) return;
    setLoading(true);
    const { data, error: loadError } = await fetchClubMessageThread({ clubId, membershipId });
    if (loadError) {
      setError(loadError.message || "Unable to load messages.");
      setMessages([]);
    } else {
      await applyThreadData(data);
      setError("");
      const markRead =
        viewerRole === "admin"
          ? markMemberMessagesReadForAdmin({ clubId, membershipId })
          : markAdminMessagesReadForMember({ clubId, membershipId });
      markRead.then((result) => {
        if (!result?.error) notifySent();
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!clubId || !membershipId) return undefined;
    let cancelled = false;
    fetchClubMessageThread({ clubId, membershipId }).then(async ({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message || "Unable to load messages.");
        setMessages([]);
      } else {
        await applyThreadData(data);
        setError("");
        const markRead =
          viewerRole === "admin"
            ? markMemberMessagesReadForAdmin({ clubId, membershipId })
            : markAdminMessagesReadForMember({ clubId, membershipId });
        markRead.then((result) => {
          if (!result?.error) notifySent();
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, viewerRole, notifySent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    const send =
      viewerRole === "admin"
        ? sendAdminClubMessage({ clubId, membershipId, body: trimmed, senderUserId })
        : sendMemberClubMessage({
            clubId,
            membershipId,
            eventId,
            body: trimmed,
            senderUserId,
          });
    const { error: sendError } = await send;
    setSending(false);
    if (sendError) {
      setError(sendError.message || "Unable to send message.");
      return;
    }
    setDraft("");
    await loadThread();
    notifySent();
  }

  const setupHint =
    error && /club_messages|schema cache|does not exist|permission denied/i.test(error)
      ? " Messaging is not set up in the database yet. Ask your club to run scripts/create-club-messages.sql in Supabase."
      : "";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="max-h-[420px] min-h-[200px] overflow-y-auto rounded-md border p-3 space-y-3"
        style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
      >
        {loading ? (
          <p className="text-sm text-text-muted">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet. Send a note to the club below.</p>
        ) : (
          messages.map((msg) => {
            const fromClub = msg.sender_role === "admin";
            return (
              <div
                key={msg.id}
                className={`flex ${fromClub ? "justify-start" : "justify-end"}`}
              >
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                  style={{
                    background: fromClub ? "#ffffff" : brand,
                    color: fromClub ? "#111827" : "#ffffff",
                    border: fromClub ? "1px solid #e5e7eb" : "none",
                  }}
                >
                  <div className="text-[11px] opacity-80 mb-1">
                    {labelForMessage(msg)} · {formatWhen(msg.created_at)}
                  </div>
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div>
        <Textarea
          label="Your message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Type your message to the club…"
        />
        {error && (
          <p className="text-sm text-red-600 mt-2">
            {error}
            {setupHint}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <Button type="button" disabled={sending || !draft.trim()} onClick={handleSend}>
            {sending ? "Sending…" : "Send message"}
          </Button>
        </div>
      </div>
    </div>
  );
}
