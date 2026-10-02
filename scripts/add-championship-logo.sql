-- Championship logo for member standings and results hub cards.
alter table public.championships
  add column if not exists logo_url text;

comment on column public.championships.logo_url is
  'Public URL for championship logo (club-assets bucket).';
