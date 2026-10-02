const PROFILE_SECTION_KEYS = [
  "basic",
  "colors_number",
  "personal",
  "racing",
  "on_road",
  "off_road",
  "experience",
  "trivia_sponsors",
];

export const NOMINATE_REQUIRED_FIELD_KEYS = [
  "permanent_number",
  "primary_color",
  "secondary_color",
  "gender",
  "country",
  "manufacturer",
  "transponder",
];

export const DEFAULT_DRIVER_SETTINGS = {
  household: {
    non_driver_members: "family_only",
    allow_member_delete_drivers: true,
    require_active_membership_to_add: true,
    allow_non_member_drivers: true,
  },
  naming: {
    unique_name_per_club: true,
    warn_on_name_change: true,
    name_change_notice_body: "",
    allow_nickname_in_directory: true,
    lock_name_after_first_nomination: false,
  },
  numbers: {
    members_can_choose: true,
    require_before_nominate: false,
    members_can_change_after_assign: true,
    auto_reconcile_on_create: true,
  },
  profile: {
    enabled_sections: PROFILE_SECTION_KEYS.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}),
    required_before_nominate: [],
    require_transponder_per_class: false,
    default_directory_visibility: "opt_out",
  },
  directory: {
    enabled: true,
    audience: "members_only",
    show_juniors: true,
  },
  juniors: {
    mode: "manual_checkbox",
    cutoff_birth_year: null,
  },
  livetime: {
    club_name_override: "",
    show_profile_field_hints: true,
  },
};

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function mergeSection(defaults, raw) {
  if (!isObject(raw)) return { ...defaults };
  return { ...defaults, ...raw };
}

export function mergeDriverSettings(raw) {
  const source = isObject(raw) ? raw : {};
  const defaultSections = DEFAULT_DRIVER_SETTINGS.profile.enabled_sections;
  const rawSections = isObject(source.profile?.enabled_sections)
    ? source.profile.enabled_sections
    : {};

  const enabled_sections = { ...defaultSections };
  for (const key of PROFILE_SECTION_KEYS) {
    if (rawSections[key] !== undefined) {
      enabled_sections[key] = rawSections[key] !== false;
    }
  }

  const required = Array.isArray(source.profile?.required_before_nominate)
    ? source.profile.required_before_nominate.filter((k) =>
        NOMINATE_REQUIRED_FIELD_KEYS.includes(k)
      )
    : DEFAULT_DRIVER_SETTINGS.profile.required_before_nominate;

  return {
    household: mergeSection(DEFAULT_DRIVER_SETTINGS.household, source.household),
    naming: mergeSection(DEFAULT_DRIVER_SETTINGS.naming, source.naming),
    numbers: mergeSection(DEFAULT_DRIVER_SETTINGS.numbers, source.numbers),
    profile: {
      ...mergeSection(DEFAULT_DRIVER_SETTINGS.profile, source.profile),
      enabled_sections,
      required_before_nominate: required,
    },
    directory: mergeSection(DEFAULT_DRIVER_SETTINGS.directory, source.directory),
    juniors: mergeSection(DEFAULT_DRIVER_SETTINGS.juniors, source.juniors),
    livetime: mergeSection(DEFAULT_DRIVER_SETTINGS.livetime, source.livetime),
  };
}

export function getDriverSettings(club) {
  return mergeDriverSettings(club?.driver_settings);
}

export function resolveDriverNamingRules(club) {
  return getDriverSettings(club).naming;
}

export function resolveDriverNumberRules(club) {
  return getDriverSettings(club).numbers;
}

export function resolveDriverHouseholdRules(club) {
  return getDriverSettings(club).household;
}

export function resolveDriverProfilePolicy(club) {
  return getDriverSettings(club).profile;
}

export function resolveDriverDirectoryRules(club) {
  return getDriverSettings(club).directory;
}

export function resolveDriverJuniorRules(club) {
  return getDriverSettings(club).juniors;
}

export function resolveLiveTimeDriverRules(club) {
  return getDriverSettings(club).livetime;
}

export function liveTimeClubName(club) {
  const override = (getDriverSettings(club).livetime.club_name_override || "").trim();
  if (override) return override;
  return club?.name || club?.display_name || "";
}

export function isProfileSectionEnabled(club, sectionKey) {
  const policy = resolveDriverProfilePolicy(club);
  return policy.enabled_sections?.[sectionKey] !== false;
}

function hasValue(field, driver) {
  if (!driver) return false;
  switch (field) {
    case "permanent_number":
      return driver.permanent_number != null && driver.permanent_number !== "";
    case "primary_color":
      return Boolean((driver.primary_color || "").trim());
    case "secondary_color":
      return Boolean((driver.secondary_color || "").trim());
    case "gender":
      return Boolean((driver.gender || "").trim());
    case "country":
      return Boolean((driver.country || "").trim());
    case "manufacturer":
      return Boolean((driver.manufacturer || "").trim());
    case "transponder": {
      const classes = driver.driver_classes || driver._driverClasses || [];
      if (!Array.isArray(classes) || classes.length === 0) return false;
      return classes.some((row) => (row.transponder_number || "").trim());
    }
    default:
      return true;
  }
}

export function evaluateDriverProfileReadiness(club, driver, driverClasses = []) {
  const policy = resolveDriverProfilePolicy(club);
  const required = policy.required_before_nominate || [];
  const mergedDriver =
    driverClasses?.length > 0 ? { ...driver, driver_classes: driverClasses } : driver;

  const missing = required.filter((field) => !hasValue(field, mergedDriver));

  if (policy.require_transponder_per_class && Array.isArray(driverClasses)) {
    const missingXp = driverClasses.some(
      (row) => !(row.transponder_number || "").trim()
    );
    if (missingXp && !missing.includes("transponder")) {
      missing.push("transponder");
    }
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function suggestJuniorFromBirthYear(yearOfBirth, cutoffBirthYear) {
  if (yearOfBirth == null || cutoffBirthYear == null) return null;
  const yob = Number(yearOfBirth);
  const cutoff = Number(cutoffBirthYear);
  if (Number.isNaN(yob) || Number.isNaN(cutoff)) return null;
  return yob >= cutoff;
}

export function showNonDriverMemberOption(club, membershipType, isNonMember) {
  if (isNonMember) return false;
  const mode = resolveDriverHouseholdRules(club).non_driver_members || "family_only";
  if (mode === "off") return false;
  if (mode === "all_member_types") return true;
  return membershipType === "family";
}

export async function applyNewDriverProfileDefaults(supabaseClient, driverId, club) {
  if (!driverId || !supabaseClient) return;
  const policy = resolveDriverProfilePolicy(club);
  const visible = policy.default_directory_visibility === "opt_in";
  const { error } = await supabaseClient.from("driver_profiles").upsert(
    { driver_id: driverId, visible_in_directory: visible },
    { onConflict: "driver_id" }
  );
  if (error) {
    console.warn("applyNewDriverProfileDefaults:", error.message);
  }
}
