-- Re-apply after create-nominations-rls.sql if inserts still fail (RCRA / household checks).
-- Safe to run multiple times.

create or replace function public.nomination_belongs_to_user_household(p_group_id uuid, p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_group_id in (select public.user_household_membership_ids())
     and public.user_can_manage_driver(p_driver_id)
     and exists (
       select 1
       from public.drivers d
       where d.id = p_driver_id
         and (
           d.membership_id = p_group_id
           or (d.membership_id is null and d.created_by = auth.uid())
         )
     );
$$;

drop policy if exists "nominations_insert_household" on public.nominations;
create policy "nominations_insert_household"
  on public.nominations
  for insert
  to authenticated
  with check (
    public.nomination_belongs_to_user_household(group_id, driver_id)
    and club_id is not null
    and public.nomination_event_club_matches(event_id, club_id)
  );
