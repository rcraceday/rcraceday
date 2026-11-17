import { supabase } from "@/supabaseClient";
import { richTextToPlainText } from "@/app/lib/richText";
import { getDriverSettings } from "@/app/lib/driverClubSettings";
import {
  notifyClubMessagesInboxChanged,
  sendAdminClubMessageToMemberships,
} from "@/app/lib/clubMessages";
import {
  createInAppNotification,
  sendWebPushToUsers,
} from "@/app/lib/userNotifications";

export function isEventCancelled(event) {
  return !!(event?.is_cancelled || event?.cancelled);
}

export function moneyAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function formatAud(value) {
  return moneyAmount(value).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export function getCancellationPolicy(club) {
  const settings = getDriverSettings(club).cancellation || {};
  const hour = Number(settings.refund_deadline_hour);
  const months = Number(settings.credit_expiry_months);
  return {
    refundRequestUntilNextMeeting: !!settings.refund_request_until_next_meeting,
    refundDeadlineHour: Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : 6,
    creditExpiryMonths: Number.isFinite(months) && months > 0 ? months : 0,
    timezone: String(settings.timezone || "Australia/Brisbane").trim() || "Australia/Brisbane",
  };
}

function eventStartDate(event) {
  const days = [
    ...(Array.isArray(event?.days) ? event.days : []),
    ...(Array.isArray(event?.classes_by_day) ? event.classes_by_day : []),
  ];
  const fromDays = days
    .map((day) => String(day?.date || "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  const raw = fromDays[0] || String(event?.event_date || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/** Wall-clock time in a named timezone as a Date (UTC instant). */
export function wallTimeInTimeZone(ymd, hour, minute, timeZone) {
  const [year, month, day] = String(ymd || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return null;
  const h = Number(hour) || 0;
  const min = Number(minute) || 0;
  let utc = Date.UTC(year, month - 1, day, h, min, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utc));
    const get = (type) => Number(parts.find((part) => part.type === type)?.value);
    const gotHour = get("hour") === 24 ? 0 : get("hour");
    const got = Date.UTC(get("year"), get("month") - 1, get("day"), gotHour, get("minute"));
    const want = Date.UTC(year, month - 1, day, h, min);
    utc += want - got;
  }
  return new Date(utc);
}

export function addMonths(date, months) {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + Number(months || 0));
  return next;
}

export function formatPolicyDateTime(value, timeZone) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatPolicyDate(value, timeZone) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function nominationCreditBalanceFromRows(rows, now = new Date()) {
  return moneyAmount(
    (rows || []).reduce((sum, row) => {
      const amount = Number(row.amount || 0);
      if (amount > 0 && row.expires_at && new Date(row.expires_at) < now) {
        return sum;
      }
      return sum + amount;
    }, 0)
  );
}

export function nominationCreditSummaryFromRows(rows, now = new Date()) {
  const balance = nominationCreditBalanceFromRows(rows, now);
  const futureExpiries = [];
  let hasIndefiniteCredit = false;

  for (const row of rows || []) {
    const amount = Number(row.amount || 0);
    if (amount <= 0) continue;
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (expiresAt && expiresAt < now) continue;
    if (!expiresAt) {
      hasIndefiniteCredit = true;
      continue;
    }
    futureExpiries.push(expiresAt);
  }

  futureExpiries.sort((a, b) => a.getTime() - b.getTime());

  return {
    balance,
    soonestExpiry: futureExpiries[0] || null,
    hasIndefiniteCredit,
  };
}

export function formatCreditExpiryDate(value, timeZone = "Australia/Brisbane") {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function clubCreditExpiryTooltip(summary, club, t) {
  if (!summary || summary.balance <= 0.005) return "";
  const tz = getDriverSettings(club).cancellation?.timezone || "Australia/Brisbane";
  if (summary.soonestExpiry) {
    const date = formatCreditExpiryDate(summary.soonestExpiry, tz);
    if (summary.hasIndefiniteCredit) {
      return t("clubCredit.expiresWithIndefinite", { date });
    }
    return t("clubCredit.expires", { date });
  }
  return t("clubCredit.noExpiry");
}

export async function fetchNominationCreditSummary(groupId, clubId) {
  if (!groupId || !clubId) return null;
  const withExpiry = await supabase
    .from("nomination_credits")
    .select("amount, expires_at")
    .eq("group_id", groupId)
    .eq("club_id", clubId);
  if (!withExpiry.error) {
    return nominationCreditSummaryFromRows(withExpiry.data);
  }
  const { data, error } = await supabase
    .from("nomination_credits")
    .select("amount")
    .eq("group_id", groupId)
    .eq("club_id", clubId);
  if (error) {
    console.error("Error loading nomination credits:", error);
    return { balance: 0, soonestExpiry: null, hasIndefiniteCredit: false };
  }
  return nominationCreditSummaryFromRows(data);
}

export async function fetchNominationCreditBalance(groupId, clubId) {
  const summary = await fetchNominationCreditSummary(groupId, clubId);
  return summary?.balance ?? 0;
}

export function householdCancellationCreditAmount(nominations) {
  const paid = (nominations || []).filter((row) => row.paid);
  if (!paid.length) return 0;
  const merch = paid[0]?.merchandise && typeof paid[0].merchandise === "object"
    ? paid[0].merchandise
    : {};
  const householdPaid = moneyAmount(merch.household_paid_total);
  const creditApplied = moneyAmount(merch.credit_applied);
  if (householdPaid > 0.005 || creditApplied > 0.005) {
    return moneyAmount(householdPaid + creditApplied);
  }
  return moneyAmount(paid.reduce((sum, row) => sum + Number(row.total_fee || 0), 0));
}

export function findNextMeeting(events, cancelledEvent) {
  const cancelledStart = eventStartDate(cancelledEvent);
  const cancelledTime = cancelledStart
    ? new Date(`${cancelledStart}T12:00:00`).getTime()
    : cancelledEvent?.event_date
      ? new Date(cancelledEvent.event_date).getTime()
      : 0;
  return (events || [])
    .filter((event) => {
      if (!event || event.id === cancelledEvent?.id) return false;
      if (isEventCancelled(event)) return false;
      if (event.is_published === false) return false;
      const start = eventStartDate(event);
      if (!start) return false;
      return new Date(`${start}T12:00:00`).getTime() > cancelledTime;
    })
    .sort((a, b) => eventStartDate(a).localeCompare(eventStartDate(b)))[0] || null;
}

export function cancellationSchedule(club, cancelledEvent, upcomingEvents, now = new Date()) {
  const policy = getCancellationPolicy(club);
  const nextMeeting = findNextMeeting(upcomingEvents, cancelledEvent);
  const nextYmd = eventStartDate(nextMeeting);
  const refundHour = policy.refundDeadlineHour ?? 6;
  const refundDeadline = nextYmd
    ? wallTimeInTimeZone(nextYmd, refundHour, 0, policy.timezone)
    : null;
  const expiryMonths = policy.creditExpiryMonths > 0 ? policy.creditExpiryMonths : 6;
  const expiresAt = addMonths(now, expiryMonths);
  return { policy, nextMeeting, refundDeadline, expiresAt };
}

export function findNextUpcomingMeeting(events, now = new Date()) {
  const todayYmd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return (
    (events || [])
      .filter((event) => {
        if (isEventCancelled(event)) return false;
        if (event.is_published === false) return false;
        const start = eventStartDate(event);
        return !!start && start >= todayYmd;
      })
      .sort((a, b) => eventStartDate(a).localeCompare(eventStartDate(b)))[0] || null
  );
}

export function creditRefundSchedule(club, events, now = new Date()) {
  const policy = getCancellationPolicy(club);
  const nextMeeting = findNextUpcomingMeeting(events, now);
  const nextYmd = eventStartDate(nextMeeting);
  const refundHour = policy.refundDeadlineHour ?? 6;
  const refundDeadline = nextYmd
    ? wallTimeInTimeZone(nextYmd, refundHour, 0, policy.timezone)
    : null;
  const expiryMonths = policy.creditExpiryMonths > 0 ? policy.creditExpiryMonths : 6;
  const expiresAt = addMonths(now, expiryMonths);
  return { policy, nextMeeting, refundDeadline, expiresAt };
}

export async function fetchCreditRefundSchedule(supabase, club, now = new Date()) {
  if (!club?.id) return creditRefundSchedule(club, [], now);
  const { data } = await supabase
    .from("events")
    .select("id, name, event_date, days, classes_by_day, is_published, is_cancelled")
    .eq("club_id", club.id);
  return creditRefundSchedule(club, data || [], now);
}

export function refundWindowCopy(schedule) {
  const { policy, refundDeadline, expiresAt } = schedule || {};
  const hour = policy?.refundDeadlineHour ?? 6;
  const hourLabel = hour === 0 ? "12am" : `${hour}am`;
  const months = policy?.creditExpiryMonths > 0 ? policy.creditExpiryMonths : 6;
  const timezone = policy?.timezone || "Australia/Brisbane";
  const deadlineBit = refundDeadline
    ? ` (${formatPolicyDateTime(refundDeadline, timezone)})`
    : "";
  const expiryBit = expiresAt
    ? ` (until ${formatPolicyDate(expiresAt, timezone)})`
    : "";
  return `Refunds are available until ${hourLabel} the morning of the next meeting${deadlineBit}. Contact the club by then if you would like a refund. If you do not, the funds will be kept as a credit for ${months} months${expiryBit}.`;
}

export function cancellationMemberCopy({
  eventName,
  amount,
  schedule,
  credited,
}) {
  const lines = [`${eventName} has been cancelled.`];
  if (credited && amount > 0.005) {
    lines.push(
      `Your entry fee of ${formatAud(amount)} has been credited to your club account to use at a future event.`
    );
  }
  lines.push(refundWindowCopy(schedule));
  return lines.join(" ");
}

export function cancellationPushCopy(eventName, schedule) {
  const hour = schedule?.policy?.refundDeadlineHour ?? 6;
  const hourLabel = hour === 0 ? "12am" : `${hour}am`;
  const months = schedule?.policy?.creditExpiryMonths > 0 ? schedule.policy.creditExpiryMonths : 6;
  return `${eventName} has been cancelled. Entry fees have been credited for a future event. Refunds are available until ${hourLabel} the morning of the next meeting. If you do not contact the club by then, the funds will be kept as a credit for ${months} months.`;
}

export function nominationCreditMemberCopy({ eventName, amount, schedule }) {
  const lines = [`Your nomination for ${eventName} has been updated.`];
  if (amount > 0.005) {
    lines.push(
      `Your account has been credited ${formatAud(amount)} to use at a future event.`
    );
  }
  lines.push(refundWindowCopy(schedule));
  return lines.join(" ");
}

export function nominationCreditPushCopy(eventName, schedule) {
  const hour = schedule?.policy?.refundDeadlineHour ?? 6;
  const hourLabel = hour === 0 ? "12am" : `${hour}am`;
  const months = schedule?.policy?.creditExpiryMonths > 0 ? schedule.policy.creditExpiryMonths : 6;
  return `${eventName} nomination credited. Refunds are available until ${hourLabel} the morning of the next meeting. If you do not contact the club by then, the funds will be kept as a credit for ${months} months.`;
}

export async function notifyNominationCredit({
  supabase,
  club,
  clubSlug,
  event,
  membershipId,
  userId,
  amount,
  schedule,
  senderUserId,
}) {
  const eventName = richTextToPlainText(event?.name) || "this event";
  const body = nominationCreditMemberCopy({ eventName, amount, schedule });
  const title = `${eventName} nomination credited`;
  const linkPath = clubSlug && event?.id ? `/${clubSlug}/app/events/${event.id}` : null;
  if (club?.id && membershipId) {
    await sendAdminClubMessageToMemberships({
      clubId: club.id,
      membershipIds: [membershipId],
      body,
      senderUserId,
      eventId: event?.id || null,
    });
    notifyClubMessagesInboxChanged();
  }
  if (userId) {
    await createInAppNotification(supabase, {
      userId,
      clubId: club?.id,
      title,
      body,
      linkPath,
    });
    await sendWebPushToUsers(supabase, {
      userIds: [userId],
      title,
      body: nominationCreditPushCopy(eventName, schedule),
      url: linkPath,
      clubId: club?.id,
    });
  }
}

export function cancellationPublicNotice(club, eventName, schedule) {
  const resolved = schedule || { policy: getCancellationPolicy(club) };
  const refund = refundWindowCopy(resolved);
  return [
    `${eventName} has been cancelled.`,
    "Nominated drivers have been credited their entry fee for a future event.",
    refund,
  ]
    .filter(Boolean)
    .join(" ");
}

async function invokeEdgeJson(supabase, functionName, payload) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    return { data: null, error: { message: "VITE_SUPABASE_URL is not set." } };
  }
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { data: null, error: { message: "Sign in again, then retry." } };
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: { message: data?.error || `Edge Function returned ${response.status}` },
      };
    }
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : "Failed to reach Edge Function" },
    };
  }
}

export async function cancelClubEvent({
  supabase,
  event,
  club,
  clubSlug,
  senderUserId,
}) {
  if (!event?.id || !club?.id) {
    return { error: { message: "Event or club is missing." } };
  }
  if (isEventCancelled(event)) {
    return { error: { message: "This event is already cancelled." } };
  }

  const eventName = richTextToPlainText(event.name) || "This event";
  const now = new Date();

  const [{ data: upcomingEvents, error: upcomingError }, { data: nominations, error: nominationsError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, name, event_date, days, classes_by_day, is_published, is_cancelled")
        .eq("club_id", club.id),
      supabase
        .from("nominations")
        .select("id, group_id, paid, total_fee, merchandise")
        .eq("event_id", event.id),
    ]);

  if (upcomingError) return { error: upcomingError };
  if (nominationsError) return { error: nominationsError };

  const schedule = cancellationSchedule(club, event, upcomingEvents || [], now);
  const byHousehold = new Map();
  (nominations || []).forEach((row) => {
    if (!row.group_id) return;
    if (!byHousehold.has(row.group_id)) byHousehold.set(row.group_id, []);
    byHousehold.get(row.group_id).push(row);
  });

  const membershipIds = Array.from(byHousehold.keys());
  const { data: existingCredits } = await supabase
    .from("nomination_credits")
    .select("id, group_id")
    .eq("source_event_id", event.id)
    .gt("amount", 0);
  const alreadyCredited = new Set((existingCredits || []).map((row) => row.group_id));

  const { error: updateError } = await supabase
    .from("events")
    .update({
      is_cancelled: true,
      cancelled_at: now.toISOString(),
      cancelled_by: senderUserId || null,
    })
    .eq("id", event.id)
    .eq("club_id", club.id);

  if (updateError) return { error: updateError };

  const creditRows = [];
  const creditByMembership = new Map();
  membershipIds.forEach((groupId) => {
    const amount = householdCancellationCreditAmount(byHousehold.get(groupId));
    creditByMembership.set(groupId, amount);
    if (amount <= 0.005 || alreadyCredited.has(groupId)) return;
    creditRows.push({
      group_id: groupId,
      club_id: club.id,
      amount,
      source_event_id: event.id,
      notes: `Credit from cancelled event (${eventName})`,
      refund_deadline: schedule.refundDeadline ? schedule.refundDeadline.toISOString() : null,
      expires_at: schedule.expiresAt ? schedule.expiresAt.toISOString() : null,
    });
  });

  if (creditRows.length) {
    const { error: creditError } = await supabase.from("nomination_credits").insert(creditRows);
    if (creditError) {
      const retry = creditRows.map(({ refund_deadline, expires_at, ...row }) => row);
      const { error: retryError } = await supabase.from("nomination_credits").insert(retry);
      if (retryError) return { error: retryError };
    }
  }

  const { data: memberships } = membershipIds.length
    ? await supabase
        .from("household_memberships")
        .select("id, user_id")
        .in("id", membershipIds)
    : { data: [] };

  const userIds = (memberships || []).map((row) => row.user_id).filter(Boolean);
  const linkPath = clubSlug ? `/${clubSlug}/app/events/${event.id}` : null;
  const title = `${eventName} cancelled`;

  const messageRows = membershipIds.map((membershipId) => {
    const amount = creditByMembership.get(membershipId) || 0;
    return {
      membershipId,
      body: cancellationMemberCopy({
        eventName,
        amount,
        schedule,
        credited: amount > 0.005,
      }),
    };
  });

  for (const row of messageRows) {
    await sendAdminClubMessageToMemberships({
      clubId: club.id,
      membershipIds: [row.membershipId],
      body: row.body,
      senderUserId,
      eventId: event.id,
    });
  }
  if (messageRows.length) notifyClubMessagesInboxChanged();

  if (userIds.length) {
    await Promise.all(
      userIds.map((userId) => {
        const membership = (memberships || []).find((row) => row.user_id === userId);
        const amount = creditByMembership.get(membership?.id) || 0;
        const body = cancellationMemberCopy({
          eventName,
          amount,
          schedule,
          credited: amount > 0.005,
        });
        return createInAppNotification(supabase, {
          userId,
          clubId: club.id,
          title,
          body,
          linkPath,
        });
      })
    );

    await sendWebPushToUsers(supabase, {
      userIds,
      title,
      body: cancellationPushCopy(eventName, schedule),
      url: linkPath,
      clubId: club.id,
    });

    await invokeEdgeJson(supabase, "process-nominations-open", {
      eventId: event.id,
      type: "event_cancelled",
      force: true,
    });
  }

  return {
    error: null,
    creditedHouseholds: creditRows.length,
    notifiedHouseholds: membershipIds.length,
    refundDeadline: schedule.refundDeadline,
    expiresAt: schedule.expiresAt,
  };
}
