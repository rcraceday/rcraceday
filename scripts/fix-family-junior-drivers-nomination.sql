-- Family household drivers must be visible when nominating.
-- A second junior can exist as a club_member (or a driver with a stale membership_id)
-- and never appear in EventNominate, which only lists household drivers.
-- Run in Supabase SQL editor.

-- Household members can read every driver on their membership, including
-- drivers linked through club_members if membership_id is missing/stale.
drop policy if exists "drivers_select_household" on public.drivers;
create policy "drivers_select_household"
  on public.drivers
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.household_memberships hm
      where hm.id = drivers.membership_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.club_members cm
      inner join public.household_memberships hm on hm.id = cm.membership_id
      where cm.driver_id = drivers.id
        and hm.user_id = auth.uid()
    )
  );

-- Family/adult/junior households can insert more than one driver.
drop policy if exists "drivers_insert_household" on public.drivers;
create policy "drivers_insert_household"
  on public.drivers
  for insert
  to authenticated
  with check (
    membership_id is not null
    and exists (
      select 1
      from public.household_memberships hm
      where hm.id = membership_id
        and hm.user_id = auth.uid()
    )
  );

-- Relink drivers that belong to a household via club_members but have the wrong membership_id.
update public.drivers d
set membership_id = cm.membership_id
from public.club_members cm
where cm.driver_id = d.id
  and d.membership_id is distinct from cm.membership_id;

-- Fill missing club_id from the household.
update public.drivers d
set club_id = hm.club_id
from public.household_memberships hm
where hm.id = d.membership_id
  and d.club_id is null;
