-- Phase 1: platform directory, optional directory profile, primary club.
-- Run in Supabase SQL editor.

alter table public.profiles
  add column if not exists primary_club_id uuid references public.clubs (id) on delete set null;

comment on column public.profiles.primary_club_id is
  'User default club for /launch and PWA; changeable anytime from club directory.';

alter table public.clubs
  add column if not exists platform_subscribed boolean not null default false;

comment on column public.clubs.platform_subscribed is
  'When true, club appears on rcraceday.com club directory (subscribed tenants only).';

alter table public.clubs
  add column if not exists directory_profile jsonb not null default '{}'::jsonb;

comment on column public.clubs.directory_profile is
  'Optional public directory fields: tagline, scales_offered[], classes_offered, etc.';

create index if not exists clubs_platform_subscribed_idx
  on public.clubs (platform_subscribed)
  where platform_subscribed = true;

-- Authenticated users can set their own primary club.
drop policy if exists "profiles_update_own_primary_club" on public.profiles;
create policy "profiles_update_own_primary_club"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Enable directory for existing tenants during rollout (adjust slug as needed):
-- update public.clubs set platform_subscribed = true where slug in ('chargers-rc', 'rcraceday');
