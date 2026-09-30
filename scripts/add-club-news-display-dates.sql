-- Optional display window for published club news (carousel, news list, detail).
-- Run in Supabase SQL editor after create-club-news.sql.

alter table public.club_news
  add column if not exists display_from timestamptz,
  add column if not exists display_until timestamptz;

alter table public.club_news
  drop constraint if exists club_news_display_range;

alter table public.club_news
  add constraint club_news_display_range check (
    display_from is null
    or display_until is null
    or display_until > display_from
  );

comment on column public.club_news.display_from is
  'When set, members only see this item from this time (inclusive). Null = no start limit.';
comment on column public.club_news.display_until is
  'When set, members stop seeing this item at this time (exclusive). Null = no end limit.';

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
