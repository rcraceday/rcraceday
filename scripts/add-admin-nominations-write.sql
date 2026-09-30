-- Admin can insert, update, and delete nominations and class entries.
-- Run in Supabase SQL Editor.

drop policy if exists "nominations_update_admin" on public.nominations;
drop policy if exists "nominations_admin_write" on public.nominations;
create policy "nominations_admin_write"
  on public.nominations
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "nomination_entries_admin_write" on public.nomination_entries;
create policy "nomination_entries_admin_write"
  on public.nomination_entries
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());
