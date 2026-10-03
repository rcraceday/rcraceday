-- Club-scoped admin grants with granular permissions (JSON booleans).
-- Full legacy admins: public.profiles.role = 'admin' (all permissions).
-- Run in Supabase SQL editor after household_memberships exists.

create table if not exists public.club_admin_grants (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index if not exists club_admin_grants_club_id_idx
  on public.club_admin_grants (club_id);
create index if not exists club_admin_grants_user_id_idx
  on public.club_admin_grants (user_id);

comment on table public.club_admin_grants is
  'Delegated club admin permissions. profiles.role=admin remains full access.';

create or replace function public.user_is_full_club_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.user_has_club_admin_permission(
  p_club_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_is_full_club_admin()
  or coalesce(
    (
      select (g.permissions ->> p_permission)::boolean
      from public.club_admin_grants g
      where g.club_id = p_club_id
        and g.user_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.user_has_any_club_admin_access(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_is_full_club_admin()
  or exists (
    select 1
    from public.club_admin_grants g
    where g.club_id = p_club_id
      and g.user_id = auth.uid()
      and (
        select bool_or(coalesce((value)::text = 'true', false))
        from jsonb_each_text(g.permissions) as t(key, value)
      )
  );
$$;

create or replace function public.user_can_manage_club_admin_users(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_club_admin_permission(p_club_id, 'settings');
$$;

alter table public.club_admin_grants enable row level security;

drop policy if exists "club_admin_grants_select" on public.club_admin_grants;
create policy "club_admin_grants_select"
  on public.club_admin_grants
  for select
  to authenticated
  using (public.user_can_manage_club_admin_users(club_id));

drop policy if exists "club_admin_grants_insert" on public.club_admin_grants;
create policy "club_admin_grants_insert"
  on public.club_admin_grants
  for insert
  to authenticated
  with check (public.user_can_manage_club_admin_users(club_id));

drop policy if exists "club_admin_grants_update" on public.club_admin_grants;
create policy "club_admin_grants_update"
  on public.club_admin_grants
  for update
  to authenticated
  using (public.user_can_manage_club_admin_users(club_id))
  with check (public.user_can_manage_club_admin_users(club_id));

drop policy if exists "club_admin_grants_delete" on public.club_admin_grants;
create policy "club_admin_grants_delete"
  on public.club_admin_grants
  for delete
  to authenticated
  using (public.user_can_manage_club_admin_users(club_id));

-- Delegated admins can read their own grant (for menu gating in the app).
drop policy if exists "club_admin_grants_select_own" on public.club_admin_grants;
create policy "club_admin_grants_select_own"
  on public.club_admin_grants
  for select
  to authenticated
  using (user_id = auth.uid());

-- Full admins may update other profiles (role changes from User Settings).
drop policy if exists "profiles_update_club_admin" on public.profiles;
create policy "profiles_update_club_admin"
  on public.profiles
  for update
  to authenticated
  using (public.user_is_full_club_admin())
  with check (true);

-- --- Permission-scoped RLS patches (replace blanket user_is_club_admin on writes) ---

drop policy if exists "club_news_select_admin" on public.club_news;
create policy "club_news_select_admin"
  on public.club_news
  for select
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'news'));

drop policy if exists "club_news_insert_admin" on public.club_news;
create policy "club_news_insert_admin"
  on public.club_news
  for insert
  to authenticated
  with check (public.user_has_club_admin_permission(club_id, 'news'));

drop policy if exists "club_news_update_admin" on public.club_news;
create policy "club_news_update_admin"
  on public.club_news
  for update
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'news'))
  with check (public.user_has_club_admin_permission(club_id, 'news'));

drop policy if exists "club_news_delete_admin" on public.club_news;
create policy "club_news_delete_admin"
  on public.club_news
  for delete
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'news'));

drop policy if exists "club_messages_select_admin" on public.club_messages;
create policy "club_messages_select_admin"
  on public.club_messages
  for select
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'messages'));

drop policy if exists "club_messages_insert_admin" on public.club_messages;
create policy "club_messages_insert_admin"
  on public.club_messages
  for insert
  to authenticated
  with check (
    public.user_has_club_admin_permission(club_id, 'messages')
    and sender_role = 'admin'
    and sender_user_id = auth.uid()
  );

drop policy if exists "club_messages_update_admin_read" on public.club_messages;
create policy "club_messages_update_admin_read"
  on public.club_messages
  for update
  to authenticated
  using (
    public.user_has_club_admin_permission(club_id, 'messages')
    and sender_role = 'member'
  )
  with check (
    public.user_has_club_admin_permission(club_id, 'messages')
    and sender_role = 'member'
  );

drop policy if exists "household_memberships_select_club_admin" on public.household_memberships;
create policy "household_memberships_select_club_admin"
  on public.household_memberships
  for select
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'membership'));

drop policy if exists "drivers_select_club_admin" on public.drivers;
create policy "drivers_select_club_admin"
  on public.drivers
  for select
  to authenticated
  using (public.user_has_club_admin_permission(club_id, 'drivers'));

drop policy if exists "club_members_select_club_admin" on public.club_members;
create policy "club_members_select_club_admin"
  on public.club_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_memberships hm
      where hm.id = club_members.membership_id
        and public.user_has_club_admin_permission(hm.club_id, 'membership')
    )
  );
