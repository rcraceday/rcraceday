-- Let club admins with the "news" permission broadcast alerts (messages + in-app).
-- Run in Supabase SQL editor after create-club-admin-grants.sql.

drop policy if exists "club_messages_insert_admin_news_broadcast" on public.club_messages;
create policy "club_messages_insert_admin_news_broadcast"
  on public.club_messages
  for insert
  to authenticated
  with check (
    public.user_has_club_admin_permission(club_id, 'news')
    and sender_role = 'admin'
    and sender_user_id = auth.uid()
  );

drop policy if exists "notifications_insert_club_news_admin" on public.notifications;
create policy "notifications_insert_club_news_admin"
  on public.notifications
  for insert
  to authenticated
  with check (
    club_id is not null
    and public.user_has_club_admin_permission(club_id, 'news')
  );

drop policy if exists "household_memberships_select_club_admin_news" on public.household_memberships;
create policy "household_memberships_select_club_admin_news"
  on public.household_memberships
  for select
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'news'));

create or replace function public.broadcast_club_news_notifications(
  p_news_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_news public.club_news%rowtype;
  v_club_slug text;
  v_title text;
  v_plain text;
  v_push_body text;
  v_link_path text;
  v_message_body text;
  v_row record;
  v_messages int := 0;
  v_in_app int := 0;
  v_user_ids uuid[] := array[]::uuid[];
  v_now timestamptz := now();
  v_notify_at timestamptz;
begin
  select * into v_news from public.club_news where id = p_news_id;
  if not found then
    raise exception 'News item not found';
  end if;

  if not public.user_has_club_admin_permission(v_news.club_id, 'news') then
    raise exception 'You do not have permission to send news notifications for this club.';
  end if;

  if not coalesce(v_news.notify_members, false) and not p_force then
    return jsonb_build_object('skipped', true, 'reason', 'notify_disabled');
  end if;

  if not p_force and v_news.notified_at is not null then
    return jsonb_build_object('skipped', true, 'reason', 'already_sent');
  end if;

  if not coalesce(v_news.is_published, false) then
    raise exception 'Publish the news item before sending notifications.';
  end if;

  if not p_force then
  if v_news.notify_mode = 'scheduled' then
    v_notify_at := v_news.notify_at;
    if v_notify_at is null or v_notify_at > v_now then
      return jsonb_build_object('skipped', true, 'reason', 'not_due');
    end if;
  end if;
  end if;

  select c.slug into v_club_slug from public.clubs c where c.id = v_news.club_id;

  v_title := coalesce(nullif(btrim(v_news.title), ''), 'Club news');
  v_plain := btrim(regexp_replace(coalesce(v_news.body, ''), '<[^>]+>', ' ', 'g'));
  v_plain := regexp_replace(v_plain, '\s+', ' ', 'g');
  v_push_body := case
    when char_length(v_plain) > 220 then left(v_plain, 217) || '…'
    when v_plain <> '' then v_plain
    else v_title
  end;
  v_link_path := case
    when v_club_slug is not null and v_club_slug <> '' then '/' || v_club_slug || '/app/news/' || v_news.id::text
    else null
  end;
  v_message_body := concat_ws(
    E'\n\n',
    'New club news: ' || v_title,
    v_push_body,
    case when v_link_path is not null then 'View in the app: ' || v_link_path else null end
  );

  for v_row in
    select hm.id as membership_id, hm.user_id
    from public.household_memberships hm
    where hm.club_id = v_news.club_id
      and hm.status = 'active'
  loop
    insert into public.club_messages (
      club_id,
      membership_id,
      body,
      sender_role,
      sender_user_id
    ) values (
      v_news.club_id,
      v_row.membership_id,
      v_message_body,
      'admin',
      auth.uid()
    );
    v_messages := v_messages + 1;

    if v_row.user_id is not null then
      insert into public.notifications (
        user_id,
        club_id,
        title,
        body,
        read,
        metadata
      ) values (
        v_row.user_id,
        v_news.club_id,
        v_title,
        v_push_body,
        false,
        case
          when v_link_path is not null then jsonb_build_object('link_path', v_link_path)
          else '{}'::jsonb
        end
      );
      v_in_app := v_in_app + 1;
      if not v_row.user_id = any (v_user_ids) then
        v_user_ids := array_append(v_user_ids, v_row.user_id);
      end if;
    end if;
  end loop;

  if v_messages = 0 then
    raise exception 'No active club memberships to notify.';
  end if;

  update public.club_news
  set notified_at = v_now
  where id = v_news.id
    and club_id = v_news.club_id;

  return jsonb_build_object(
    'messages_sent', v_messages,
    'in_app', v_in_app,
    'user_ids', to_jsonb(v_user_ids)
  );
end;
$$;

revoke all on function public.broadcast_club_news_notifications(uuid, boolean) from public;
grant execute on function public.broadcast_club_news_notifications(uuid, boolean) to authenticated;