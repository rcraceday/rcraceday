import { readFileSync } from "node:fs";

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function loadLiveTimeDrivers(filePath) {
  const text = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const idxFirst = header.findIndex((h) => /^first\s*name$/i.test(h));
  const idxLast = header.findIndex((h) => /^last\s*name$/i.test(h));
  const idxDriver = header.findIndex((h) => /driver\s*name/i.test(h));

  const seen = new Set();
  const drivers = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    let first = "";
    let last = "";
    if (idxFirst >= 0 && idxLast >= 0) {
      first = (cols[idxFirst] || "").trim();
      last = (cols[idxLast] || "").trim();
    } else if (idxDriver >= 0) {
      const parts = String(cols[idxDriver] || "").trim().split(/\s+/);
      first = parts[0] || "";
      last = parts.slice(1).join(" ");
    } else if (cols.length >= 2) {
      first = (cols[0] || "").trim();
      last = (cols[1] || "").trim();
    }
    if (!first && !last) continue;
    const key = `${first.toLowerCase()}|${last.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drivers.push({ first_name: first, last_name: last });
  }

  return drivers;
}
