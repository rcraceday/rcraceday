-- Reset a test account for "existing member" signup (member lookup + create-user + login link).
--
-- Keeps: public.household_memberships row(s) for the email (user_id cleared).
-- Removes: auth user, profile, drivers, club_members, nominations, messages, etc.
--
-- Run in Supabase SQL Editor as postgres / service role.
-- Review the preview queries first, then run the transaction block.

-- ---------------------------------------------------------------------------
-- Preview (safe to run)
-- ---------------------------------------------------------------------------
select id, club_id, email, user_id, membership_type, status
from public.household_memberships
where lower(trim(email)) = lower(trim('sales@deathscrowco.com'));

select id, email, email_confirmed_at, created_at
from auth.users
where lower(trim(email)) = lower(trim('sales@deathscrowco.com'));

-- ---------------------------------------------------------------------------
-- Apply reset
-- ---------------------------------------------------------------------------
begin;

create temp table _reset_memberships on commit drop as
select
  hm.id as membership_id,
  hm.club_id,
  hm.user_id
from public.household_memberships hm
where lower(trim(hm.email)) = lower(trim('sales@deathscrowco.com'));

create temp table _reset_user_ids on commit drop as
select distinct uid as user_id
from (
  select user_id as uid from _reset_memberships where user_id is not null
  union
  select u.id as uid
  from auth.users u
  where lower(trim(u.email)) = lower(trim('sales@deathscrowco.com'))
) s
where uid is not null;

create temp table _reset_driver_ids on commit drop as
select distinct d.id as driver_id
from public.drivers d
where d.membership_id in (select membership_id from _reset_memberships)
   or d.created_by in (select user_id from _reset_user_ids);

-- Nominations (entries cascade from nominations in this schema)
delete from public.nomination_entries ne
using public.nominations n
where ne.nomination_id = n.id
  and (
    n.group_id in (select membership_id from _reset_memberships)
    or n.driver_id in (select driver_id from _reset_driver_ids)
  );

delete from public.nominations n
where n.group_id in (select membership_id from _reset_memberships)
   or n.driver_id in (select driver_id from _reset_driver_ids);

delete from public.nomination_credits nc
where nc.group_id in (select membership_id from _reset_memberships);

delete from public.club_messages cm
where cm.membership_id in (select membership_id from _reset_memberships);

-- Unassign race numbers if the column exists (no-op on older schemas)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'numbers'
      and column_name = 'driver_id'
  ) then
    update public.numbers num
    set driver_id = null
    where num.driver_id in (select driver_id from _reset_driver_ids);
  end if;
end $$;

delete from public.driver_classes dc
where dc.driver_id in (select driver_id from _reset_driver_ids);

delete from public.club_members cm
where cm.membership_id in (select membership_id from _reset_memberships);

delete from public.drivers d
where d.id in (select driver_id from _reset_driver_ids);

delete from public.notifications n
where n.user_id in (select user_id from _reset_user_ids);

delete from public.push_subscriptions ps
where ps.user_id in (select user_id from _reset_user_ids);

-- Detach auth user from membership but keep the club membership record
update public.household_memberships hm
set user_id = null
where hm.id in (select membership_id from _reset_memberships);

delete from public.profiles p
where p.id in (select user_id from _reset_user_ids);

delete from auth.users u
where u.id in (select user_id from _reset_user_ids);

commit;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- select id, club_id, email, user_id, membership_type, status
-- from public.household_memberships
-- where lower(trim(email)) = lower(trim('sales@deathscrowco.com'));
--
-- select count(*) from auth.users
-- where lower(trim(email)) = lower(trim('sales@deathscrowco.com'));
