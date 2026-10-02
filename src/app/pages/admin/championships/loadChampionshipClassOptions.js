const FALLBACK_CLASSES = [
  "Juniors",
  "2wd Modified Buggy",
  "2wd Stock Buggy",
  "4wd Modified Buggy",
  "4wd Stock Buggy",
  "Stadium Truck",
  "Short Course Truck",
];

export async function loadChampionshipClassOptions(supabase, clubId) {
  const { data: trackRows } = await supabase
    .from("club_tracks")
    .select("id, name")
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  const tracks = trackRows || [];
  if (!tracks.length) {
    const { data } = await supabase
      .from("club_classes")
      .select("name")
      .eq("club_id", clubId)
      .order("name");
    const names = [...new Set((data || []).map((row) => row.name).filter(Boolean))];
    return { tracks: [], classOptions: names.length ? names : FALLBACK_CLASSES };
  }

  const trackIds = tracks.map((track) => track.id);
  const { data } = await supabase
    .from("club_track_classes")
    .select("class_id, club_classes ( name )")
    .in("track_id", trackIds);

  const names = [
    ...new Set((data || []).map((row) => row.club_classes?.name).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return { tracks, classOptions: names };
}
