import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadJotformRows(filePath) {
  const abs = resolve(filePath);
  const py = join(__dirname, "..", "jotform_xlsx_to_json.py");
  const result = spawnSync("python", [py, abs], { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new Error(`Could not run Python: ${result.error.message}`);
  if (result.status !== 0) throw new Error(result.stderr || "jotform_xlsx_to_json.py failed");
  return JSON.parse(result.stdout || "[]");
}

export function mapMembershipType(raw) {
  const key = String(raw || "").toLowerCase();
  if (key.includes("family")) return "family";
  if (key.includes("junior")) return "junior";
  if (key.includes("single")) return "adult";
  return "adult";
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

/** Everyone on a registration row (primary, extra adult, juniors). */
export function peopleFromRegistrationRow(row) {
  const membership_type = mapMembershipType(row.membership_type_raw);
  const people = [];
  const primary = {
    email: row.email,
    first_name: row.primary_first_name,
    last_name: row.primary_last_name,
    is_junior: membership_type === "junior",
    membership_type,
  };
  if (primary.first_name || primary.last_name) people.push(primary);

  if (row.additional_adult && (row.additional_first_name || row.additional_last_name)) {
    const adult = {
      email: row.email,
      first_name: row.additional_first_name,
      last_name: row.additional_last_name,
      is_junior: false,
      membership_type,
    };
    if (nameKey(adult.first_name, adult.last_name) !== nameKey(primary.first_name, primary.last_name)) {
      people.push(adult);
    }
  }

  for (const raw of row.junior_names || []) {
    const parsed = splitName(raw);
    if (!parsed) continue;
    const junior = {
      email: row.email,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      is_junior: true,
      membership_type,
    };
    if (nameKey(junior.first_name, junior.last_name) === nameKey(primary.first_name, primary.last_name)) {
      continue;
    }
    people.push(junior);
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

export function buildRegistrationIndex(rows) {
  const byEmail = new Map();
  const allPeople = [];
  for (const row of rows) {
    const people = peopleFromRegistrationRow(row);
    byEmail.set(row.email, { row, people });
    allPeople.push(...people);
  }
  return { byEmail, allPeople };
}
