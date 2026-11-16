-- Event ban = barred from the next N upcoming club events (not a lifetime entry quota).
-- Run after add-driver-access-restrictions.sql if you already applied the original script.

update public.drivers
set access_restriction = 'event_ban'
where access_restriction = 'event_cap';

alter table public.drivers drop constraint if exists drivers_access_restriction_check;

alter table public.drivers
  add constraint drivers_access_restriction_check
  check (access_restriction in ('none', 'event_ban', 'no_events', 'no_app'));

comment on column public.drivers.event_entry_limit is
  'When access_restriction = event_ban: number of upcoming club events the driver may not enter.';

comment on column public.drivers.access_restriction is
  'none | event_ban | no_events | no_app — event ban uses next N events on the calendar; no_events excludes all racing.';

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
  v_ban integer;
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
    v_ban := d.event_entry_limit;
    if v_ban is null or v_ban < 1 then
      return false;
    end if;
    if public.driver_has_nomination_for_event(p_driver_id, p_event_id) then
      return true;
    end if;
    if public.driver_is_on_event_ban_list(d.club_id, p_event_id, v_ban) then
      return false;
    end if;
    return true;
  end if;

  return true;
end;
$$;

grant execute on function public.driver_is_on_event_ban_list(uuid, uuid, integer) to authenticated;