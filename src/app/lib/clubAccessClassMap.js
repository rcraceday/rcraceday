import { supabase } from "@/supabaseClient";
import {
  buildInitialClassMappings,
  fetchImportableDriversFromOtherClubs,
  fetchTargetClubClasses,
  resolveTrackForClass,
} from "@/app/lib/crossClubDriverImport";
import {
  driverClassTransponderUpdatePayload,
  isMissingUserTranspondersTable,
} from "@/app/lib/userTransponders";

function namesMatch(a, b) {
  const fn = (row) => String(row?.first_name || "").trim().toLowerCase();
  const ln = (row) => String(row?.last_name || "").trim().toLowerCase();
  return fn(a) === fn(b) && ln(a) === ln(b) && !!a?.is_junior === !!b?.is_junior;
}

function matchSourceDriver(localDriver, otherDrivers) {
  if (localDriver?.platform_person_id) {
    const byPerson = otherDrivers.find(
      (row) => row.platform_person_id === localDriver.platform_person_id
    );
    if (byPerson) return byPerson;
  }
  return otherDrivers.find((row) => namesMatch(localDriver, row)) || null;
}

export async function loadClubAccessClassMap({ clubId, driversAtClub }) {
  const local = Array.isArray(driversAtClub) ? driversAtClub.filter((d) => d?.id) : [];
  if (!clubId || !local.length) {
    return { groups: [], targetClasses: [] };
  }

  const [{ classes: targetClasses }, { drivers: otherDrivers }] = await Promise.all([
    fetchTargetClubClasses(clubId),
    fetchImportableDriversFromOtherClubs(clubId),
  ]);

  const groups = [];
  for (const driver of local) {
    const { data: existing } = await supabase
      .from("driver_classes")
      .select("class_id")
      .eq("driver_id", driver.id);
    const existingIds = new Set((existing || []).map((row) => row.class_id));

    const source = matchSourceDriver(driver, otherDrivers || []);
    const mappings = (source
      ? buildInitialClassMappings(source, targetClasses || [])
      : []
    ).filter((row) => !row.targetClassId || !existingIds.has(row.targetClassId));

    if (!mappings.length) continue;

    groups.push({
      driverId: driver.id,
      name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver",
      mappings,
    });
  }

  return { groups, targetClasses: targetClasses || [] };
}

export async function saveClubAccessClassMap({ clubId, groups, inventoryRows = [] }) {
  for (const group of groups || []) {
    for (const row of group.mappings || []) {
      if (row.skip || !row.targetClassId) continue;

      const trackId = await resolveTrackForClass(clubId, row.targetClassId);
      const payload = driverClassTransponderUpdatePayload(row.transponder || "", inventoryRows);
      const insert = {
        driver_id: group.driverId,
        club_id: clubId,
        class_id: row.targetClassId,
        track_id: trackId,
        transponder_number: payload.transponder_number,
      };
      if (payload.user_transponder_id) {
        insert.user_transponder_id = payload.user_transponder_id;
      }

      const { error } = await supabase.from("driver_classes").insert(insert);
      if (error && insert.user_transponder_id && isMissingUserTranspondersTable(error)) {
        delete insert.user_transponder_id;
        const retry = await supabase.from("driver_classes").insert(insert);
        if (retry.error) {
          return { ok: false, error: retry.error.message };
        }
        continue;
      }
      if (error) {
        const missingFk = String(error.message || "").includes("user_transponder_id");
        if (missingFk && insert.user_transponder_id) {
          delete insert.user_transponder_id;
          const retry = await supabase.from("driver_classes").insert(insert);
          if (retry.error) return { ok: false, error: retry.error.message };
          continue;
        }
        return { ok: false, error: error.message };
      }
    }
  }

  return { ok: true, error: null };
}
