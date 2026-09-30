from pathlib import Path

path = Path(r"c:\Users\Jason\rcraceday\supabase\functions\process-nominations-open\index.ts")
text = path.read_text(encoding="utf-8")

old = """function bearerToken(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

function requestApiKey(req: Request): string {
  return (req.headers.get("apikey") || "").trim();
}

function isServiceAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret");
    if (header === cronSecret) return true;
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) return false;
  const token = bearerToken(req);
  const apiKey = requestApiKey(req);
  return token === serviceKey || apiKey === serviceKey;
}

// pg_cron + pg_net sends the publishable/anon key in `apikey` (and sometimes Bearer), not the service role.
function isScheduledInvoke(req: Request): boolean {
  if (isServiceAuthorized(req)) return true;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!anonKey) return false;
  const token = bearerToken(req);
  const apiKey = requestApiKey(req);
  return token === anonKey || apiKey === anonKey;
}"""

new = """function trimKey(value: string | null | undefined): string {
  return (value || "").trim();
}

function bearerToken(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return trimKey(auth.slice(7));
  return "";
}

function requestApiKey(req: Request): string {
  return trimKey(req.headers.get("apikey"));
}

function keyMatchesRequest(req: Request, expected: string): boolean {
  const key = trimKey(expected);
  if (!key) return false;
  const token = bearerToken(req);
  const apiKey = requestApiKey(req);
  return token === key || apiKey === key;
}

function isServiceAuthorized(req: Request): boolean {
  const cronSecret = trimKey(Deno.env.get("CRON_SECRET"));
  if (cronSecret) {
    const header = trimKey(req.headers.get("x-cron-secret"));
    if (header === cronSecret) return true;
  }
  const serviceKey = trimKey(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (serviceKey && keyMatchesRequest(req, serviceKey)) return true;
  return false;
}

/** pg_cron batch run: empty body, no eventId, no force. */
function isScheduledBatchInvoke(
  req: Request,
  eventIdFilter: string | null,
  forceResend: boolean
): boolean {
  if (eventIdFilter || forceResend) return false;
  const cronSecret = trimKey(Deno.env.get("CRON_SECRET"));
  const header = trimKey(req.headers.get("x-cron-secret"));
  if (cronSecret && header === cronSecret) return true;
  if (isServiceAuthorized(req)) return true;
  const anonCandidates = [
    trimKey(Deno.env.get("SUPABASE_ANON_KEY")),
    trimKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEY")),
  ].filter(Boolean);
  for (const anonKey of anonCandidates) {
    if (keyMatchesRequest(req, anonKey)) return true;
  }
  return false;
}"""

if old not in text:
    raise SystemExit("auth block not found")
text = text.replace(old, new, 1)

text = text.replace(
    "  let authorized = isServiceAuthorized(req);\n  // Automatic/cron runs have no eventId and cannot force-resend.\n  if (!authorized && !eventIdFilter && !forceResend && isScheduledInvoke(req)) {\n    authorized = true;\n  }",
    "  let authorized = isServiceAuthorized(req);\n  if (!authorized && isScheduledBatchInvoke(req, eventIdFilter, forceResend)) {\n    authorized = true;\n  }",
    1,
)

path.write_text(text, encoding="utf-8")
print("patched")
