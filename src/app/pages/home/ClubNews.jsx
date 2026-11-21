import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, NewspaperIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import useTheme from "@/app/providers/useTheme";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fetchVisibleClubNewsList } from "@/app/lib/clubNews";

/** Menu target: open latest visible post (no card list). */
export default function ClubNews() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();
  const { palette } = useTheme();
  const brand = palette.primary;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!club?.id || !clubSlug) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await fetchVisibleClubNewsList(supabase, club.id);
      if (cancelled) return;
      if (error) {
        console.warn(error);
        setEmpty(true);
        setLoading(false);
        return;
      }
      const latest = data?.[0];
      if (latest?.id) {
        navigate(`/${clubSlug}/app/news/${latest.id}`, { replace: true });
        return;
      }
      setEmpty(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [club?.id, clubSlug, navigate]);

  if (!empty && loading) {
    return (
      <div style={{ minHeight: "100vh", width: "100%", backgroundColor: palette.background }}>
        <PageTitle icon={NewspaperIcon} title={t("news.title")} style={{ color: brand }} />
        <main className="app-page-main">
          <Card>
            <div style={{ padding: 16 }}>{t("loading.loading")}</div>
          </Card>
        </main>
      </div>
    );
  }

  if (!empty) return null;

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: palette.background }}>
      <PageTitle
        icon={NewspaperIcon}
        title={t("news.title")}
        style={{ color: brand }}
        actions={
          <Button
            variant="primary"
            size="sm"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() => navigate(`/${clubSlug}/app`)}
          >
            <ArrowLeftIcon className="h-3 w-3" />
            {t("nav.home")}
          </Button>
        }
      />
      <main className="app-page-main">
        <Card>
          <p className="text-text-muted" style={{ padding: 16 }}>
            {t("news.noNews")}
          </p>
        </Card>
      </main>
    </div>
  );
}