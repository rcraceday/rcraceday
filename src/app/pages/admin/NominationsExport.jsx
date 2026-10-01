import { useEffect, useState } from "react"
import { supabase } from "@/supabaseClient"
import Header from "@/components/ui/Header"
import SectionHeader from "@/components/ui/SectionHeader"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Label from "@/components/ui/Label"
import useTheme from "@app/providers/useTheme"
import { useTranslation } from "@/app/i18n/I18nContext";

export default function NominationsExport() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { theme } = useTheme()

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date")
        .order("event_date", { ascending: false })

      if (error) {
        setError("Unable to load events.")
        return
      }

      setEvents(data || [])
    }

    loadEvents()
  }, [])

  const handleExport = async () => {
    if (!eventId) {
      setError("Please select an event.")
      return
    }

    setError("")
    setLoading(true)

    const { data, error } = await supabase
      .from("nominations")
      .select(
        `
        driver:drivers (
          first_name,
          last_name,
          driver_profiles (
            transponders
          )
        ),
        class:event_classes (
          name
        )
      `
      )
      .eq("event_id", eventId)

    if (error) {
      setError("Unable to load nominations.")
      setLoading(false)
      return
    }

    const rows = (data || []).map((row) => ({
      FirstName: row.driver?.first_name || "",
      LastName: row.driver?.last_name || "",
      ClassName: row.class?.name || "",
      TransponderNumber: row.driver?.driver_profiles?.transponders?.[0] || "",
      LocalMembershipType: "Local",
    }))

    const header = [
      "FirstName",
      "LastName",
      "ClassName",
      "TransponderNumber",
      "LocalMembershipType",
    ]

    const csvLines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.FirstName,
          r.LastName,
          r.ClassName,
          r.TransponderNumber,
          r.LocalMembershipType,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ]

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nominations_event_${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)

    setLoading(false)
  }

  return (
    <>
      <Header />

      <div className="px-5 mt-6">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: theme.colors.primary }}
        >
          Export Nominations for LiveTime
        </h1>
      </div>

      <div className="px-5 pb-10">
        {error && (
          <Card className="border border-red-700/50 bg-red-900/30 text-red-300 mb-6">
            <p className="text-sm">{error}</p>
          </Card>
        )}

        <SectionHeader title="Export Tools" />

        <Card className="space-y-5">
          <div>
            <Label>Select Event</Label>

            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="
                w-full rounded-lg
                bg-surface border border-gray-700
                px-4 py-3 text-sm text-white
                focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/40
              "
            >
              <option value="">-- Choose an event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.event_date})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            disabled={loading || !eventId}
            onClick={handleExport}
          >
            {loading ? "Exporting…" : "Download CSV"}
          </Button>
        </Card>
      </div>
    </>
  )
}
