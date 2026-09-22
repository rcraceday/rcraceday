import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import useTheme from "@app/providers/useTheme";

export default function NominationsStart() {
  const { clubSlug, eventId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [drivers, setDrivers] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [event, setEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: household } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: driverRows } = await supabase
      .from("drivers")
      .select("*")
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
    setLoading(false);
  }

  function getPricingForDriver(driver) {
    const memberPrice = event?.member_price ?? 10;
    const nonMemberPrice = event?.non_member_price ?? 20;
    const juniorPrice = event?.junior_price ?? 0;

    if (driver.membership_type === "junior") return { perClass: juniorPrice };
    if (driver.membership_type === "single") return { perClass: memberPrice };
    if (driver.membership_type === "family") return { perClass: memberPrice };
    return { perClass: nonMemberPrice };
  }

  function getDriverEntries(driverId) {
    const driverNoms = nominations.filter((n) => n.driver_id === driverId);
    const nomIds = driverNoms.map((n) => n.id);

    const driverEntries = entries.filter((e) =>
      nomIds.includes(e.nomination_id)
    );

    const primary = driverEntries.filter((e) => !e.is_preference);
    const preference = driverEntries.find((e) => e.is_preference) || null;

    return { primary, preference, nominations: driverNoms };
  }

  function getClassName(classId) {
    const cls = classes.find((c) => c.class_id === classId);
    return cls?.event_classes?.class_name || "";
  }

  function calculateTotal(driver, primaryCount) {
    const { perClass } = getPricingForDriver(driver);
    return perClass * primaryCount;
  }

  function isDriverPaid(driverId) {
    const driverNoms = nominations.filter((n) => n.driver_id === driverId);
    if (driverNoms.length === 0) return false;
    return driverNoms.some((n) => n.paid === true);
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "1rem" }}>
        <p style={{ opacity: 0.7 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "1rem" }}>
      
      {/* PAGE TITLE */}
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "700",
          marginBottom: "1.5rem",
          color: theme?.textColor || "#000",
        }}
      >
        Nominations
      </h1>

      {/* DRIVER LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {drivers.map((driver) => {
          const { primary, preference } = getDriverEntries(driver.id);
          const total = calculateTotal(driver, primary.length);
          const paid = isDriverPaid(driver.id);

return (
            <div
              key={driver.id}
              onClick={() =>
                navigate(`/${clubSlug}/nominations/${eventId}/select-class/${driver.id}`)
              }
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.25rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              }}
            >
              {/* DRIVER NAME + STATUS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                  {driver.first_name} {driver.last_name}
                </div>

                {paid ? (
                  <span
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "20px",
                      background: "#2e7d32",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Paid
                  </span>
                ) : primary.length > 0 ? (
                  <span
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "20px",
                      background: theme?.headerBackground || "#000",
                      color: theme?.headerTextColor || "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Nominated
                  </span>
                ) : (
                  <span
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "20px",
                      background: "#ddd",
                      color: "#555",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Not Started
                  </span>
                )}
              </div>

              {/* CLASSES */}
              <div style={{ marginBottom: "0.5rem" }}>
                {primary.map((e) => (
                  <div key={e.id} style={{ opacity: 0.85, fontSize: "0.9rem" }}>
                    {getClassName(e.class_id)}
                  </div>
                ))}

                {preference && (
                  <div
                    style={{
                      opacity: 0.85,
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                    }}
                  >
                    {getClassName(preference.class_id)} (Preference)
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>
                Total: ${total}
              </div>
            </div>
          );
        })}
      </div>

{/* REVIEW BUTTON */}
{entries.length > 0 && (
  <button
    onClick={() => navigate(`/${clubSlug}/nominations/${eventId}/review`)}
    style={{
      width: "100%",
      marginTop: "1.5rem",
      padding: "0.9rem",
      borderRadius: "10px",
      fontWeight: "600",
      background: theme?.headerBackground || "#000",
      color: theme?.headerTextColor || "#fff",
    }}
  >
          Review & Submit
        </button>
      )}
    </div>
  );
}
