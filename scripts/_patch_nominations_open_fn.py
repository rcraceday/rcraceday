from pathlib import Path

path = Path(r"c:\Users\Jason\rcraceday\supabase\functions\process-nominations-open\index.ts")
text = path.read_text(encoding="utf-8")

old_auth = """function isServiceAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret");
    if (header === cronSecret) return true;
  }
  const auth = req.headers.get("authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}"""

new_auth = """function bearerToken(req: Request): string {
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

if old_auth not in text:
    raise SystemExit("auth block not found")
text = text.replace(old_auth, new_auth, 1)

old_gate = """  let authorized = isServiceAuthorized(req);
  if (!authorized && eventIdFilter && anonKey) {"""

new_gate = """  let authorized = isServiceAuthorized(req);
  // Automatic/cron runs have no eventId and cannot force-resend.
  if (!authorized && !eventIdFilter && !forceResend && isScheduledInvoke(req)) {
    authorized = true;
  }
  if (!authorized && eventIdFilter && anonKey) {"""

if old_gate not in text:
    raise SystemExit("auth gate not found")
text = text.replace(old_gate, new_gate, 1)

old_query = """    if (!forceResend) {
      eventsQuery = eventsQuery.is("nominations_open_notified_at", null);
    }"""

new_query = """    if (!forceResend) {
      eventsQuery = eventsQuery.is("nominations_open_notified_at", null);
      eventsQuery = eventsQuery.eq("is_published", true);
    }"""

if old_query not in text:
    raise SystemExit("events query block not found")
text = text.replace(old_query, new_query, 1)

path.write_text(text, encoding="utf-8")
print("patched ok")
