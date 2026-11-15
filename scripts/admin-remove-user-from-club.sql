-- Permanently remove one user's presence from a single club (membership, drivers,
-- nominations, messages, credits, notifications at that club). Keeps auth.users and
-- global profile; clears primary_club_id / favorite_club_ids for that club.
-- Run in Supabase SQL editor after deploy.
--
-- Callable from the app: supabase.rpc('admin_remove_user_from_club', { p_club_id, p_user_id })

create or replace function public.admin_remove_user_from_club(
  p_club_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_email text;
  v_membership_ids uuid[];
  v_driver_ids uuid[];
  v_nominations int := 0;
  v_drivers int := 0;
  v_memberships int := 0;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if p_club_id is null or p_user_id is null then
    raise exception 'invalid_arguments';
  end if;

  if p_user_id = v_caller then
    raise exception 'cannot_remove_self';
  end if;

  if not (
    public.user_is_full_club_admin()
    or public.user_has_club_admin_permission(p_club_id, 'membership')
    or public.user_is_club_admin()
  ) then
    raise exception 'permission_denied';
  end if;

  select lower(trim(p.email)) into v_email
  from public.profiles p
  where p.id = p_user_id;

  select coalesce(array_agg(distinct hm.id), array[]::uuid[])
    into v_membership_ids
  from public.household_memberships hm
  where hm.club_id = p_club_id
    and (
      hm.user_id = p_user_id
      or (
        v_email is not null
        and v_email <> ''
        and lower(trim(hm.email)) = v_email
      )
    );

  select coalesce(array_agg(distinct d.id), array[]::uuid[])
    into v_driver_ids
  from public.drivers d
  where d.club_id = p_club_id
    and (
      d.created_by = p_user_id
      or (
        cardinality(v_membership_ids) > 0
        and d.membership_id = any (v_membership_ids)
      )
      or exists (
        select 1
        from public.club_members cm
        where cm.club_id = p_club_id
          and cm.driver_id = d.id
          and (
            cardinality(v_membership_ids) > 0
            and cm.membership_id = any (v_membership_ids)
          )
      )
    );

  delete from public.nomination_entries ne
  using public.nominations n
  where ne.nomination_id = n.id
    and n.club_id = p_club_id
    and (
      (cardinality(v_membership_ids) > 0 and n.group_id = any (v_membership_ids))
      or (cardinality(v_driver_ids) > 0 and n.driver_id = any (v_driver_ids))
    );

  delete from public.nominations n
  where n.club_id = p_club_id
    and (
      (cardinality(v_membership_ids) > 0 and n.group_id = any (v_membership_ids))
      or (cardinality(v_driver_ids) > 0 and n.driver_id = any (v_driver_ids))
    );

  get diagnostics v_nominations = row_count;

  delete from public.nomination_credits nc
  where nc.club_id = p_club_id
    and (
      (cardinality(v_membership_ids) > 0 and nc.group_id = any (v_membership_ids))
      or nc.created_by = p_user_id
    );

  delete from public.club_messages cm
  where cm.club_id = p_club_id
    and (
      (cardinality(v_membership_ids) > 0 and cm.membership_id = any (v_membership_ids))
      or cm.sender_user_id = p_user_id
    );

  if to_regclass('public.driver_profiles') is not null
     and cardinality(v_driver_ids) > 0 then
    delete from public.driver_profiles dp
    where dp.driver_id = any (v_driver_ids);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'numbers'
      and column_name = 'assigned_to_driver'
  ) and cardinality(v_driver_ids) > 0 then
    update public.numbers num
    set
      assigned_to_driver = null,
      assigned_driver_name = null,
      assigned_driver_email = null,
      status = coalesce(nullif(trim(status), ''), 'available')
    where num.club_id = p_club_id
      and num.assigned_to_driver = any (v_driver_ids);
  end if;

  if cardinality(v_driver_ids) > 0 then
    delete from public.driver_classes dc
    where dc.driver_id = any (v_driver_ids);
  end if;

  if cardinality(v_membership_ids) > 0 or cardinality(v_driver_ids) > 0 then
    delete from public.club_members cm
    where cm.club_id = p_club_id
      and (
        (cardinality(v_membership_ids) > 0 and cm.membership_id = any (v_membership_ids))
        or (cardinality(v_driver_ids) > 0 and cm.driver_id = any (v_driver_ids))
      );
  end if;

  if cardinality(v_driver_ids) > 0 then
    delete from public.drivers d
    where d.id = any (v_driver_ids);
    get diagnostics v_drivers = row_count;
  end if;

  delete from public.club_admin_grants g
  where g.club_id = p_club_id
    and g.user_id = p_user_id;

  delete from public.notifications n
  where n.club_id = p_club_id
    and n.user_id = p_user_id;

  delete from public.push_subscriptions ps
  where ps.club_id = p_club_id
    and ps.user_id = p_user_id;

  if cardinality(v_membership_ids) > 0 then
    delete from public.household_memberships hm
    where hm.id = any (v_membership_ids);
    get diagnostics v_memberships = row_count;
  end if;

  update public.profiles p
  set
    primary_club_id = case
      when p.primary_club_id = p_club_id then null
      else p.primary_club_id
    end,
    favorite_club_ids = array_remove(coalesce(p.favorite_club_ids, array[]::uuid[]), p_club_id)
  where p.id = p_user_id;

  if cardinality(v_membership_ids) = 0
     and cardinality(v_driver_ids) = 0
     and not exists (
       select 1
       from public.club_admin_grants g
       where g.club_id = p_club_id
         and g.user_id = p_user_id
     ) then
    raise exception 'nothing_to_remove';
  end if;

  return jsonb_build_object(
    'club_id', p_club_id,
    'user_id', p_user_id,
    'memberships_removed', v_memberships,
    'drivers_removed', v_drivers,
    'nominations_removed', v_nominations
  );
end;
$$;

revoke all on function public.admin_remove_user_from_club(uuid, uuid) from public;
grant execute on function public.admin_remove_user_from_club(uuid, uuid) to authenticated;