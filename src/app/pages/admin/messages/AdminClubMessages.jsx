import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { cmsStyles } from "@cms/styles";
import MessageThreadPanel from "@/app/pages/messages/MessageThreadPanel";
import {
  fetchClubMessagesForClub,
  groupMessagesByMembership,
} from "@/app/lib/clubMessages";
import {
  enrichMembershipDisplayNameMapFromMessages,
  fetchMembershipDisplayNameMap,
} from "@/app/lib/membershipDisplayName";
import { useClubMessageUnreadCount } from "@/app/hooks/useClubMessageUnreadCount";

export default function AdminClubMessages() {
  const { club } = useClub();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("household") || "";

  const [threads, setThreads] = useState([]);
  const [labels, setLabels] = useState({});
  const [memberDirectory, setMemberDirectory] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { refreshUnreadCount } = useClubMessageUnreadCount({
    clubId: club?.id,
    audience: "admin",
  });

  useEffect(() => {
    if (!club?.id) return undefined;
    let cancelled = false;

    fetchClubMessagesForClub(club.id).then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn(error);
        setThreads([]);
        setLabels({});
        setLoading(false);
        return;
      }
      const grouped = groupMessagesByMembership(data || []);
      setThreads(grouped);

      const ids = grouped.map((t) => t.membershipId);
      if (ids.length) {
        let next = await fetchMembershipDisplayNameMap(supabase, ids);
        next = await enrichMembershipDisplayNameMapFromMessages(
          supabase,
          data || [],
          next
        );
        if (cancelled) return;
        setLabels(next);
      } else {
        setLabels({});
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [club?.id]);

  useEffect(() => {
    if (!club?.id) return;
    supabase
      .from("household_memberships")
      .select("id, user_id, email, primary_first_name, primary_last_name, status")
      .eq("club_id", club.id)
      .eq("status", "active")
      .then(async ({ data }) => {
        const rows = data || [];
        const nameMap = await fetchMembershipDisplayNameMap(
          supabase,
          rows.map((r) => r.id)
        );
        setMemberDirectory(
          rows.map((row) => {
            const label = nameMap[row.id] || row.email || "Member";
            const primary = [row.primary_first_name, row.primary_last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            const searchText = [label, row.email, primary].filter(Boolean).join(" ").toLowerCase();
            return {
              id: row.id,
              email: row.email || "",
              label,
              searchText,
            };
          })
        );
      });
  }, [club?.id]);

  const filteredMembers = memberDirectory.filter((row) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (row.searchText || row.label.toLowerCase()).includes(q);
  });

  async function loadThreads() {
    if (!club?.id) return;
    setLoading(true);
    const { data, error } = await fetchClubMessagesForClub(club.id);
    if (error) {
      console.warn(error);
      setThreads([]);
      setLabels({});
      setLoading(false);
      return;
    }
    const grouped = groupMessagesByMembership(data || []);
    setThreads(grouped);

    const ids = grouped.map((t) => t.membershipId);
    if (ids.length) {
      let next = await fetchMembershipDisplayNameMap(supabase, ids);
      next = await enrichMembershipDisplayNameMapFromMessages(
        supabase,
        data || [],
        next
      );
      setLabels(next);
    } else {
      setLabels({});
    }
    setLoading(false);
  }

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
      <h1
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 16,
          color: "#111827",
        }}
      >
        <ChatBubbleLeftRightIcon style={{ width: 24, height: 24, color: "#c20a0a" }} />
        Messages
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
        Reply to members privately. Conversations are not shared between households.
      </p>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]"
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Message a member</div>
            <input
              type="search"
              placeholder="Search name or email…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                fontSize: 13,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
              }}
            />
            {memberSearch.trim() && (
              <ul
                style={{
                  listStyle: "none",
                  margin: "8px 0 0",
                  padding: 0,
                  maxHeight: 140,
                  overflowY: "auto",
                }}
              >
                {filteredMembers.length === 0 ? (
                  <li style={{ fontSize: 12, color: "#6b7280" }}>No matches.</li>
                ) : (
                  filteredMembers.slice(0, 12).map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchParams({ household: row.id });
                          setMemberSearch("");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 4px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {row.label}
                        {row.email && row.email !== row.label ? (
                          <span style={{ color: "#6b7280", fontSize: 11 }}> · {row.email}</span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div style={{ padding: "10px 12px", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>
            Inbox
          </div>
          {loading ? (
            <p style={{ padding: 12, fontSize: 14, color: "#6b7280" }}>Loading…</p>
          ) : threads.length === 0 ? (
            <p style={{ padding: 12, fontSize: 14, color: "#6b7280" }}>No messages yet.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {threads.map((thread) => {
                const active = thread.membershipId === selectedId;
                const preview = (thread.lastMessage?.body || "").slice(0, 80);
                return (
                  <li key={thread.membershipId}>
                    <button
                      type="button"
                      onClick={() =>
                        setSearchParams({ household: thread.membershipId })
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "none",
                        borderBottom: "1px solid #f3f4f6",
                        background: active ? "#fef2f2" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {labels[thread.membershipId] || "Member"}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span
                            style={{
                              background: "#c20a0a",
                              color: "#fff",
                              borderRadius: 999,
                              fontSize: 11,
                              padding: "2px 6px",
                              fontWeight: 600,
                            }}
                          >
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{preview}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            minHeight: 280,
          }}
        >
          {!selectedId ? (
            <p style={{ fontSize: 14, color: "#6b7280" }}>Select a conversation from the inbox.</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>
                {labels[selectedId] || "Member"}
              </p>
              <MessageThreadPanel
                key={`${club?.id}-${selectedId}`}
                clubId={club?.id}
                membershipId={selectedId}
                viewerRole="admin"
                senderUserId={user?.id}
                threadMemberName={labels[selectedId] || "Member"}
                brand="#c20a0a"
                onSent={() => {
                  refreshUnreadCount();
                  loadThreads();
                }}
              />
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
