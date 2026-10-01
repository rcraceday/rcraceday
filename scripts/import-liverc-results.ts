// Deploy from supabase/functions/import-liverc-results (not this file).
// supabase functions deploy import-liverc-results

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function assertLiveRcUrl(raw) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (host !== "liverc.com" && !host.endsWith(".liverc.com")) {
    throw new Error("URL must be a LiveRC results link.");
  }
  return url.toString();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(String(html || "")))) {
    try {
      links.push(new URL(match[1].replace(/&amp;/g, "&"), baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return [...new Set(links)];
}

const LIVE_RC_QUAL_ORDERS = [
  "top_5_average",
  "laps_time",
  "fastest_lap",
  "top_3_consecutive",
];

function withQualifyingOrder(url: string, order: string) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get("p") !== "view_round_ranking") return url;
    parsed.searchParams.set("o", order);
    return parsed.toString();
  } catch {
    return url;
  }
}

function classify(url) {
  const parsed = new URL(url);
  const page = parsed.searchParams.get("p") || "";
  const id = parsed.searchParams.get("id") || "";
  if (page === "view_race_result") return { kind: "race", id, url };
  if (page === "view_multi_main_result") return { kind: "multi", id, url };
  if (page === "event_overall_ranking") return { kind: "overall", id, url };
  if (page === "view_round_ranking") return { kind: "qualifying", id, url };
  return { kind: "other", id, url };
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const raw = (h1?.[1] || title?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return raw.replace(/::.*$/, "").trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "RCRaceDay/1.0 (results import)",
      Accept: "text/html",
    },
  });
  if (!response.ok) {
    throw new Error("LiveRC returned " + response.status + " for " + url);
  }
  return stripHtml(await response.text());
}

async function mapPool(items, limit, mapper) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      out[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => worker()));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);

  try {
    const body = await req.json();
    const sourceUrl = assertLiveRcUrl(body?.url);
    const qualifyingOrder =
      typeof body?.qualifyingOrder === "string" &&
      LIVE_RC_QUAL_ORDERS.includes(body.qualifyingOrder)
        ? body.qualifyingOrder
        : "top_5_average";
    const indexHtml = await fetchText(sourceUrl);
    const childUrls = extractLinks(indexHtml, sourceUrl)
      .map(classify)
      .filter((item) => ["race", "multi", "overall", "qualifying"].includes(item.kind));
    const unique = [];
    const seen = new Set();
    for (const item of childUrls) {
      let fetchUrl = item.url;
      if (item.kind === "qualifying") {
        fetchUrl = withQualifyingOrder(item.url, qualifyingOrder);
      }
      if (seen.has(fetchUrl)) continue;
      seen.add(fetchUrl);
      unique.push({ ...item, url: fetchUrl });
      if (unique.length >= 80) break;
    }

    const pages = [{ url: sourceUrl, html: indexHtml }];
    if (unique.length) {
      const fetched = await mapPool(unique, 4, async (item) => ({
        url: item.url,
        html: await fetchText(item.url),
      }));
      pages.push(...fetched);
    }

    const overall = unique.find((item) => item.kind === "overall");
    return json({
      sourceUrl,
      livercEventId: overall?.id || classify(sourceUrl).id || null,
      title: extractTitle(indexHtml),
      pages,
    });
  } catch (error) {
    return json({ error: error?.message || "LiveRC import failed" }, 400);
  }
});
