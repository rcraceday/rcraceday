export function countHouseholdSlots(drivers = [], clubMembers = []) {
  const driverList = Array.isArray(drivers) ? drivers : [];
  const members = Array.isArray(clubMembers) ? clubMembers : [];

  const adults =
    driverList.filter((d) => !d.is_junior).length +
    members.filter((m) => !m.is_junior && !m.driver_id).length;

  const juniors =
    driverList.filter((d) => d.is_junior).length +
    members.filter((m) => m.is_junior && !m.driver_id).length;

  return { adults, juniors };
}

export function canAddHouseholdDriver({
  membershipType,
  isJunior,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
}) {
  if (!membershipType || membershipType === "non_member") return true;

  if (membershipType === "family") {
    const { adults, juniors } = countHouseholdSlots(drivers, clubMembers);
    if (isJunior) return juniors < maxJuniors;
    return adults < maxAdults;
  }

  return (drivers?.length ?? 0) === 0;
}

export function canShowAddDriverButton({
  membershipType,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
}) {
  if (!membershipType) return true;
  if (membershipType === "non_member") return true;

  if (membershipType === "family") {
    const { adults, juniors } = countHouseholdSlots(drivers, clubMembers);
    return adults < maxAdults || juniors < maxJuniors;
  }

  return (drivers?.length ?? 0) === 0;
}
