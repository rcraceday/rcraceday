-- Reliable mark-read for club_messages (run if unread badges stay after reading).
-- Uses security definer RPCs so read receipts work for members and admins.

create or replace function public.mark_club_messages_read_for_member(
  p_club_id uuid,
  p_membership_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if not public.user_owns_household_membership(p_membership_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.club_messages
  set read_by_member_at = now()
  where club_id = p_club_id
    and membership_id = p_membership_id
    and sender_role = 'admin'
    and read_by_member_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.mark_club_messages_read_for_admin(
  p_club_id uuid,
  p_membership_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if not public.user_is_club_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.club_messages
  set read_by_admin_at = now()
  where club_id = p_club_id
    and membership_id = p_membership_id
    and sender_role = 'member'
    and read_by_admin_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_club_messages_read_for_member(uuid, uuid) from public;
revoke all on function public.mark_club_messages_read_for_admin(uuid, uuid) from public;
grant execute on function public.mark_club_messages_read_for_member(uuid, uuid) to authenticated;
grant execute on function public.mark_club_messages_read_for_admin(uuid, uuid) to authenticated;
