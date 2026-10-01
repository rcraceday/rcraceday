/**
 * Import household_memberships export CSV into Supabase.
 *
 * Spreadsheet-only columns (secondary_*, junior_*_*) are synced to club_members,
 * not stored on household_memberships.
 *
 *   set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/import-household-csv.mjs --dry-run
 *   node scripts/import-household-csv.mjs --file src/assets/household_memberships_rows_Oct_2026.csv
 *
 * Options:
 *   --create-drivers   Also create drivers + link club_members.driver_id (LiveTime names = member names)
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadCsvObjects } from "./lib/csvTable.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const HOUSEHOLD_COLUMNS = new Set([
  "id",
  "user_id",
  "status",
  "start_date",
  "end_date",
  "membership_type",
  "duration",
  "primary_first_name",
  "primary_last_name",
  "email",
  "mobile",
  "street_address",
  "city",
  "state",
  "post_code",
  "payment_method",
  "transaction_id",
  "amount_paid",
  "preferred_number",
  "club_id",
  "is_life_member",
]);

const SPREADSHEET_ONLY = [
  "secondary_first_name",
  "secondary_last_name",
  "junior_a_first_name",
  "junior_a_last_name",
  "junior_b_first_name",
  "junior_b_last_name",
  "junior_c_first_name",
  "junior_c_last_name",
];

function parseArgs(argv) {
  const out = {
    file: join(__dirname, "..", "src", "assets", "household_memberships_rows_Oct_2026.csv"),
    dryRun: false,
    createDrivers: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--create-drivers") out.createDrivers = true;
    else if (arg === "--file") out.file = argv[++i] || out.file;
  }
  return out;
}

function parseDateToIso(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${m}-${d}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function splitPersonName(first, last) {
  let f = String(first || "").trim();
  let l = String(last || "").trim();
  if (f && !l && f.includes(" ")) {
    const parts = f.split(/\s+/);
    f = parts[0];
    l = parts.slice(1).join(" ");
  }
  if (!f && !l) return null;
  return { first_name: f, last_name: l };
}

function nameKey(first, last) {
  return `${String(first || "").trim().toLowerCase()}|${String(last || "").trim().toLowerCase()}`;
}

function peopleFromCsvRow(row) {
  const type = String(row.membership_type || "").toLowerCase();
  const people = [];

  const primary = splitPersonName(row.primary_first_name, row.primary_last_name);
  if (primary) {
    people.push({
      ...primary,
      is_junior: type === "junior",
      slot: "primary",
    });
  }

  const secondary = splitPersonName(row.secondary_first_name, row.secondary_last_name);
  if (secondary) {
    people.push({ ...secondary, is_junior: false, slot: "secondary" });
  }

  for (const letter of ["a", "b", "c"]) {
    const junior = splitPersonName(
      row[`junior_${letter}_first_name`],
      row[`junior_${letter}_last_name`]
    );
    if (junior) people.push({ ...junior, is_junior: true, slot: `junior_${letter}` });
  }

  const seen = new Set();
  return people.filter((p) => {
    const key = nameKey(p.first_name, p.last_name);
    if (!key.replace("|", "")) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function householdPayloadFromRow(row) {
  const payload = {};
  for (const key of HOUSEHOLD_COLUMNS) {
    if (key === "id") continue;
    let value = row[key];
    if (value === undefined || value === "") continue;
    if (key === "start_date" || key === "end_date") {
      value = parseDateToIso(value);
      if (!value) continue;
    }
    if (key === "is_life_member") {
      value = String(value).toLowerCase() === "true";
    }
    if (key === "user_id" && !value) continue;
    if (key === "amount_paid" && value) value = Number(value) || value;
    if (key === "preferred_number" && value) value = Number(value) || value;
    payload[key] = value;
  }
  if (payload.email) payload.email = payload.email.toLowerCase();
  return payload;
}

async function ensureClubMembers(supabase, membershipId, people, dryRun, createDrivers, clubId, stats) {
  const { data: existing = [], error } = await supabase
    .from("club_members")
    .select("id, first_name, last_name, driver_id, is_junior")
    .eq("membership_id", membershipId);
  if (error) throw error;

  const byName = new Map(
    (existing || []).map((m) => [nameKey(m.first_name, m.last_name), m])
  );

  for (const person of people) {
    const key = nameKey(person.first_name, person.last_name);
    let member = byName.get(key);

    if (!member) {
      if (dryRun) {
        stats.membersWouldAdd += 1;
        console.log(`    + member ${person.first_name} ${person.last_name}${person.is_junior ? " (junior)" : ""}`);
        member = { id: null };
      } else {
        const { data: created, error: insertError } = await supabase
          .from("club_members")
          .insert({
            membership_id: membershipId,
            first_name: person.first_name,
            last_name: person.last_name,
            is_junior: !!person.is_junior,
            is_life_member: false,
          })
          .select("id, first_name, last_name, driver_id, is_junior")
          .single();
        if (insertError) throw insertError;
        member = created;
        byName.set(key, member);
        stats.membersAdded += 1;
      }
    } else {
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("club_members")
          .update({ is_junior: !!person.is_junior })
          .eq("id", member.id);
        if (updateError) throw updateError;
      }
      stats.membersSkipped += 1;
    }

    if (!createDrivers || !clubId) continue;
    if (member.driver_id) continue;

    if (dryRun) {
      stats.driversWouldCreate += 1;
      console.log(`    + driver ${person.first_name} ${person.last_name}`);
      continue;
    }

    const { data: drivers } = await supabase
      .from("drivers")
      .select("id")
      .eq("club_id", clubId)
      .eq("first_name", person.first_name)
      .eq("last_name", person.last_name);

    let driverId = drivers?.[0]?.id;
    if (!driverId) {
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .insert({
          club_id: clubId,
          membership_id: membershipId,
          first_name: person.first_name,
          last_name: person.last_name,
          is_junior: !!person.is_junior,
        })
        .select("id")
        .single();
      if (driverError) throw driverError;
      driverId = driver.id;
      stats.driversCreated += 1;
    } else {
      await supabase
        .from("drivers")
        .update({ membership_id: membershipId, is_junior: !!person.is_junior })
        .eq("id", driverId);
      stats.driversLinked += 1;
    }

    if (member.id) {
      await supabase.from("club_members").update({ driver_id: driverId }).eq("id", member.id);
    }
  }
}

async function findHouseholdByEmail(supabase, clubId, email) {
  const { data, error } = await supabase
    .from("household_memberships")
    .select("id, user_id, email")
    .eq("club_id", clubId)
    .ilike("email", email);
  if (error) throw error;
  if (!data?.length) return null;
  if (data.length === 1) return data[0];
  const sorted = [...data].sort((a, b) => {
    if (a.user_id && !b.user_id) return -1;
    if (!a.user_id && b.user_id) return 1;
    return String(a.id).localeCompare(String(b.id));
  });
  console.warn(
    `Multiple households for ${email} (${data.length} rows); using ${sorted[0].id}. Merge duplicates in Supabase when you can.`
  );
  return sorted[0];
}

async function resolveMembershipId(supabase, row, payload, dryRun, stats) {
  const id = (row.id || "").trim();
  const email = (payload.email || "").trim().toLowerCase();
  const clubId = payload.club_id;

  if (id) {
    const { data, error } = await supabase
      .from("household_memberships")
      .select("id, user_id, email")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return { id: data.id, action: "update", existing: data };
  }

  if (email && clubId) {
    const match = await findHouseholdByEmail(supabase, clubId, email);
    if (match?.id) return { id: match.id, action: "update", existing: match };
  }

  if (dryRun) {
    stats.householdsWouldCreate += 1;
    return { id: "dry-run", action: "create", existing: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("household_memberships")
    .insert(payload)
    .select("id, user_id, email")
    .single();
  if (insertError) throw insertError;
  stats.householdsCreated += 1;
  return { id: created.id, action: "create", existing: created };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!url || !serviceKey) {
    console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const rows = loadCsvObjects(args.file);
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Importing ${rows.length} rows from ${args.file}`);
  if (args.dryRun) console.log("DRY RUN\n");

  const stats = {
    householdsCreated: 0,
    householdsWouldCreate: 0,
    householdsUpdated: 0,
    membersAdded: 0,
    membersWouldAdd: 0,
    membersSkipped: 0,
    driversCreated: 0,
    driversWouldCreate: 0,
    driversLinked: 0,
    errors: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email) {
      stats.skipped += 1;
      continue;
    }

    const payload = householdPayloadFromRow(row);
    const people = peopleFromCsvRow(row);
    const clubId = payload.club_id;

    try {
      const resolved = await resolveMembershipId(supabase, row, payload, args.dryRun, stats);

      if (resolved.action === "update" && resolved.id !== "dry-run") {
        const updatePayload = { ...payload };
        if (resolved.existing?.user_id && !payload.user_id) {
          delete updatePayload.user_id;
        }
        if (!args.dryRun) {
          const { error: updateError } = await supabase
            .from("household_memberships")
            .update(updatePayload)
            .eq("id", resolved.id);
          if (updateError) throw updateError;
          stats.householdsUpdated += 1;
        }
        console.log(`${args.dryRun ? "Would update" : "Updated"} ${email}`);
      } else if (resolved.action === "create") {
        console.log(`${args.dryRun ? "Would create" : "Created"} ${email}`);
      }

      const membershipId = resolved.id;
      if (membershipId && membershipId !== "dry-run" && people.length) {
        await ensureClubMembers(
          supabase,
          membershipId,
          people,
          args.dryRun,
          args.createDrivers,
          clubId,
          stats
        );
      } else if (membershipId === "dry-run" && people.length) {
        for (const person of people) {
          stats.membersWouldAdd += 1;
          console.log(
            `    + member ${person.first_name} ${person.last_name}${person.is_junior ? " (junior)" : ""}`
          );
        }
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`Error ${email}:`, err.message || err);
    }
  }

  console.log("\nSummary:", stats);
  if (stats.errors) process.exit(1);
}

main();
