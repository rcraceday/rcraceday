-- Inventory public tables vs the current RCRaceday app.
-- Run this FIRST in the Supabase SQL editor. It drops nothing.
--
-- Used tables are those referenced from src/ (and current scripts).
-- Anything else is a candidate — confirm row counts and edge functions
-- before renaming or dropping.

with used (table_name) as (
  values
    ('championships'),
    ('club_admin_grants'),
    ('club_classes'),
    ('club_event_types'),
    ('club_members'),
    ('club_membership_types'),
    ('club_messages'),
    ('club_news'),
    ('club_track_classes'),
    ('club_tracks'),
    ('clubs'),
    ('driver_classes'),
    ('driver_profiles'),
    ('drivers'),
    ('event_classes'),
    ('event_result_entries'),
    ('event_result_overall'),
    ('event_result_races'),
    ('event_results'),
    ('events'),
    ('household_memberships'),
    ('memberships'),
    ('nomination_classes'),
    ('nomination_credits'),
    ('nomination_entries'),
    ('nominations'),
    ('notifications'),
    ('numbers'),
    ('platform_discipline_tags'),
    ('profiles'),
    ('push_subscriptions'),
    ('rcra_clubs')
),
public_tables as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname not like 'pg_%'
)
select
  t.table_name,
  case when u.table_name is not null then 'used_by_app' else 'not_in_app' end as app_status,
  coalesce(s.n_live_tup, 0) as approx_rows
from public_tables t
left join used u on u.table_name = t.table_name
left join pg_stat_user_tables s
  on s.schemaname = 'public' and s.relname = t.table_name
order by
  case when u.table_name is null then 0 else 1 end,
  t.table_name;

-- Columns on the tables most affected by the platform-account change.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'clubs', 'household_memberships', 'drivers', 'club_members')
order by table_name, ordinal_position;
