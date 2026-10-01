-- Merge two household_memberships that share the same email into one family household.
-- Example: Scott Supple (adult) + Cadel Supple (junior) on scott.supple77@gmail.com
--
-- BEFORE: Run preview. Pick KEEP_ID = parent/family row, DROP_ID = duplicate (usually junior-only row).
-- AFTER: One household (family), Cadel on club_members (+ drivers relinked).

-- ---------------------------------------------------------------------------
-- 1) PREVIEW — find duplicates
-- ---------------------------------------------------------------------------
select id, email, membership_type, primary_first_name, primary_last_name, user_id, status
from public.household_memberships
where lower(trim(email)) = lower(trim('scott.supple77@gmail.com'))
order by membership_type, created_at;

select cm.id, cm.membership_id, cm.first_name, cm.last_name, cm.is_junior, cm.driver_id
from public.club_members cm
join public.household_memberships hm on hm.id = cm.membership_id
where lower(trim(hm.email)) = lower(trim('scott.supple77@gmail.com'));

select d.id, d.membership_id, d.first_name, d.last_name, d.is_junior
from public.drivers d
join public.household_memberships hm on hm.id = d.membership_id
where lower(trim(hm.email)) = lower(trim('scott.supple77@gmail.com'));

-- ---------------------------------------------------------------------------
-- 2) APPLY — set IDs from preview, then run in one transaction
-- ---------------------------------------------------------------------------
-- KEEP_ID  = household to keep (Scott / family parent — should hold user_id if linked)
-- DROP_ID  = junior-only duplicate household to remove

begin;

-- Scott Supple (KEEP) + Cadel junior household (DROP) — scott.supple77@gmail.com
do $$
declare
  keep_id uuid := '6a9d8e20-2d6b-48e8-a72d-107ce38ae68f';
  drop_id uuid := '7c414313-f832-41d7-bc00-dd995ad3dd1c';
  v_club_id uuid;
begin
  select club_id into v_club_id from public.household_memberships where id = keep_id;
  if v_club_id is null then
    raise exception 'KEEP_ID not found';
  end if;

  update public.household_memberships
  set membership_type = 'family',
      primary_first_name = coalesce(nullif(trim(primary_first_name), ''), 'Scott'),
      primary_last_name = coalesce(nullif(trim(primary_last_name), ''), 'Supple'),
      status = 'active'
  where id = keep_id;

  -- Move drivers to kept household
  update public.drivers
  set membership_id = keep_id
  where membership_id = drop_id;

  -- Move club_members (avoid unique conflicts: delete drop household members if same name exists on keep)
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

  -- Ensure Cadel exists on family household
  insert into public.club_members (membership_id, first_name, last_name, is_junior, is_life_member)
  select keep_id, 'Cadel', 'Supple', true, false
  where not exists (
    select 1 from public.club_members
    where membership_id = keep_id
      and lower(first_name) = 'cadel'
      and lower(last_name) = 'supple'
  );

  -- Ensure Scott is a member row (optional; primary is on household row)
  insert into public.club_members (membership_id, first_name, last_name, is_junior, is_life_member)
  select keep_id, 'Scott', 'Supple', false, false
  where not exists (
    select 1 from public.club_members
    where membership_id = keep_id
      and lower(first_name) = 'scott'
      and lower(last_name) = 'supple'
  );

  -- Nominations / messages / credits use group_id = household id
  update public.nominations set group_id = keep_id where group_id = drop_id;
  update public.nomination_credits set group_id = keep_id where group_id = drop_id;
  update public.club_messages set membership_id = keep_id where membership_id = drop_id;

  delete from public.household_memberships where id = drop_id;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- 3) CSV going forward — one row only, e.g.:
-- membership_type=family, primary Scott Supple, junior_a Cadel Supple, email scott.supple77@gmail.com
-- ---------------------------------------------------------------------------
