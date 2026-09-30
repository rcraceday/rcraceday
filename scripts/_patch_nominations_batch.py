from pathlib import Path

path = Path(r"c:\Users\Jason\rcraceday\supabase\functions\process-nominations-open\index.ts")
text = path.read_text(encoding="utf-8")

old_query = """    let eventsQuery = supabase
      .from("events")
      .select(
        "id, club_id, name, track, nominations_open, notify_nominations_open, nominations_open_notified_at"
      )
      .not("nominations_open", "is", null)
      .lte("nominations_open", nowIso);

    if (!forceResend) {
      eventsQuery = eventsQuery.is("nominations_open_notified_at", null);
      eventsQuery = eventsQuery.eq("is_published", true);
    }

    if (eventIdFilter) {
      eventsQuery = eventsQuery.eq("id", eventIdFilter);
    }

    const { data: events, error: eventsError } = await eventsQuery.limit(20);"""

new_query = """    const lookbackHours = Math.max(
      1,
      Number(Deno.env.get("NOMINATIONS_OPEN_LOOKBACK_HOURS") || "168")
    );
    const lookbackIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    let eventsQuery = supabase
      .from("events")
      .select(
        "id, club_id, name, track, nominations_open, notify_nominations_open, nominations_open_notified_at"
      )
      .not("nominations_open", "is", null)
      .lte("nominations_open", nowIso);

    if (!forceResend) {
      eventsQuery = eventsQuery.is("nominations_open_notified_at", null);
      eventsQuery = eventsQuery.eq("is_published", true);
      // Skip ancient backlog; cron should fire near real open time only.
      eventsQuery = eventsQuery.gte("nominations_open", lookbackIso);
    }

    if (eventIdFilter) {
      eventsQuery = eventsQuery.eq("id", eventIdFilter);
    }

    const perRunLimit = eventIdFilter ? 1 : Number(Deno.env.get("NOMINATIONS_OPEN_BATCH_SIZE") || "1");
    const { data: events, error: eventsError } = await eventsQuery
      .order("nominations_open", { ascending: true })
      .limit(perRunLimit);"""

if old_query not in text:
    raise SystemExit("events query block not found")
text = text.replace(old_query, new_query, 1)

old_push = """      let pushSent = 0;
      let pushNote = "";
      if (pushUserIds.length > 0) {
        const pushResult = await sendWebPushToUsers(supabase, pushUserIds, {"""

new_push = """      let pushSent = 0;
      let pushNote = "";
      const uniquePushUserIds = [...new Set(pushUserIds)];
      if (uniquePushUserIds.length > 0) {
        const pushResult = await sendWebPushToUsers(supabase, uniquePushUserIds, {"""

if old_push not in text:
    raise SystemExit("push block not found")
text = text.replace(old_push, new_push, 1)

path.write_text(text, encoding="utf-8")
print("patched edge function")
