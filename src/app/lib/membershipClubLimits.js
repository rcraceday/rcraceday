import { normalizeMembershipProductType } from "@/app/pages/profile/householdDriverLimits";

export const DEFAULT_MEMBERSHIP_TYPE_SEEDS = [
  {
    type_key: "adult",
    display_name: "Single Adult",
    enabled: true,
    max_household_adults: 1,
    max_household_juniors: 0,
    max_drivers: 1,
    access_driver_profiles: true,
    access_championship_points: true,
    discounted_racing: true,
    sort_order: 10,
  },
  {
    type_key: "junior",
    display_name: "Junior",
    enabled: true,
    max_household_adults: 0,
    max_household_juniors: 1,
    max_drivers: 1,
    access_driver_profiles: true,
    access_championship_points: true,
    discounted_racing: true,
    sort_order: 20,
  },
  {
    type_key: "family",
    display_name: "Family",
    enabled: true,
    max_household_adults: 2,
    max_household_juniors: 2,
    max_drivers: null,
    access_driver_profiles: true,
    access_championship_points: true,
    discounted_racing: true,
    sort_order: 30,
  },
  {
    type_key: "non_member",
    display_name: "Non-member",
    enabled: true,
    max_household_adults: 2,
    max_household_juniors: 2,
    max_drivers: null,
    access_driver_profiles: true,
    access_championship_points: false,
    discounted_racing: false,
    sort_order: 40,
  },
];

export function findMembershipTypeConfig(club, membershipType) {
  const configs = club?.membership_type_configs;
  if (!Array.isArray(configs) || configs.length === 0) return null;

  const normalized = normalizeMembershipProductType(membershipType);
  return (
    configs.find((row) => row.type_key === membershipType) ||
    configs.find((row) => normalizeMembershipProductType(row.type_key) === normalized) ||
    null
  );
}

export function resolveHouseholdLimits(club, membershipType) {
  const config = findMembershipTypeConfig(club, membershipType);
  const maxAdults =
    config?.max_household_adults ??
    club?.max_adults ??
    0;
  const maxJuniors =
    config?.max_household_juniors ??
    club?.max_juniors ??
    0;

  return {
    maxAdults: Number(maxAdults) || 0,
    maxJuniors: Number(maxJuniors) || 0,
    maxDrivers:
      config?.max_drivers != null ? Number(config.max_drivers) : null,
    accessDriverProfiles: config?.access_driver_profiles !== false,
    accessChampionshipPoints: config?.access_championship_points !== false,
  };
}

export function membershipHasFeature(club, membershipType, feature) {
  const limits = resolveHouseholdLimits(club, membershipType);
  if (feature === "driver_profiles") return limits.accessDriverProfiles;
  if (feature === "championship_points") return limits.accessChampionshipPoints;
  return true;
}
