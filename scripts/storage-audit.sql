-- Storage audit for RCRaceDay (run in Supabase SQL editor)
-- Review results before deleting anything. Prefer app re-upload + stable paths over bulk delete.

-- ---------------------------------------------------------------------------
-- 1) Total usage by bucket
-- ---------------------------------------------------------------------------
select
  bucket_id,
  count(*) as files,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects
where name not like '.%'
group by bucket_id
order by coalesce(sum((metadata->>'size')::bigint), 0) desc;

-- ---------------------------------------------------------------------------
-- 2) club-assets: size by club + folder (seg1 = club uuid or legacy name)
-- ---------------------------------------------------------------------------
select
  split_part(name, '/', 1) as seg1,
  split_part(name, '/', 2) as seg2,
  count(*) as files,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects
where bucket_id = 'club-assets'
  and name not like '.%'
group by 1, 2
order by coalesce(sum((metadata->>'size')::bigint), 0) desc;

-- ---------------------------------------------------------------------------
-- 3) Largest objects (candidates to review)
-- ---------------------------------------------------------------------------
select
  bucket_id,
  name,
  pg_size_pretty((metadata->>'size')::bigint) as size,
  created_at
from storage.objects
where name not like '.%'
order by (metadata->>'size')::bigint desc nulls last
limit 40;

-- ---------------------------------------------------------------------------
-- 4) Driver photos (club-assets/{slug}/drivers/) + legacy driver-avatars bucket
-- ---------------------------------------------------------------------------
select
  split_part(name, '/', 1) as club_folder,
  count(*) as files,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects
where bucket_id = 'club-assets'
  and name like '%/drivers/%'
  and name not like '.%'
group by 1
order by coalesce(sum((metadata->>'size')::bigint), 0) desc;

select
  case
    when name like 'avatars/%' then 'legacy avatars/'
    when position('/' in name) = 0 then 'root'
    else 'other'
  end as layout,
  count(*) as files,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects
where bucket_id = 'driver-avatars'
  and name not like '.%'
group by 1;

-- ---------------------------------------------------------------------------
-- 5) Event logos referenced in DB (storage path in events.logourl)
-- ---------------------------------------------------------------------------
select e.id, e.club_id, e.name, e.logourl
from public.events e
where e.logourl is not null and btrim(e.logourl) <> ''
order by e.updated_at desc nulls last;

-- Orphan event logo paths (in storage but not referenced by any event)
select o.name, o.created_at
from storage.objects o
where o.bucket_id = 'club-assets'
  and (
    o.name like '%/event-logos/%'
    or o.name like '%/event-logos'
  )
  and not exists (
    select 1 from public.events e where e.logourl = o.name
  )
order by o.created_at desc;

-- ---------------------------------------------------------------------------
-- 6) Club branding paths (logo_url / admin_logo_url contain path after /club-assets/)
-- Manual: compare clubs.logo_url to storage; legacy paths include clubs/{id}-logo_url.*
-- ---------------------------------------------------------------------------
select id, slug, logo_url, admin_logo_url
from public.clubs
where logo_url is not null or admin_logo_url is not null;

-- Legacy branding folder pattern
select name, created_at
from storage.objects
where bucket_id = 'club-assets'
  and (name like 'clubs/%' or name like '%/branding/%')
order by name;

-- ---------------------------------------------------------------------------
-- 7) Duplicate-heavy merch uploads (timestamp in filename)
--    Pattern: {club}/merch/{itemId}_main_{timestamp}_*
-- ---------------------------------------------------------------------------
select
  split_part(name, '/', 1) as club_id,
  count(*) as merch_files,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as total_size
from storage.objects
where bucket_id = 'club-assets'
  and (
    name like '%/merch/%'
    or name like '%/merchandise/%'
  )
group by 1
order by count(*) desc;

-- ---------------------------------------------------------------------------
-- 8) Driver avatars: DB URLs vs storage (ghost URLs)
-- ---------------------------------------------------------------------------
select
  d.id,
  d.first_name,
  d.avatar_url,
  exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'driver-avatars'
      and d.avatar_url like '%/' || o.name || '%'
  ) as object_exists
from public.drivers d
where d.avatar_url is not null and btrim(d.avatar_url) <> '';

-- ---------------------------------------------------------------------------
-- 9) SAFE cleanup candidates (review list only — do not auto-delete)
--    Empty Supabase folder placeholders
-- ---------------------------------------------------------------------------
select name, bucket_id, created_at
from storage.objects
where name like '.%';

-- Legacy driver-avatars subfolder (after migrating to root {driver-id}.ext)
-- select name from storage.objects
-- where bucket_id = 'driver-avatars' and name like 'avatars/%';
