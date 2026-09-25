-- Per event-type + track templates used by Event Defaults and new-event autofill.
-- Shape: { by_track: { "<track_uuid>": { pricing, timing, class_limit, ... } } }
-- Copied into events at create time; events.pricing / events.days remain source of truth.
-- Do not put these fields on public.nominations.

alter table public.club_event_types
  add column if not exists defaults jsonb not null default '{}'::jsonb;

alter table public.club_event_types enable row level security;

drop policy if exists "club_event_types_select_authenticated" on public.club_event_types;
create policy "club_event_types_select_authenticated"
  on public.club_event_types
  for select
  to authenticated
  using (true);

drop policy if exists "club_event_types_update_admin" on public.club_event_types;
create policy "club_event_types_update_admin"
  on public.club_event_types
  for update
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

notify pgrst, 'reload schema';
