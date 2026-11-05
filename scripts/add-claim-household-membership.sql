-- Lets an authenticated RCRaceday user attach an unlinked club membership
-- that was stored under a different email than their login.

create or replace function public.claim_household_membership(
  p_club_id uuid,
  p_membership_email text
)
returns public.household_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_membership_email, '')));
  v_target public.household_memberships;
  v_existing public.household_memberships;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_club_id is null or v_email = '' then
    return null;
  end if;

  select *
    into v_target
  from public.household_memberships
  where club_id = p_club_id
    and lower(trim(email)) = v_email
  order by case when membership_type = 'non_member' then 1 else 0 end,
           created_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if v_target.membership_type = 'non_member' then
    return null;
  end if;

  if v_target.user_id is not null and v_target.user_id <> auth.uid() then
    raise exception 'membership_already_linked';
  end if;

  select *
    into v_existing
  from public.household_memberships
  where club_id = p_club_id
    and user_id = auth.uid()
  order by case when membership_type = 'non_member' then 1 else 0 end
  limit 1
  for update;

  if found and v_existing.id <> v_target.id then
    if v_existing.membership_type is distinct from 'non_member' then
      raise exception 'already_has_membership';
    end if;

    update public.household_memberships
    set user_id = null
    where id = v_existing.id;
  end if;

  update public.household_memberships
  set user_id = auth.uid()
  where id = v_target.id
  returning * into v_target;

  return v_target;
end;
$$;

revoke all on function public.claim_household_membership(uuid, text) from public;
grant execute on function public.claim_household_membership(uuid, text) to authenticated;
