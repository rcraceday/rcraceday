import {
  evaluateDriverProfileReadiness,
  resolveDriverNumberRules,
} from "@/app/lib/driverClubSettings";

export function driverNominationBlockReason(club, driver, driverClasses = [], t) {
  const tr = t || ((key) => key);
  const numberRules = resolveDriverNumberRules(club);

  if (
    numberRules.require_before_nominate &&
    (driver?.permanent_number == null || driver?.permanent_number === "")
  ) {
    const name = [driver?.first_name, driver?.last_name].filter(Boolean).join(" ");
    return tr("driverRules.needNumber", { name: name || tr("driverRules.thisDriver") });
  }

  const { ready, missing } = evaluateDriverProfileReadiness(
    club,
    driver,
    driverClasses
  );

  if (!ready) {
    const labels = missing.map((field) => tr(`admin.driverSettings.requiredField.${field}`));
    const name = [driver?.first_name, driver?.last_name].filter(Boolean).join(" ");
    return tr("driverRules.missingProfileFields", {
      name: name || tr("driverRules.thisDriver"),
      fields: labels.join(", "),
    });
  }

  return null;
}
