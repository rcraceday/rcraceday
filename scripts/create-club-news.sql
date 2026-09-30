-- Club news items for the home carousel + optional member notifications.
-- Redeploy process-nominations-open after this script (it also delivers news alerts).

create table if not exists public.club_news (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  title text not null,
  body text not null default '',
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  notify_members boolean not null default false,
  notify_mode text not null default 'on_publish'
    check (notify_mode in ('on_publish', 'scheduled')),
  notify_at timestamptz,
  notified_at timestamptz,
  display_from timestamptz,
  display_until timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_news_title_not_blank check (char_length(btrim(title)) > 0),
  constraint club_news_display_range check (
    display_from is null
    or display_until is null
    or display_until > display_from
  )
);

create index if not exists club_news_club_published_idx
  on public.club_news (club_id, is_published, published_at desc);

create index if not exists club_news_notify_due_idx
  on public.club_news (notify_members, notified_at, notify_at)
  where notify_members = true and notified_at is null;

comment on table public.club_news is
  'Club news shown on the home carousel. Optional push/email/in-app when published or at notify_at.';

create or replace function public.club_news_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.title := btrim(new.title);

  if new.is_published then
    new.published_at := coalesce(new.published_at, now());
  end if;

  if tg_op = 'UPDATE' then
    if new.notify_members is distinct from old.notify_members
       or new.notify_mode is distinct from old.notify_mode
       or new.notify_at is distinct from old.notify_at
       or new.is_published is distinct from old.is_published
    then
      new.notified_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists club_news_before_write on public.club_news;
create trigger club_news_before_write
  before insert or update on public.club_news
  for each row
  execute function public.club_news_before_write();

alter table public.club_news enable row level security;

drop policy if exists "club_news_select_member" on public.club_news;
create policy "club_news_select_member"
  on public.club_news
  for select
  to authenticated
  using (
    is_published = true
    and (display_from is null or display_from <= now())
    and (display_until is null or display_until > now())
    and exists (
      select 1
      from public.household_memberships hm
      where hm.club_id = club_news.club_id
        and hm.user_id = auth.uid()
        and hm.status = 'active'
    )
  );

drop policy if exists "club_news_select_admin" on public.club_news;
create policy "club_news_select_admin"
  on public.club_news
  for select
  to authenticated
  using (public.user_is_club_admin());

drop policy if exists "club_news_insert_admin" on public.club_news;
create policy "club_news_insert_admin"
  on public.club_news
  for insert
  to authenticated
  with check (public.user_is_club_admin());

drop policy if exists "club_news_update_admin" on public.club_news;
create policy "club_news_update_admin"
  on public.club_news
  for update
  to authenticated
  using (public.user_is_club_admin())
  with check (public.user_is_club_admin());

drop policy if exists "club_news_delete_admin" on public.club_news;
create policy "club_news_delete_admin"
  on public.club_news
  for delete
  to authenticated
  using (public.user_is_club_admin());
