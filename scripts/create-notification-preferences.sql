-- Member notification preferences + event-level nominations-open broadcast flag.
-- In-app rows use public.notifications (existing table).
-- Email delivery: wire a Supabase Edge Function / cron to read preferences via shouldNotify* logic in app.

alter table public.household_memberships
  add column if not exists notification_preferences jsonb not null default '{
    "in_app_enabled": true,
    "email_enabled": true,
    "nominations_open_enabled": true,
    "membership_renewal_enabled": true,
    "track_ids": null
  }'::jsonb;

alter table public.events
  add column if not exists notify_nominations_open boolean not null default false;

comment on column public.events.notify_nominations_open is
  'When true, send nominations-open in-app + email to all eligible members even if they disabled notifications.';

-- Members update own preferences
drop policy if exists "household_memberships_update_own_preferences" on public.household_memberships;
create policy "household_memberships_update_own_preferences"
  on public.household_memberships
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins read profiles for messaging / directory (if not already present)
drop policy if exists "profiles_select_club_admin" on public.profiles;
create policy "profiles_select_club_admin"
  on public.profiles
  for select
  to authenticated
  using (public.user_is_club_admin());
