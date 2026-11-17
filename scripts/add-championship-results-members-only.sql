-- Opt-in: hide non-members from published results for events linked to this championship.
-- Safe to run once.

alter table public.championships
  add column if not exists results_members_only boolean not null default false;

comment on column public.championships.results_members_only is
  'When true, published results for championship-linked events omit non-member drivers.';