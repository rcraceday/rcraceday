import ResultsTableSection, {
  ResultsDataTable,
  PositionCell,
} from "@/app/pages/events/results/ResultsTableSection";

function roundEntry(row, eventId) {
  return (row.rounds || []).find((item) => item.eventId === eventId) || null;
}

function isDroppedRound(row, eventId) {
  return (row.dropped || []).some((item) => item.eventId === eventId);
}

export default function ChampionshipRoundPointsTable({
  standings,
  rounds,
  dropRounds = 0,
  t,
  rowClass,
  action = null,
}) {
  return (
    <div className="space-y-2">
      <ResultsTableSection title={t("results.championshipRoundPoints")} action={action}>
        <ResultsDataTable className="text-xs sm:text-sm">
          <thead>
            <tr>
              <th className="my-results-th">{t("results.pos")}</th>
              <th className="my-results-th">{t("results.driver")}</th>
              {(rounds || []).map((round, index) => (
                <th
                  key={round.eventId}
                  className="my-results-th text-right"
                  title={round.eventName || ""}
                >
                  {t("results.championshipRoundN", { n: index + 1 })}
                </th>
              ))}
              <th className="my-results-th text-right">{t("results.points")}</th>
            </tr>
          </thead>
          <tbody>
            {(standings || []).map((row) => (
              <tr key={row.key} className={rowClass(row)}>
                <PositionCell value={row.rank} />
                <td className="py-2 pr-2 font-medium whitespace-nowrap">{row.driverName}</td>
                {(rounds || []).map((round) => {
                  const scored = roundEntry(row, round.eventId);
                  const dropped = isDroppedRound(row, round.eventId);
                  return (
                    <td
                      key={round.eventId}
                      className="py-2 pl-2 tabular-nums text-right whitespace-nowrap"
                    >
                      {scored == null ? (
                        "—"
                      ) : (
                        <span
                          className={dropped ? "line-through text-text-muted" : ""}
                          title={
                            dropped
                              ? t("results.championshipDroppedScore")
                              : round.eventName || ""
                          }
                        >
                          {scored.points}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 pl-2 tabular-nums font-semibold text-right whitespace-nowrap">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </ResultsDataTable>
      </ResultsTableSection>
      {dropRounds > 0 ? (
        <p className="text-[11px] text-text-muted m-0 px-1">
          {t("results.championshipDroppedHint")}
        </p>
      ) : null}
    </div>
  );
}
