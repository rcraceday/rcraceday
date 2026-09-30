import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { NewspaperIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import NewsItemImage from "@/components/news/NewsItemImage";
import { richTextToPlainText } from "@/app/lib/richText";
import { parseStoredTimestamp } from "@/app/lib/eventDatetime";

function formatPublished(iso) {
  const d = parseStoredTimestamp(iso);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClubNews() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const brand = palette.primary;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club?.id) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_news")
        .select("id, title, body, image_url, published_at")
        .eq("club_id", club.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.warn(error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [club?.id]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: palette.background,
      }}
    >
      <PageTitle icon={NewspaperIcon} title="Club News" style={{ color: brand }} />

      <main className="app-page-main">
        {loading && (
          <Card>
            <div style={{ padding: 16 }}>Loading…</div>
          </Card>
        )}

        {!loading && items.length === 0 && (
          <Card>
            <p className="text-text-muted" style={{ padding: 16 }}>
              No news published yet.
            </p>
          </Card>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const excerpt = richTextToPlainText(item.body).slice(0, 140);
              return (
                <Link
                  key={item.id}
                  to={`/${clubSlug}/app/news/${item.id}`}
                  className="no-underline block"
                >
                  <Card className="!p-0 overflow-hidden hover:opacity-[0.98]">
                    <div className="flex gap-3 p-3 sm:p-4 items-center">
                      {item.image_url ? (
                        <NewsItemImage
                          variant="thumb"
                          newsBackgroundUrl={club?.news_background_url}
                          imageUrl={item.image_url}
                          title={item.title}
                        />
                      ) : (
                        <div
                          className="shrink-0 rounded-lg overflow-hidden bg-[#F3F4F6] flex items-center justify-center"
                          style={{ width: 72, height: 72 }}
                        >
                          <NewspaperIcon className="h-8 w-8 text-text-muted opacity-50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-text-base m-0">
                          {item.title}
                        </h2>
                        {item.published_at && (
                          <p className="text-xs text-text-muted mt-1 mb-0">
                            {formatPublished(item.published_at)}
                          </p>
                        )}
                        {excerpt ? (
                          <p className="text-sm text-text-muted mt-2 mb-0 line-clamp-2">
                            {excerpt}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
