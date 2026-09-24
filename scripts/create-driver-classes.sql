-- Driver ↔ class assignments (per club), with optional track context and transponder.
-- Required by DriverListCard.jsx and EventNominate.jsx.

create table if not exists public.driver_classes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  class_id uuid not null references public.club_classes (id) on delete cascade,
  track_id uuid references public.club_tracks (id) on delete set null,
  transponder_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_classes_driver_class_unique unique (driver_id, class_id)
);

create index if not exists driver_classes_driver_id_idx
  on public.driver_classes (driver_id);

create index if not exists driver_classes_club_id_idx
  on public.driver_classes (club_id);

create index if not exists driver_classes_class_id_idx
  on public.driver_classes (class_id);

create index if not exists driver_classes_track_id_idx
  on public.driver_classes (track_id);

-- Keep updated_at in sync (optional; safe if trigger already exists elsewhere).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists driver_classes_set_updated_at on public.driver_classes;
create trigger driver_classes_set_updated_at
  before update on public.driver_classes
  for each row
  execute function public.set_updated_at();

alter table public.driver_classes enable row level security;

-- Household members (and non-member creators) can manage assignments for their drivers.
create or replace function public.user_can_manage_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    where d.id = p_driver_id
      and (
        d.created_by = auth.uid()
        or exists (
          select 1
          from public.household_memberships hm
          where hm.id = d.membership_id
            and hm.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "driver_classes_select_own" on public.driver_classes;
create policy "driver_classes_select_own"
  on public.driver_classes
  for select
  to authenticated
  using (public.user_can_manage_driver(driver_id));

drop policy if exists "driver_classes_insert_own" on public.driver_classes;
create policy "driver_classes_insert_own"
  on public.driver_classes
  for insert
  to authenticated
  with check (public.user_can_manage_driver(driver_id));

drop policy if exists "driver_classes_update_own" on public.driver_classes;
create policy "driver_classes_update_own"
  on public.driver_classes
  for update
  to authenticated
  using (public.user_can_manage_driver(driver_id))
  with check (public.user_can_manage_driver(driver_id));

drop policy if exists "driver_classes_delete_own" on public.driver_classes;
create policy "driver_classes_delete_own"
  on public.driver_classes
  for delete
  to authenticated
  using (public.user_can_manage_driver(driver_id));

grant select, insert, update, delete on public.driver_classes to authenticated;
