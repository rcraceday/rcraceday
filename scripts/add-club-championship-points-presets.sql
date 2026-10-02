-- Named championship point tables / spreads per club (reusable when creating championships).

alter table public.clubs
  add column if not exists championship_points_presets jsonb not null default '[]'::jsonb;

comment on column public.clubs.championship_points_presets is
  'Array of { id, name, spread, pointsTable } saved by admins.';
