-- Favorite clubs on platform home (multi-club shortcuts).
-- Run in Supabase SQL editor.

alter table public.profiles
  add column if not exists favorite_club_ids uuid[] not null default '{}';

comment on column public.profiles.favorite_club_ids is
  'Club ids shown on rcraceday.com home; user can pin multiple clubs.';

drop policy if exists "profiles_update_own_favorite_clubs" on public.profiles;
create policy "profiles_update_own_favorite_clubs"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
