import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/solid";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import useTheme from "@/app/providers/useTheme";
import { useClub } from "@/app/providers/ClubProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import { supabase } from "@/supabaseClient";

export default function ChampionshipsIndex() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!club?.id) return;
      setLoading(true);
      const { data = [] } = await supabase
        .from("championships")
        .select("id, name, season, classes")
        .eq("club_id", club.id)
        .order("created_at", { ascending: false });
      setRows(data);
      setLoading(false);
    }
    load();
  }, [club?.id]);

  return (
    <div className="space-y-4 pb-8">
      <PageTitle icon={TrophyIcon} title={t("results.championships")} style={{ color: palette.primary }} />
      {loading && <p className="text-text-muted">{t("loading.loading")}</p>}
      {!loading && rows.length === 0 && (
        <p className="text-text-muted">{t("results.noChampionships")}</p>
      )}
      {rows.map((champ) => (
        <Link key={champ.id} to={`/${clubSlug}/app/championships/${champ.id}`} className="no-underline">
          <Card className="p-4 mb-2">
            <div className="font-semibold text-slate-900">{champ.name}</div>
            <div className="text-sm text-slate-500">
              {t("results.seasonN", { season: champ.season })}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
