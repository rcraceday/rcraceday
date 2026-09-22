import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function NominationsConfirmation() {
  const { clubSlug, eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, []);

  async function loadEvent() {
    setLoading(true);

    const { data: eventRow } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    setEvent(eventRow || null);
    setLoading(false);
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="page confirmation-page">
      <h1>Nominations Submitted</h1>

      <div className="confirmation-box">
        <p>
          Your nominations for <strong>{event.event_name}</strong> have been
          successfully submitted.
        </p>

        <p>
          You can return at any time to review or update your nominations before
          the event closes.
        </p>

        <p>
          If payment is required, please complete it at the venue or through the
          club’s normal payment process.
        </p>
      </div>

<button
  className="primary-button"
  onClick={() => navigate(`/${clubSlug}/events/${eventId}`)}
>
  Back to Event
</button>

<button
  className="secondary-button"
  onClick={() => navigate(`/${clubSlug}/dashboard`)}
>
  Return to Dashboard
</button>
</div>
);
}
