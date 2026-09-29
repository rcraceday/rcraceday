-- Driver photos live under club-assets/{slug}/drivers/ (same tree as branding, merch, etc.).
-- Run in Supabase SQL editor when uploads fail or verify step reports missing object.
-- Legacy driver-avatars bucket policies remain for migration; add club-assets policies below.

update storage.buckets
set public = true
where id in ('club-assets', 'driver-avatars');

create or replace function public.driver_id_from_avatar_storage_path(object_name text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when substring(object_name from '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') is not null
    then substring(
      object_name from '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
    )::uuid
    else null
  end;
$$;

create or replace function public.user_can_manage_driver_avatar_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    where d.id = public.driver_id_from_avatar_storage_path(object_name)
      and (
        exists (
          select 1
          from public.household_memberships hm
          where hm.id = d.membership_id
            and hm.user_id = auth.uid()
            and hm.status = 'active'
        )
        or (d.membership_id is null and d.created_by = auth.uid())
      )
  );
$$;

grant execute on function public.driver_id_from_avatar_storage_path(text) to authenticated;
grant execute on function public.user_can_manage_driver_avatar_object(text) to authenticated;

drop policy if exists "driver_avatars_public_read" on storage.objects;
create policy "driver_avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'driver-avatars');

drop policy if exists "driver_avatars_insert" on storage.objects;
create policy "driver_avatars_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-avatars'
    and public.user_can_manage_driver_avatar_object(name)
  );

drop policy if exists "driver_avatars_update" on storage.objects;
create policy "driver_avatars_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'driver-avatars'
    and public.user_can_manage_driver_avatar_object(name)
  )
  with check (
    bucket_id = 'driver-avatars'
    and public.user_can_manage_driver_avatar_object(name)
  );

drop policy if exists "driver_avatars_delete" on storage.objects;
create policy "driver_avatars_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'driver-avatars'
    and public.user_can_manage_driver_avatar_object(name)
  );

-- club-assets: driver photos at {slug}/drivers/{driver-id}.ext
drop policy if exists "club_assets_driver_photos_insert" on storage.objects;
create policy "club_assets_driver_photos_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'club-assets'
    and name ~ '/drivers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.'
    and public.user_can_manage_driver_avatar_object(name)
  );

drop policy if exists "club_assets_driver_photos_update" on storage.objects;
create policy "club_assets_driver_photos_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'club-assets'
    and name ~ '/drivers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.'
    and public.user_can_manage_driver_avatar_object(name)
  )
  with check (
    bucket_id = 'club-assets'
    and name ~ '/drivers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.'
    and public.user_can_manage_driver_avatar_object(name)
  );

drop policy if exists "club_assets_driver_photos_delete" on storage.objects;
create policy "club_assets_driver_photos_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'club-assets'
    and name ~ '/drivers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.'
    and public.user_can_manage_driver_avatar_object(name)
  );

-- Inspect existing policies on this bucket (optional):
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and (qual like '%driver-avatars%' or with_check like '%driver-avatars%');
