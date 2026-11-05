-- Fully remove two test Auth users and their club data so signup can be retried.
-- Run in the Supabase SQL editor as postgres. Review the preview, then the transaction.
--
-- Deletes: auth user, profile, household memberships, drivers, club_members,
-- nominations, credits, messages, notifications, push subscriptions, admin grants.
-- Does not delete clubs, events, classes, or other members.

-- ---------------------------------------------------------------------------
-- Preview (safe to run)
-- ---------------------------------------------------------------------------
select id, email, email_confirmed_at, created_at
from auth.users
where id in (
  '37820250-bf4c-422a-84f3-00a5263e4aeb',
  '625c6234-b34e-4885-b492-63e2493c33f6'
);

select id, email, full_name, first_name, last_name, role
from public.profiles
where id in (
  '37820250-bf4c-422a-84f3-00a5263e4aeb',
  '625c6234-b34e-4885-b492-63e2493c33f6'
);

select id, club_id, email, user_id, membership_type, status
from public.household_memberships
where user_id in (
  '37820250-bf4c-422a-84f3-00a5263e4aeb',
  '625c6234-b34e-4885-b492-63e2493c33f6'
)
or lower(trim(email)) in (
  select lower(trim(email))
  from auth.users
  where id in (
    '37820250-bf4c-422a-84f3-00a5263e4aeb',
    '625c6234-b34e-4885-b492-63e2493c33f6'
  )
);

-- ---------------------------------------------------------------------------
-- Apply wipe
-- ---------------------------------------------------------------------------
begin;

create temp table _wipe_users on commit drop as
select u.id as user_id, lower(trim(u.email)) as email
from auth.users u
where u.id in (
  '37820250-bf4c-422a-84f3-00a5263e4aeb',
  '625c6234-b34e-4885-b492-63e2493c33f6'
);

insert into _wipe_users (user_id, email)
select p.id, lower(trim(p.email))
from public.profiles p
where p.id in (
  '37820250-bf4c-422a-84f3-00a5263e4aeb',
  '625c6234-b34e-4885-b492-63e2493c33f6'
)
and not exists (select 1 from _wipe_users w where w.user_id = p.id);

create temp table _wipe_memberships on commit drop as
select distinct hm.id as membership_id, hm.club_id, hm.user_id
from public.household_memberships hm
where hm.user_id in (select user_id from _wipe_users)
   or lower(trim(hm.email)) in (select email from _wipe_users where email is not null);

create temp table _wipe_drivers on commit drop as
select distinct d.id as driver_id
from public.drivers d
where d.membership_id in (select membership_id from _wipe_memberships)
   or d.created_by in (select user_id from _wipe_users);

delete from public.nomination_entries ne
using public.nominations n
where ne.nomination_id = n.id
  and (
    n.group_id in (select membership_id from _wipe_memberships)
    or n.driver_id in (select driver_id from _wipe_drivers)
  );

delete from public.nominations n
where n.group_id in (select membership_id from _wipe_memberships)
   or n.driver_id in (select driver_id from _wipe_drivers);

delete from public.nomination_credits nc
where nc.group_id in (select membership_id from _wipe_memberships)
   or nc.created_by in (select user_id from _wipe_users);

delete from public.club_messages cm
where cm.membership_id in (select membership_id from _wipe_memberships)
   or cm.sender_user_id in (select user_id from _wipe_users);

do $$
begin
  if to_regclass('public.driver_profiles') is not null then
    delete from public.driver_profiles dp
    where dp.driver_id in (select driver_id from _wipe_drivers);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'numbers'
      and column_name = 'driver_id'
  ) then
    update public.numbers num
    set driver_id = null
    where num.driver_id in (select driver_id from _wipe_drivers);
  end if;
end $$;

delete from public.driver_classes dc
where dc.driver_id in (select driver_id from _wipe_drivers);

delete from public.club_members cm
where cm.membership_id in (select membership_id from _wipe_memberships)
   or cm.driver_id in (select driver_id from _wipe_drivers);

delete from public.drivers d
where d.id in (select driver_id from _wipe_drivers);

delete from public.club_admin_grants g
where g.user_id in (select user_id from _wipe_users);

delete from public.notifications n
where n.user_id in (select user_id from _wipe_users);

delete from public.push_subscriptions ps
where ps.user_id in (select user_id from _wipe_users);

delete from public.household_memberships hm
where hm.id in (select membership_id from _wipe_memberships);

delete from public.profiles p
where p.id in (select user_id from _wipe_users);

delete from auth.users u
where u.id in (select user_id from _wipe_users);

commit;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- select id, email from auth.users
-- where id in (
--   '37820250-bf4c-422a-84f3-00a5263e4aeb',
--   '625c6234-b34e-4885-b492-63e2493c33f6'
-- );
--
-- select id, email, user_id from public.household_memberships
-- where user_id in (
--   '37820250-bf4c-422a-84f3-00a5263e4aeb',
--   '625c6234-b34e-4885-b492-63e2493c33f6'
-- );
