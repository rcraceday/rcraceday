-- Re-apply nomination insert/update checks for driver access limits.
-- Run after scripts/add-driver-access-restrictions.sql

drop policy if exists "nominations_insert_household" on public.nominations;
create policy "nominations_insert_household"
  on public.nominations
  for insert
  to authenticated
  with check (
    public.nomination_belongs_to_user_household(group_id, driver_id)
    and club_id is not null
    and public.nomination_event_club_matches(event_id, club_id)
    and not public.household_app_access_suspended(group_id)
    and public.driver_can_nominate(driver_id, event_id)
  );

drop policy if exists "nominations_update_household" on public.nominations;
create policy "nominations_update_household"
  on public.nominations
  for update
  to authenticated
  using (public.nomination_belongs_to_user_household(group_id, driver_id))
  with check (
    public.nomination_belongs_to_user_household(group_id, driver_id)
    and public.nomination_event_club_matches(event_id, club_id)
    and not public.household_app_access_suspended(group_id)
    and public.driver_can_nominate(driver_id, event_id)
  );