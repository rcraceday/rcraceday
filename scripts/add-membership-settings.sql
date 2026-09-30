-- Club membership configuration: badge, household limits, per-type rules, product benefits.
-- Run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- clubs (global defaults + badge URL)
-- ---------------------------------------------------------------------------
alter table public.clubs
  add column if not exists member_badge_url text,
  add column if not exists max_adults integer,
  add column if not exists max_juniors integer,
  add column if not exists membership_join_enabled boolean not null default true;

comment on column public.clubs.max_adults is
  'Default max adult household slots when a membership type has no override.';
comment on column public.clubs.max_juniors is
  'Default max junior household slots when a membership type has no override.';

-- ---------------------------------------------------------------------------
-- Per-club membership type rules (adult, junior, family, non_member, …)
-- ---------------------------------------------------------------------------
create table if not exists public.club_membership_types (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  type_key text not null,
  display_name text not null,
  enabled boolean not null default true,
  max_household_adults integer not null default 2,
  max_household_juniors integer not null default 2,
  max_drivers integer,
  access_driver_profiles boolean not null default true,
  access_championship_points boolean not null default true,
  discounted_racing boolean not null default false,
  merch_benefits_notes text,
  benefits_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_membership_types_club_type_unique unique (club_id, type_key)
);

create index if not exists club_membership_types_club_id_idx
  on public.club_membership_types (club_id, sort_order);

-- ---------------------------------------------------------------------------
-- Membership products (public.memberships catalog)
-- ---------------------------------------------------------------------------
alter table public.memberships
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists benefits_summary text,
  add column if not exists is_active boolean not null default true,
  add column if not exists access_driver_profiles boolean,
  add column if not exists access_championship_points boolean,
  add column if not exists discounted_racing boolean not null default false,
  add column if not exists sort_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- RLS: club admins manage type configs; members read active products
-- ---------------------------------------------------------------------------
alter table public.club_membership_types enable row level security;

drop policy if exists "club_membership_types_select_authenticated" on public.club_membership_types;
create policy "club_membership_types_select_authenticated"
  on public.club_membership_types
  for select
  to authenticated
  using (true);

drop policy if exists "club_membership_types_admin_write" on public.club_membership_types;
create policy "club_membership_types_admin_write"
  on public.club_membership_types
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "memberships_admin_write" on public.memberships;
create policy "memberships_admin_write"
  on public.memberships
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());
