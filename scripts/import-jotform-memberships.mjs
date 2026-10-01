/**
 * Import Jotform membership spreadsheet into Supabase (household_memberships + club_members).
 *
 * Uses service role — never commit the key. Requires Python + openpyxl for .xlsx parsing.
 *
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/import-jotform-memberships.mjs --club-slug chargers-rc --dry-run
 *   node scripts/import-jotform-memberships.mjs --club-slug chargers-rc --file src/assets/2026_Membership_Registration2026-10-01_00_21_32.xlsx
 *
 * Re-running is safe: matches households by club + email; adds missing club_members by name.
 */

import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function usage() {
  console.error(`
Usage:
  node scripts/import-jotform-memberships.mjs --club-slug <slug> [--file <path.xlsx>] [--dry-run]

Defaults:
  --file  src/assets/2026_Membership_Registration2026-10-01_00_21_32.xlsx
`);
}

function parseArgs(argv) {
  const out = { clubSlug: "", file: "", dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--club-slug") out.clubSlug = argv[++i] || "";
    else if (arg === "--file") out.file = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
  }
  if (!out.file) {
    out.file = join(__dirname, "..", "src", "assets", "2026_Membership_Registration2026-10-01_00_21_32.xlsx");
  }
  return out;
}

function splitName(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const parts = text.split(" ");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function nameKey(first, last) {
  return `${String(first || "").trim().toLowerCase()}|${String(last || "").trim().toLowerCase()}`;
}

function mapMembershipType(raw) {
  const key = String(raw || "").toLowerCase();
  if (key.includes("family")) return "family";
  if (key.includes("junior")) return "junior";
  if (key.includes("single")) return "adult";
  return "adult";
}

function mapDuration(raw) {
  const key = String(raw || "").toLowerCase();
  if (key.includes("half")) return "half";
  if (key.includes("full")) return "full";
  return "full";
}

function inferHalfPeriod(isoDate) {
  if (!isoDate) return "H2";
  const month = Number(isoDate.slice(5, 7));
  return month <= 6 ? "H1" : "H2";
}

function membershipEndDate(startIso, duration, period) {
  const year = Number(startIso?.slice(0, 4)) || new Date().getFullYear();
  if (duration !== "half") return `${year}-12-31`;
  if (period === "H1") return `${year}-06-30`;
  return `${year}-12-31`;
}

function mapStatus(raw) {
  const key = String(raw || "").toLowerCase();
  if (key.includes("renew")) return "active";
  if (key.includes("new")) return "active";
  return "active";
}

function loadRowsFromXlsx(filePath) {
  const abs = resolve(filePath);
  const py = join(__dirname, "jotform_xlsx_to_json.py");
  const result = spawnSync("python", [py, abs], { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) {
    throw new Error(`Could not run Python: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || "jotform_xlsx_to_json.py failed");
  }
  return JSON.parse(result.stdout || "[]");
}

function peopleFromRow(row) {
  const people = [];
  const primary = {
    first_name: row.primary_first_name,
    last_name: row.primary_last_name,
    is_junior: mapMembershipType(row.membership_type_raw) === "junior",
  };
  if (primary.first_name || primary.last_name) {
    people.push(primary);
  }

  if (row.additional_adult && (row.additional_first_name || row.additional_last_name)) {
    const adult = {
      first_name: row.additional_first_name,
      last_name: row.additional_last_name,
      is_junior: false,
    };
    if (nameKey(adult.first_name, adult.last_name) !== nameKey(primary.first_name, primary.last_name)) {
      people.push(adult);
    }
  }

  for (const raw of row.junior_names || []) {
    const parsed = splitName(raw);
    if (!parsed) continue;
    parsed.is_junior = true;
    if (nameKey(parsed.first_name, parsed.last_name) === nameKey(primary.first_name, primary.last_name)) {
      continue;
    }
    people.push(parsed);
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

async function ensureClubMembers(supabase, membershipId, people, dryRun, stats) {
  const { data: existing = [], error } = await supabase
    .from("club_members")
    .select("id, first_name, last_name, is_junior")
    .eq("membership_id", membershipId);

  if (error) throw error;

  const have = new Set((existing || []).map((r) => nameKey(r.first_name, r.last_name)));

  for (const person of people) {
    const key = nameKey(person.first_name, person.last_name);
    if (have.has(key)) {
      stats.membersSkipped += 1;
      continue;
    }
    const payload = {
      membership_id: membershipId,
      first_name: person.first_name,
      last_name: person.last_name,
      is_junior: !!person.is_junior,
      driver_id: null,
    };
    if (dryRun) {
      stats.membersWouldAdd += 1;
      console.log(`  + club_member ${person.first_name} ${person.last_name}${person.is_junior ? " (junior)" : ""}`);
      have.add(key);
      continue;
    }
    const { error: insertError } = await supabase.from("club_members").insert(payload);
    if (insertError) throw insertError;
    stats.membersAdded += 1;
    have.add(key);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!url || !serviceKey) {
    console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!args.clubSlug) {
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
    console.error("Club not found for slug:", args.clubSlug, clubError?.message || "");
    process.exit(1);
  }

  const rows = loadRowsFromXlsx(args.file);
  console.log(`Club: ${club.name} (${club.slug})`);
  console.log(`Rows with email: ${rows.length} from ${resolve(args.file)}`);
  if (args.dryRun) console.log("DRY RUN — no database writes\n");

  const stats = {
    householdsCreated: 0,
    householdsUpdated: 0,
    householdsWouldCreate: 0,
    householdsWouldUpdate: 0,
    membersAdded: 0,
    membersWouldAdd: 0,
    membersSkipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    const startDate = row.submission_date;
    const duration = mapDuration(row.membership_duration_raw);
    const period = inferHalfPeriod(startDate);
    const endDate = startDate ? membershipEndDate(startDate, duration, period) : null;

    const householdPayload = {
      club_id: club.id,
      email: row.email,
      primary_first_name: row.primary_first_name,
      primary_last_name: row.primary_last_name,
      membership_type: mapMembershipType(row.membership_type_raw),
      status: mapStatus(row.status_raw),
      start_date: startDate,
      end_date: endDate,
      duration,
    };

    const optionalPeriod = { period };
    const people = peopleFromRow(row);

    try {
      const { data: existing, error: findError } = await supabase
        .from("household_memberships")
        .select("id, user_id, email")
        .eq("club_id", club.id)
        .ilike("email", row.email)
        .maybeSingle();

      if (findError) throw findError;

      let membershipId = existing?.id;

      if (!membershipId) {
        if (args.dryRun) {
          stats.householdsWouldCreate += 1;
          console.log(`CREATE household ${row.email} (${householdPayload.membership_type}, ${duration})`);
          membershipId = "dry-run";
        } else {
          let insertPayload = { ...householdPayload, ...optionalPeriod };
          let { data: created, error: insertError } = await supabase
            .from("household_memberships")
            .insert(insertPayload)
            .select("id")
            .single();
          if (insertError && /period/i.test(insertError.message || "")) {
            ({ data: created, error: insertError } = await supabase
              .from("household_memberships")
              .insert(householdPayload)
              .select("id")
              .single());
          }
          if (insertError) throw insertError;
          membershipId = created.id;
          stats.householdsCreated += 1;
          console.log(`Created household ${row.email}`);
        }
      } else {
        const updatePayload = { ...householdPayload };
        if (existing.user_id) {
          delete updatePayload.email;
        }
        if (args.dryRun) {
          stats.householdsWouldUpdate += 1;
          console.log(`UPDATE household ${row.email}`);
        } else {
          let { error: updateError } = await supabase
            .from("household_memberships")
            .update({ ...updatePayload, ...optionalPeriod })
            .eq("id", membershipId);
          if (updateError && /period/i.test(updateError.message || "")) {
            ({ error: updateError } = await supabase
              .from("household_memberships")
              .update(updatePayload)
              .eq("id", membershipId));
          }
          if (updateError) throw updateError;
          stats.householdsUpdated += 1;
        }
      }

      if (membershipId && membershipId !== "dry-run") {
        await ensureClubMembers(supabase, membershipId, people, args.dryRun, stats);
      } else if (args.dryRun && people.length) {
        for (const person of people) {
          stats.membersWouldAdd += 1;
          console.log(
            `  + club_member ${person.first_name} ${person.last_name}${person.is_junior ? " (junior)" : ""}`
          );
        }
      }
    } catch (err) {
      stats.errors += 1;
      console.error(`Error for ${row.email}:`, err.message || err);
    }
  }

  console.log("\nSummary:", stats);
  if (stats.errors) process.exit(1);
}

main();
