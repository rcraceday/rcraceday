import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import useTheme from "@app/providers/useTheme";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function NominationsView() {
  const { clubSlug, eventId } = useParams();
  const { membership } = useMembership();
  const { palette } = useTheme();
  const [event, setEvent] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: eventRow } = await supabase.from("events").select("id, name, event_date").eq("id", eventId).single();
      let nominationsQuery = supabase
        .from("nominations")
        .select("id, driver_id, paid, nomination_entries(id, class_id, is_preference, order_index)")
        .eq("event_id", eventId);
      if (membership?.id) nominationsQuery = nominationsQuery.eq("group_id", membership.id);
      const { data: nominations } = await nominationsQuery;
      const driverIds = (nominations || []).map((item) => item.driver_id);
      const { data: drivers } = driverIds.length ? await supabase.from("drivers").select("id, first_name, last_name, permanent_number, sponsors").in("id", driverIds) : { data: [] };
      const classIds = (nominations || []).flatMap((nomination) => (nomination.nomination_entries || []).map((entry) => entry.class_id));
      const { data: classes } = classIds.length ? await supabase.from("club_classes").select("id, name").in("id", classIds) : { data: [] };
      const driverMap = new Map((drivers || []).map((driver) => [driver.id, driver]));
      const classMap = new Map((classes || []).map((item) => [item.id, item.name]));
      setRows((nominations || []).map((nomination) => ({ ...nomination, driver: driverMap.get(nomination.driver_id), entries: (nomination.nomination_entries || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((entry) => ({ ...entry, name: classMap.get(entry.class_id) || "Unknown class" })) })));
      setEvent(eventRow || null);
      setLoading(false);
    }
    load();
  }, [eventId, membership?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading nominations...</div>;

  return <div className="min-h-screen bg-background text-text-base"><PageTitle title={`${event?.name || "Event"} nominations`} style={{ color: palette?.primary }} /><main className="max-w-[720px] mx-auto px-4 py-4 space-y-4"><div className="flex flex-wrap gap-2"><Link to={`/${clubSlug}/app/events/${eventId}/nominate`} state={{ reloadSavedNominations: true }}><Button>Update nominations</Button></Link><Link to={`/${clubSlug}/app/events/${eventId}`}><Button variant="secondary">Back to event</Button></Link></div>{rows.length === 0 ? <Card><p className="text-sm text-text-muted">No nominations have been entered.</p></Card> : rows.map((row) => <Card key={row.id} className="space-y-3"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{row.driver?.first_name} {row.driver?.last_name}</h2><p className="text-sm text-text-muted">{row.driver?.permanent_number ? `#${row.driver.permanent_number}` : "Number not set"}{row.driver?.sponsors?.length ? ` · ${row.driver.sponsors.join(", ")}` : ""}</p></div><span className="text-xs font-semibold">{row.paid ? "Paid" : "Unpaid"}</span></div><div className="flex flex-wrap gap-2">{row.entries.map((entry) => <span key={entry.id || `${row.id}-${entry.class_id}-${entry.order_index}-${entry.is_preference ? "pref" : "class"}`} className={`rounded-md border px-2 py-1 text-sm ${entry.is_preference ? "border-amber-300 text-amber-700" : "border-surfaceBorder"}`}>{entry.name}{entry.is_preference ? " (preference)" : ""}</span>)}</div></Card>)}</main></div>;
}