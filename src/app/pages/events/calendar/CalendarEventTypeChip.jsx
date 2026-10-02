import { EVENT_TYPE_COLORS } from "./calendarHelpers";
import { TYPE_LABELS } from "../events-sections/helpers";
import { useTranslation } from "@/app/i18n/I18nContext";

const typeLabelKeys = {
  racing: "events.typeRacing",
  practice: "events.typePractice",
  club_meet: "events.typeClubMeet",
  championship_round: "events.typeChampionshipRound",
  state_titles: "events.typeStateTitles",
  national_titles: "events.typeNationalTitles",
};

export default function CalendarEventTypeChip({ eventType }) {
  const { t } = useTranslation();
  const type = (eventType || "").toLowerCase();
  if (!type) return null;

  const label = typeLabelKeys[type]
    ? t(typeLabelKeys[type])
    : TYPE_LABELS[type] || type.replace(/_/g, " ");

  const color = EVENT_TYPE_COLORS[type] || "#374151";

  return (
    <span
      className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{
        color,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  );
}
