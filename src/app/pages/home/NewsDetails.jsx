import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, NewspaperIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { newsDetailHeaderStyle } from "@/components/news/NewsItemImage";
import RichTextContent from "@/components/ui/RichTextContent";
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

export default function NewsDetails() {
  const { id, clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const navigate = useNavigate();
  const brand = palette.primary;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!club?.id || !id) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_news")
        .select("*")
        .eq("id", id)
        .eq("club_id", club.id)
        .eq("is_published", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
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
  }, [club?.id, id]);

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
        title="Club News"
        style={{ color: brand }}
        actions={
          <Button
            variant="primary"
            size="sm"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() => navigate(`/${clubSlug}/app`)}
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Home
          </Button>
        }
      />

      <main className="app-page-main flex justify-center !py-10">
        {loading && (
          <Card className="w-full">
            <div style={{ padding: 16 }}>Loading…</div>
          </Card>
        )}

        {!loading && missing && (
          <Card className="w-full">
            <p className="text-text-muted" style={{ padding: 16 }}>
              This news item is not available.
            </p>
          </Card>
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
          </div>
        )}
      </main>
    </div>
  );
}
