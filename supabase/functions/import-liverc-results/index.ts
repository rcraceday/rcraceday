// LiveRC import — parse on server; return compact JSON (avoids huge HTML payloads).
// supabase functions deploy import-liverc-results

import { parseLiveRcPages } from "./parseLiveRcHtml.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function assertLiveRcUrl(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (host !== "liverc.com" && !host.endsWith(".liverc.com")) {
    throw new Error("URL must be a LiveRC results link.");
  }
  return url.toString();
}

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(String(html || "")))) {
    try {
      links.push(new URL(match[1].replace(/&amp;/g, "&"), baseUrl).toString());
    } catch {
      // ignore
    }
  }
  return [...new Set(links)];
}

function classify(url: string) {
  const parsed = new URL(url);
  const page = parsed.searchParams.get("p") || "";
  const id = parsed.searchParams.get("id") || "";
  if (page === "view_race_result") return { kind: "race", id, url };
  if (page === "view_multi_main_result") return { kind: "multi", id, url };
  if (page === "event_overall_ranking") return { kind: "overall", id, url };
  if (page === "view_round_ranking") return { kind: "qualifying", id, url };
  return { kind: "other", id, url };
}

function extractTitle(html: string) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?<\/title>)/i);
  const raw = (h1?.[1] || title?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return raw.replace(/::.*$/, "").trim();
}

async function fetchText(url: string) {
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

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>) {
  const out = new Array(items.length) as R[];
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
    if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);

  try {
    const body = await req.json();
    const qualifyingOrder = body?.qualifyingOrder || "top_5_average";
    const sourceUrl = assertLiveRcUrl(body?.url);
    const indexHtml = await fetchText(sourceUrl);
    const childUrls = extractLinks(indexHtml, sourceUrl)
      .map(classify)
      .filter((item) => ["race", "multi", "overall", "qualifying"].includes(item.kind));

  const byKind: Record<string, ReturnType<typeof classify>[]> = {
      overall: [],
      multi: [],
      qualifying: [],
      race: [],
    };
    for (const item of childUrls) {
      let fetchUrl = item.url;
      if (item.kind === "qualifying") {
        try {
          const u = new URL(item.url);
          u.searchParams.set("o", qualifyingOrder);
          fetchUrl = u.toString();
        } catch {
          // keep original url
        }
      }
      byKind[item.kind]?.push({ ...item, url: fetchUrl });
    }

    const unique: ReturnType<typeof classify>[] = [];
    const seen = new Set<string>();
    const addUnique = (item: ReturnType<typeof classify>) => {
      if (seen.has(item.url)) return;
      seen.add(item.url);
      unique.push(item);
    };

    const MAX_PAGES = 280;
    for (const item of byKind.overall) addUnique(item);
    for (const item of byKind.multi) addUnique(item);
    for (const item of byKind.qualifying) {
      addUnique(item);
      if (unique.length >= MAX_PAGES) break;
    }
    for (const item of byKind.race) {
      addUnique(item);
      if (unique.length >= MAX_PAGES) break;
    }

    const pages: { url: string; html: string }[] = [{ url: sourceUrl, html: indexHtml }];
    if (unique.length) {
      const fetched = await mapPool(unique, 4, async (item) => ({
        url: item.url,
        html: await fetchText(item.url),
      }));
      pages.push(...fetched);
    }

    const overall = unique.find((item) => item.kind === "overall");
    const livercEventId = overall?.id || classify(sourceUrl).id || null;
    const title = extractTitle(indexHtml);
    const parsed = parseLiveRcPages(pages, {
      sourceUrl,
      livercEventId,
      title,
      sourceLabel: title || "LiveRC",
    });

    return json({
      sourceUrl,
      livercEventId,
      title,
      parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LiveRC import failed";
    return json({ error: message }, 400);
  }
});
