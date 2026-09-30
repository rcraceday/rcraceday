-- Admin membership management + life member flag.
-- Run in Supabase SQL Editor.

alter table public.household_memberships
  add column if not exists is_life_member boolean not null default false;

alter table public.club_members
  add column if not exists is_life_member boolean not null default false;

comment on column public.household_memberships.is_life_member is
  'Household has at least one life member. Membership is free; renew remains optional.';
comment on column public.club_members.is_life_member is
  'This person is a life member (free membership for life).';

-- Admins can manage households, people, and drivers
drop policy if exists "household_memberships_admin_write" on public.household_memberships;
create policy "household_memberships_admin_write"
  on public.household_memberships
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "club_members_admin_write" on public.club_members;
create policy "club_members_admin_write"
  on public.club_members
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "drivers_admin_write" on public.drivers;
create policy "drivers_admin_write"
  on public.drivers
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());
