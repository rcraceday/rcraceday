-- In-app notification feed (Home + NotificationProvider).
-- Safe if public.notifications already exists with an older schema.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Align with edge function + app (add only missing columns)
alter table public.notifications
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.notifications
  add column if not exists club_id uuid references public.clubs (id) on delete cascade;

alter table public.notifications
  add column if not exists title text;

alter table public.notifications
  add column if not exists body text not null default '';

alter table public.notifications
  add column if not exists read boolean not null default false;

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  add column if not exists created_at timestamptz not null default now();

-- Legacy column names (best-effort backfill)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'message'
  ) then
    execute $q$
      update public.notifications
      set
        title = coalesce(title, left(message, 500)),
        body = case when coalesce(body, '') = '' then coalesce(message, '') else body end
      where coalesce(title, '') = '' or coalesce(body, '') = '';
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'profile_id'
  ) then
    execute $q$
      update public.notifications
      set user_id = coalesce(user_id, profile_id)
      where user_id is null and profile_id is not null;
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'is_read'
  ) then
    execute $q$
      update public.notifications
      set read = coalesce(read, is_read, false),
          is_read = coalesce(is_read, read, false);
    $q$;
  end if;
end $$;

-- Run scripts/fix-notifications-read-columns.sql for the read/is_read sync trigger.

create index if not exists notifications_user_club_created_idx
  on public.notifications (user_id, club_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
