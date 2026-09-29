// supabase/functions/process-nominations-open/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPushToUsers } from "./web_push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

function isServiceAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const header = req.headers.get("x-cron-secret");
    if (header === cronSecret) return true;
  }
  const auth = req.headers.get("authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
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

    let eventsQuery = supabase
      .from("events")
      .select(
        "id, club_id, name, track, nominations_open, notify_nominations_open, nominations_open_notified_at"
      )
      .not("nominations_open", "is", null)
      .lte("nominations_open", nowIso);

    if (!forceResend) {
      eventsQuery = eventsQuery.is("nominations_open_notified_at", null);
    }

    if (eventIdFilter) {
      eventsQuery = eventsQuery.eq("id", eventIdFilter);
    }

    const { data: events, error: eventsError } = await eventsQuery.limit(20);

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
        .select("slug")
        .eq("id", event.club_id)
        .maybeSingle();

      const clubSlug = clubRow?.slug || "";
      const linkPath = clubSlug
        ? `/${clubSlug}/app/events/${event.id}`
        : null;

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
          const title = `Nominations open: ${event.name}`;
          const body = "You can nominate for this event now.";
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
          const subject = `Nominations open â€” ${event.name}`;
          const html = `<p>Nominations are now open for <strong>${event.name}</strong>.</p>${
            linkPath
              ? `<p><a href="${linkPath}">View event and nominate</a></p>`
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
      if (pushUserIds.length > 0) {
        const pushResult = await sendWebPushToUsers(supabase, pushUserIds, {
          title: `Nominations open: ${event.name}`,
          body: "You can nominate for this event now.",
          url: linkPath || "/",
          tag: `nominations_open:${event.id}`,
          type: "nominations_open",
        });
        pushSent = pushResult.sent;
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





