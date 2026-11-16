-- Per-driver access limits (event cap, no events, app access) + optional household app suspend.
-- Run in Supabase SQL editor, then scripts/add-driver-access-restrictions-rls.sql

alter table public.drivers
  add column if not exists access_restriction text not null default 'none';

alter table public.drivers
  drop constraint if exists drivers_access_restriction_check;

alter table public.drivers
  add constraint drivers_access_restriction_check
  check (access_restriction in ('none', 'event_ban', 'no_events', 'no_app'));

alter table public.drivers
  add column if not exists access_site_scope text not null default 'driver';

alter table public.drivers
  drop constraint if exists drivers_access_site_scope_check;

alter table public.drivers
  add constraint drivers_access_site_scope_check
  check (access_site_scope in ('driver', 'household'));

alter table public.drivers
  add column if not exists event_entry_limit integer;

alter table public.drivers
  add column if not exists access_restriction_note text;

alter table public.drivers
  add column if not exists access_restriction_until timestamptz;

comment on column public.drivers.event_entry_limit is
  'When access_restriction = event_ban: number of upcoming club events the driver may not enter.';

comment on column public.drivers.access_restriction is
  'none | event_ban | no_events | no_app — event ban blocks the next N calendar events; no_events excludes all racing.';

alter table public.household_memberships
  add column if not exists app_access_suspended boolean not null default false;

alter table public.household_memberships
  add column if not exists app_access_suspend_note text;

alter table public.household_memberships
  add column if not exists app_access_suspend_until timestamptz;

-- ---------------------------------------------------------------------------
-- Helpers for RLS / policies
-- ---------------------------------------------------------------------------

create or replace function public.driver_access_restriction_active(
  p_restriction text,
  p_until timestamptz
)
returns boolean
language sql
stable
as $$
  select
    coalesce(p_restriction, 'none') <> 'none'
    and (p_until is null or p_until > now());
$$;

create or replace function public.household_app_access_suspended(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_memberships hm
    where hm.id = p_group_id
      and hm.app_access_suspended is true
      and (hm.app_access_suspend_until is null or hm.app_access_suspend_until > now())
  );
$$;

create or replace function public.driver_nominated_distinct_events(p_driver_id uuid, p_club_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct n.event_id)::integer
  from public.nominations n
  where n.driver_id = p_driver_id
    and n.club_id = p_club_id;
$$;

create or replace function public.driver_has_nomination_for_event(
  p_driver_id uuid,
  p_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nominations n
    where n.driver_id = p_driver_id
      and n.event_id = p_event_id
  );
$$;

create or replace function public.driver_is_on_event_ban_list(
  p_club_id uuid,
  p_event_id uuid,
  p_ban_count integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select e.id
      from public.events e
      where e.club_id = p_club_id
        and e.event_date is not null
        and e.event_date::date >= current_date
      order by e.event_date asc, e.id asc
      limit greatest(p_ban_count, 0)
    ) upcoming
    where upcoming.id = p_event_id
  );
$$;

create or replace function public.driver_can_nominate(p_driver_id uuid, p_event_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.drivers%rowtype;
  v_limit integer;
begin
  select * into d from public.drivers where id = p_driver_id;
  if not found then
    return false;
  end if;

  if not public.driver_access_restriction_active(d.access_restriction, d.access_restriction_until) then
    return true;
  end if;

  if d.access_restriction in ('no_events', 'no_app') then
    return false;
  end if;

  if d.access_restriction = 'event_ban' then
    v_limit := d.event_entry_limit;
    if v_limit is null or v_limit < 1 then
      return false;
    end if;
    if public.driver_has_nomination_for_event(p_driver_id, p_event_id) then
      return true;
    end if;
    return not public.driver_is_on_event_ban_list(d.club_id, p_event_id, v_limit);
  end if;

  return true;
end;
$$;

grant execute on function public.driver_access_restriction_active(text, timestamptz) to authenticated;
grant execute on function public.household_app_access_suspended(uuid) to authenticated;
grant execute on function public.driver_nominated_distinct_events(uuid, uuid) to authenticated;
grant execute on function public.driver_has_nomination_for_event(uuid, uuid) to authenticated;
grant execute on function public.driver_is_on_event_ban_list(uuid, uuid, integer) to authenticated;
grant execute on function public.driver_can_nominate(uuid, uuid) to authenticated;