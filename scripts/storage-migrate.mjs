/**
 * Move/rename Supabase Storage objects (SQL cannot move blobs safely).
 *
 * Usage (local, service role — never commit the key):
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/storage-migrate.mjs --dry-run
 *   node scripts/storage-migrate.mjs --delete-orphans
 *   node scripts/storage-migrate.mjs --move-slug-layout
 *   node scripts/storage-migrate.mjs --move-driver-avatars  (→ club-assets/{slug}/drivers/)
 *
 * Requires Node 20+ and project dependency @supabase/supabase-js (already in repo).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!/^[\x00-\x7F]+$/.test(serviceKey)) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY contains invalid characters (often a pasted \"…\" placeholder)."
  );
  console.error("Use the full service_role secret from Supabase Dashboard → Project Settings → API.");
  process.exit(1);
}

if (!serviceKey.startsWith("eyJ")) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY does not look like a JWT (should start with eyJ)."
  );
  console.error("Copy the service_role key from Supabase Dashboard → Project Settings → API.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dryRun = process.argv.includes("--dry-run");
const deleteOrphans = process.argv.includes("--delete-orphans");
const moveBranding = process.argv.includes("--move-branding");
const moveSlugLayout = process.argv.includes("--move-slug-layout");
const moveDriverAvatars = process.argv.includes("--move-driver-avatars");

const DRIVER_ID_IN_PATH =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function sanitizeSlug(slug) {
  const cleaned = String(slug || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || "unknown-club";
}

async function driverAvatarDestPath(objectName, clubById) {
  const match = objectName.match(DRIVER_ID_IN_PATH);
  if (!match) return null;

  const driverId = match[1];
  const { data: driver } = await supabase
    .from("drivers")
    .select("club_id")
    .eq("id", driverId)
    .maybeSingle();

  const club = driver?.club_id ? clubById.get(driver.club_id) : null;
  if (!club) return null;

  const slug = sanitizeSlug(club.slug);
  const last = objectName.split("/").pop() || "";
  const extMatch = last.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  return `${slug}/drivers/${driverId}.${ext}`;
}

async function relocateToClubAssets(fromBucket, fromPath, destPath) {
  if (fromPath === destPath && fromBucket === "club-assets") return;

  if (fromBucket === "club-assets") {
    await moveObject("club-assets", fromPath, destPath);
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] relocate ${fromBucket}:${fromPath} -> club-assets:${destPath}`);
    return;
  }

  const { data, error } = await supabase.storage.from(fromBucket).download(fromPath);
  if (error) {
    console.warn(`download failed ${fromBucket}:${fromPath}:`, error.message);
    return;
  }

  const ext = destPath.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from("club-assets")
    .upload(destPath, data, { upsert: true, contentType });

  if (uploadError) {
    console.warn(`upload failed club-assets:${destPath}:`, uploadError.message);
    return;
  }

  await supabase.storage.from(fromBucket).remove([fromPath]);
  console.log(`relocated ${fromBucket}:${fromPath} -> club-assets:${destPath}`);
}

async function updateDriverAvatarUrl(driverId, destPath) {
  if (dryRun) return;

  const { data: pub } = supabase.storage.from("club-assets").getPublicUrl(destPath);
  const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
  await supabase.from("drivers").update({ avatar_url: newUrl }).eq("id", driverId);
}

async function migrateDriverAvatarsToClubFolders(clubById) {
  for (const obj of await listAllObjects("driver-avatars")) {
    if (obj.name.startsWith(".")) continue;

    const dest = await driverAvatarDestPath(obj.name, clubById);
    if (!dest) continue;

    await relocateToClubAssets("driver-avatars", obj.name, dest);

    const driverId = dest.match(DRIVER_ID_IN_PATH)?.[1];
    if (driverId) await updateDriverAvatarUrl(driverId, dest);
  }

  for (const obj of await listAllObjects("club-assets")) {
    if (obj.name.startsWith(".") || obj.name.startsWith("rc-raceday/")) continue;
    if (!DRIVER_ID_IN_PATH.test(obj.name)) continue;

    const dest = await driverAvatarDestPath(obj.name, clubById);
    if (!dest || dest === obj.name) continue;

    await relocateToClubAssets("club-assets", obj.name, dest);

    const driverId = dest.match(DRIVER_ID_IN_PATH)?.[1];
    if (driverId) await updateDriverAvatarUrl(driverId, dest);
  }

  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, avatar_url, club_id");

  for (const d of drivers || []) {
    if (!d.avatar_url) continue;
    const club = d.club_id ? clubById.get(d.club_id) : null;
    if (!club) continue;

    const slug = sanitizeSlug(club.slug);
    const legacyPath = pathFromUrl(d.avatar_url, "driver-avatars");
    const clubPath = pathFromUrl(d.avatar_url, "club-assets");
    const extMatch = (legacyPath || clubPath || "").split("/").pop()?.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    const dest = `${slug}/drivers/${d.id}.${ext}`;

    if (clubPath === dest && !d.avatar_url.includes("/driver-avatars/")) continue;

    if (legacyPath) {
      await relocateToClubAssets("driver-avatars", legacyPath, dest);
    } else if (clubPath && clubPath !== dest) {
      await relocateToClubAssets("club-assets", clubPath, dest);
    }

    if (
      legacyPath ||
      (clubPath && clubPath !== dest) ||
      d.avatar_url.includes("/driver-avatars/")
    ) {
      await updateDriverAvatarUrl(d.id, dest);
    }
  }
}

async function migrateToSlugLayout() {
  const { data: clubs } = await supabase.from("clubs").select("id, slug");
  const clubById = new Map((clubs || []).map((c) => [c.id, c]));

  for (const bucket of ["club-assets"]) {
    const objects = await listAllObjects(bucket);
    for (const obj of objects) {
      if (obj.name.startsWith(".") || obj.name.startsWith("rc-raceday/")) continue;

      const parts = obj.name.split("/");
      const head = parts[0];
      const club = clubById.get(head);
      if (club) {
        const slug = sanitizeSlug(club.slug);
        const tail = parts.slice(1).join("/");
        const dest = tail ? `${slug}/${tail}` : slug;
        if (dest !== obj.name) await moveObject(bucket, obj.name, dest);
        continue;
      }

      if (bucket === "club-assets" && head !== sanitizeSlug(head)) {
        const slugGuess = sanitizeSlug(head);
        if (slugGuess !== head) {
          const dest = `${slugGuess}/${parts.slice(1).join("/")}`;
          await moveObject(bucket, obj.name, dest);
        }
      }
    }
  }

  await migrateDriverAvatarsToClubFolders(clubById);
}

function pathFromUrl(raw, bucket) {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.includes("http")) return raw.split("?")[0];
  const marker = `/${bucket}/`;
  const i = raw.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(raw.slice(i + marker.length).split("?")[0]);
}

async function collectReferencedPaths() {
  const refs = new Set();
  const key = (bucket, path) => refs.add(`${bucket}|${path}`);

  key("club-assets", "chargers-rc/member-badges/chargers-member-badge-01.png");

  const { data: events } = await supabase
    .from("events")
    .select("logourl, merchandise, class_add_ons");
  for (const e of events || []) {
    if (e.logourl) {
      const p = pathFromUrl(e.logourl, "club-assets") || e.logourl;
      if (p) key("club-assets", p);
    }
    walkPhotoUrls(e.merchandise, key);
    walkPhotoUrls(e.class_add_ons, key);
  }

  const { data: clubs } = await supabase.from("clubs").select("id, logo_url, admin_logo_url");
  for (const c of clubs || []) {
    for (const field of [c.logo_url, c.admin_logo_url]) {
      const p = pathFromUrl(field, "club-assets");
      if (p) key("club-assets", p);
    }
  }

  const { data: drivers } = await supabase.from("drivers").select("avatar_url");
  for (const d of drivers || []) {
    const clubP = pathFromUrl(d.avatar_url, "club-assets");
    const legacyP = pathFromUrl(d.avatar_url, "driver-avatars");
    if (clubP) key("club-assets", clubP);
    if (legacyP) key("driver-avatars", legacyP);
  }

  return refs;
}

function walkPhotoUrls(node, key) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkPhotoUrls(n, key));
    return;
  }
  if (typeof node === "object") {
    if (node.photo_url) {
      const p = pathFromUrl(node.photo_url, "club-assets");
      if (p) key("club-assets", p);
    }
    Object.values(node).forEach((v) => walkPhotoUrls(v, key));
  }
}

async function listAllObjects(bucket) {
  const out = [];
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const entry of data) {
      if (entry.id) {
        out.push({ bucket, name: entry.name, size: entry.metadata?.size ?? 0 });
      } else {
        const nested = await listPrefix(bucket, entry.name);
        out.push(...nested);
      }
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function listPrefix(bucket, prefix) {
  const out = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const entry of data || []) {
    const full = `${prefix}/${entry.name}`;
    if (entry.id) {
      out.push({ bucket, name: full, size: entry.metadata?.size ?? 0 });
    } else {
      out.push(...(await listPrefix(bucket, full)));
    }
  }
  return out;
}

async function moveObject(bucket, from, to) {
  if (dryRun) {
    console.log(`[dry-run] move ${bucket}:${from} -> ${to}`);
    return;
  }
  const { error } = await supabase.storage.from(bucket).move(from, to);
  if (error) {
    console.warn(`move failed ${from} -> ${to}:`, error.message);
    return;
  }
  console.log(`moved ${from} -> ${to}`);
}

async function deleteObject(bucket, name) {
  if (dryRun) {
    console.log(`[dry-run] delete ${bucket}:${name}`);
    return;
  }
  const { error } = await supabase.storage.from(bucket).remove([name]);
  if (error) console.warn(`delete failed ${name}:`, error.message);
  else console.log(`deleted ${bucket}:${name}`);
}

async function migrateLegacyBranding() {
  const { data: clubs } = await supabase.from("clubs").select("id, slug, logo_url, admin_logo_url");
  for (const club of clubs || []) {
    const root = sanitizeSlug(club.slug);
    for (const [field, destBase] of [
      ["logo_url", "logo"],
      ["admin_logo_url", "admin-logo"],
    ]) {
      const current = club[field];
      const path = pathFromUrl(current, "club-assets");
      if (!path || path.startsWith(`${root}/branding/`)) continue;
      const ext = path.split(".").pop() || "png";
      const dest = `${root}/branding/${destBase}.${ext}`;
      if (path === dest) continue;
      await moveObject("club-assets", path, dest);
      if (!dryRun) {
        const { data: pub } = supabase.storage.from("club-assets").getPublicUrl(dest);
        await supabase
          .from("clubs")
          .update({ [field]: `${pub.publicUrl}?v=${Date.now()}` })
          .eq("id", club.id);
      }
    }
  }
}

async function main() {
  if (moveDriverAvatars) {
    const { data: clubs } = await supabase.from("clubs").select("id, slug");
    const clubById = new Map((clubs || []).map((c) => [c.id, c]));
    await migrateDriverAvatarsToClubFolders(clubById);
    return;
  }

  if (moveSlugLayout) {
    await migrateToSlugLayout();
    return;
  }

  if (moveBranding) {
    await migrateLegacyBranding();
    return;
  }

  const refs = await collectReferencedPaths();
  const buckets = ["club-assets", "driver-avatars"];
  let orphanBytes = 0;

  for (const bucket of buckets) {
    const objects = await listAllObjects(bucket);
    for (const obj of objects) {
      if (obj.name.startsWith(".")) continue;
      const refKey = `${bucket}|${obj.name}`;
      if (refs.has(refKey)) continue;
      orphanBytes += Number(obj.size) || 0;
      if (deleteOrphans) {
        await deleteObject(bucket, obj.name);
      } else {
        console.log(`orphan ${bucket}:${obj.name} (${obj.size || "?"} bytes)`);
      }
    }
  }

  console.log(
    deleteOrphans
      ? `Done. Orphans removed (~${orphanBytes} bytes).`
      : `Found orphans (~${orphanBytes} bytes). Re-run with --delete-orphans or --dry-run --delete-orphans`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
