// src/app/pages/events/EventDetailsSections/EventDetailsNominations.jsx

import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import {
  isLateEntryWindow,
  isNominationsOpen,
} from "../events-sections/helpers";
import { useTranslation } from "@/app/i18n/I18nContext";

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function now() {
  return new Date();
}

export default function EventDetailsNominations({ event, clubSlug, brand }) {
  const { t } = useTranslation();
  const nowTime = now();

  const open = event.nominations_open ? new Date(event.nominations_open) : null;
  const close = event.nominations_close ? new Date(event.nominations_close) : null;

  const canNominate = isNominationsOpen(event, nowTime);
  const nominationsNotOpenYet = open && nowTime < open;
  const lateWindowActive = isLateEntryWindow(event, nowTime);

  const lateClose =
    event.late_entries_enabled && event.late_entries_close
      ? new Date(event.late_entries_close)
      : null;

  const lateFee =
    event.late_entries_enabled && event.late_fee_activation
      ? new Date(event.late_fee_activation)
      : null;

  const lateFeeActive =
    event.late_entries_enabled &&
    lateFee &&
    nowTime >= lateFee;

  let buttonLabel = t("events.nominate");
  let buttonDisabled = !canNominate;

  if (nominationsNotOpenYet) {
    buttonLabel = t("events.nominationsNotOpen");
  } else if (!canNominate) {
    buttonLabel = t("events.nominationsClosed");
  } else if (lateWindowActive) {
    buttonLabel = t("events.lateNomination");
  }

  return (
    <div className="space-y-6 text-sm text-text-muted leading-tight">

      <div className="space-y-2">

        {open && (
          <p>
            <strong>{t("events.nominationsOpens")}</strong> {formatDateTime(open)}
          </p>
        )}

        {close && (
          <p>
            <strong>{t("events.nominationsCloses")}</strong> {formatDateTime(close)}
          </p>
        )}

        {event.late_entries_enabled && lateClose && (
          <p>
            <strong>{t("events.lateEntriesClose")}</strong> {formatDateTime(lateClose)}
          </p>
        )}

        {event.late_entries_enabled && lateFee && (
          <p>
            <strong>{t("events.lateFeeAppliesFrom")}</strong> {formatDateTime(lateFee)}
          </p>
        )}

        <p className="mt-2">
          <strong>{t("events.statusLabel")}</strong>{" "}
          {nominationsNotOpenYet && t("events.statusNotOpen")}
          {!nominationsNotOpenYet && canNominate && !lateWindowActive && t("events.statusOpen")}
          {!canNominate && !nominationsNotOpenYet && t("events.statusClosed")}
          {lateWindowActive && t("events.statusLateEntry")}
        </p>

        {lateFeeActive && (
          <p className="text-red-600 font-medium">
            {t("events.lateFeeAppliesNote")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">

        {buttonDisabled ? (
          <Button
            disabled
            className="w-full !py-2 !rounded-md font-semibold"
            style={{ backgroundColor: "#ccc", color: "#666", cursor: "not-allowed" }}
          >
            {buttonLabel}
          </Button>
        ) : (
          <Link to={`/${clubSlug}/app/events/${event.id}/nominate`} className="block w-full no-underline">
            <Button className="w-full !py-2 !rounded-md font-semibold" style={{ backgroundColor: brand, color: "white" }}>
              {buttonLabel}
            </Button>
          </Link>
        )}

        <Link to={`/${clubSlug}/app/events/${event.id}/nominations`} className="block w-full no-underline">
          <Button variant="secondary" className="w-full !py-2 !rounded-md font-semibold">
            {t("events.viewNominations")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
