import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** Legacy route — championships live under Results with filters. */
export default function ChampionshipsIndex() {
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const year = searchParams.get("year");
  const qs = new URLSearchParams({ type: "championship_round" });
  if (year) qs.set("year", year);
  return <Navigate to={`/${clubSlug}/app/results?${qs.toString()}`} replace />;
}
