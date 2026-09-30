// supabase/functions/process-nominations-open/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPushToUsers } from "./web_push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationPrefs = {
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  nominations_open_enabled?: boolean;
  track_ids?: string[] | null;
};

function normalizePrefs(raw: unknown): NotificationPrefs {
  const source =
    raw && typeof raw === "object" ? (raw as NotificationPrefs) : {};
  const trackIds = source.track_ids;
  return {
    in_app_enabled:
      typeof source.in_app_enabled === "boolean" ? source.in_app_enabled : true,
    email_enabled:
      typeof source.email_enabled === "boolean" ? source.email_enabled : true,
    push_enabled:
      typeof source.push_enabled === "boolean" ? source.push_enabled : true,
    nominations_open_enabled:
      typeof source.nominations_open_enabled === "boolean"
        ? source.nominations_open_enabled
        : true,
    track_ids:
      trackIds === null || trackIds === undefined
        ? null
        : Array.isArray(trackIds)
          ? trackIds.filter(Boolean)
          : null,
  };
}


function htmlToPlainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>\s*<p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
function shouldNotifyForEventTrack(prefs: NotificationPrefs, eventTrackId: string | null) {
  if (!eventTrackId) return true;
  if (prefs.track_ids === null || prefs.track_ids === undefined) return true;
  if (!Array.isArray(prefs.track_ids) || prefs.track_ids.length === 0) return false;
  return prefs.track_ids.includes(eventTrackId);
}

function channelsForMember(
  membership: { notification_preferences?: unknown },
  event: { notify_nominations_open?: boolean; track?: string | null }
) {
  const prefs = normalizePrefs(membership.notification_preferences);
  if (!shouldNotifyForEventTrack(prefs, event.track ?? null)) {
    return { inApp: false, email: false, push: false };
  }
  if (event.notify_nominations_open) {
    return { inApp: true, email: true, push: true };
  }
  const nom = prefs.nominations_open_enabled;
  return {
    inApp: !!(prefs.in_app_enabled && nom),
    email: !!(prefs.email_enabled && nom),
    push: !!(prefs.push_enabled && nom),
  };
}

function trimKey(value: string | null | undefined): string {
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  let eventIdFilter: string | null = null;
  let forceResend = false;
  try {
    const body = await req.json();
    if (body?.eventId && typeof body.eventId === "string") {
      eventIdFilter = body.eventId;
    }
    if (body?.force === true) {
      forceResend = true;
    }
  } catch {
    // empty body is fine
  }

  let authorized = isServiceAuthorized(req);
  if (!authorized && isScheduledBatchInvoke(req, eventIdFilter, forceResend)) {
    authorized = true;
  }
  if (!authorized && eventIdFilter && anonKey) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: isAdmin } = await userClient.rpc("user_is_club_admin");
        if (isAdmin) {
          const { data: eventRow } = await userClient
            .from("events")
            .select("id")
            .eq("id", eventIdFilter)
            .maybeSingle();
          if (eventRow?.id) authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const nowIso = new Date().toISOString();

    const lookbackHours = Math.max(
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
      .limit(perRunLimit);

    if (eventsError) {
      return new Response(JSON.stringify({ error: eventsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: Array<{ eventId: string; inApp: number; email: number; push: number }> = [];

    for (const event of events || []) {
      const { data: clubRow } = await supabase
        .from("clubs")
        .select("slug, name")
        .eq("id", event.club_id)
        .maybeSingle();

      const clubSlug = clubRow?.slug || "";
      const clubName = htmlToPlainText(clubRow?.name) || "Club";
      const eventName = htmlToPlainText(event.name) || "Event";
      const siteUrl = (Deno.env.get("SITE_URL") || "https://rcraceday.com").replace(/\/$/, "");
      const linkPath = clubSlug
        ? `/${clubSlug}/app/events/${event.id}/nominate`
        : "/";
      const linkUrl = `${siteUrl}${linkPath}`;

      const { data: memberships, error: membError } = await supabase
        .from("household_memberships")
        .select("id, user_id, email, notification_preferences, membership_type, status")
        .eq("club_id", event.club_id)
        .eq("status", "active")
        .not("user_id", "is", null);

      if (membError) {
        console.error("memberships", membError);
        continue;
      }

      let inAppCount = 0;
      let emailCount = 0;
      const pushUserIds: string[] = [];

      for (const membership of memberships || []) {
        if (membership.membership_type === "non_member") continue;

        const channels = channelsForMember(membership, event);
        if (!channels.inApp && !channels.email && !channels.push) continue;

        if (channels.inApp && membership.user_id) {
          const title = `${clubName}: nominations open`;
          const body = `${eventName}. Tap to nominate.`;
          const { error: notifError } = await supabase.from("notifications").insert({
            user_id: membership.user_id,
            club_id: event.club_id,
            title,
            body,
            read: false,
            is_read: false,
            metadata: {
              type: "nominations_open",
              event_id: event.id,
              link_path: linkPath,
            },
          });
          if (!notifError) inAppCount += 1;
          else console.warn("notification insert", notifError);
        }

        if (channels.email && membership.email) {
          const subject = `${clubName}: nominations open - ${eventName}`;
          const html = `<p>Nominations are now open for <strong>${eventName}</strong> at ${clubName}.</p>${
            linkPath
              ? `<p><a href="${linkUrl}">Nominate now</a></p>`
              : ""
          }`;
          const { error: emailError } = await supabase.functions.invoke(
            "send-club-email",
            {
              body: {
                to: membership.email,
                subject,
                html,
                template: "nominations_open",
              },
            }
          );
          if (!emailError) emailCount += 1;
          else console.warn("send-club-email", emailError);
        }

        if (channels.push && membership.user_id) {
          pushUserIds.push(membership.user_id);
        }
      }

      let pushSent = 0;
      let pushNote = "";
      const uniquePushUserIds = [...new Set(pushUserIds)];
      if (uniquePushUserIds.length > 0) {
        const pushResult = await sendWebPushToUsers(supabase, uniquePushUserIds, {
          title: `${clubName}: nominations open`,
          body: `${eventName}. Tap to nominate.`,
          url: linkUrl,
          tag: `nominations_open:${event.id}`,
          type: "nominations_open",
        });
        pushSent = pushResult.sent;
        pushNote = pushResult.note || "";
      }

      const delivered = inAppCount + emailCount + pushSent;
      const eligible = (memberships || []).filter(
        (m) => m.membership_type !== "non_member"
      ).length;

      if (delivered > 0 || eligible === 0) {
        const { error: markError } = await supabase
          .from("events")
          .update({ nominations_open_notified_at: nowIso })
          .eq("id", event.id);

        if (markError) {
          console.error("mark notified", markError);
        }
      } else {
        console.warn(
          "nominations-open: 0 delivered but eligible members exist; not marking notified",
          event.id
        );
      }

      summary.push({
        eventId: event.id,
        inApp: inAppCount,
        email: emailCount,
        push: pushSent,
        pushNote,
        eligible,
        markedNotified: delivered > 0 || eligible === 0,
      });
    }

    return new Response(JSON.stringify({ processed: summary.length, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});





