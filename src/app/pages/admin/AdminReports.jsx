import { useEffect, useMemo, useState } from "react";

// CSV EXPORT HELPERS
function downloadCSV(filename, rows) {
  const process = (row) =>
    row
      .map((value) => {
        if (value === null || value === undefined) return "";
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",");

  const csvContent = [process(Object.keys(rows[0] || {}))]
    .concat(rows.map((r) => process(Object.values(r))))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportEventsCSV(events, nominationClassesByEventId) {
  const rows = events.map((e) => {
    const nom = nominationClassesByEventId[e.id] || [];
    const enabled = nom.filter((nc) => nc.is_enabled).length;

    return {
      Event: e.name,
      Date: e.event_date || "",
      Track: e.track || "",
      EnabledClasses: enabled,
      HasLogo: e.logourl ? "Yes" : "No",
      NominationWindow:
        e.nominations_open && e.nominations_close ? "Set" : "Missing",
    };
  });

  downloadCSV("events_report.csv", rows);
}

function exportMembershipsCSV(memberships, driversByMembershipId) {
  const rows = memberships.map((m) => {
    const driverCount = (driversByMembershipId[m.id] || []).length;

    return {
      Name: `${m.primary_first_name || ""} ${m.primary_last_name || ""}`,
      Email: m.email || "",
      Type: m.membership_type || "",
      Duration: m.duration || "",
      Status: m.status || "",
      DriverCount: driverCount,
    };
  });

  downloadCSV("memberships_report.csv", rows);
}

function exportDriversCSV(drivers, membershipById) {
  const rows = drivers.map((d) => {
    const household = d.membership_id ? membershipById[d.membership_id] : null;

    return {
      FirstName: d.first_name || "",
      LastName: d.last_name || "",
      Email: d.email || "",
      DriverType: d.driver_type || "",
      Junior: d.is_junior ? "Yes" : "No",
      Household: household
        ? `${household.primary_first_name} ${household.primary_last_name}`
        : "None",
    };
  });

  downloadCSV("drivers_report.csv", rows);
}

function exportSystemHealthCSV({
  inactiveClasses,
  eventsMissingWindows,
  eventsMissingLogos,
  driversWithoutMembership,
}) {
  const rows = [
    {
      Metric: "Inactive Classes",
      Count: inactiveClasses.length,
    },
    {
      Metric: "Events Missing Nomination Window",
      Count: eventsMissingWindows.length,
    },
    {
      Metric: "Events Missing Logo",
      Count: eventsMissingLogos.length,
    },
    {
      Metric: "Drivers Without Membership",
      Count: driversWithoutMembership.length,
    },
  ];

  downloadCSV("system_health_report.csv", rows);
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [eventClasses, setEventClasses] = useState([]);
  const [nominationClasses, setNominationClasses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [{ data: eventRows }, { data: membershipRows }, { data: driverRows }] =
      await Promise.all([
        window.supabase
          .from("events")
          .select("*")
          .order("event_date", { ascending: true }),
        window.supabase
          .from("household_memberships")
          .select("*")
          .order("primary_last_name", { ascending: true }),
        window.supabase
          .from("drivers")
          .select("*")
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true }),
      ]);

    const [{ data: classRows }, { data: nomClassRows }] = await Promise.all([
      window.supabase
        .from("event_classes")
        .select("*")
        .order("class_name", { ascending: true }),
      window.supabase.from("nomination_classes").select("*"),
    ]);

    setEvents(eventRows || []);
    setMemberships(membershipRows || []);
    setDrivers(driverRows || []);
    setEventClasses(classRows || []);
    setNominationClasses(nomClassRows || []);

    setLoading(false);
  }

  // DERIVED METRICS
  const totalEvents = events.length;

  const totalMemberships = memberships.length;
  const activeMemberships = useMemo(
    () =>
      memberships.filter(
        (m) =>
          (m.status || "").toLowerCase() === "active" ||
          (m.status || "").toLowerCase() === "current"
      ).length,
    [memberships]
  );

  const membershipTypeCounts = useMemo(() => {
    const map = {};
    memberships.forEach((m) => {
      const key = m.membership_type || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [memberships]);

  const totalDrivers = drivers.length;
  const juniorDrivers = useMemo(
    () => drivers.filter((d) => d.is_junior).length,
    [drivers]
  );
  const seniorDrivers = totalDrivers - juniorDrivers;

  const driversByMembershipId = useMemo(() => {
    const map = {};
    drivers.forEach((d) => {
      const key = d.membership_id || "none";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [drivers]);

  const membershipsWithoutDrivers = useMemo(
    () =>
      memberships.filter((m) => {
        const list = driversByMembershipId[m.id] || [];
        return list.length === 0;
      }),
    [memberships, driversByMembershipId]
  );

  const driversWithoutMembership = useMemo(
    () => drivers.filter((d) => !d.membership_id),
    [drivers]
  );

  const inactiveClasses = useMemo(
    () => eventClasses.filter((c) => c.is_active === false),
    [eventClasses]
  );

  const eventsMissingWindows = useMemo(
    () =>
      events.filter(
        (e) => !e.nominations_open || !e.nominations_close
      ),
    [events]
  );

  const eventsMissingLogos = useMemo(
    () => events.filter((e) => !e.logoUrl),
    [events]
  );

  const nominationClassesByEventId = useMemo(() => {
    const map = {};
    nominationClasses.forEach((nc) => {
      if (!map[nc.event_id]) map[nc.event_id] = [];
      map[nc.event_id].push(nc);
    });
    return map;
  }, [nominationClasses]);

  const membershipById = useMemo(() => {
    const map = {};
    memberships.forEach((m) => (map[m.id] = m));
    return map;
  }, [memberships]);

  // RENDER
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="app-page-main space-y-10">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Reports
          </h1>

          <button
            onClick={loadData}
            className="rounded-full bg-slate-800 text-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
            <div className="text-xs uppercase text-slate-400">Events</div>
            <div className="text-2xl font-semibold text-slate-50">
              {totalEvents}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
            <div className="text-xs uppercase text-slate-400">
              Memberships (Active / Total)
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {activeMemberships} / {totalMemberships}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
            <div className="text-xs uppercase text-slate-400">
              Drivers (Junior / Total)
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {juniorDrivers} / {totalDrivers}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-1">
            <div className="text-xs uppercase text-slate-400">
              Households without Drivers
            </div>
            <div className="text-2xl font-semibold text-slate-50">
              {membershipsWithoutDrivers.length}
            </div>
          </div>
        </div>

        {/* EVENT REPORTS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">
              Event Reports
            </h2>
            <button
              onClick={() =>
                exportEventsCSV(events, nominationClassesByEventId)
              }
              className="rounded-full bg-slate-800 text-slate-200 px-4 py-1.5 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* MEMBERSHIP REPORTS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">
              Membership Reports
            </h2>
            <button
              onClick={() =>
                exportMembershipsCSV(memberships, driversByMembershipId)
              }
              className="rounded-full bg-slate-800 text-slate-200 px-4 py-1.5 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* DRIVER REPORTS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">
              Driver Reports
            </h2>
            <button
              onClick={() =>
                exportDriversCSV(drivers, membershipById)
              }
              className="rounded-full bg-slate-800 text-slate-200 px-4 py-1.5 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* FINANCIAL REPORTS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">
              Financial Reports
            </h2>
            <button
              disabled
              className="rounded-full bg-slate-800 text-slate-500 px-4 py-1.5 text-sm font-medium cursor-not-allowed"
            >
              Export CSV (coming soon)
            </button>
          </div>
        </div>

        {/* SYSTEM HEALTH */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-50">
              System Health
            </h2>
            <button
              onClick={() =>
                exportSystemHealthCSV({
                  inactiveClasses,
                  eventsMissingWindows,
                  eventsMissingLogos,
                  driversWithoutMembership,
                })
              }
              className="rounded-full bg-slate-800 text-slate-200 px-4 py-1.5 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
