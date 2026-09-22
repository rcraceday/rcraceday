import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import useTheme from "@app/providers/useTheme";
import { buildLiveTimeCsv, buildLiveTimeRows } from "@app/pages/nominations/LiveTimeExport";

export default function AdminEventNominations() {
  const { palette } = useTheme();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [event, setEvent] = useState(null);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [clubName, setClubName] = useState("");
  const [tab, setTab] = useState("drivers");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("events").select("id, name, event_date, club_id").order("event_date", { ascending: false }).then(({ data }) => {
      setEvents(data || []);
      if (data?.[0]) setEventId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    async function load() {
      setLoading(true);
      const { data: eventRow } = await supabase.from("events").select("*").eq("id", eventId).single();
      const { data: nominationRows } = await supabase.from("nominations").select("*").eq("event_id", eventId);
      const nominationIds = (nominationRows || []).map((item) => item.id);
      const driverIds = (nominationRows || []).map((item) => item.driver_id);
      const { data: entryRows } = nominationIds.length ? await supabase.from("nomination_entries").select("*").in("nomination_id", nominationIds) : { data: [] };
      const { data: driverRows } = driverIds.length ? await supabase.from("drivers").select("*").in("id", driverIds) : { data: [] };
      const classIds = (entryRows || []).map((item) => item.class_id);
      const { data: classRows } = classIds.length ? await supabase.from("club_classes").select("id, name").in("id", classIds) : { data: [] };
      const membershipIds = (driverRows || []).map((item) => item.membership_id).filter(Boolean);
      const { data: membershipRows } = membershipIds.length ? await supabase.from("household_memberships").select("*").in("id", membershipIds) : { data: [] };
      const { data: clubRow } = eventRow?.club_id ? await supabase.from("clubs").select("name").eq("id", eventRow.club_id).single() : { data: null };
      setEvent(eventRow || null);
      setNominations(nominationRows || []);
      setEntries(entryRows || []);
      setDrivers(driverRows || []);
      setClasses(classRows || []);
      setMemberships(membershipRows || []);
      setClubName(clubRow?.name || "");
      setLoading(false);
    }
    load();
  }, [eventId]);

  const driverMap = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item.name || ""])), [classes]);
  const entriesFor = (nominationId) => entries.filter((entry) => entry.nomination_id === nominationId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const driverRows = nominations.map((nomination) => ({ nomination, driver: driverMap.get(nomination.driver_id), entries: entriesFor(nomination.id) })).filter((row) => row.driver);
  const sortedDrivers = driverRows.slice().sort((a, b) => sort === "class" ? (classMap.get(a.entries.find((entry) => !entry.is_preference)?.class_id) || "").localeCompare(classMap.get(b.entries.find((entry) => !entry.is_preference)?.class_id) || "") : `${a.driver.last_name}${a.driver.first_name}`.localeCompare(`${b.driver.last_name}${b.driver.first_name}`));
  const classRows = entries.filter((entry) => !entry.is_preference).reduce((groups, entry) => {
    const name = classMap.get(entry.class_id) || "Unknown class";
    const nomination = nominations.find((item) => item.id === entry.nomination_id);
    const driver = nomination && driverMap.get(nomination.driver_id);
    if (driver) groups[name] = [...(groups[name] || []), driver];
    return groups;
  }, {});
  const csv = buildLiveTimeCsv(buildLiveTimeRows({ nominations, entries, drivers, classes, memberships, clubName }));

  const flatRequirements = useMemo(() => {
    const requirements = Array.isArray(event?.club_requirements) ? event.club_requirements : [];
    const flattened = [];

    requirements.forEach((group, groupIndex) => {
      const descriptor = typeof group?.descriptor === "string" ? group.descriptor.trim() : "";
      const items = Array.isArray(group?.items)
        ? group.items.map((item) => String(item ?? "").trim()).filter(Boolean)
        : typeof group?.item === "string" && group.item.trim()
          ? [group.item.trim()]
          : [];

      const requirementId = group?.id || `requirement-${groupIndex}`;

      if (!descriptor && items.length === 0) return;

      if (items.length === 0) {
        flattened.push({
          id: `${requirementId}-item-0`,
          requirementId,
          descriptor,
          item: "",
        });
        return;
      }

      items.forEach((item, itemIndex) => {
        flattened.push({
          id: `${requirementId}-item-${itemIndex}`,
          requirementId,
          descriptor,
          item,
        });
      });
    });

    return flattened;
  }, [event?.club_requirements]);

  const requirementTally = useMemo(() => {
    const seenGroups = new Set();
    const counts = {};

    nominations.forEach((nomination) => {
      if (seenGroups.has(nomination.group_id)) return;
      seenGroups.add(nomination.group_id);

      const selected = nomination.merchandise?.requirements || {};
      Object.entries(selected).forEach(([reqId, checked]) => {
        if (!checked) return;
        const requirementId = reqId.replace(/-item-\d+$/, "");
        counts[requirementId] = (counts[requirementId] || 0) + 1;
      });
    });

    return counts;
  }, [nominations]);

  function downloadCsv() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${event?.name || "event"}-livetime.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function togglePaid(nomination) {
    const paid = nomination.paid !== true;
    const { error } = await supabase.from("nominations").update({ paid }).eq("id", nomination.id);
    if (error) return;
    setNominations((current) => current.map((item) => item.id === nomination.id ? { ...item, paid } : item));
  }

  if (loading && !event) return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading nominations...</div>;

  return <div className="min-h-screen bg-background text-text-base"><PageTitle title="Admin nominations" style={{ color: palette?.primary }} /><main className="max-w-5xl mx-auto px-4 py-4 space-y-5"><select className="w-full rounded-md border border-surfaceBorder bg-white px-3 py-2" value={eventId} onChange={(e) => setEventId(e.target.value)}>{events.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.event_date}</option>)}</select><div className="flex flex-wrap gap-2">{["drivers", "classes", "requirements", "full", "export"].map((item) => <Button key={item} variant={tab === item ? "primary" : "secondary"} onClick={() => setTab(item)}>{item === "drivers" ? "Drivers" : item === "classes" ? "By class" : item === "requirements" ? "Requirements" : item === "full" ? "Full sheet" : "Export"}</Button>)}</div>
    {tab === "drivers" && <section className="space-y-3"><div className="flex justify-end"><select className="rounded-md border border-surfaceBorder bg-white px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Sort by driver</option><option value="class">Sort by class</option></select></div>{sortedDrivers.map(({ nomination, driver, entries: driverEntries }) => <Card key={nomination.id} className="space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{driver.first_name} {driver.last_name}</strong><span>{driver.permanent_number ? `#${driver.permanent_number}` : ""}</span></div><p className="text-sm text-text-muted">{Array.isArray(driver.sponsors) ? driver.sponsors.join(", ") : driver.sponsors || "No sponsor listed"}</p><p className="text-sm">{driverEntries.map((entry) => `${classMap.get(entry.class_id) || "Unknown class"}${entry.is_preference ? " (preference)" : ""}`).join(" · ")}</p></Card>)}</section>}
    {tab === "classes" && <section className="space-y-3">{Object.entries(classRows).sort(([a], [b]) => a.localeCompare(b)).map(([name, classDrivers]) => <Card key={name}><h2 className="font-semibold">{name}</h2><p className="mt-2 text-sm text-text-muted">{classDrivers.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)).map((driver) => `${driver.first_name} ${driver.last_name}`).join(" · ")}</p></Card>)}</section>}
    {tab === "requirements" && (
      <section className="space-y-3">
        {flatRequirements.length === 0 && (
          <Card>
            <p className="text-sm text-text-muted">No club requirements configured for this event.</p>
          </Card>
        )}

        {Object.values(
          flatRequirements.reduce((groups, requirement) => {
            if (!groups[requirement.requirementId]) {
              groups[requirement.requirementId] = {
                descriptor: requirement.descriptor,
                items: [],
              };
            }
            groups[requirement.requirementId].items.push(requirement);
            return groups;
          }, {})
        ).map((group) => (
          <Card key={group.items[0].requirementId} className="space-y-2">
            <div className="font-medium">{group.descriptor}</div>
            <div className="flex flex-col gap-2">
              {group.items.map((requirement) => (
                <label key={requirement.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!requirementTally[requirement.requirementId]}
                    readOnly
                  />
                  <span>{requirement.item}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </section>
    )}
    {tab === "full" && <div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="border-b border-surfaceBorder text-left"><th className="p-2">Driver</th><th className="p-2">Number</th><th className="p-2">Paid</th><th className="p-2">Classes</th><th className="p-2">Fee</th></tr></thead><tbody>{driverRows.map(({ nomination, driver, entries: driverEntries }) => <tr key={nomination.id} className="border-b border-surfaceBorder"><td className="p-2">{driver.first_name} {driver.last_name}</td><td className="p-2">{driver.permanent_number || ""}</td><td className="p-2"><button type="button" className="rounded-md border border-surfaceBorder px-2 py-1 text-xs" onClick={() => togglePaid(nomination)}>{nomination.paid ? "TRUE" : "FALSE"}</button></td><td className="p-2">{driverEntries.map((entry) => classMap.get(entry.class_id)).join(", ")}</td><td className="p-2">{nomination.total_fee ?? ""}</td></tr>)}</tbody></table></div>}
    {tab === "export" && <Card className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted">Preferences are excluded from this LiveTime export.</p><Button onClick={downloadCsv}>Download LiveTime CSV</Button></div><pre className="max-h-[480px] overflow-auto rounded-md bg-surfaceAlt p-3 text-xs whitespace-pre-wrap">{csv}</pre></Card>}
  </main></div>;
}
