-- Nominations + nomination_entries schema and RLS for EventNominate.jsx
--
-- Late entry windows (enabled, activation, close) and pricing.late_fee live on public.events,
-- not on nominations. See scripts/add-event-late-entries.sql.
--
-- nominations row (per driver per event) written by confirmPaymentAndNominations():
--   event_id, driver_id, group_id (household_memberships.id), club_id (hosting club),
--   affiliated_club_id (legacy; app stores RCRA name in merchandise.affiliated_club_name),
--   total_fee, paid, merchandise (jsonb object — NOT an array)
--
-- merchandise jsonb shape:
-- {
--   "merch": { ... },
--   "addons": { ... },
--   "requirements": { "<requirement-item-id>": true, ... },
--   "payment_method": "stripe" | "paypal",
--   "practice_days": [0, 1, ...],
--   "practice_class_ids": ["<club_class uuid>", ...]
-- }
--
-- nomination_entries rows (per class slot + optional preference):
--   nomination_id, class_id, is_preference, order_index
--   (optional is_practice on entry for LiveTimeExport; app currently uses merchandise instead)

-- ---------------------------------------------------------------------------
-- nominations table (align columns + defaults with the app)
-- ---------------------------------------------------------------------------

create table if not exists public.nominations (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  driver_id uuid not null,
  total_fee numeric null,
  created_at timestamptz not null default now(),
  group_id uuid null,
  club_id uuid null,
  day text null,
  merchandise jsonb null default '{}'::jsonb,
  paid boolean not null default false,
  affiliated_club_id uuid null,
  is_practice boolean not null default false,
  constraint nominations_pkey primary key (id),
  constraint nominations_affiliated_club_id_fkey
    foreign key (affiliated_club_id) references public.clubs (id),
  constraint nominations_club_id_fkey
    foreign key (club_id) references public.clubs (id),
  constraint nominations_group_id_fkey
    foreign key (group_id) references public.household_memberships (id),
  constraint nominations_event_id_fkey
    foreign key (event_id) references public.events (id) on delete cascade,
  constraint nominations_driver_id_fkey
    foreign key (driver_id) references public.drivers (id) on delete cascade,
  constraint nomination_day_valid check (
    day is null or day <> ''::text
  ),
  constraint nominations_merchandise_is_object check (
    merchandise is null or jsonb_typeof(merchandise) = 'object'
  )
);

-- Idempotent column fixes if the table already existed
alter table public.nominations
  alter column merchandise set default '{}'::jsonb;

update public.nominations
set merchandise = '{}'::jsonb
where merchandise is null
   or jsonb_typeof(merchandise) <> 'object';

create unique index if not exists nominations_event_driver_unique
  on public.nominations (event_id, driver_id);

create index if not exists nominations_event_id_idx
  on public.nominations (event_id);

create index if not exists nominations_group_id_idx
  on public.nominations (group_id);

create index if not exists nominations_club_id_idx
  on public.nominations (club_id);

-- ---------------------------------------------------------------------------
-- nomination_entries
-- ---------------------------------------------------------------------------

create table if not exists public.nomination_entries (
  id uuid not null default gen_random_uuid(),
  nomination_id uuid not null,
  class_id uuid not null,
  is_preference boolean not null default false,
  order_index integer not null default 1,
  is_practice boolean not null default false,
  created_at timestamptz not null default now(),
  constraint nomination_entries_pkey primary key (id),
  constraint nomination_entries_nomination_id_fkey
    foreign key (nomination_id) references public.nominations (id) on delete cascade,
  constraint nomination_entries_class_id_fkey
    foreign key (class_id) references public.club_classes (id)
);

create index if not exists nomination_entries_nomination_id_idx
  on public.nomination_entries (nomination_id);

create index if not exists nomination_entries_class_id_idx
  on public.nomination_entries (class_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (same household / driver pattern as driver_classes.sql)
-- ---------------------------------------------------------------------------

create or replace function public.user_household_membership_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.id
  from public.household_memberships hm
  where hm.user_id = auth.uid()
    and hm.status = 'active';
$$;

create or replace function public.user_is_club_admin()
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

create or replace function public.user_can_view_event_nominations(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    inner join public.household_memberships hm
      on hm.club_id = e.club_id
     and hm.user_id = auth.uid()
     and hm.status = 'active'
    where e.id = p_event_id
  );
$$;

create or replace function public.nomination_belongs_to_user_household(p_group_id uuid, p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_group_id in (select public.user_household_membership_ids())
     and public.user_can_manage_driver(p_driver_id)
     and exists (
       select 1
       from public.drivers d
       where d.id = p_driver_id
         and (
           d.membership_id = p_group_id
           or (d.membership_id is null and d.created_by = auth.uid())
         )
     );
$$;

create or replace function public.nomination_event_club_matches(p_event_id uuid, p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.club_id = p_club_id
  );
$$;

-- ---------------------------------------------------------------------------
-- nominations RLS
-- ---------------------------------------------------------------------------

alter table public.nominations enable row level security;

drop policy if exists "nominations_select_club_members" on public.nominations;
create policy "nominations_select_club_members"
  on public.nominations
  for select
  to authenticated
  using (public.user_can_view_event_nominations(event_id));

drop policy if exists "nominations_insert_household" on public.nominations;
create policy "nominations_insert_household"
  on public.nominations
  for insert
  to authenticated
  with check (
    public.nomination_belongs_to_user_household(group_id, driver_id)
    and club_id is not null
    and public.nomination_event_club_matches(event_id, club_id)
  );

drop policy if exists "nominations_update_household" on public.nominations;
create policy "nominations_update_household"
  on public.nominations
  for update
  to authenticated
  using (public.nomination_belongs_to_user_household(group_id, driver_id))
  with check (
    public.nomination_belongs_to_user_household(group_id, driver_id)
    and public.nomination_event_club_matches(event_id, club_id)
  );

drop policy if exists "nominations_delete_household" on public.nominations;
create policy "nominations_delete_household"
  on public.nominations
  for delete
  to authenticated
  using (public.nomination_belongs_to_user_household(group_id, driver_id));

drop policy if exists "nominations_update_admin" on public.nominations;
create policy "nominations_update_admin"
  on public.nominations
  for update
  to authenticated
  using (
    public.user_is_club_admin()
    and public.user_can_view_event_nominations(event_id)
  )
  with check (
    public.user_is_club_admin()
    and public.user_can_view_event_nominations(event_id)
  );

grant select, insert, update, delete on public.nominations to authenticated;

-- ---------------------------------------------------------------------------
-- nomination_entries RLS (via parent nomination)
-- ---------------------------------------------------------------------------

alter table public.nomination_entries enable row level security;

drop policy if exists "nomination_entries_select_club_members" on public.nomination_entries;
create policy "nomination_entries_select_club_members"
  on public.nomination_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.nominations n
      where n.id = nomination_id
        and public.user_can_view_event_nominations(n.event_id)
    )
  );

drop policy if exists "nomination_entries_insert_household" on public.nomination_entries;
create policy "nomination_entries_insert_household"
  on public.nomination_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.nominations n
      where n.id = nomination_id
        and public.nomination_belongs_to_user_household(n.group_id, n.driver_id)
    )
  );

drop policy if exists "nomination_entries_update_household" on public.nomination_entries;
create policy "nomination_entries_update_household"
  on public.nomination_entries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.nominations n
      where n.id = nomination_id
        and public.nomination_belongs_to_user_household(n.group_id, n.driver_id)
    )
  )
  with check (
    exists (
      select 1
      from public.nominations n
      where n.id = nomination_id
        and public.nomination_belongs_to_user_household(n.group_id, n.driver_id)
    )
  );

drop policy if exists "nomination_entries_delete_household" on public.nomination_entries;
create policy "nomination_entries_delete_household"
  on public.nomination_entries
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.nominations n
      where n.id = nomination_id
        and public.nomination_belongs_to_user_household(n.group_id, n.driver_id)
    )
  );

grant select, insert, update, delete on public.nomination_entries to authenticated;
