/** True when published rounds meet the configured season length. */
export function isChampionshipSeasonComplete(championship, publishedRoundCount = 0) {
  const total = Number(championship?.total_rounds) || 0;
  if (total <= 0) return false;
  return Number(publishedRoundCount) >= total;
}
