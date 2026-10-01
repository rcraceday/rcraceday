import { finalizeLiveRcRaces, parseLiveRcPages } from "./parseLiveRcHtml.js";
import { DEFAULT_LIVE_RC_QUAL_ORDER, reapplyQualifyingOrderToRaces } from "./qualifyingRank.js";

export const LIVE_RC_RACE_FORMATS = [
  "auto",
  "triple_heads_up",
  "club_mains",
  "single_main",
  "qual_heats",
];

export const DEFAULT_LIVE_RC_RACE_FORMAT = "auto";

export function buildParsedFromLiveRcResponse(data, options = {}) {
  const qualifyingOrder = options.qualifyingOrder || DEFAULT_LIVE_RC_QUAL_ORDER;
  const raceFormat = options.raceFormat || DEFAULT_LIVE_RC_RACE_FORMAT;
  const meta = {
    sourceUrl: data?.sourceUrl,
    livercEventId: data?.livercEventId,
    title: data?.title,
    sourceLabel: data?.title || "LiveRC",
    qualifyingOrder,
    raceFormat,
  };

  if (Array.isArray(data?.pages) && data.pages.length > 0) {
    return parseLiveRcPages(data.pages, meta);
  }

  if (data?.parsed) {
    const races = finalizeLiveRcRaces(reapplyQualifyingOrderToRaces(data.parsed.races, qualifyingOrder), {
      raceFormat,
      pages: data.pages || [],
    });
    return {
      ...data.parsed,
      races,
      raceFormat,
      qualifyingOrder,
    };
  }

  throw new Error("LiveRC import returned no result pages.");
}

export function reprocessLiveRcImport(liveRcPayload, options = {}) {
  return buildParsedFromLiveRcResponse(liveRcPayload, options);
}
