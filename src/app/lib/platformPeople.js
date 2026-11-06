export function normalizePersonNamePart(value) {
  return String(value ?? "").trim();
}

export function isMissingPlatformPeopleTable(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("platform_people") &&
    (msg.includes("does not exist") || msg.includes("could not find"))
  );
}

function isMissingDriversPlatformPersonIdColumn(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return msg.includes("platform_person_id") && msg.includes("column");
}

export async function ensurePlatformPersonForDriver(
  client,
  { userId, firstName, lastName, isJunior }
) {
  const first = normalizePersonNamePart(firstName);
  const last = normalizePersonNamePart(lastName);
  if (!userId || !first || !last) {
    return { platformPersonId: null, error: null, skipped: true };
  }

  const j = !!isJunior;

  const { data: existing, error: findError } = await client
    .from("platform_people")
    .select("id")
    .eq("user_id", userId)
    .eq("first_name", first)
    .eq("last_name", last)
    .eq("is_junior", j)
    .maybeSingle();

  if (findError) {
    if (isMissingPlatformPeopleTable(findError)) {
      return { platformPersonId: null, error: null, skipped: true };
    }
    return { platformPersonId: null, error: findError };
  }

  if (existing?.id) {
    return { platformPersonId: existing.id, error: null };
  }

  const { data: created, error: insertError } = await client
    .from("platform_people")
    .insert({
      user_id: userId,
      first_name: first,
      last_name: last,
      is_junior: j,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: again } = await client
        .from("platform_people")
        .select("id")
        .eq("user_id", userId)
        .eq("first_name", first)
        .eq("last_name", last)
        .eq("is_junior", j)
        .maybeSingle();
      if (again?.id) return { platformPersonId: again.id, error: null };
    }
    if (isMissingPlatformPeopleTable(insertError)) {
      return { platformPersonId: null, error: null, skipped: true };
    }
    return { platformPersonId: null, error: insertError };
  }

  return { platformPersonId: created?.id ?? null, error: null };
}

/**
 * Attach a new or existing roster row to a driver (Phase 2). No-op if schema not migrated.
 */
export async function linkDriverToPlatformPerson(client, props) {
  const { driverId, userId, firstName, lastName, isJunior } = props;
  if (!driverId || !userId) return { error: null, skipped: true };

  const { platformPersonId, error, skipped } = await ensurePlatformPersonForDriver(client, {
    userId,
    firstName,
    lastName,
    isJunior,
  });

  if (skipped || error || !platformPersonId) {
    return { error: error ?? null, skipped: true };
  }

  return linkDriverToPlatformPersonId(client, { driverId, platformPersonId });
}

/** Prefer this when the roster row already exists (e.g. welcome “add from account”). */
export async function linkDriverToPlatformPersonId(client, { driverId, platformPersonId }) {
  if (!driverId || !platformPersonId) return { error: null, skipped: true };

  const { error: updError } = await client
    .from("drivers")
    .update({ platform_person_id: platformPersonId })
    .eq("id", driverId);

  if (updError && isMissingDriversPlatformPersonIdColumn(updError)) {
    return { error: null, skipped: true };
  }

  return { error: updError ?? null };
}
