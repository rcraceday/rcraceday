import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function NominationsConfirmation() {
  const { clubSlug, eventId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  if (loading) return <div>{t("loading.loading")}</div>;

  return (
    <div className="page confirmation-page">
      <h1>{t("nominationsFlow.submittedTitle")}</h1>

      <div className="confirmation-box">
        <p>
          {t("nominationsFlow.submittedForEvent", { eventName: event?.event_name || "" })}
        </p>

        <p>{t("nominationsFlow.reviewAnytime")}</p>

        <p>{t("nominationsFlow.paymentAtVenue")}</p>
      </div>

      <button
        className="primary-button"
        onClick={() => navigate(`/${clubSlug}/events/${eventId}`)}
      >
        {t("nominationsFlow.backToEvent")}
      </button>

      <button
        className="secondary-button"
        onClick={() => navigate(`/${clubSlug}/dashboard`)}
      >
        {t("nominationsFlow.returnDashboard")}
      </button>
    </div>
  );
}
