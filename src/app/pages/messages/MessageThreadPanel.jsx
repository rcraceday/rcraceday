import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { supabase } from "@/supabaseClient";
import { fetchSenderDisplayNameMap } from "@/app/lib/membershipDisplayName";
import {
  canDeleteClubMessage,
  fetchClubMessageThread,
  manageClubMessages,
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
  fillHeight = false,
}) {
  const [messages, setMessages] = useState([]);
  const [senderNames, setSenderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const scrollRef = useRef(null);
  const onSentRef = useRef(onSent);
  onSentRef.current = onSent;

  const notifySent = useCallback(() => {
    onSentRef.current?.();
  }, []);

  const clearSelectionState = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setContextMenu(null);
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
    const { data, error: loadError } = await fetchClubMessageThread({
      clubId,
      membershipId,
      viewerRole,
    });
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
    clearSelectionState();
    fetchClubMessageThread({ clubId, membershipId, viewerRole }).then(
      async ({ data, error: loadError }) => {
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
      }
    );
    return () => {
      cancelled = true;
    };
  }, [clubId, membershipId, viewerRole, notifySent, clearSelectionState]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  const scrollToLatest = useCallback((behavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }, []);

  useLayoutEffect(() => {
    if (loading || messages.length === 0) return;
    scrollToLatest("auto");
  }, [loading, messages, scrollToLatest]);

  function toggleSelected(messageId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(messages.map((m) => m.id)));
  }

  async function runManage(action, ids) {
    const messageIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (!messageIds.length || managing) return;
    if (action === "delete") {
      const count = messageIds.length;
      const ok = window.confirm(
        count === 1
          ? "Delete this message permanently?"
          : `Delete ${count} messages permanently?`
      );
      if (!ok) return;
    }
    setManaging(true);
    setError("");
    const { error: manageError } = await manageClubMessages({
      clubId,
      membershipId,
      messageIds,
      action,
    });
    setManaging(false);
    setContextMenu(null);
    if (manageError) {
      setError(manageError.message || "Could not update messages.");
      return;
    }
    clearSelectionState();
    await loadThread();
    notifySent();
  }

  function openContextMenu(event, msg) {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      messageId: msg.id,
      canDelete: canDeleteClubMessage(msg, viewerRole, senderUserId),
    });
  }

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
    scrollToLatest("smooth");
    notifySent();
  }

  const selectedCount = selectedIds.size;
  const selectedDeletableCount = messages.filter(
    (msg) => selectedIds.has(msg.id) && canDeleteClubMessage(msg, viewerRole, senderUserId)
  ).length;

  const setupHint =
    error && /club_messages|schema cache|does not exist|permission denied/i.test(error)
      ? " Messaging is not set up in the database yet. Ask your club to run scripts/create-club-messages.sql in Supabase."
      : "";

  const threadClass = fillHeight
    ? "club-message-thread club-message-thread--fill"
    : "club-message-thread";

  const contextMessage =
    contextMenu?.messageId && messages.find((m) => m.id === contextMenu.messageId);

  return (
    <div className={threadClass}>
      {!loading && messages.length > 0 ? (
        <div className="club-message-thread-toolbar">
          {selectionMode ? (
            <>
              <button
                type="button"
                className="club-message-thread-toolbar-btn"
                onClick={clearSelectionState}
              >
                Cancel
              </button>
              <span className="club-message-thread-toolbar-muted">
                {selectedCount} selected
              </span>
              <button
                type="button"
                className="club-message-thread-toolbar-btn"
                onClick={selectAllVisible}
              >
                Select all
              </button>
              <span className="club-message-thread-toolbar-spacer" />
              <button
                type="button"
                className="club-message-thread-toolbar-btn"
                disabled={!selectedCount || managing}
                onClick={() => runManage("archive", [...selectedIds])}
              >
                Archive
              </button>
              <button
                type="button"
                className="club-message-thread-toolbar-btn club-message-thread-toolbar-btn--danger"
                disabled={!selectedDeletableCount || managing}
                onClick={() => {
                  const ids = messages
                    .filter(
                      (msg) =>
                        selectedIds.has(msg.id) &&
                        canDeleteClubMessage(msg, viewerRole, senderUserId)
                    )
                    .map((msg) => msg.id);
                  runManage("delete", ids);
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="club-message-thread-toolbar-btn"
                onClick={() => setSelectionMode(true)}
              >
                Select messages
              </button>
              <span className="club-message-thread-toolbar-muted">
                Right-click a message to archive or delete
              </span>
            </>
          )}
        </div>
      ) : null}

      <div ref={scrollRef} className="club-message-thread-scroll">
        {loading ? (
          <p className="text-sm text-text-muted">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-text-muted">
            {viewerRole === "admin"
              ? "No messages yet. Send a note to this member below."
              : "No messages yet. Send a note to the club below."}
          </p>
        ) : (
          messages.map((msg) => {
            const fromClub = msg.sender_role === "admin";
            const selected = selectedIds.has(msg.id);
            return (
              <div
                key={msg.id}
                className={`club-message-bubble-row ${
                  fromClub ? "club-message-bubble-row--start" : "club-message-bubble-row--end"
                }`}
              >
                <div
                  className={`club-message-bubble-wrap ${
                    fromClub ? "club-message-bubble-wrap--start" : "club-message-bubble-wrap--end"
                  }${selected ? " club-message-bubble-wrap--selected" : ""}`}
                  onContextMenu={(e) => openContextMenu(e, msg)}
                  onClick={() => {
                    if (selectionMode) toggleSelected(msg.id);
                  }}
                  onKeyDown={(e) => {
                    if (selectionMode && (e.key === " " || e.key === "Enter")) {
                      e.preventDefault();
                      toggleSelected(msg.id);
                    }
                  }}
                  role={selectionMode ? "button" : undefined}
                  tabIndex={selectionMode ? 0 : undefined}
                >
                  {selectionMode ? (
                    <input
                      type="checkbox"
                      className="club-message-select-check"
                      checked={selected}
                      onChange={() => toggleSelected(msg.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select message"
                    />
                  ) : null}
                  <div
                    className="club-message-bubble"
                    style={{
                      background: fromClub ? "#ffffff" : brand,
                      color: fromClub ? "#111827" : "#ffffff",
                      border: fromClub ? "1px solid #e5e7eb" : "none",
                      cursor: selectionMode ? "pointer" : "default",
                    }}
                  >
                    <div className="club-message-bubble-meta">
                      {labelForMessage(msg)} · {formatWhen(msg.created_at)}
                    </div>
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {contextMenu && contextMessage
        ? createPortal(
            <div
              className="club-message-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => runManage("archive", [contextMessage.id])}
                disabled={managing}
              >
                Archive
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => runManage("delete", [contextMessage.id])}
                disabled={managing || !contextMenu.canDelete}
              >
                Delete
              </button>
            </div>,
            document.body
          )
        : null}

      <div className="club-message-thread-compose">
        <Textarea
          label="Your message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder={
            viewerRole === "admin"
              ? "Type your message to the member…"
              : "Type your message to the club…"
          }
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