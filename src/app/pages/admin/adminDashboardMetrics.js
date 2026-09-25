import { supabase } from "@/supabaseClient";

export function getCalendarYear(date = new Date()) {
  return date.getFullYear();
}

export function formatMetricsCurrency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isActiveMembership(status) {
  const normalized = (status || "").toLowerCase();
  return normalized === "active" || normalized === "current";
}

export function getEventAnchorDate(event) {
  if (Array.isArray(event?.days) && event.days.length > 0) {
    const sorted = [...event.days].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return sorted[0]?.date ? new Date(sorted[0].date) : null;
  }
  return event?.event_date ? new Date(event.event_date) : null;
}

export function getEventYear(event) {
  const anchor = getEventAnchorDate(event);
  return anchor ? anchor.getFullYear() : null;
}

function isEventCancelled(event) {
  return !!(event?.is_cancelled || event?.cancelled);
}

function trackKindFromName(name) {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("modern")) return "modern";
  if (normalized.includes("dirt")) return "dirt";
  return null;
}

export function eventsInCalendarYear(events, year) {
  return (events || []).filter((event) => getEventYear(event) === year);
}

export function referenceDateForMetricsYear(year) {
  const currentYear = getCalendarYear();
  if (year < currentYear) {
    return new Date(year, 11, 31, 23, 59, 59, 999);
  }
  return new Date();
}

export function listArchiveYears(events, currentYear = getCalendarYear()) {
  const years = new Set();
  (events || []).forEach((event) => {
    const year = getEventYear(event);
    if (year != null && year < currentYear) {
      years.add(year);
    }
  });
  return [...years].sort((a, b) => b - a);
}

export function countMembershipTypes(memberships) {
  const counts = {
    active: 0,
    adult: 0,
    family: 0,
    junior: 0,
    nonMember: 0,
  };

  (memberships || []).forEach((row) => {
    if (isActiveMembership(row.status)) counts.active += 1;

    const type = (row.membership_type || "").toLowerCase();
    if (type === "adult" || type === "single") counts.adult += 1;
    else if (type === "family") counts.family += 1;
    else if (type === "junior") counts.junior += 1;
    else if (type === "non_member") counts.nonMember += 1;
  });

  return counts;
}

export function computeEventMetrics(events, trackNameById, metricsYear, referenceDate) {
  const yearEvents = eventsInCalendarYear(events, metricsYear);
  let total = 0;
  let modern = 0;
  let dirt = 0;
  let cancelled = 0;
  let remaining = 0;

  yearEvents.forEach((event) => {
    total += 1;
    const trackName = trackNameById[event.track] || "";
    const kind = trackKindFromName(trackName);
    if (kind === "modern") modern += 1;
    if (kind === "dirt") dirt += 1;

    const cancelledEvent = isEventCancelled(event);
    if (cancelledEvent) {
      cancelled += 1;
      return;
    }

    const anchor = getEventAnchorDate(event);
    if (anchor && anchor >= referenceDate) remaining += 1;
  });

  return { total, modern, dirt, cancelled, remaining };
}

export function entryRevenueFromNomination(nomination) {
  if (!nomination?.paid) return 0;

  const totalFee = Number(nomination.total_fee) || 0;
  const merchandise = nomination.merchandise;
  if (!merchandise || typeof merchandise !== "object") {
    return totalFee;
  }

  const breakdown = Array.isArray(merchandise.paid_checkout_breakdown)
    ? merchandise.paid_checkout_breakdown
    : null;

  if (breakdown?.length) {
    const driverId = nomination.driver_id;
    const merchAddon = breakdown
      .filter(
        (line) =>
          line.driverId === driverId &&
          (line.kind === "merch" || line.kind === "addon")
      )
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);
    return Math.max(0, totalFee - merchAddon);
  }

  return totalFee;
}

export function computeNominationMetrics(
  nominations,
  eventsById,
  trackNameById,
  metricsYear
) {
  const counts = {
    totalYtd: 0,
    modernYtd: 0,
    modernRevenue: 0,
    dirtYtd: 0,
    dirtRevenue: 0,
  };

  (nominations || []).forEach((row) => {
    const event = eventsById[row.event_id];
    if (!event || getEventYear(event) !== metricsYear) return;

    counts.totalYtd += 1;
    const entryRevenue = entryRevenueFromNomination(row);
    const trackName = trackNameById[event.track] || "";
    const kind = trackKindFromName(trackName);

    if (kind === "modern") {
      counts.modernYtd += 1;
      counts.modernRevenue += entryRevenue;
    } else if (kind === "dirt") {
      counts.dirtYtd += 1;
      counts.dirtRevenue += entryRevenue;
    }
  });

  return counts;
}

export const emptyDashboardStats = () => ({
  membership: {
    active: 0,
    adult: 0,
    family: 0,
    junior: 0,
    nonMember: 0,
  },
  events: {
    total: 0,
    modern: 0,
    dirt: 0,
    cancelled: 0,
    remaining: 0,
  },
  nominations: {
    totalYtd: 0,
    modernYtd: 0,
    modernRevenue: 0,
    dirtYtd: 0,
    dirtRevenue: 0,
  },
});

export async function loadClubMetricsContext(clubSlug) {
  const { data: club, error: clubErr } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", clubSlug)
    .single();

  if (clubErr || !club?.id) {
    return { error: clubErr || new Error("Club not found") };
  }

  const clubId = club.id;
  const nowIso = new Date().toISOString();

  const [eventsRes, upcomingEventsRes, membershipsRes, tracksRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, name, event_date, days, track")
        .eq("club_id", clubId),

      supabase
        .from("events")
        .select("id, name, event_date")
        .eq("club_id", clubId)
        .gte("event_date", nowIso)
        .order("event_date", { ascending: true }),

      supabase
        .from("household_memberships")
        .select("id, status, membership_type")
        .eq("club_id", clubId),

      supabase
        .from("club_tracks")
        .select("id, name")
        .eq("club_id", clubId),
    ]);

  const clubEvents = eventsRes.data || [];
  const clubEventIds = clubEvents.map((event) => event.id);

  let nominationRows = [];
  if (clubEventIds.length > 0) {
    const { data: nominationsData, error: nominationsErr } = await supabase
      .from("nominations")
      .select("event_id, driver_id, total_fee, paid, merchandise")
      .in("event_id", clubEventIds);

    if (nominationsErr) {
      console.error("Failed to load nominations metrics:", nominationsErr);
    } else {
      nominationRows = nominationsData || [];
    }
  }

  const trackNameById = Object.fromEntries(
    (tracksRes.data || []).map((track) => [track.id, track.name || ""])
  );
  const eventsById = Object.fromEntries(
    clubEvents.map((event) => [event.id, event])
  );

  return {
    clubId,
    clubEvents,
    nominationRows,
    trackNameById,
    eventsById,
    memberships: membershipsRes.data || [],
    upcomingEvents: upcomingEventsRes.data || [],
  };
}

export function buildStatsForYear(context, metricsYear) {
  const referenceDate = referenceDateForMetricsYear(metricsYear);
  const membershipCounts = countMembershipTypes(context.memberships);
  const eventMetrics = computeEventMetrics(
    context.clubEvents,
    context.trackNameById,
    metricsYear,
    referenceDate
  );
  const nominationMetrics = computeNominationMetrics(
    context.nominationRows,
    context.eventsById,
    context.trackNameById,
    metricsYear
  );

  return {
    membership: membershipCounts,
    events: eventMetrics,
    nominations: nominationMetrics,
  };
}
