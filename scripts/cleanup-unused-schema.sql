-- Archive empty leftover tables confirmed by inspect-unused-schema.sql.
--
-- SAFE RULES
-- 1. Keep the inspect result.
-- 2. This script RENAMES leftover tables instead of dropping them.
--    Restore with: alter table public._archived_YYYYMMDD_name rename to name;
-- 3. Do not touch used_by_app tables. event_classes + nomination_classes still
--    have old nomination UI queries. memberships is the paid product catalogue.
-- 4. Wait a week (or a backup cycle) then drop _archived_* tables if unused.

do $$
declare
  archive_prefix text := '_archived_' || to_char(now(), 'YYYYMMDD') || '_';
  leftover text;
  leftovers text[] := array[
    'app_settings',
    'championship_results',
    'championship_rounds',
    'championship_standings',
    'club_admins',
    'nomination_groups',
    'preference_nominations',
    'rate_limits'
  ];
begin
  foreach leftover in array leftovers loop
    if to_regclass('public.' || leftover) is not null
       and to_regclass('public.' || archive_prefix || leftover) is null then
      execute format(
        'alter table public.%I rename to %I',
        leftover,
        archive_prefix || leftover
      );
    end if;
  end loop;
end $$;

-- Permanent drop (only after you confirm archives are unused):
-- drop table if exists public._archived_YYYYMMDD_app_settings;
-- drop table if exists public._archived_YYYYMMDD_championship_results;
-- drop table if exists public._archived_YYYYMMDD_championship_rounds;
-- drop table if exists public._archived_YYYYMMDD_championship_standings;
-- drop table if exists public._archived_YYYYMMDD_club_admins;
-- drop table if exists public._archived_YYYYMMDD_nomination_groups;
-- drop table if exists public._archived_YYYYMMDD_preference_nominations;
-- drop table if exists public._archived_YYYYMMDD_rate_limits;
