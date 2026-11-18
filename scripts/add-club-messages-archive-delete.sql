-- Archive (hide per side) and delete club messages. Run in Supabase SQL editor.

alter table public.club_messages
  add column if not exists archived_by_member_at timestamptz;

alter table public.club_messages
  add column if not exists archived_by_admin_at timestamptz;

comment on column public.club_messages.archived_by_member_at is
  'When set, hidden from the member thread view.';
comment on column public.club_messages.archived_by_admin_at is
  'When set, hidden from the admin thread/inbox view.';

create or replace function public.manage_club_messages(
  p_club_id uuid,
  p_membership_id uuid,
  p_message_ids uuid[],
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_ids uuid[];
  v_is_member boolean;
  v_is_admin boolean;
  v_affected integer := 0;
begin
  if p_club_id is null or p_membership_id is null then
    raise exception 'Missing club or membership';
  end if;

  v_ids := array(select distinct unnest(coalesce(p_message_ids, array[]::uuid[])));
  if cardinality(v_ids) = 0 then
    return jsonb_build_object('affected', 0);
  end if;

  v_is_member := public.user_owns_household_membership(p_membership_id);
  v_is_admin := public.user_has_club_admin_permission(p_club_id, 'messages')
    or public.user_is_full_club_admin()
    or public.user_is_club_admin();

  if not v_is_member and not v_is_admin then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_action = 'archive' then
    if v_is_admin then
      update public.club_messages m
      set archived_by_admin_at = now()
      where m.club_id = p_club_id
        and m.membership_id = p_membership_id
        and m.id = any (v_ids)
        and m.archived_by_admin_at is null;
      get diagnostics v_affected = row_count;
    elsif v_is_member then
      update public.club_messages m
      set archived_by_member_at = now()
      where m.club_id = p_club_id
        and m.membership_id = p_membership_id
        and m.id = any (v_ids)
        and m.archived_by_member_at is null;
      get diagnostics v_affected = row_count;
    end if;
    return jsonb_build_object('action', 'archive', 'affected', v_affected);
  end if;

  if v_action = 'delete' then
    if v_is_admin then
      delete from public.club_messages m
      where m.club_id = p_club_id
        and m.membership_id = p_membership_id
        and m.id = any (v_ids);
      get diagnostics v_affected = row_count;
    elsif v_is_member then
      delete from public.club_messages m
      where m.club_id = p_club_id
        and m.membership_id = p_membership_id
        and m.id = any (v_ids)
        and m.sender_role = 'member'
        and m.sender_user_id = auth.uid();
      get diagnostics v_affected = row_count;
    end if;
    return jsonb_build_object('action', 'delete', 'affected', v_affected);
  end if;

  raise exception 'Unknown action: %', p_action;
end;
$$;

revoke all on function public.manage_club_messages(uuid, uuid, uuid[], text) from public;
grant execute on function public.manage_club_messages(uuid, uuid, uuid[], text) to authenticated;

drop policy if exists "club_messages_delete_admin" on public.club_messages;
create policy "club_messages_delete_admin"
  on public.club_messages
  for delete
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'messages'));

drop policy if exists "club_messages_delete_member_own" on public.club_messages;
create policy "club_messages_delete_member_own"
  on public.club_messages
  for delete
  to authenticated
  using (
    public.user_owns_household_membership(membership_id)
    and sender_role = 'member'
    and sender_user_id = auth.uid()
  );