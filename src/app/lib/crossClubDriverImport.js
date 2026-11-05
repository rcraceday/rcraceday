import { supabase } from "@/supabaseClient";
import { findDuplicateDriverNameInClub } from "@/app/lib/driverNameUniqueness";
import {
  applyNewDriverProfileDefaults,
  resolveDriverNumberRules,
} from "@/app/lib/driverClubSettings";
import { canAddHouseholdDriver } from "@/app/pages/profile/householdDriverLimits";

export function normalizeClassNameForMatch(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function suggestTargetClassId(sourceClassName, targetClasses) {
  const source = normalizeClassNameForMatch(sourceClassName);
  if (!source || !targetClasses?.length) return "";

  const exact = targetClasses.find(
    (c) => normalizeClassNameForMatch(c.name) === source
  );
  if (exact) return exact.id;

  const sourceTokens = source.split(" ").filter(Boolean);
  let best = null;
  let bestScore = 0;

  for (const candidate of targetClasses) {
    const target = normalizeClassNameForMatch(candidate.name);
    let score = 0;
    for (const token of sourceTokens) {
      if (target.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best && bestScore >= Math.min(2, sourceTokens.length)) {
    return best.id;
  }

  return "";
}

export async function fetchImportableDriversFromOtherClubs(targetClubId) {
  if (!targetClubId) return { drivers: [], error: null };

  const { data, error } = await supabase
    .from("drivers")
    .select(
      `
      id,
      club_id,
      first_name,
      last_name,
      is_junior,
      clubs ( name, slug ),
      driver_classes (
        id,
        class_id,
        track_id,
        transponder_number,
        club_classes ( name )
      )
    `
    )
    .neq("club_id", targetClubId)
    .order("last_name", { ascending: true });

  if (error) {
    console.warn("[crossClubDriverImport] load drivers", error);
    return { drivers: [], error: error.message };
  }

  return { drivers: data || [], error: null };
}

export async function fetchTargetClubClasses(clubId) {
  const { data, error } = await supabase
    .from("club_classes")
    .select("id, name, description")
    .eq("club_id", clubId)
    .order("name");

  if (error) {
    return { classes: [], error: error.message };
  }

  return { classes: data || [], error: null };
}

async function resolveTrackForClass(clubId, classId) {
  const { data: tracks } = await supabase
    .from("club_tracks")
    .select("id")
    .eq("club_id", clubId);

  const trackIds = (tracks || []).map((t) => t.id);
  if (!trackIds.length) return null;

  const { data: link } = await supabase
    .from("club_track_classes")
    .select("track_id")
    .eq("class_id", classId)
    .in("track_id", trackIds)
    .limit(1)
    .maybeSingle();

  return link?.track_id || trackIds[0] || null;
}

function sourceClassRows(sourceDriver) {
  return (sourceDriver?.driver_classes || []).map((row) => ({
    sourceDriverClassId: row.id,
    sourceClassName: row.club_classes?.name || "Class",
    transponder: String(row.transponder_number || "").trim(),
    sourceClassId: row.class_id,
  }));
}

export function buildInitialClassMappings(sourceDriver, targetClasses) {
  return sourceClassRows(sourceDriver).map((row) => ({
    ...row,
    targetClassId: suggestTargetClassId(row.sourceClassName, targetClasses),
    skip: false,
  }));
}

export async function filterAlreadyAtClub(drivers, clubId, club) {
  const available = [];
  for (const driver of drivers || []) {
    const { duplicate } = await findDuplicateDriverNameInClub({
      clubId,
      firstName: driver.first_name,
      lastName: driver.last_name,
      club,
    });
    if (!duplicate) available.push(driver);
  }
  return available;
}

export async function importDriverFromOtherClub({
  user,
  club,
  membership,
  membershipType,
  isNonMember,
  sourceDriver,
  classMappings,
  drivers,
  clubMembers,
  maxAdults,
  maxJuniors,
  householdRules,
}) {
  const trimmedFirst = String(sourceDriver.first_name || "").trim();
  const trimmedLast = String(sourceDriver.last_name || "").trim();
  const isJunior = !!sourceDriver.is_junior;

  if (!trimmedFirst || !trimmedLast) {
    return { ok: false, error: "missing_name" };
  }

  if (
    householdRules?.require_active_membership_to_add &&
    membership?.status &&
    membership.status !== "active"
  ) {
    return { ok: false, error: "membership_inactive" };
  }

  if (isNonMember && !householdRules?.allow_non_member_drivers) {
    return { ok: false, error: "non_member_not_allowed" };
  }

  if (
    !canAddHouseholdDriver({
      membershipType,
      isJunior,
      drivers,
      clubMembers,
      maxAdults,
      maxJuniors,
    })
  ) {
    return { ok: false, error: "household_limit" };
  }

  const { duplicate, error: dupErr } = await findDuplicateDriverNameInClub({
    clubId: club.id,
    firstName: trimmedFirst,
    lastName: trimmedLast,
    club,
  });

  if (dupErr) return { ok: false, error: "duplicate_check_failed" };
  if (duplicate) return { ok: false, error: "duplicate_name" };

  let newDriverId = null;

  if (isNonMember) {
    const { data: guestDriver, error: insertError } = await supabase
      .from("drivers")
      .insert({
        membership_id: null,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJunior,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) return { ok: false, error: insertError.message };
    newDriverId = guestDriver.id;
  } else {
    const { data: driver, error: insertError } = await supabase
      .from("drivers")
      .insert({
        membership_id: membership.id,
        club_id: club.id,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        is_junior: isJunior,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) return { ok: false, error: insertError.message };
    newDriverId = driver.id;

    await supabase.from("club_members").insert({
      membership_id: membership.id,
      club_id: club.id,
      driver_id: newDriverId,
      first_name: trimmedFirst,
      last_name: trimmedLast,
      is_junior: isJunior,
    });
  }

  await applyNewDriverProfileDefaults(supabase, newDriverId, club);

  const numberRules = resolveDriverNumberRules(club);
  if (numberRules.auto_reconcile_on_create) {
    await supabase.rpc("reconcile_driver_number", {
      p_club_id: club.id,
      p_driver_id: newDriverId,
      p_first_name: trimmedFirst,
      p_last_name: trimmedLast,
    });
  }

  const rowsToInsert = (classMappings || []).filter(
    (row) => !row.skip && row.targetClassId
  );

  for (const row of rowsToInsert) {
    const trackId = await resolveTrackForClass(club.id, row.targetClassId);
    const { error: classError } = await supabase.from("driver_classes").insert({
      driver_id: newDriverId,
      club_id: club.id,
      class_id: row.targetClassId,
      track_id: trackId,
      transponder_number: row.transponder || "",
    });

    if (classError) {
      console.warn("[crossClubDriverImport] class insert", classError);
      return { ok: false, error: classError.message, driverId: newDriverId };
    }
  }

  return { ok: true, driverId: newDriverId, error: null };
}

export function driverDisplayLabel(driver) {
  const name = `${driver.first_name || ""} ${driver.last_name || ""}`.trim();
  const clubName = driver.clubs?.name || "";
  return clubName ? `${name} (${clubName})` : name;
}
