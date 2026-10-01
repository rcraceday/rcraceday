/**
 * Seed drivers (LiveTime spelling) onto households using Jotform registration for email/name matching.
 *
 * Does not change membership dates/settings on existing households unless you create a new one.
 *
 *   set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/import-livetime-membership-roster.mjs --club-slug chargers-rc \
 *     --registration src/assets/2026_Membership_Registration....xlsx \
 *     --livetime path/to/livetime-drivers.csv \
 *     --dry-run
 *
 * LiveTime CSV: FirstName + LastName columns (app export), or Driver Name, or two columns without header.
 *
 * --create-missing-households  Insert household_memberships for registration emails not in DB yet.
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRegistrationIndex, loadJotformRows, mapMembershipType } from "./lib/jotformRegistration.mjs";
import { loadLiveTimeDrivers } from "./lib/livetimeCsv.mjs";
import { matchLiveTimeToRegistration, normalizeParts } from "./lib/rosterMatch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function usage() {
  console.error(`
Usage:
  node scripts/import-livetime-membership-roster.mjs --club-slug <slug> --livetime <drivers.csv>
    [--registration <jotform.xlsx>] [--create-missing-households] [--dry-run]

Default registration:
  src/assets/2026_Membership_Registration2026-10-01_00_21_32.xlsx
`);
}

function parseArgs(argv) {
  const out = {
    clubSlug: "",
    livetime: "",
    registration: "",
    dryRun: false,
    createMissingHouseholds: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--create-missing-households") out.createMissingHouseholds = true;
    else if (arg === "--club-slug") out.clubSlug = argv[++i] || "";
    else if (arg === "--livetime") out.livetime = argv[++i] || "";
    else if (arg === "--registration") out.registration = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
  }
  if (!out.registration) {
    out.registration = join(
      __dirname,
      "..",
      "src",
      "assets",
      "2026_Membership_Registration2026-10-01_00_21_32.xlsx"
    );
  }
  return out;
}

function nameKey(first, last) {
  return `${String(first || "").trim().toLowerCase()}|${String(last || "").trim().toLowerCase()}`;
}

async function syncDriverToClubMember(supabase, membershipId, driver, dryRun) {
  const { data: members = [] } = await supabase
    .from("club_members")
    .select("id, driver_id, first_name, last_name")
    .eq("membership_id", membershipId);

  const key = nameKey(driver.first_name, driver.last_name);
  const linked = members.find((m) => m.driver_id === driver.id);
  if (linked) return { action: "member_ok" };

  const byName = members.find(
    (m) => !m.driver_id && nameKey(m.first_name, m.last_name) === key
  );
  if (byName) {
    if (dryRun) return { action: "would_link_member" };
    const { error } = await supabase
      .from("club_members")
      .update({
        driver_id: driver.id,
        first_name: driver.first_name,
        last_name: driver.last_name,
        is_junior: !!driver.is_junior,
      })
      .eq("id", byName.id);
    if (error) throw error;
    return { action: "linked_member" };
  }

  if (dryRun) return { action: "would_add_member" };
  const { error } = await supabase.from("club_members").insert({
    membership_id: membershipId,
    driver_id: driver.id,
    first_name: driver.first_name,
    last_name: driver.last_name,
    is_junior: !!driver.is_junior,
    is_life_member: false,
  });
  if (error) throw error;
  return { action: "added_member" };
}

async function ensureDriver(supabase, clubId, membershipId, person, liveTimeName, dryRun) {
  const first = liveTimeName.first_name.trim();
  const last = liveTimeName.last_name.trim();

  const { data: existing } = await supabase
    .from("drivers")
    .select("id, membership_id, first_name, last_name, is_junior")
    .eq("club_id", clubId)
    .eq("first_name", first)
    .eq("last_name", last);

  if (existing?.length) {
    const driver = existing[0];
    if (driver.membership_id !== membershipId) {
      if (dryRun) return { driver, action: "would_link_membership" };
      const { error } = await supabase
        .from("drivers")
        .update({ membership_id: membershipId, is_junior: !!person.is_junior })
        .eq("id", driver.id);
      if (error) throw error;
      driver.membership_id = membershipId;
      driver.is_junior = !!person.is_junior;
      return { driver, action: "linked_membership" };
    }
    return { driver, action: "exists" };
  }

  if (dryRun) {
    return {
      driver: { id: "dry-run", first_name: first, last_name: last, is_junior: person.is_junior },
      action: "would_create_driver",
    };
  }

  const { data: created, error } = await supabase
    .from("drivers")
    .insert({
      club_id: clubId,
      membership_id: membershipId,
      first_name: first,
      last_name: last,
      is_junior: !!person.is_junior,
    })
    .select("id, first_name, last_name, is_junior")
    .single();
  if (error) throw error;
  return { driver: created, action: "created_driver" };
}

async function resolveHouseholdId(supabase, clubId, email, regRow, createMissing, dryRun) {
  const { data: existing, error } = await supabase
    .from("household_memberships")
    .select("id, email")
    .eq("club_id", clubId)
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  if (existing?.id) return existing.id;

  if (!createMissing) return null;

  const payload = {
    club_id: clubId,
    email,
    primary_first_name: regRow.primary_first_name || "",
    primary_last_name: regRow.primary_last_name || "",
    membership_type: mapMembershipType(regRow.membership_type_raw),
    status: "active",
  };

  if (dryRun) return "dry-run-new-household";

  const { data: created, error: insertError } = await supabase
    .from("household_memberships")
    .insert(payload)
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!url || !serviceKey) {
    console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!args.clubSlug || !args.livetime) {
    usage();
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .eq("slug", args.clubSlug)
    .maybeSingle();
  if (clubError || !club) {
    console.error("Club not found:", args.clubSlug);
    process.exit(1);
  }

  const regRows = loadJotformRows(args.registration);
  const { byEmail, allPeople } = buildRegistrationIndex(regRows);
  const liveTimeDrivers = loadLiveTimeDrivers(args.livetime);

  console.log(`Club: ${club.name}`);
  console.log(`Registration rows: ${regRows.length}`);
  console.log(`LiveTime drivers (unique): ${liveTimeDrivers.length}`);
  if (args.dryRun) console.log("DRY RUN\n");

  const stats = {
    matched: 0,
    unmatchedLiveTime: [],
    driversCreated: 0,
    driversLinked: 0,
    householdsCreated: 0,
    membersSynced: 0,
    skippedNoHousehold: 0,
    errors: 0,
  };

  const matchedRegistrationKeys = new Set();

  for (const lt of liveTimeDrivers) {
    const person = matchLiveTimeToRegistration(lt, allPeople);
    if (!person) {
      stats.unmatchedLiveTime.push(`${lt.first_name} ${lt.last_name}`.trim());
      continue;
    }
    stats.matched += 1;
    matchedRegistrationKeys.add(
      `${person.email}|${normalizeParts(person.first_name, person.last_name)}`
    );

    const bundle = byEmail.get(person.email);
    const regRow = bundle?.row;
    if (!regRow) continue;

    try {
      const membershipId = await resolveHouseholdId(
        supabase,
        club.id,
        person.email,
        regRow,
        args.createMissingHouseholds,
        args.dryRun
      );

      if (!membershipId) {
        stats.skippedNoHousehold += 1;
        console.warn(`No household for ${person.email} — ${lt.first_name} ${lt.last_name} (use --create-missing-households)`);
        continue;
      }
      if (membershipId === "dry-run-new-household") {
        stats.householdsCreated += 1;
        console.log(`Would create household ${person.email}`);
      } else if (args.createMissingHouseholds && !args.dryRun) {
        // created in resolveHouseholdId only on insert path
      }

      const { driver, action } = await ensureDriver(
        supabase,
        club.id,
        membershipId === "dry-run-new-household" ? null : membershipId,
        person,
        lt,
        args.dryRun
      );

      if (action === "created_driver" || action === "would_create_driver") stats.driversCreated += 1;
      if (action === "linked_membership" || action === "would_link_membership") stats.driversLinked += 1;

      if (membershipId && membershipId !== "dry-run-new-household" && driver?.id && driver.id !== "dry-run") {
        const memberResult = await syncDriverToClubMember(supabase, membershipId, driver, args.dryRun);
        if (memberResult.action !== "member_ok") stats.membersSynced += 1;
      }

      console.log(
        `${lt.first_name} ${lt.last_name} → ${person.email} [${action}]`
      );
    } catch (err) {
      stats.errors += 1;
      console.error(`Error ${lt.first_name} ${lt.last_name}:`, err.message || err);
    }
  }

  const unmatchedReg = [];
  for (const person of allPeople) {
    const key = `${person.email}|${normalizeParts(person.first_name, person.last_name)}`;
    if (!matchedRegistrationKeys.has(key)) {
      unmatchedReg.push(
        `${person.first_name} ${person.last_name} (${person.email})${person.is_junior ? " junior" : ""}`
      );
    }
  }

  console.log("\n--- Summary ---");
  console.log(stats);
  if (stats.unmatchedLiveTime.length) {
    console.log("\nLiveTime names not matched to registration (fix sheet or add alias):");
    stats.unmatchedLiveTime.forEach((n) => console.log(`  ? ${n}`));
  }
  if (unmatchedReg.length) {
    console.log("\nOn registration but not in LiveTime file (no driver created):");
    unmatchedReg.slice(0, 40).forEach((n) => console.log(`  - ${n}`));
    if (unmatchedReg.length > 40) console.log(`  ... and ${unmatchedReg.length - 40} more`);
  }

  if (stats.errors) process.exit(1);
}

main();
