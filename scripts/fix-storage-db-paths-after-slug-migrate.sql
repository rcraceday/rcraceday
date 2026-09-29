-- After storage-migrate.mjs --move-slug-layout (and --move-branding)
-- Align DB paths/URLs with storage folder = clubs.slug (e.g. chargers-rc).
-- Run PREVIEW sections first, then EXECUTE.

-- ---------------------------------------------------------------------------
-- 0) What is in storage for this club? (manual check in dashboard too)
-- ---------------------------------------------------------------------------
select name, pg_size_pretty((metadata->>'size')::bigint) as size
from storage.objects
where bucket_id = 'club-assets'
  and (
    name like 'chargers-rc/%'
    or name like 'chargers/%'
    or name like 'Chargers/%'
  )
order by name;

select name
from storage.objects
where bucket_id = 'driver-avatars'
  and (name like 'chargers-rc/%' or name like '%/%')
order by name;

-- If legacy files landed under chargers/ instead of chargers-rc/, move in Storage UI:
--   chargers/...  →  chargers-rc/...   (or re-run migrate after we fix folder mapping)

-- ---------------------------------------------------------------------------
-- 1) PREVIEW — event logos (logourl is a storage path, not always a full URL)
-- ---------------------------------------------------------------------------
select
  e.id,
  e.name,
  e.logourl as current_path,
  c.slug || substring(e.logourl from position('/' in e.logourl)) as fixed_path
from public.events e
join public.clubs c on c.id = e.club_id
where c.slug = 'chargers-rc'
  and e.logourl is not null
  and btrim(e.logourl) <> ''
  and split_part(e.logourl, '/', 1) <> c.slug;

-- EXECUTE event logourl (uuid or legacy first segment → slug)
-- update public.events e
-- set logourl = c.slug || substring(e.logourl from position('/' in e.logourl))
-- from public.clubs c
-- where c.id = e.club_id
--   and c.slug = 'chargers-rc'
--   and e.logourl is not null
--   and btrim(e.logourl) <> ''
--   and position('/' in e.logourl) > 0
--   and split_part(e.logourl, '/', 1) <> c.slug;

-- ---------------------------------------------------------------------------
-- 2) PREVIEW / EXECUTE — club branding URLs (full public URLs)
-- ---------------------------------------------------------------------------
select id, slug, logo_url, admin_logo_url
from public.clubs
where slug = 'chargers-rc';

-- Rewrites first folder after .../club-assets/ to chargers-rc (keeps ?v= query)
-- update public.clubs c
-- set logo_url = regexp_replace(
--       logo_url,
--       '(/club-assets/)[^/?]+',
--       '\1' || c.slug,
--       'g'
--     )
-- where c.slug = 'chargers-rc'
--   and logo_url is not null
--   and logo_url not like '%/club-assets/' || c.slug || '/%';

-- update public.clubs c
-- set admin_logo_url = regexp_replace(
--       admin_logo_url,
--       '(/club-assets/)[^/?]+',
--       '\1' || c.slug,
--       'g'
--     )
-- where c.slug = 'chargers-rc'
--   and admin_logo_url is not null
--   and admin_logo_url not like '%/club-assets/' || c.slug || '/%';

-- ---------------------------------------------------------------------------
-- 3) PREVIEW / EXECUTE — driver avatars → chargers-rc/drivers/{id}.ext
-- ---------------------------------------------------------------------------
select d.id, d.first_name, d.avatar_url
from public.drivers d
join public.clubs c on c.id = d.club_id
where c.slug = 'chargers-rc'
  and d.avatar_url is not null;

-- Root-level or driver-avatars bucket URL → club-assets/{slug}/drivers/
-- update public.drivers d
-- set avatar_url = regexp_replace(
--   regexp_replace(
--     d.avatar_url,
--     '/driver-avatars/',
--     '/club-assets/'
--   ),
--   '/club-assets/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.)',
--   '/club-assets/chargers-rc/drivers/\1'
-- )
-- from public.clubs c
-- where d.club_id = c.id
--   and c.slug = 'chargers-rc'
--   and d.avatar_url is not null
--   and d.avatar_url not like '%/club-assets/chargers-rc/drivers/%';

-- ---------------------------------------------------------------------------
-- 4) PREVIEW / EXECUTE — merch & add-on photo URLs inside event JSON
-- ---------------------------------------------------------------------------
select e.id, e.name
from public.events e
join public.clubs c on c.id = e.club_id
where c.slug = 'chargers-rc'
  and (
    e.merchandise::text like '%/club-assets/' || c.id::text || '/%'
    or e.merchandise::text like '%/club-assets/Chargers/%'
    or e.merchandise::text like '%/club-assets/chargers/%'
    or e.class_add_ons::text like '%/club-assets/' || c.id::text || '/%'
    or e.class_add_ons::text like '%/club-assets/Chargers/%'
    or e.class_add_ons::text like '%/club-assets/chargers/%'
  );

-- update public.events e
-- set
--   merchandise = replace(
--     replace(
--       replace(merchandise::text, '/club-assets/' || c.id::text || '/', '/club-assets/' || c.slug || '/'),
--       '/club-assets/Chargers/', '/club-assets/' || c.slug || '/'
--     ),
--     '/club-assets/chargers/', '/club-assets/' || c.slug || '/'
--   )::jsonb,
--   class_add_ons = replace(
--     replace(
--       replace(class_add_ons::text, '/club-assets/' || c.id::text || '/', '/club-assets/' || c.slug || '/'),
--       '/club-assets/Chargers/', '/club-assets/' || c.slug || '/'
--     ),
--     '/club-assets/chargers/', '/club-assets/' || c.slug || '/'
--   )::jsonb
-- from public.clubs c
-- where e.club_id = c.id
--   and c.slug = 'chargers-rc';

-- ---------------------------------------------------------------------------
-- 5) Verify ghost URLs (DB points to missing object)
-- ---------------------------------------------------------------------------
select d.id, d.first_name, d.avatar_url,
  exists (
    select 1 from storage.objects o
    where o.bucket_id = 'club-assets'
      and o.name like '%/drivers/' || d.id::text || '.%'
  ) as file_exists
from public.drivers d
join public.clubs c on c.id = d.club_id
where c.slug = 'chargers-rc' and d.avatar_url is not null;
