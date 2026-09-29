-- Allow non-member households to add multiple drivers up to club max_adults / max_juniors
-- (same slot rules as family membership in the app).
-- Run in Supabase SQL editor if inserts fail with RLS after the first non-member driver.

create or replace function public.user_can_insert_non_member_driver(
  p_club_id uuid,
  p_is_junior boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_max_adults integer;
  v_max_juniors integer;
  v_adults integer;
  v_juniors integer;
begin
  if p_club_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.household_memberships hm
    where hm.user_id = auth.uid()
      and hm.club_id = p_club_id
      and hm.status = 'active'
      and lower(trim(hm.membership_type)) = 'non_member'
  ) then
    return false;
  end if;

  select coalesce(c.max_adults, 0), coalesce(c.max_juniors, 0)
  into v_max_adults, v_max_juniors
  from public.clubs c
  where c.id = p_club_id;

  select
    count(*) filter (where not coalesce(d.is_junior, false)),
    count(*) filter (where coalesce(d.is_junior, false))
  into v_adults, v_juniors
  from public.drivers d
  where d.club_id = p_club_id
    and d.membership_id is null
    and d.created_by = auth.uid();

  if coalesce(p_is_junior, false) then
    return v_juniors < v_max_juniors;
  end if;

  return v_adults < v_max_adults;
end;
$$;

-- If a stricter insert policy still blocks a second driver, inspect:
--   select policyname, cmd, qual, with_check from pg_policies where tablename = 'drivers';
-- Drop or update any policy that only allows a single non-member driver, then re-run this script.

drop policy if exists "drivers_insert_non_member" on public.drivers;

create policy "drivers_insert_non_member"
  on public.drivers
  for insert
  to authenticated
  with check (
    membership_id is null
    and created_by = auth.uid()
    and public.user_can_insert_non_member_driver(club_id, is_junior)
  );
