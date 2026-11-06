-- Phase 1: global transponder inventory (one account, reused at every club).
-- Run in Supabase SQL editor, then scripts/backfill-user-transponders-from-driver-classes.sql

create table if not exists public.user_transponders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  number text not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_transponders_user_number_unique unique (user_id, number),
  constraint user_transponders_number_format check (number ~ '^[0-9]{1,8}$')
);

create index if not exists user_transponders_user_id_idx
  on public.user_transponders (user_id);

comment on table public.user_transponders is
  'Account-owned transponder numbers; class assignments at each club still live on driver_classes.';

drop trigger if exists user_transponders_set_updated_at on public.user_transponders;
create trigger user_transponders_set_updated_at
  before update on public.user_transponders
  for each row
  execute function public.set_updated_at();

alter table public.user_transponders enable row level security;

drop policy if exists "user_transponders_select_own" on public.user_transponders;
create policy "user_transponders_select_own"
  on public.user_transponders
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_transponders_insert_own" on public.user_transponders;
create policy "user_transponders_insert_own"
  on public.user_transponders
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_transponders_update_own" on public.user_transponders;
create policy "user_transponders_update_own"
  on public.user_transponders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_transponders_delete_own" on public.user_transponders;
create policy "user_transponders_delete_own"
  on public.user_transponders
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.user_transponders to authenticated;

-- Optional link from club class assignment → inventory row (denormalized number kept for exports).
alter table public.driver_classes
  add column if not exists user_transponder_id uuid references public.user_transponders (id) on delete set null;

create index if not exists driver_classes_user_transponder_id_idx
  on public.driver_classes (user_transponder_id)
  where user_transponder_id is not null;

comment on column public.driver_classes.user_transponder_id is
  'When set, transponder_number should match user_transponders.number for that household account.';
