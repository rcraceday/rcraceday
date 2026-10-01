import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { cmsStyles } from "@cms/styles";

export default function ChampionshipsList() {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadChampionships() {
    setLoading(true);

    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .single();

    if (clubError) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("championships")
      .select("*")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setChampionships(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadChampionships();
  }, [clubSlug]);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <h1 style={cmsStyles.sectionHeaderTitle}>{t("admin.championships.title")}</h1>
          <CMSButton onClick={() => navigate(`/${clubSlug}/app/admin/championships/create`)}>
            {t("admin.championships.create")}
          </CMSButton>
        </div>

        {loading && <div>{t("loading.loading")}</div>}

        {!loading && championships.length === 0 && (
          <div style={{ color: "#6B7280" }}>{t("results.noChampionships")}</div>
        )}

        {championships.map((champ) => (
          <CMSCard key={champ.id} title={champ.name}>
            <div style={{ fontSize: 14, color: "#4B5563" }}>
              {t("results.seasonN", { season: champ.season })}
            </div>
            <div style={{ fontSize: 14, color: "#4B5563" }}>
              {(champ.classes || []).join(", ")}
            </div>
            <div style={{ fontSize: 14, color: "#4B5563" }}>
              {t("admin.championships.rounds")}: {champ.total_rounds} · {t("admin.championships.drop")}: {champ.drop_rounds}
            </div>
            <CMSButton onClick={() => navigate(`/${clubSlug}/app/admin/championships/${champ.id}`)}>
              {t("admin.championships.manage")}
            </CMSButton>
          </CMSCard>
        ))}
      </div>
    </div>
  );
}
