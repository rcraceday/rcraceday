import { useMemo, useState } from "react";
import { memberBadgeImageCandidates } from "@/app/lib/clubAssetStorage";
import { supabase } from "@/supabaseClient";

export default function ClubMemberBadgeImage({
  club,
  alt,
  className,
  style,
  fallback = null,
}) {
  const candidates = useMemo(() => memberBadgeImageCandidates(supabase, club), [club]);
  const [index, setIndex] = useState(0);

  if (!candidates.length) {
    return fallback;
  }

  if (index >= candidates.length) {
    return fallback;
  }

  return (
    <img
      src={candidates[index]}
      alt={alt}
      className={className}
      style={style}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}