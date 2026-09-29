-- Club ↔ household messaging (admin replies to members; not member-to-member).
-- Run in Supabase SQL editor after deploy.

create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  membership_id uuid not null references public.household_memberships (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  body text not null,
  sender_role text not null check (sender_role in ('member', 'admin')),
  sender_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  read_by_member_at timestamptz,
  read_by_admin_at timestamptz,
  constraint club_messages_body_not_blank check (char_length(btrim(body)) > 0)
);

create index if not exists club_messages_club_membership_created_idx
  on public.club_messages (club_id, membership_id, created_at desc);

create index if not exists club_messages_club_unread_admin_idx
  on public.club_messages (club_id)
  where sender_role = 'member' and read_by_admin_at is null;

alter table public.club_messages enable row level security;

create or replace function public.user_owns_household_membership(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_memberships hm
    where hm.id = p_membership_id
      and hm.user_id = auth.uid()
  );
$$;

-- Members: read own thread
drop policy if exists "club_messages_select_member" on public.club_messages;
create policy "club_messages_select_member"
  on public.club_messages
  for select
  to authenticated
  using (public.user_owns_household_membership(membership_id));

-- Members: send as member (same club as membership)
drop policy if exists "club_messages_insert_member" on public.club_messages;
create policy "club_messages_insert_member"
  on public.club_messages
  for insert
  to authenticated
  with check (
    sender_role = 'member'
    and sender_user_id = auth.uid()
    and public.user_owns_household_membership(membership_id)
    and club_id = (
      select hm.club_id from public.household_memberships hm where hm.id = membership_id
    )
  );

-- Members: mark admin messages read
drop policy if exists "club_messages_update_member_read" on public.club_messages;
create policy "club_messages_update_member_read"
  on public.club_messages
  for update
  to authenticated
  using (
    public.user_owns_household_membership(membership_id)
    and sender_role = 'admin'
  )
  with check (
    public.user_owns_household_membership(membership_id)
    and sender_role = 'admin'
  );

-- Admins: read all club messages
drop policy if exists "club_messages_select_admin" on public.club_messages;
create policy "club_messages_select_admin"
  on public.club_messages
  for select
  to authenticated
  using (public.user_is_club_admin());

-- Admins: reply
drop policy if exists "club_messages_insert_admin" on public.club_messages;
create policy "club_messages_insert_admin"
  on public.club_messages
  for insert
  to authenticated
  with check (
    public.user_is_club_admin()
    and sender_role = 'admin'
    and sender_user_id = auth.uid()
  );

-- Admins: mark member messages read
drop policy if exists "club_messages_update_admin_read" on public.club_messages;
create policy "club_messages_update_admin_read"
  on public.club_messages
  for update
  to authenticated
  using (public.user_is_club_admin() and sender_role = 'member')
  with check (public.user_is_club_admin() and sender_role = 'member');
