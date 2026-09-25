import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/solid";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import useTheme from "@app/providers/useTheme";
import { useMembership } from "@/app/providers/MembershipProvider";

function driverName(driver) {
  return [driver?.first_name, driver?.last_name].filter(Boolean).join(" ").trim();
}

function getEventEndDate(event) {
  const scheduledDays = [
    ...(Array.isArray(event?.classes_by_day) ? event.classes_by_day : []),
    ...(Array.isArray(event?.days) ? event.days : []),
  ];
  const scheduledDates = scheduledDays
    .map((day) => day?.date)
    .filter((date) => date && !Number.isNaN(new Date(date).getTime()))
    .sort();
  return scheduledDates.at(-1) || event?.event_date || null;
}

function isEventStillListed(event, now = new Date()) {
  const endStr = getEventEndDate(event);
  if (!endStr) return false;
  const endDay = new Date(`${String(endStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(endDay.getTime())) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const removeOn = new Date(endDay);
  removeOn.setHours(0, 0, 0, 0);
  removeOn.setDate(removeOn.getDate() + 1);
  return today < removeOn;
}

function transponderFor(nomination, classId, driverClassMap) {
  const fromSnapshot = nomination?.merchandise?.selection_snapshot?.transponders?.[classId];
  if (fromSnapshot && String(fromSnapshot).trim()) return String(fromSnapshot).trim();
  return driverClassMap.get(`${nomination.driver_id}:${classId}`) || "";
}

export default function NominationsReview() {
  const { clubSlug } = useParams();
  const { membership } = useMembership();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";
  const contentText = palette?.text || "#1f2937";

  const [eventCards, setEventCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!membership?.id) {
        setEventCards([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: nominationRows } = await supabase
        .from("nominations")
        .select("id, event_id, driver_id, merchandise")
        .eq("group_id", membership.id);

      const nominations = nominationRows || [];
      const eventIds = [...new Set(nominations.map((row) => row.event_id).filter(Boolean))];
      const driverIds = [...new Set(nominations.map((row) => row.driver_id).filter(Boolean))];
      const nominationIds = nominations.map((row) => row.id);

      const { data: eventRows } = eventIds.length
        ? await supabase
            .from("events")
            .select("id, name, event_date, is_multi_day, days, classes_by_day, nominations_open, nominations_close, late_entries_enabled, late_entries_close, late_fee_activation")
            .in("id", eventIds)
        : { data: [] };

      const visibleEvents = (eventRows || []).filter((event) => isEventStillListed(event));

      const { data: entryRows } = nominationIds.length
        ? await supabase
            .from("nomination_entries")
            .select("id, nomination_id, class_id, is_preference, order_index")
            .in("nomination_id", nominationIds)
            .order("order_index", { ascending: true })
        : { data: [] };

      const { data: driverRows } = driverIds.length
        ? await supabase.from("drivers").select("id, first_name, last_name").in("id", driverIds)
        : { data: [] };

      const classIds = [...new Set((entryRows || []).map((entry) => entry.class_id).filter(Boolean))];
      const { data: classRows } = classIds.length
        ? await supabase.from("club_classes").select("id, name").in("id", classIds)
        : { data: [] };

      const { data: driverClassRows } = driverIds.length
        ? await supabase
            .from("driver_classes")
            .select("driver_id, class_id, transponder_number")
            .in("driver_id", driverIds)
        : { data: [] };

      if (cancelled) return;

      const driverMap = new Map((driverRows || []).map((driver) => [driver.id, driver]));
      const classMap = new Map((classRows || []).map((item) => [item.id, item.name]));
      const driverClassMap = new Map(
        (driverClassRows || []).map((row) => [
          `${row.driver_id}:${row.class_id}`,
          row.transponder_number || "",
        ])
      );

      const cards = visibleEvents
        .map((event) => {
          const eventNominations = nominations.filter((row) => row.event_id === event.id);
          const drivers = eventNominations
            .map((nomination) => {
              const driver = driverMap.get(nomination.driver_id);
              if (!driver) return null;
              const classSeen = new Set();
              const classes = [];
              (entryRows || []).forEach((entry) => {
                if (entry.nomination_id !== nomination.id || entry.is_preference) return;
                if (!entry.class_id || classSeen.has(entry.class_id)) return;
                classSeen.add(entry.class_id);
                classes.push({
                  id: entry.class_id,
                  name: classMap.get(entry.class_id) || "Unknown class",
                  transponder: transponderFor(nomination, entry.class_id, driverClassMap),
                });
              });
              return { nomination, driver, classes };
            })
            .filter(Boolean)
            .sort((a, b) =>
              `${a.driver.last_name || ""} ${a.driver.first_name || ""}`.localeCompare(
                `${b.driver.last_name || ""} ${b.driver.first_name || ""}`
              )
            );
          return { event, drivers };
        })
        .filter((card) => card.drivers.length > 0)
        .sort((a, b) => {
          const aDate = getEventEndDate(a.event) || "";
          const bDate = getEventEndDate(b.event) || "";
          return String(aDate).localeCompare(String(bDate));
        });

      setEventCards(cards);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [membership?.id]);

  const hasCards = useMemo(() => eventCards.length > 0, [eventCards]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background text-text-muted flex items-center justify-center">
        Loading your nominations...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: palette?.background || "#ffffff" }}>
      <PageTitle
        icon={ClipboardDocumentCheckIcon}
        title="My Nominations"
        style={{ color: brand }}
        actions={
          <Link to={`/${clubSlug}/app/events`} className="no-underline">
            <Button variant="primary" size="sm" className="!py-1 !px-3 !text-xs !rounded-sm">
              Back to events
            </Button>
          </Link>
        }
      />

      <main
        style={{
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {!hasCards ? (
          <Card className="p-4">
            <p className="text-sm text-text-muted">
              You have no household nominations for upcoming events.
            </p>
          </Card>
        ) : (
          eventCards.map(({ event, drivers }) => (
            <Card key={event.id} className="p-4 space-y-4">
              <h2 className="font-semibold text-lg leading-tight" style={{ color: contentText }}>
                {event.name}
              </h2>

              <div className="space-y-4">
                {drivers.map(({ driver, classes }) => (
                  <div key={driver.id} className="space-y-1">
                    <p className="font-medium" style={{ color: contentText }}>
                      {driverName(driver) || "Unnamed driver"}
                    </p>
                    {classes.length === 0 ? (
                      <p className="text-sm text-text-muted">No classes nominated.</p>
                    ) : (
                      classes.map((item) => (
                        <p key={item.id} className="text-sm text-text-muted">
                          {item.name}
                          {item.transponder ? ` · Transponder ${item.transponder}` : " · Transponder not set"}
                        </p>
                      ))
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/${clubSlug}/app/events/${event.id}/nominate`}
                  state={{ reloadSavedNominations: true }}
                  className="no-underline"
                >
                  <Button variant="secondary" className="!py-1.5 !text-xs w-full sm:w-auto">
                    Update Nominations
                  </Button>
                </Link>
                <Link
                  to={`/${clubSlug}/app/events/${event.id}/nominations`}
                  className="no-underline"
                >
                  <Button className="!py-1.5 !text-xs w-full sm:w-auto">
                    View Nominations
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
