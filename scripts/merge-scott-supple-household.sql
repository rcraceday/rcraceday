-- Copy ONLY this file into Supabase SQL editor (not JSON results).
-- Merges Cadel junior household into Scott family household.

begin;

do $$
declare
  keep_id uuid := '6a9d8e20-2d6b-48e8-a72d-107ce38ae68f';
  drop_id uuid := '7c414313-f832-41d7-bc00-dd995ad3dd1c';
begin
  update public.household_memberships
  set membership_type = 'family',
      primary_first_name = 'Scott',
      primary_last_name = 'Supple',
      status = 'active'
  where id = keep_id;

  update public.drivers
  set membership_id = keep_id
  where membership_id = drop_id;

  update public.club_members cm
  set membership_id = keep_id
  where cm.membership_id = drop_id
    and not exists (
      select 1 from public.club_members existing
      where existing.membership_id = keep_id
        and lower(trim(existing.first_name)) = lower(trim(cm.first_name))
        and lower(trim(existing.last_name)) = lower(trim(cm.last_name))
    );

  delete from public.club_members where membership_id = drop_id;

  insert into public.club_members (membership_id, first_name, last_name, is_junior, is_life_member)
  select keep_id, 'Cadel', 'Supple', true, false
  where not exists (
    select 1 from public.club_members
    where membership_id = keep_id
      and lower(first_name) = 'cadel' and lower(last_name) = 'supple'
  );

  insert into public.club_members (membership_id, first_name, last_name, is_junior, is_life_member)
  select keep_id, 'Scott', 'Supple', false, false
  where not exists (
    select 1 from public.club_members
    where membership_id = keep_id
      and lower(first_name) = 'scott' and lower(last_name) = 'supple'
  );

  update public.nominations set group_id = keep_id where group_id = drop_id;
  update public.club_messages set membership_id = keep_id where membership_id = drop_id;

  delete from public.household_memberships where id = drop_id;
end $$;

commit;

-- Verify (run after commit):
-- select id, membership_type, primary_first_name, primary_last_name from household_memberships
-- where lower(email) = 'scott.supple77@gmail.com';
