-- Club-wide driver rules and profile policy (admin Driver Settings).
-- Run in Supabase SQL Editor.

alter table public.clubs
  add column if not exists driver_settings jsonb not null default '{}';

comment on column public.clubs.driver_settings is
  'Driver rules: naming, numbers, profile sections, directory, juniors, LiveTime copy.';
