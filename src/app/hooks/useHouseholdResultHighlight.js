import { useMemo } from "react";
import { useDrivers } from "@/app/providers/DriverProvider";
import {
  buildHouseholdDriverNameKeys,
  isHouseholdResultRow,
  isCompareDriver,
  resultsTableRowClass,
} from "@/app/lib/results/resultsRowHighlight";

export function useHouseholdResultHighlight() {
  const { drivers } = useDrivers();
  return useMemo(() => {
    const driverIds = new Set((drivers || []).map((d) => d.id));
    const driverNameKeys = buildHouseholdDriverNameKeys(drivers);
    return {
      driverIds,
      driverNameKeys,
      isMyRow: (row) => isHouseholdResultRow(row, driverIds, driverNameKeys),
      rowClass: (row, compareDriver = "") =>
        resultsTableRowClass({
          isMe: isHouseholdResultRow(row, driverIds, driverNameKeys),
          isCompare: isCompareDriver(row, compareDriver),
        }),
    };
  }, [drivers]);
}