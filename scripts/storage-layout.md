-- Target layout (club-assets bucket):
--
--   rc-raceday/              App-wide assets (not tied to one club)
--   {club-slug}/             Per-club tree (slug from clubs.slug, lowercased)
--     branding/
--     event-logos/
--     merchandise/
--     class-addons/
--     member-badges/
--     drivers/               Driver profile photos
--
-- Legacy driver-avatars bucket: empty after scripts/storage-migrate.mjs --move-driver-avatars
--
-- Migrate existing objects with scripts/storage-migrate.mjs
--   --move-slug-layout
--   --move-driver-avatars

-- Map club uuid top-level folders to slug (preview)
select
  c.id,
  c.slug,
  c.slug || '/…' as new_root,
  o.name as legacy_object
from public.clubs c
join storage.objects o
  on o.bucket_id = 'club-assets'
 and split_part(o.name, '/', 1) = c.id::text
limit 50;
