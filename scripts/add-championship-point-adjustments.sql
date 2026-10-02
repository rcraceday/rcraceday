-- Manual championship point tweaks (bonuses, penalties, per-round overrides). Safe to run once.

alter table public.championships
  add column if not exists point_adjustments jsonb not null default '{}'::jsonb;

comment on column public.championships.point_adjustments is
  'Admin overrides: driverDelta, roundPoints, mergedDrivers (alias names), manualRounds.';
