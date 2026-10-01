-- Optional: half-year championship rules (H1 vs H2). Safe to run once.
alter table public.household_memberships
  add column if not exists period text;

comment on column public.household_memberships.period is
  'Half-year window: H1 (Jan–Jun) or H2 (Jul–Dec). Full-year memberships leave null.';
