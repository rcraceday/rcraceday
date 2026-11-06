-- Phase 1 backfill: distinct transponder numbers from driver_classes → user_transponders.
-- Prerequisite: scripts/add-user-transponders.sql
-- Safe to re-run (on conflict do nothing).

insert into public.user_transponders (user_id, number, label)
select distinct
  hm.user_id,
  trim(dc.transponder_number) as number,
  '' as label
from public.driver_classes dc
join public.drivers d on d.id = dc.driver_id
join public.household_memberships hm on hm.id = d.membership_id
where hm.user_id is not null
  and trim(coalesce(dc.transponder_number, '')) <> ''
  and trim(dc.transponder_number) ~ '^[0-9]{1,8}$'
on conflict (user_id, number) do nothing;

-- Link existing assignments where number matches inventory.
update public.driver_classes dc
set user_transponder_id = ut.id
from public.drivers d
join public.household_memberships hm on hm.id = d.membership_id
join public.user_transponders ut on ut.user_id = hm.user_id
where dc.driver_id = d.id
  and dc.user_transponder_id is null
  and trim(coalesce(dc.transponder_number, '')) <> ''
  and ut.number = trim(dc.transponder_number);
