// src/app/pages/admin/championships/CreateChampionship.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSToggle from "@cms/CMSToggle";
import { cmsStyles } from "@cms/styles";
import { DEFAULT_CHAMPIONSHIP_POINTS } from "@/app/lib/results/championshipPointsTable";
import ChampionshipPointsTableEditor from "./ChampionshipPointsTableEditor";
import CMSImageUpload from "@cms/CMSImageUpload";
import { uploadChampionshipLogo } from "@/app/lib/championshipLogo";

const CLASS_OPTIONS = [
  "Juniors",
  "2wd Modified Buggy",
  "2wd Stock Buggy",
  "4wd Modified Buggy",
  "4wd Stock Buggy",
  "Stadium Truck",
  "Short Course Truck",
];

export default function CreateChampionship() {
  const { t } = useTranslation();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [clubId, setClubId] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);

  const [name, setName] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [membersOnly, setMembersOnly] = useState(true);
  const [totalRounds, setTotalRounds] = useState(0);
  const [dropRounds, setDropRounds] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [classOptions, setClassOptions] = useState(CLASS_OPTIONS);
  const [pointsTable, setPointsTable] = useState(DEFAULT_CHAMPIONSHIP_POINTS);
  const [pointsSpread, setPointsSpread] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClubAndTracks() {
      const { data: club } = await supabase.from("clubs").select("id").eq("slug", clubSlug).single();
      if (!club?.id) return;
      setClubId(club.id);

      const { data: trackRows } = await supabase
        .from("club_tracks")
        .select("id, name")
        .eq("club_id", club.id)
        .order("name", { ascending: true });

      const list = trackRows || [];
      setTracks(list);
      if (list.length === 1) {
        setSelectedTrackIds([list[0].id]);
      }
    }
    loadClubAndTracks();
  }, [clubSlug]);

  useEffect(() => {
    if (!clubId) return;

    async function loadClassOptions() {
      if (tracks.length === 0) {
        const { data } = await supabase
          .from("club_classes")
          .select("name")
          .eq("club_id", clubId)
          .order("name");
        if (data?.length) {
          setClassOptions([...new Set(data.map((row) => row.name).filter(Boolean))]);
        } else {
          setClassOptions(CLASS_OPTIONS);
        }
        return;
      }

      if (selectedTrackIds.length === 0) {
        setClassOptions([]);
        return;
      }

      const { data } = await supabase
        .from("club_track_classes")
        .select(
          `
          class_id,
          club_classes ( name )
        `
        )
        .in("track_id", selectedTrackIds);

      const names = [
        ...new Set(
          (data || [])
            .map((row) => row.club_classes?.name)
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b));

      setClassOptions(names);
    }

    loadClassOptions();
  }, [clubId, tracks, selectedTrackIds]);

  useEffect(() => {
    setSelectedClasses((prev) => prev.filter((c) => classOptions.includes(c)));
  }, [classOptions]);

  function toggleTrack(trackId) {
    setSelectedTrackIds((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  }

  function toggleClass(className) {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("slug", clubSlug)
      .single();

    if (clubError) {
      setError("Unable to find club.");
      setLoading(false);
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("championships")
      .insert({
        club_id: club.id,
        name,
        season,
        members_only: membersOnly,
        total_rounds: totalRounds,
        drop_rounds: dropRounds,
        classes: selectedClasses,
        points_table: pointsTable,
        points_spread: pointsSpread,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (logoFile && created?.id) {
      const { publicUrl, error: logoError } = await uploadChampionshipLogo(supabase, {
        clubSlug,
        championshipId: created.id,
        file: logoFile,
      });
      if (logoError) {
        setError(logoError.message || "Championship created but logo upload failed.");
        setLoading(false);
        return;
      }
      if (publicUrl) {
        await supabase
          .from("championships")
          .update({ logo_url: publicUrl })
          .eq("id", created.id);
      }
    }

    navigate(`/${clubSlug}/app/admin/championships`);
  }

  const classesHint =
    tracks.length === 0
      ? t("admin.championships.allClubClasses")
      : selectedTrackIds.length === 0
        ? t("admin.championships.selectTrackFirst")
        : t("admin.championships.tracksHelp");

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
      <h1 style={cmsStyles.sectionHeaderTitle}>
        {t("admin.championships.create")}
      </h1>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <CMSCard title="Championship Details">
        <CMSInput
          label="Name"
          value={name}
          onChange={setName}
          placeholder="2025 Summer Series"
        />
        <CMSInput
          label="Season"
          value={season}
          onChange={setSeason}
        />
        <CMSImageUpload
          label={t("admin.championships.logo")}
          value={null}
          filePreview={logoFile}
          onChange={setLogoFile}
        />
      </CMSCard>

      {tracks.length > 1 && (
        <CMSCard title={t("admin.championships.tracks")}>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 8px" }}>
            {t("admin.championships.tracksHelp")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tracks.map((track) => (
              <label
                key={track.id}
                className="flex items-center space-x-2"
                style={{ color: "#374151" }}
              >
                <input
                  type="checkbox"
                  checked={selectedTrackIds.includes(track.id)}
                  onChange={() => toggleTrack(track.id)}
                />
                <span>{track.name}</span>
              </label>
            ))}
          </div>
        </CMSCard>
      )}

      <CMSCard title="Classes">
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 12px" }}>{classesHint}</p>
        {classOptions.length === 0 ? (
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>{t("admin.championships.selectTrackFirst")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classOptions.map((cls) => (
              <label
                key={cls}
                className="flex items-center space-x-2"
                style={{ color: "#374151" }}
              >
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(cls)}
                  onChange={() => toggleClass(cls)}
                />
                <span>{cls}</span>
              </label>
            ))}
          </div>
        )}
      </CMSCard>

      <CMSCard title="Rules">
        <CMSToggle
          label="Only members earn championship points"
          checked={membersOnly}
          onChange={setMembersOnly}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CMSInput
            label="Total Rounds"
            type="number"
            value={String(totalRounds)}
            onChange={(value) => setTotalRounds(Number(value))}
          />
          <CMSInput
            label="Drop Rounds"
            type="number"
            value={String(dropRounds)}
            onChange={(value) => setDropRounds(Number(value))}
          />
        </div>
      </CMSCard>

      <CMSCard title={t("admin.championships.pointsTableTitle")}>
        <ChampionshipPointsTableEditor
          clubId={clubId}
          pointsTable={pointsTable}
          onChange={setPointsTable}
          spreadConfig={pointsSpread}
          onSpreadConfigChange={setPointsSpread}
        />
      </CMSCard>

      <CMSButton onClick={handleSubmit} disabled={loading}>
        {loading ? t("loading.loading") : t("admin.championships.create")}
      </CMSButton>
      </div>
    </div>
  );
}

