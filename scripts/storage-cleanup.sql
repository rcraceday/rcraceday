-- Storage cleanup via SQL (Supabase SQL editor)
--
-- What SQL can do:
--   DELETE from storage.objects  → removes the file (OK).
-- What SQL cannot do safely:
--   UPDATE name to "move" files — does not relocate blob data; breaks links.
--   For moves/renames use scripts/storage-migrate.mjs (Storage API copy + delete).
--
-- Workflow: run PREVIEW → EXECUTE blocks → re-run storage-audit.sql section 1.

create or replace function public.storage_path_from_url(url text, bucket text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when url is null or btrim(url) = '' then null
    when url not like 'http%' and url not like '%/' || bucket || '/%' then url
    when url like '%/' || bucket || '/%' then
      regexp_replace(substring(url from '.*/' || bucket || '/(.+)$'), '\?.*$', '')
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- PREVIEW — reclaimable space + orphan file list
-- ---------------------------------------------------------------------------
with ref as (
  select distinct bucket_id, path
  from (
    select 'club-assets'::text as bucket_id, e.logourl as path
    from public.events e
    where e.logourl is not null and btrim(e.logourl) <> '' and e.logourl not like 'http%'

    union

    select 'club-assets', public.storage_path_from_url(e.logourl, 'club-assets')
    from public.events e
    where e.logourl is not null and btrim(e.logourl) <> ''

    union

    select 'club-assets', public.storage_path_from_url(c.logo_url, 'club-assets')
    from public.clubs c
    where c.logo_url is not null and btrim(c.logo_url) <> ''

    union

    select 'club-assets', public.storage_path_from_url(c.admin_logo_url, 'club-assets')
    from public.clubs c
    where c.admin_logo_url is not null and btrim(c.admin_logo_url) <> ''

    union

    select 'club-assets', public.storage_path_from_url(d.avatar_url, 'club-assets')
    from public.drivers d
    where d.avatar_url is not null and btrim(d.avatar_url) <> ''

    union

    select 'driver-avatars', public.storage_path_from_url(d.avatar_url, 'driver-avatars')
    from public.drivers d
    where d.avatar_url is not null and btrim(d.avatar_url) <> ''

    union

    select 'club-assets',
      public.storage_path_from_url(trim(both '"' from t.value::text), 'club-assets')
    from public.events e
    cross join lateral jsonb_path_query(
      coalesce(e.merchandise, '[]'::jsonb) || coalesce(e.class_add_ons, '[]'::jsonb),
      '$.**.photo_url'
    ) as t(value)
    where t.value is not null
      and t.value::text not in ('null', '""')
      and trim(both '"' from t.value::text) <> ''

    union

    select 'club-assets', 'chargers-rc/member-badges/chargers-member-badge-01.png'
  ) s
  where path is not null and btrim(path) <> ''
),
orphans as (
  select
    o.bucket_id,
    o.name,
    (o.metadata->>'size')::bigint as size_bytes,
    o.created_at
  from storage.objects o
  where o.name not like '.%'
    and not exists (
      select 1
      from ref r
      where r.bucket_id = o.bucket_id
        and r.path = o.name
    )
)
select
  bucket_id,
  count(*) as orphan_files,
  pg_size_pretty(coalesce(sum(size_bytes), 0)) as reclaimable
from orphans
group by bucket_id
order by coalesce(sum(size_bytes), 0) desc;

-- Orphan detail (run as second statement in editor if needed)
with ref as (
  select distinct bucket_id, path
  from (
    select 'club-assets'::text as bucket_id, e.logourl as path
    from public.events e
    where e.logourl is not null and btrim(e.logourl) <> '' and e.logourl not like 'http%'
    union
    select 'club-assets', public.storage_path_from_url(e.logourl, 'club-assets')
    from public.events e where e.logourl is not null and btrim(e.logourl) <> ''
    union
    select 'club-assets', public.storage_path_from_url(c.logo_url, 'club-assets')
    from public.clubs c where c.logo_url is not null and btrim(c.logo_url) <> ''
    union
    select 'club-assets', public.storage_path_from_url(c.admin_logo_url, 'club-assets')
    from public.clubs c where c.admin_logo_url is not null and btrim(c.admin_logo_url) <> ''
    union
    select 'driver-avatars', public.storage_path_from_url(d.avatar_url, 'driver-avatars')
    from public.drivers d where d.avatar_url is not null and btrim(d.avatar_url) <> ''
    union
    select 'club-assets',
      public.storage_path_from_url(trim(both '"' from t.value::text), 'club-assets')
    from public.events e
    cross join lateral jsonb_path_query(
      coalesce(e.merchandise, '[]'::jsonb) || coalesce(e.class_add_ons, '[]'::jsonb),
      '$.**.photo_url'
    ) as t(value)
    where t.value is not null and t.value::text not in ('null', '""')
    union
    select 'club-assets', 'chargers-rc/member-badges/chargers-member-badge-01.png'
  ) s
  where path is not null and btrim(path) <> ''
),
orphans as (
  select o.bucket_id, o.name, (o.metadata->>'size')::bigint as size_bytes, o.created_at
  from storage.objects o
  where o.name not like '.%'
    and not exists (
      select 1 from ref r where r.bucket_id = o.bucket_id and r.path = o.name
    )
)
select bucket_id, name, pg_size_pretty(size_bytes) as size, created_at
from orphans
order by size_bytes desc nulls last
limit 300;

-- ---------------------------------------------------------------------------
-- EXECUTE (uncomment one block at a time)
-- ---------------------------------------------------------------------------

-- 0) Legacy standalone buckets (app now uses club-assets/{club-id}/event-logos/ etc.)
--
-- Check DB still references old bucket host paths (run before delete):
-- select src, entity_id, val from (
--   select 'events.logourl'::text as src, e.id::text as entity_id, e.logourl as val
--   from public.events e
--   where e.logourl ilike '%/object/public/event-logos/%'
--      or e.logourl ilike '%/object/public/event-merch/%'
--   union all
--   select 'clubs.logo_url', c.id::text, c.logo_url
--   from public.clubs c
--   where c.logo_url ilike '%/object/public/event-logos/%'
--      or c.logo_url ilike '%/object/public/event-merch/%'
--   union all
--   select 'clubs.admin_logo_url', c.id::text, c.admin_logo_url
--   from public.clubs c
--   where c.admin_logo_url ilike '%/object/public/event-logos/%'
--      or c.admin_logo_url ilike '%/object/public/event-merch/%'
--   union all
--   select 'drivers.avatar_url', d.id::text, d.avatar_url
--   from public.drivers d
--   where d.avatar_url ilike '%/object/public/event-logos/%'
--      or d.avatar_url ilike '%/object/public/event-merch/%'
-- ) t;
--
-- select e.id::text, e.name
-- from public.events e
-- where e.merchandise::text ilike '%/object/public/event-merch/%'
--    or e.merchandise::text ilike '%/object/public/event-logos/%'
--    or e.class_add_ons::text ilike '%/object/public/event-merch/%'
--    or e.class_add_ons::text ilike '%/object/public/event-logos/%';
--
-- Preview:
-- select bucket_id, name, pg_size_pretty((metadata->>'size')::bigint) as size
-- from storage.objects
-- where bucket_id in ('event-logos', 'event-merch')
--   and name not like '.%';
-- Delete after DB checks show no URLs pointing at these buckets:
-- delete from storage.objects
-- where bucket_id in ('event-logos', 'event-merch');

-- 1) Placeholders only
-- delete from storage.objects where name like '.%';

-- 2) Legacy driver-avatars/ subfolder
-- delete from storage.objects
-- where bucket_id = 'driver-avatars' and name like 'avatars/%';

-- 3) Orphan event logos
-- delete from storage.objects o
-- where o.bucket_id = 'club-assets'
--   and o.name like '%/event-logos/%'
--   and not exists (select 1 from public.events e where e.logourl = o.name);

-- 4) ALL orphans (same logic as PREVIEW — destructive)
-- delete from storage.objects o
-- where o.name not like '.%'
--   and not exists (
--     select 1
--     from (
--       select distinct bucket_id, path from (
--         select 'club-assets'::text as bucket_id, e.logourl as path
--         from public.events e
--         where e.logourl is not null and btrim(e.logourl) <> '' and e.logourl not like 'http%'
--         union
--         select 'club-assets', public.storage_path_from_url(e.logourl, 'club-assets')
--         from public.events e where e.logourl is not null and btrim(e.logourl) <> ''
--         union
--         select 'club-assets', public.storage_path_from_url(c.logo_url, 'club-assets')
--         from public.clubs c where c.logo_url is not null and btrim(c.logo_url) <> ''
--         union
--         select 'club-assets', public.storage_path_from_url(c.admin_logo_url, 'club-assets')
--         from public.clubs c where c.admin_logo_url is not null and btrim(c.admin_logo_url) <> ''
--         union
--         select 'driver-avatars', public.storage_path_from_url(d.avatar_url, 'driver-avatars')
--         from public.drivers d where d.avatar_url is not null and btrim(d.avatar_url) <> ''
--         union
--         select 'club-assets',
--           public.storage_path_from_url(trim(both '"' from t.value::text), 'club-assets')
--         from public.events e
--         cross join lateral jsonb_path_query(
--           coalesce(e.merchandise, '[]'::jsonb) || coalesce(e.class_add_ons, '[]'::jsonb),
--           '$.**.photo_url'
--         ) as t(value)
--         where t.value is not null and t.value::text not in ('null', '""')
--         union
--         select 'club-assets', 'chargers-rc/member-badges/chargers-member-badge-01.png'
--       ) s where path is not null and btrim(path) <> ''
--     ) r
--     where r.bucket_id = o.bucket_id and r.path = o.name
--   );
