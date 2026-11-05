export function pickHouseholdMembership(rows) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : rows ? [rows] : [];
  if (!list.length) return null;
  return (
    list.find((row) => row.membership_type && row.membership_type !== "non_member") ||
    list[0]
  );
}

export function withMembershipFlags(row) {
  if (!row) return null;
  return {
    ...row,
    isMember: !!(row.membership_type && row.membership_type !== "non_member"),
  };
}
