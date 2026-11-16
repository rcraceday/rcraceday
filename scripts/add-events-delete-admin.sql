-- Allow club admins to delete events (and related rows needed for ON DELETE CASCADE under RLS).
-- Run in Supabase SQL Editor if Admin → Delete event fails with a generic error.

alter table public.events enable row level security;

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin"
  on public.events
  for delete
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'events'));

-- Cascaded nomination deletes require a DELETE policy admins can satisfy.
drop policy if exists "nominations_delete_events_admin" on public.nominations;
create policy "nominations_delete_events_admin"
  on public.nominations
  for delete
  to authenticated
  using (
    public.user_has_club_admin_permission(club_id, 'nominations')
    or public.user_has_club_admin_permission(club_id, 'events')
  );