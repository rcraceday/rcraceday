-- Event results import (LiveTime Round Result XLS or LiveRC URL) and championship link.
-- Run in the Supabase SQL editor.

alter table public.events
  add column if not exists championship_id uuid references public.championships (id) on delete set null,
  add column if not exists championship_round integer;

create index if not exists events_championship_id_idx
  on public.events (championship_id);

comment on column public.events.championship_id is
  'Optional championship this event scores toward.';

create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  source text not null default 'livetime_xls'
    check (source in ('livetime_xls', 'liverc_url')),
  source_label text,
  source_url text,
  liverc_event_id text,
  published boolean not null default true,
  imported_at timestamptz not null default now(),
  imported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_results_event_unique unique (event_id)
);

create index if not exists event_results_club_published_idx
  on public.event_results (club_id, published, imported_at desc);

comment on table public.event_results is
  'One imported result set per event, from a LiveTime workbook or LiveRC URL.';

create table if not exists public.event_result_races (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.event_results (id) on delete cascade,
  class_name text not null,
  main_letter text,
  main_number integer,
  round_label text,
  race_kind text not null default 'main'
    check (race_kind in ('main', 'qualifying', 'heat')),
  sort_index integer not null default 0,
  source_race_id text
);

create index if not exists event_result_races_result_idx
  on public.event_result_races (result_id, sort_index);

create table if not exists public.event_result_entries (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.event_result_races (id) on delete cascade,
  driver_id uuid references public.drivers (id) on delete set null,
  driver_name_raw text not null,
  position integer,
  car_number text,
  manufacturer text,
  is_tq boolean not null default false,
  laps integer,
  total_time_ms integer,
  laps_time_label text,
  fast_lap_ms integer,
  avg_lap_ms integer,
  seed integer,
  top3_con_ms integer,
  consistency_pct numeric,
  status text,
  sort_index integer not null default 0
);

create index if not exists event_result_entries_race_idx
  on public.event_result_entries (race_id, sort_index);

create index if not exists event_result_entries_driver_idx
  on public.event_result_entries (driver_id)
  where driver_id is not null;

create table if not exists public.event_result_overall (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.event_results (id) on delete cascade,
  class_name text not null,
  main_letter text not null default 'A',
  position integer not null,
  overall_position integer,
  driver_id uuid references public.drivers (id) on delete set null,
  driver_name_raw text not null,
  is_tq boolean not null default false,
  ifmar_points integer,
  tie_breaker text,
  mains jsonb not null default '[]'::jsonb
);

create index if not exists event_result_overall_result_idx
  on public.event_result_overall (result_id, class_name, overall_position);

create or replace function public.event_results_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists event_results_before_write on public.event_results;
create trigger event_results_before_write
  before insert or update on public.event_results
  for each row
  execute function public.event_results_before_write();

alter table public.event_results enable row level security;
alter table public.event_result_races enable row level security;
alter table public.event_result_entries enable row level security;
alter table public.event_result_overall enable row level security;

drop policy if exists "event_results_select_member" on public.event_results;
create policy "event_results_select_member"
  on public.event_results
  for select
  to authenticated
  using (
    published = true
    and exists (
      select 1
      from public.household_memberships hm
      where hm.club_id = event_results.club_id
        and hm.user_id = auth.uid()
        and hm.status = 'active'
    )
  );

drop policy if exists "event_results_select_admin" on public.event_results;
create policy "event_results_select_admin"
  on public.event_results
  for select
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "event_results_insert_admin" on public.event_results;
create policy "event_results_insert_admin"
  on public.event_results
  for insert
  to authenticated
  with check (public.user_is_club_admin());

drop policy if exists "event_results_update_admin" on public.event_results;
create policy "event_results_update_admin"
  on public.event_results
  for update
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "event_results_delete_admin" on public.event_results;
create policy "event_results_delete_admin"
  on public.event_results
  for delete
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "event_result_races_select_member" on public.event_result_races;
create policy "event_result_races_select_member"
  on public.event_result_races
  for select
  to authenticated
  using (
    exists (
      select 1 from public.event_results r
      where r.id = result_id
        and (
          public.user_is_club_admin()
          or (
            r.published = true
            and exists (
              select 1 from public.household_memberships hm
              where hm.club_id = r.club_id
                and hm.user_id = auth.uid()
                and hm.status = 'active'
            )
          )
        )
    )
  );

drop policy if exists "event_result_races_write_admin" on public.event_result_races;
create policy "event_result_races_write_admin"
  on public.event_result_races
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "event_result_entries_select_member" on public.event_result_entries;
create policy "event_result_entries_select_member"
  on public.event_result_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.event_result_races race
      join public.event_results r on r.id = race.result_id
      where race.id = race_id
        and (
          public.user_is_club_admin()
          or (
            r.published = true
            and exists (
              select 1 from public.household_memberships hm
              where hm.club_id = r.club_id
                and hm.user_id = auth.uid()
                and hm.status = 'active'
            )
          )
        )
    )
  );

drop policy if exists "event_result_entries_write_admin" on public.event_result_entries;
create policy "event_result_entries_write_admin"
  on public.event_result_entries
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "event_result_overall_select_member" on public.event_result_overall;
create policy "event_result_overall_select_member"
  on public.event_result_overall
  for select
  to authenticated
  using (
    exists (
      select 1 from public.event_results r
      where r.id = result_id
        and (
          public.user_is_club_admin()
          or (
            r.published = true
            and exists (
              select 1 from public.household_memberships hm
              where hm.club_id = r.club_id
                and hm.user_id = auth.uid()
                and hm.status = 'active'
            )
          )
        )
    )
  );

drop policy if exists "event_result_overall_write_admin" on public.event_result_overall;
create policy "event_result_overall_write_admin"
  on public.event_result_overall
  for all
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

grant select, insert, update, delete on public.event_results to authenticated;
grant select, insert, update, delete on public.event_result_races to authenticated;
grant select, insert, update, delete on public.event_result_entries to authenticated;
grant select, insert, update, delete on public.event_result_overall to authenticated;
