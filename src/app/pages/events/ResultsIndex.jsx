import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { loadPublishedResultEventIds } from "@/app/lib/results/loadEventResults";

export default function ResultsIndex() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!club?.id) return;
      setLoading(true);
      const { data = [] } = await supabase
        .from("events")
        .select("id, name, event_date")
        .eq("club_id", club.id)
        .eq("is_published", true)
        .order("event_date", { ascending: false });
      const withResults = await loadPublishedResultEventIds(data.map((event) => event.id));
      setEvents(data.filter((event) => withResults.has(event.id)));
      setLoading(false);
    }
    load();
  }, [club?.id]);

  return (
    <div className="space-y-4 pb-8">
      <PageTitle icon={TrophyIcon} title={t("results.title")} style={{ color: palette.primary }} />
      <Link to={`/${clubSlug}/app/championships`} className="text-sm" style={{ color: palette.primary }}>
        {t("results.championships")}
      </Link>
      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}
      {!loading && events.length === 0 && (
        <p className="text-text-muted">{t("results.noneYet")}</p>
      )}
      {events.map((event) => (
        <Link key={event.id} to={`/${clubSlug}/app/events/${event.id}/results`} className="no-underline">
          <Card className="p-4 mb-2">
            <div className="font-semibold text-slate-900">
              {richTextToPlainText(event.name) || t("eventCard.event")}
            </div>
            <div className="text-sm text-slate-500">{event.event_date}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
