-- Championships (admin create + member standings). Safe to run multiple times.
-- Run in Supabase SQL Editor if Create Championship fails with RLS on public.championships.

create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null,
  season text not null default '',
  members_only boolean not null default true,
  total_rounds integer not null default 0,
  drop_rounds integer not null default 0,
  classes text[] not null default '{}',
  points_table jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint championships_name_not_blank check (char_length(btrim(name)) > 0)
);

create index if not exists championships_club_id_idx
  on public.championships (club_id, created_at desc);

-- Table may already exist without these columns (create table if not exists skips alters).
alter table public.championships
  add column if not exists created_at timestamptz not null default now();

alter table public.championships
  add column if not exists updated_at timestamptz not null default now();

comment on table public.championships is
  'Club championship series: classes, points table, drop rounds. Events link via events.championship_id.';

create or replace function public.championships_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  if new.name is not null then
    new.name := btrim(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists championships_before_write on public.championships;
create trigger championships_before_write
  before insert or update on public.championships
  for each row
  execute function public.championships_before_write();

-- Same admin check as club_news / event_results (profiles.role = 'admin').
create or replace function public.user_is_club_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

alter table public.championships enable row level security;

drop policy if exists "championships_select_member" on public.championships;
create policy "championships_select_member"
  on public.championships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_memberships hm
      where hm.club_id = championships.club_id
        and hm.user_id = auth.uid()
        and hm.status = 'active'
    )
  );

drop policy if exists "championships_select_admin" on public.championships;
create policy "championships_select_admin"
  on public.championships
  for select
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "championships_insert_admin" on public.championships;
create policy "championships_insert_admin"
  on public.championships
  for insert
  to authenticated
  with check (public.user_is_club_admin());

drop policy if exists "championships_update_admin" on public.championships;
create policy "championships_update_admin"
  on public.championships
  for update
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "championships_delete_admin" on public.championships;
create policy "championships_delete_admin"
  on public.championships
  for delete
  to authenticated
  using (public.user_is_club_admin());
