-- Remove ONE test user from app tables + auth so you can retry flows from scratch.
-- Run in Supabase → SQL → as postgres (or a role that can delete from auth.users).
--
-- Deletes: nominations, driver_classes, drivers (by membership_id, created_by, platform_person_id),
-- club_members, household_memberships for that user,
-- profile (user_transponders & platform_people), notifications, push,
-- club_admin_grants, then auth.users.
--
-- If you sign in again with a NEW auth user id but the SAME email, set v_email to that email so
-- household_memberships and orphan club drivers (no created_by) at those clubs are included.
-- Does not delete clubs, events, or other members' data.
--
-- ---------------------------------------------------------------------------
-- STEP 1 — Preview (replace UUID / email)
-- ---------------------------------------------------------------------------
/*
select id, email, email_confirmed_at, created_at
from auth.users
where id = 'YOUR-USER-UUID'::uuid;

select id, email from public.profiles where id = 'YOUR-USER-UUID'::uuid;

select id, club_id, email, user_id, membership_type
from public.household_memberships
where user_id = 'YOUR-USER-UUID'::uuid
   or lower(trim(email)) = lower(trim('you@example.com'));
*/

-- ---------------------------------------------------------------------------
-- STEP 2 — Edit v_user_id (and optionally v_email) in the block below, then run all of STEP 2.
--          Use exactly one semicolon after each declare line (not ;;).
-- ---------------------------------------------------------------------------
begin;

do $wipe$
declare
  -- >>> REQUIRED: paste user id from Dashboard → Authentication → Users <<<
  v_user_id uuid := '03caae7a-4186-457e-90fa-5be0f3497d32'::uuid;
  -- >>> OPTIONAL: match household_memberships by email if user_id was not always set <<<
  v_email   text := null::text;  -- e.g. 'racer@example.com'
begin
  if v_user_id is null then
    raise exception 'Set v_user_id to your auth user UUID (replace null in the declare block above).';
  end if;

  create temp table _wipe_users on commit drop as
  select u.id as user_id, lower(trim(u.email)) as email
  from auth.users u
  where u.id = v_user_id
  union
  select p.id, lower(trim(p.email))
  from public.profiles p
  where p.id = v_user_id
     or (v_email is not null and lower(trim(p.email)) = lower(trim(v_email)));

  create temp table _wipe_memberships on commit drop as
  select distinct hm.id as membership_id, hm.club_id, hm.user_id
  from public.household_memberships hm
  where hm.user_id in (select user_id from _wipe_users)
     or lower(trim(hm.email)) in (select email from _wipe_users where email is not null);

  create temp table _wipe_drivers on commit drop as
  select distinct d.id as driver_id
  from public.drivers d
  where d.membership_id in (select membership_id from _wipe_memberships)
     or d.created_by in (select user_id from _wipe_users)
     or (
       to_regclass('public.platform_people') is not null
       and d.platform_person_id in (
         select pp.id
         from public.platform_people pp
         where pp.user_id in (select user_id from _wipe_users)
       )
     )
     or (
       v_email is not null
       and d.membership_id is null
       and d.created_by is null
       and exists (
         select 1
         from _wipe_memberships wm
         where wm.club_id = d.club_id
       )
     );

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

  delete from public.driver_classes dc
  where dc.driver_id in (select driver_id from _wipe_drivers);

  delete from public.club_members cm
  where cm.membership_id in (select membership_id from _wipe_memberships)
     or cm.driver_id in (select driver_id from _wipe_drivers);

  delete from public.drivers d
  where d.id in (select driver_id from _wipe_drivers);

  if to_regclass('public.platform_people') is not null then
    delete from public.platform_people pp
    where pp.user_id in (select user_id from _wipe_users);
  end if;

  if to_regclass('public.user_transponders') is not null then
    delete from public.user_transponders ut
    where ut.user_id in (select user_id from _wipe_users);
  end if;

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
end;
$wipe$;

commit;

-- Verify (replace UUID / email):
-- select id, email from auth.users where id = 'YOUR-UUID'::uuid;
-- select id from public.profiles where id = 'YOUR-UUID'::uuid;
-- select d.id, d.club_id, d.first_name, d.last_name, d.created_by, d.membership_id
-- from public.drivers d
-- where d.created_by = 'YOUR-UUID'::uuid
--    or d.membership_id in (select id from household_memberships where user_id = 'YOUR-UUID'::uuid);
