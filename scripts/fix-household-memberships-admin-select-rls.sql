-- App admin access: public.profiles.role = 'admin' (see Header.jsx, HamburgerMenu.jsx).
-- Lets profile admins read all household memberships for dashboard/reports.
-- public.club_admins is not used by this app.

create or replace function public.user_is_club_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

drop policy if exists "household_memberships_select_club_admin" on public.household_memberships;
create policy "household_memberships_select_club_admin"
  on public.household_memberships
  for select
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "drivers_select_club_admin" on public.drivers;
create policy "drivers_select_club_admin"
  on public.drivers
  for select
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "club_members_select_club_admin" on public.club_members;
create policy "club_members_select_club_admin"
  on public.club_members
  for select
  to authenticated
  using (public.user_is_club_admin());
