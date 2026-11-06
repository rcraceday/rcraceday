-- Phase 2: global roster (household racers) per account, linked from club drivers.
-- Run in Supabase SQL editor after Phase 1. Optional: scripts/backfill-platform-people-from-drivers.sql

create table if not exists public.platform_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  is_junior boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_people_user_identity_unique
  on public.platform_people (
    user_id,
    lower(trim(both from first_name)),
    lower(trim(both from last_name)),
    (coalesce(is_junior, false))
  );

comment on table public.platform_people is
  'Account-owned roster (legal names); club-specific rows in drivers link via platform_person_id.';

create index if not exists platform_people_user_id_idx
  on public.platform_people (user_id);

drop trigger if exists platform_people_set_updated_at on public.platform_people;
create trigger platform_people_set_updated_at
  before update on public.platform_people
  for each row
  execute function public.set_updated_at();

alter table public.platform_people enable row level security;

drop policy if exists "platform_people_select_own" on public.platform_people;
create policy "platform_people_select_own"
  on public.platform_people
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "platform_people_insert_own" on public.platform_people;
create policy "platform_people_insert_own"
  on public.platform_people
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "platform_people_update_own" on public.platform_people;
create policy "platform_people_update_own"
  on public.platform_people
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "platform_people_delete_own" on public.platform_people;
create policy "platform_people_delete_own"
  on public.platform_people
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Optional link from club driver row to roster identity (set null if roster row deleted)
alter table public.drivers
  add column if not exists platform_person_id uuid references public.platform_people (id) on delete set null;

create index if not exists drivers_platform_person_id_idx
  on public.drivers (platform_person_id)
  where platform_person_id is not null;
