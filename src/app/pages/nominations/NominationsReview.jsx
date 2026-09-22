// src/app/pages/nominations/NominationsReview.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import useTheme from "@app/providers/useTheme";
import { COUNTRIES } from "@/data/countries";

export default function NominationsReview() {
  const { clubSlug, eventId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [drivers, setDrivers] = useState([]);
  const [event, setEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to review nominations.");
        setLoading(false);
        return;
      }

      const { data: household } = await supabase
        .from("household_memberships")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!household) {
        setError("No household membership found.");
        setLoading(false);
        return;
      }

      const { data: driverRows } = await supabase
        .from("drivers")
        .select(
          `
          *,
          profile:driver_profiles(*)
        `
        )
        .eq("membership_id", household.id);

      const { data: eventRow } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      const { data: classRows } = await supabase
        .from("nomination_classes")
        .select("*, event_classes(*)")
        .eq("event_id", eventId)
        .eq("is_enabled", true)
        .order("order_index", { ascending: true });

      const driverIds = driverRows?.map((d) => d.id) || [];

      let nomRows = [];
      let entryRows = [];

      if (driverIds.length > 0) {
        const { data: n } = await supabase
          .from("nominations")
          .select("*")
          .eq("event_id", eventId)
          .in("driver_id", driverIds);

        nomRows = n || [];

        const nomIds = nomRows.map((n) => n.id);

        if (nomIds.length > 0) {
          const { data: e } = await supabase
            .from("nomination_entries")
            .select("*")
            .in("nomination_id", nomIds)
            .order("order_index", { ascending: true });

          entryRows = e || [];
        }
      }

      setDrivers(driverRows || []);
      setEvent(eventRow || null);
      setClasses(classRows || []);
      setNominations(nomRows);
      setEntries(entryRows);
    } catch (err) {
      console.error(err);
      setError("Something went wrong loading your nominations.");
    } finally {
      setLoading(false);
    }
  }

  function getClassName(classId) {
    const cls = classes.find((c) => c.class_id === classId);
    return cls?.event_classes?.class_name || "";
  }

  function getPricingForDriver(driver) {
    const memberPrice = event?.member_price ?? 10;
    const juniorPrice = event?.junior_price ?? 0;

    if (driver.is_junior) return { perClass: juniorPrice };
    return { perClass: memberPrice };
  }

  function calculateTotal(driver, primaryCount) {
    const { perClass } = getPricingForDriver(driver);
    return perClass * primaryCount;
  }

  function getDriverEntries(driverId) {
    const driverNoms = nominations.filter((n) => n.driver_id === driverId);
    const nomIds = driverNoms.map((n) => n.id);

    const driverEntries = entries.filter((e) =>
      nomIds.includes(e.nomination_id)
    );

    const primary = driverEntries.filter((e) => !e.is_preference);
    const preference = driverEntries.find((e) => e.is_preference) || null;

    return { primary, preference, nominationId: driverNoms[0]?.id || null };
  }

  async function submit() {
    try {
      setSubmitting(true);
      setError(null);

      const firstNomination = nominations[0];

      if (!firstNomination) {
        setError("No nomination found to submit.");
        setSubmitting(false);
        return;
      }

      navigate(`/${clubSlug}/nominations/${eventId}/complete`, {
        state: { nominationId: firstNomination.id },
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong submitting your nominations.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">Loading your nominations…</p>
        </div>
      </div>
    );
  }

if (error) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h2 className="text-lg font-semibold text-red-200">Error</h2>
        <p className="mt-2 text-sm text-red-100/80">{error}</p>
        <button
          onClick={() => navigate(`/${clubSlug}/events`)}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 transition-colors"
        >
          Return to events
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* PAGE TITLE */}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6">
          Review your nominations
        </h1>

        {/* DRIVER CARDS */}
        <div className="space-y-4">
          {drivers.map((driver) => {
            const p = driver.profile || {};
            const country = COUNTRIES.find((c) => c.code === p.country_code);

            const { primary, preference } = getDriverEntries(driver.id);
            const total = calculateTotal(driver, primary.length);

            return (
              <div
                key={driver.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                {/* DRIVER HEADER */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={p.avatar_url || "/default-avatar.png"}
                    className="w-12 h-12 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <p className="text-lg font-semibold text-slate-50">
                      {p.nickname ||
                        `${driver.first_name} ${driver.last_name}`}
                    </p>
                    {country && (
                      <span className="text-xl">{country.flag}</span>
                    )}
                  </div>
                </div>

                {/* CLASSES */}
                <div className="space-y-1 mb-3">
                  {primary.map((e) => (
                    <p key={e.id} className="text-sm text-slate-300">
                      {getClassName(e.class_id)}
                    </p>
                  ))}

                  {preference && (
                    <p className="text-sm text-slate-400 italic">
                      {getClassName(preference.class_id)} (Preference)
                    </p>
                  )}
                </div>

                {/* TOTAL */}
                <p className="text-sm text-slate-400">
                  Total:{" "}
                  <span className="font-semibold text-slate-50">
                    ${total}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={submit}
          disabled={submitting}
          className={`w-full mt-8 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
            submitting
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          }`}
        >
          {submitting ? "Submitting…" : "Submit Nominations"}
        </button>
      </div>
    </div>
  );
}
