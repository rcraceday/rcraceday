import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { EditButton, DeleteButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "@cms/styles";
import { richTextToPlainText } from "@/app/lib/richText";
import { parseStoredTimestamp } from "@/app/lib/eventDatetime";
import { getClubNewsDisplayStatus } from "@/app/lib/clubNews";
import { removeClubAssetPath } from "@/app/lib/clubAssetStorage";
import { useTranslation } from "@/app/i18n/I18nContext";

function formatWhen(iso) {
  const d = parseStoredTimestamp(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminClubNews() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug } = useParams();
  const { club } = useClub();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNews() {
    if (!club?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("club_news")
      .select("*")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn(error);
      setItems([]);
      setError(error.message || "Could not load news. Run scripts/create-club-news.sql in Supabase.");
    } else {
      setItems(data || []);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, [club?.id]);

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete “${item.title}”? This cannot be undone.`
    );
    if (!confirmed) return;
    if (item.image_url) {
      await removeClubAssetPath(supabase, item.image_url);
    }
    const { error } = await supabase.from("club_news").delete().eq("id", item.id);
    if (error) {
      window.alert(error.message || "Failed to delete news item.");
      return;
    }
    loadNews();
  };

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>Club News</h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            News items appear in the home page carousel when published.
          </p>
        </div>

        <CMSCard
          title="News"
          actions={
            <CMSButton
              onClick={() => navigate(`/${clubSlug}/app/admin/news/new`)}
              style={{ whiteSpace: "nowrap" }}
            >
              Create News
            </CMSButton>
          }
        >
          {loading ? (
            <div style={{ padding: "12px 0", color: "#6B7280" }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: "12px 0", color: "#991B1B" }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "12px 0", color: "#6B7280" }}>
              No news items yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {items.map((item) => {
                const excerpt = richTextToPlainText(item.body).slice(0, 120);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #F3F4F6",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#F3F4F6",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>No image</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>
                        {excerpt || "No description"}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={
                            item.is_published
                              ? cmsStyles.badgePublished
                              : cmsStyles.badgeDraft
                          }
                        >
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                        {item.is_published && (
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {getClubNewsDisplayStatus(item) === "scheduled"
                              ? `Shows from ${formatWhen(item.display_from)}`
                              : getClubNewsDisplayStatus(item) === "expired"
                                ? `Hidden since ${formatWhen(item.display_until)}`
                                : item.display_from || item.display_until
                                  ? [
                                      item.display_from
                                        ? `From ${formatWhen(item.display_from)}`
                                        : null,
                                      item.display_until
                                        ? `Until ${formatWhen(item.display_until)}`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")
                                  : "Always visible"}
                          </span>
                        )}
                        {item.notify_members && (
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            Notify{" "}
                            {item.notify_mode === "scheduled"
                              ? formatWhen(item.notify_at)
                              : "when published"}
                            {item.notified_at ? " · sent" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <EditButton
                        onClick={() =>
                          navigate(`/${clubSlug}/app/admin/news/${item.id}`)
                        }
                      />
                      <DeleteButton onClick={() => handleDelete(item)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CMSCard>
      </div>
    </div>
  );
}
