-- Allow club administrators to save branding and other club settings.
-- Run this in the Supabase SQL editor for the project database.

alter table public.clubs enable row level security;

drop policy if exists "Club admins can update their club" on public.clubs;

create policy "Club admins can update their club"
on public.clubs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  and exists (
    select 1
    from public.household_memberships
    where household_memberships.user_id = auth.uid()
      and household_memberships.club_id = clubs.id
      and household_memberships.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  and exists (
    select 1
    from public.household_memberships
    where household_memberships.user_id = auth.uid()
      and household_memberships.club_id = clubs.id
      and household_memberships.status = 'active'
  )
);
