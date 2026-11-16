import useTheme from "@/app/providers/useTheme";
import { TYPE_LABELS } from "../events-sections/helpers";
import { useTranslation } from "@/app/i18n/I18nContext";
import { eventTypeChipClassName, eventTypeUsesClubPrimary } from "./eventTypeChipStyles";

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
  const { palette } = useTheme();
  const type = (eventType || "").toLowerCase();
  if (!type) return null;

  const label = typeLabelKeys[type]
    ? t(typeLabelKeys[type])
    : TYPE_LABELS[type] || type.replace(/_/g, " ");

  const primaryColor = palette?.primary || "#2563eb";
  const usePrimary = eventTypeUsesClubPrimary(type);
  const toneClass = eventTypeChipClassName(type);

  return (
    <span
      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${toneClass}`}
      style={
        usePrimary
          ? {
              color: primaryColor,
              backgroundColor: `color-mix(in srgb, ${primaryColor} 12%, white)`,
              borderColor: `color-mix(in srgb, ${primaryColor} 35%, white)`,
            }
          : undefined
      }
    >
      {label}
    </span>
  );
}