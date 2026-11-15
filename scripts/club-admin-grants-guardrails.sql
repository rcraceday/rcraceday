-- Guardrails for club_admin_grants: prevent removing the last settings admin,
-- self-removal, and (for membership-only managers) changes to settings-capable admins.
-- Run in Supabase after scripts/create-club-admin-grants.sql

create or replace function public.user_has_settings_admin_at_club(
  p_club_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.club_admin_grants g
    where g.club_id = p_club_id
      and g.user_id = p_user_id
      and coalesce((g.permissions ->> 'settings')::boolean, false)
  );
$$;

create or replace function public.club_settings_admin_count(p_club_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*)::integer
    from public.club_admin_grants g
    where g.club_id = p_club_id
      and coalesce((g.permissions ->> 'settings')::boolean, false)
  ) + (
    select count(*)::integer
    from public.household_memberships hm
    inner join public.profiles p on p.id = hm.user_id
    where hm.club_id = p_club_id
      and hm.user_id is not null
      and p.role = 'admin'
  );
$$;

create or replace function public.club_admin_grants_caller_scope(p_club_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.user_is_full_club_admin()
     or public.user_has_club_admin_permission(p_club_id, 'settings') then
    return 'full';
  end if;
  if public.user_has_club_admin_permission(p_club_id, 'membership') then
    return 'limited';
  end if;
  return 'none';
end;
$$;

create or replace function public.club_admin_permissions_allowed_for_scope(
  p_scope text,
  p_permissions jsonb
)
returns boolean
language sql
immutable
as $$
  select case
    when p_scope = 'full' then true
    when p_scope = 'limited' then
      not coalesce((p_permissions ->> 'settings')::boolean, false)
    else false
  end;
$$;

create or replace function public.club_admin_grants_enforce()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_target uuid;
  v_caller uuid := auth.uid();
  v_scope text;
  v_target_protected boolean;
  v_count integer;
  v_new_perms jsonb;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if tg_op = 'DELETE' then
    v_club_id := old.club_id;
    v_target := old.user_id;
    v_new_perms := null;
  else
    v_club_id := new.club_id;
    v_target := new.user_id;
    v_new_perms := new.permissions;
  end if;

  v_scope := public.club_admin_grants_caller_scope(v_club_id);
  if v_scope = 'none' then
    raise exception 'permission_denied';
  end if;

  if tg_op = 'DELETE' and v_target = v_caller then
    raise exception 'cannot_remove_self';
  end if;

  v_target_protected := public.user_has_settings_admin_at_club(v_club_id, v_target);

  if v_scope = 'limited' and v_target_protected then
    raise exception 'cannot_modify_protected_admin';
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if not public.club_admin_permissions_allowed_for_scope(v_scope, v_new_perms) then
      raise exception 'cannot_grant_settings';
    end if;
  end if;

  if tg_op in ('DELETE', 'UPDATE') and v_target_protected then
    if tg_op = 'DELETE'
       or not coalesce((v_new_perms ->> 'settings')::boolean, false) then
      v_count := public.club_settings_admin_count(v_club_id);
      if v_count <= 1 then
        raise exception 'last_settings_admin';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and v_target_protected and v_scope = 'full' then
    if not coalesce((v_new_perms ->> 'settings')::boolean, false) then
      v_count := public.club_settings_admin_count(v_club_id);
      if v_count <= 1 then
        raise exception 'last_settings_admin';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists club_admin_grants_enforce_trigger on public.club_admin_grants;

create trigger club_admin_grants_enforce_trigger
  before insert or update or delete on public.club_admin_grants
  for each row
  execute function public.club_admin_grants_enforce();

-- Membership admins may manage non-settings delegates; Settings admins manage all.
create or replace function public.user_can_manage_club_admin_users(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_club_admin_permission(p_club_id, 'settings')
    or public.user_has_club_admin_permission(p_club_id, 'membership');
$$;