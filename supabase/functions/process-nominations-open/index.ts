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

function channelsForBroadcast(membership: { notification_preferences?: unknown }) {
  const prefs = normalizePrefs(membership.notification_preferences);
  return {
    inApp: !!prefs.in_app_enabled,
    email: !!prefs.email_enabled,
    push: !!prefs.push_enabled,
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

/** pg_cron batch run: empty body, no eventId/newsId, no force. */
function isScheduledBatchInvoke(
  req: Request,
  eventIdFilter: string | null,
  newsIdFilter: string | null,
  forceResend: boolean
): boolean {
  if (eventIdFilter || newsIdFilter || forceResend) return false;
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

async function loadActiveMemberships(supabase: any, clubId: string) {
  const { data: memberships, error } = await supabase
    .from("household_memberships")
    .select("id, user_id, email, notification_preferences, membership_type, status")
    .eq("club_id", clubId)
    .eq("status", "active")
    .not("user_id", "is", null);
  return { memberships: memberships || [], error };
}

async function deliverToMemberships(
  supabase: any,
  memberships: any[],
  opts: {
    channelsFor: (membership: any) => { inApp: boolean; email: boolean; push: boolean };
    skipMembershipIds?: Set<string>;
    clubId: string;
    title: string;
    body: string;
    linkPath: string;
    linkUrl: string;
    metadata: Record<string, unknown>;
    emailSubject: string;
    emailHtml: string;
    emailTemplate: string;
    pushTag: string;
    pushType: string;
  }
) {
  let inAppCount = 0;
  let emailCount = 0;
  const pushUserIds: string[] = [];
  let eligible = 0;

  for (const membership of memberships || []) {
    if (membership.membership_type === "non_member") continue;
    if (opts.skipMembershipIds?.has(membership.id)) continue;
    eligible += 1;

    const channels = opts.channelsFor(membership);
    if (!channels.inApp && !channels.email && !channels.push) continue;

    if (channels.inApp && membership.user_id) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: membership.user_id,
        club_id: opts.clubId,
        title: opts.title,
        body: opts.body,
        read: false,
        is_read: false,
        metadata: { ...opts.metadata, link_path: opts.linkPath },
      });
      if (!notifError) inAppCount += 1;
      else console.warn("notification insert", notifError);
    }

    if (channels.email && membership.email) {
      const { error: emailError } = await supabase.functions.invoke("send-club-email", {
        body: {
          to: membership.email,
          subject: opts.emailSubject,
          html: opts.emailHtml,
          template: opts.emailTemplate,
        },
      });
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
      title: opts.title,
      body: opts.body,
      url: opts.linkUrl,
      tag: opts.pushTag,
      type: opts.pushType,
    });
    pushSent = pushResult.sent;
    pushNote = pushResult.note || "";
  }

  return { inApp: inAppCount, email: emailCount, push: pushSent, pushNote, eligible };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  let eventIdFilter: string | null = null;
  let newsIdFilter: string | null = null;
  let jobType: string | null = null;
  let forceResend = false;
  try {
    const body = await req.json();
    if (body?.eventId && typeof body.eventId === "string") {
      eventIdFilter = body.eventId;
    }
    if (body?.newsId && typeof body.newsId === "string") {
      newsIdFilter = body.newsId;
    }
    if (body?.type && typeof body.type === "string") {
      jobType = body.type;
    }
    if (body?.force === true) {
      forceResend = true;
    }
  } catch {
    // empty body is fine
  }

  let authorized = isServiceAuthorized(req);
  if (!authorized && isScheduledBatchInvoke(req, eventIdFilter, newsIdFilter, forceResend)) {
    authorized = true;
  }
  if (!authorized && (eventIdFilter || newsIdFilter) && anonKey) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: isAdmin } = await userClient.rpc("user_is_club_admin");
        if (isAdmin) {
          if (eventIdFilter) {
            const { data: eventRow } = await userClient
              .from("events")
              .select("id")
              .eq("id", eventIdFilter)
              .maybeSingle();
            if (eventRow?.id) authorized = true;
          }
          if (newsIdFilter) {
            const { data: newsRow } = await userClient
              .from("club_news")
              .select("id")
              .eq("id", newsIdFilter)
              .maybeSingle();
            if (newsRow?.id) authorized = true;
          }
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
    const now = new Date();
    const nowIso = now.toISOString();
    const lookbackHours = Math.max(
      1,
      Number(Deno.env.get("NOMINATIONS_OPEN_LOOKBACK_HOURS") || "168")
    );
    const lookbackIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
    const siteUrl = (Deno.env.get("SITE_URL") || "https://rcraceday.com").replace(/\/$/, "");
    const summary: Array<Record<string, unknown>> = [];

    const shouldProcessOpen = !jobType || jobType === "nominations_open";
    const shouldProcessReminder = !jobType || jobType === "nominations_reminder";
    const shouldProcessNews = !jobType || jobType === "club_news";

    if (shouldProcessOpen) {
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

      for (const event of events || []) {
        const { data: clubRow } = await supabase
          .from("clubs")
          .select("slug, name")
          .eq("id", event.club_id)
          .maybeSingle();

        const clubSlug = clubRow?.slug || "";
        const clubName = htmlToPlainText(clubRow?.name) || "Club";
        const eventName = htmlToPlainText(event.name) || "Event";
        const linkPath = clubSlug ? `/${clubSlug}/app/events/${event.id}/nominate` : "/";
        const linkUrl = `${siteUrl}${linkPath}`;

        const { memberships, error: membError } = await loadActiveMemberships(
          supabase,
          event.club_id
        );
        if (membError) {
          console.error("memberships", membError);
          continue;
        }

        const result = await deliverToMemberships(supabase, memberships, {
          channelsFor: (membership) => channelsForMember(membership, event),
          clubId: event.club_id,
          title: `${clubName}: nominations open`,
          body: `${eventName}. Tap to nominate.`,
          linkPath,
          linkUrl,
          metadata: { type: "nominations_open", event_id: event.id },
          emailSubject: `${clubName}: nominations open - ${eventName}`,
          emailHtml: `<p>Nominations are now open for <strong>${eventName}</strong> at ${clubName}.</p>${
            linkPath ? `<p><a href="${linkUrl}">Nominate now</a></p>` : ""
          }`,
          emailTemplate: "nominations_open",
          pushTag: `nominations_open:${event.id}`,
          pushType: "nominations_open",
        });

        const delivered = result.inApp + result.email + result.push;
        if (delivered > 0 || result.eligible === 0) {
          const { error: markError } = await supabase
            .from("events")
            .update({ nominations_open_notified_at: nowIso })
            .eq("id", event.id);
          if (markError) console.error("mark notified", markError);
        } else {
          console.warn(
            "nominations-open: 0 delivered but eligible members exist; not marking notified",
            event.id
          );
        }

        summary.push({
          type: "nominations_open",
          eventId: event.id,
          inApp: result.inApp,
          email: result.email,
          push: result.push,
          pushNote: result.pushNote,
          eligible: result.eligible,
          markedNotified: delivered > 0 || result.eligible === 0,
        });
      }
    }

    if (shouldProcessReminder) {
      let reminderQuery = supabase
        .from("events")
        .select(
          "id, club_id, name, nominations_open, nominations_close, nominations_reminder_at, nominations_reminder_message, nominations_reminder_notified_at, notify_nominations_reminder, is_published"
        )
        .eq("notify_nominations_reminder", true)
        .not("nominations_reminder_at", "is", null)
        .lte("nominations_reminder_at", nowIso);

      if (!forceResend) {
        reminderQuery = reminderQuery.is("nominations_reminder_notified_at", null);
        reminderQuery = reminderQuery.eq("is_published", true);
        reminderQuery = reminderQuery.gte("nominations_reminder_at", lookbackIso);
      }

      if (eventIdFilter) {
        reminderQuery = reminderQuery.eq("id", eventIdFilter);
      }

      const reminderLimit = eventIdFilter ? 1 : Number(Deno.env.get("NOMINATIONS_OPEN_BATCH_SIZE") || "1");
      const { data: reminderEvents, error: reminderError } = await reminderQuery
        .order("nominations_reminder_at", { ascending: true })
        .limit(reminderLimit);

      if (reminderError) {
        console.error("reminder query", reminderError);
      } else {
        for (const event of reminderEvents || []) {
          if (!forceResend) {
            if (event.nominations_open && new Date(event.nominations_open) > now) continue;
            if (event.nominations_close && new Date(event.nominations_close) < now) continue;
          }

          const { data: clubRow } = await supabase
            .from("clubs")
            .select("slug, name")
            .eq("id", event.club_id)
            .maybeSingle();

          const clubSlug = clubRow?.slug || "";
          const clubName = htmlToPlainText(clubRow?.name) || "Club";
          const eventName = htmlToPlainText(event.name) || "Event";
          const message =
            String(event.nominations_reminder_message || "").trim() ||
            `${eventName}. Don't forget to nominate.`;
          const linkPath = clubSlug ? `/${clubSlug}/app/events/${event.id}/nominate` : "/";
          const linkUrl = `${siteUrl}${linkPath}`;

          const { data: nominatedRows } = await supabase
            .from("nominations")
            .select("group_id")
            .eq("event_id", event.id)
            .not("group_id", "is", null);
          const skipMembershipIds = new Set(
            (nominatedRows || []).map((row: { group_id: string }) => row.group_id).filter(Boolean)
          );

          const { memberships, error: membError } = await loadActiveMemberships(
            supabase,
            event.club_id
          );
          if (membError) {
            console.error("memberships", membError);
            continue;
          }

          const result = await deliverToMemberships(supabase, memberships, {
            channelsFor: () => ({ inApp: true, email: true, push: true }),
            skipMembershipIds,
            clubId: event.club_id,
            title: `${clubName}: nomination reminder`,
            body: message,
            linkPath,
            linkUrl,
            metadata: { type: "nominations_reminder", event_id: event.id },
            emailSubject: `${clubName}: nomination reminder - ${eventName}`,
            emailHtml: `<p>${message}</p><p><strong>${eventName}</strong> at ${clubName}.</p>${
              linkPath ? `<p><a href="${linkUrl}">Nominate now</a></p>` : ""
            }`,
            emailTemplate: "nominations_reminder",
            pushTag: `nominations_reminder:${event.id}`,
            pushType: "nominations_reminder",
          });

          const delivered = result.inApp + result.email + result.push;
          if (delivered > 0 || result.eligible === 0) {
            const { error: markError } = await supabase
              .from("events")
              .update({ nominations_reminder_notified_at: nowIso })
              .eq("id", event.id);
            if (markError) console.error("mark reminder notified", markError);
          }

          summary.push({
            type: "nominations_reminder",
            eventId: event.id,
            inApp: result.inApp,
            email: result.email,
            push: result.push,
            pushNote: result.pushNote,
            eligible: result.eligible,
            markedNotified: delivered > 0 || result.eligible === 0,
          });
        }
      }
    }

    if (shouldProcessNews) {
      let newsQuery = supabase
        .from("club_news")
        .select(
          "id, club_id, title, body, is_published, published_at, notify_members, notify_mode, notify_at, notified_at"
        )
        .eq("notify_members", true)
        .eq("is_published", true);

      if (!forceResend) {
        newsQuery = newsQuery.is("notified_at", null);
      }

      if (newsIdFilter) {
        newsQuery = newsQuery.eq("id", newsIdFilter);
      }

      const newsLimit = newsIdFilter ? 1 : Number(Deno.env.get("NOMINATIONS_OPEN_BATCH_SIZE") || "1");
      const { data: newsRows, error: newsError } = await newsQuery
        .order("created_at", { ascending: true })
        .limit(20);

      if (newsError) {
        console.error("news query", newsError);
      } else {
        const dueNews = (newsRows || [])
          .filter((item: any) => {
            if (forceResend && newsIdFilter) return true;
            if (item.notify_mode === "scheduled") {
              if (!item.notify_at) return false;
              const at = new Date(item.notify_at);
              if (at > now) return false;
              if (!forceResend && at.toISOString() < lookbackIso) return false;
              return true;
            }
            const publishedAt = item.published_at ? new Date(item.published_at) : now;
            if (!forceResend && publishedAt.toISOString() < lookbackIso) return false;
            return publishedAt <= now;
          })
          .slice(0, newsLimit);

        for (const item of dueNews) {
          const { data: clubRow } = await supabase
            .from("clubs")
            .select("slug, name")
            .eq("id", item.club_id)
            .maybeSingle();

          const clubSlug = clubRow?.slug || "";
          const clubName = htmlToPlainText(clubRow?.name) || "Club";
          const title = String(item.title || "Club news").trim();
          const excerpt = htmlToPlainText(item.body).slice(0, 160);
          const linkPath = clubSlug ? `/${clubSlug}/app/news/${item.id}` : "/";
          const linkUrl = `${siteUrl}${linkPath}`;

          const { memberships, error: membError } = await loadActiveMemberships(
            supabase,
            item.club_id
          );
          if (membError) {
            console.error("memberships", membError);
            continue;
          }

          const result = await deliverToMemberships(supabase, memberships, {
            channelsFor: () => ({ inApp: true, email: true, push: true }),
            clubId: item.club_id,
            title: `${clubName}: ${title}`,
            body: excerpt || title,
            linkPath,
            linkUrl,
            metadata: { type: "club_news", news_id: item.id },
            emailSubject: `${clubName}: ${title}`,
            emailHtml: `<p>${title}</p>${
              excerpt ? `<p>${excerpt}</p>` : ""
            }${linkPath ? `<p><a href="${linkUrl}">Read more</a></p>` : ""}`,
            emailTemplate: "club_news",
            pushTag: `club_news:${item.id}`,
            pushType: "club_news",
          });

          const delivered = result.inApp + result.email + result.push;
          if (delivered > 0 || result.eligible === 0) {
            const { error: markError } = await supabase
              .from("club_news")
              .update({ notified_at: nowIso })
              .eq("id", item.id);
            if (markError) console.error("mark news notified", markError);
          }

          summary.push({
            type: "club_news",
            newsId: item.id,
            inApp: result.inApp,
            email: result.email,
            push: result.push,
            pushNote: result.pushNote,
            eligible: result.eligible,
            markedNotified: delivered > 0 || result.eligible === 0,
          });
        }
      }
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
