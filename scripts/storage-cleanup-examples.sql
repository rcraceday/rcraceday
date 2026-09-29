-- Review orphan lists from storage-audit.sql before running deletes.
-- Prefer deleting in Supabase Dashboard Storage UI after confirming paths.

-- Example: remove legacy empty-folder placeholders (negligible size)
-- delete from storage.objects
-- where name like '.%' and bucket_id in ('club-assets', 'driver-avatars');

-- Example: remove legacy driver avatar subfolder after all drivers use root {id}.ext
-- delete from storage.objects
-- where bucket_id = 'driver-avatars' and name like 'avatars/%';

-- Example: remove orphan event logos (NOT referenced in events.logourl)
-- delete from storage.objects o
-- where o.bucket_id = 'club-assets'
--   and o.name like '%/event-logos/%'
--   and not exists (select 1 from public.events e where e.logourl = o.name);

-- Example: remove old timestamp merch uploads under legacy merch/ folder
-- (only after events no longer reference URLs containing these paths)
-- delete from storage.objects
-- where bucket_id = 'club-assets' and name like '%/merch/%';

-- Example: legacy club branding paths after re-upload to {club_id}/branding/*
-- delete from storage.objects
-- where bucket_id = 'club-assets' and name like 'clubs/%';
