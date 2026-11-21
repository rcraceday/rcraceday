import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, NewspaperIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { newsDetailHeaderStyle } from "@/components/news/NewsItemImage";
import RichTextContent from "@/components/ui/RichTextContent";
import { parseStoredTimestamp } from "@/app/lib/eventDatetime";
import {
  fetchVisibleClubNewsList,
  getClubNewsDisplayStatus,
  isClubNewsVisible,
} from "@/app/lib/clubNews";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";

function formatPublished(iso) {
  const d = parseStoredTimestamp(iso);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsDetails() {
  const { id, clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const brand = palette.primary;
  const { t } = useTranslation();
  const { hasAnyAdminAccess } = useAdminAccess();
  const isAdmin = hasAnyAdminAccess;
  const saveNotice = location.state?.sendNotice;
  const saveError = location.state?.sendError;

  const [item, setItem] = useState(null);
  const [navItems, setNavItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const currentIndex = navItems.findIndex((row) => row.id === id);
  const newerPost = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const olderPost =
    currentIndex >= 0 && currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;

  useEffect(() => {
    if (!club?.id || !id) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [{ data: list }, itemResult] = await Promise.all([
        fetchVisibleClubNewsList(supabase, club.id),
        (async () => {
          let query = supabase
            .from("club_news")
            .select("*")
            .eq("id", id)
            .eq("club_id", club.id);
          if (!isAdmin) {
            query = query.eq("is_published", true);
          }
          return query.maybeSingle();
        })(),
      ]);
      if (cancelled) return;
      setNavItems(list || []);
      const { data, error } = itemResult;
      const visible = isAdmin
        ? !!data
        : !!(data && isClubNewsVisible(data));
      if (error || !visible) {
        setMissing(true);
        setItem(null);
      } else {
        setItem(data);
        setMissing(false);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [club?.id, id, isAdmin]);

  function goToPost(targetId) {
    if (!targetId) return;
    navigate(`/${clubSlug}/app/news/${targetId}`);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: palette.background,
      }}
    >
      <PageTitle
        icon={NewspaperIcon}
        title={t("news.title")}
        style={{ color: brand }}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                className="!py-1 !px-3 !text-xs !rounded-sm"
                onClick={() => navigate(`/${clubSlug}/app/admin/news/${id}`)}
              >
                {t("cms.edit")}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
              onClick={() => navigate(`/${clubSlug}/app`)}
            >
              <ArrowLeftIcon className="h-3 w-3" />
              {t("nav.home")}
            </Button>
          </div>
        }
      />

      <main className="app-page-main flex flex-col items-center !py-10">
        {(saveNotice || saveError) && (
          <div
            className="w-full mb-4 rounded-md px-4 py-3 text-sm"
            style={{
              backgroundColor: saveError ? "#FEE2E2" : "#FEF3C7",
              color: saveError ? "#991B1B" : "#92400E",
            }}
          >
            {saveError || saveNotice}
          </div>
        )}
        {loading && (
          <Card className="w-full">
            <div style={{ padding: 16 }}>{t("loading.loading")}</div>
          </Card>
        )}

        {!loading && missing && (
          <Card className="w-full">
            <p className="text-text-muted" style={{ padding: 16 }}>
              This news item is not available.
            </p>
          </Card>
        )}

        {!loading && item && isAdmin && getClubNewsDisplayStatus(item) !== "live" && (
          <div className="w-full mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {!item.is_published
              ? t("news.adminPreviewDraft")
              : t("news.adminPreviewBanner")}
          </div>
        )}

        {!loading && item && (
          <div
            className="box-border min-w-0 w-full max-w-full"
            style={{
              background: palette?.surface || "#ffffff",
              color: palette?.text || "#111827",
              borderRadius: "8px",
              border: `2px solid ${brand}`,
              lineHeight: 1.5,
              padding: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {item.image_url && (
              <div
                className="flex flex-col items-center mb-4"
                style={newsDetailHeaderStyle({
                  newsBackgroundUrl: club?.news_background_url,
                  brand,
                  surfaceAlt: palette?.surfaceAlt,
                })}
              >
                <img
                  src={item.image_url}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 480,
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              </div>
            )}
            <h2 className="text-xl font-semibold text-text-base">{item.title}</h2>
            {item.published_at && (
              <p className="text-sm text-text-muted" style={{ marginTop: 4 }}>
                {formatPublished(item.published_at)}
              </p>
            )}
            <RichTextContent
              className="tiptap !min-h-0"
              style={{ marginTop: 12 }}
              html={item.body}
            />
            {navItems.length > 1 ? (
              <div className="club-news-post-nav">
                <button
                  type="button"
                  className="club-news-post-nav-btn"
                  disabled={!newerPost}
                  onClick={() => goToPost(newerPost?.id)}
                >
                  <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                  <span>{t("news.newerPost")}</span>
                </button>
                <button
                  type="button"
                  className="club-news-post-nav-btn"
                  disabled={!olderPost}
                  onClick={() => goToPost(olderPost?.id)}
                >
                  <span>{t("news.olderPost")}</span>
                  <ChevronRightIcon className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
