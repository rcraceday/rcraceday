-- Phase 3: platform discipline tag catalogue + club selections in directory_profile.discipline_slugs[].
-- Run in Supabase SQL editor (after Phase 1).

create table if not exists public.platform_discipline_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  tag_group text not null check (tag_group in ('scale', 'surface', 'power', 'discipline')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.platform_discipline_tags is
  'Shared RC discipline vocabulary for club finder filters (scale, surface, power, class type).';

create index if not exists platform_discipline_tags_group_idx
  on public.platform_discipline_tags (tag_group, sort_order)
  where active = true;

alter table public.platform_discipline_tags enable row level security;

drop policy if exists "platform_discipline_tags_public_read" on public.platform_discipline_tags;
create policy "platform_discipline_tags_public_read"
  on public.platform_discipline_tags
  for select
  to anon, authenticated
  using (active = true);

-- Seed catalogue (idempotent)
insert into public.platform_discipline_tags (slug, label, tag_group, sort_order) values
  ('scale-1-5', '1/5', 'scale', 10),
  ('scale-1-8', '1/8', 'scale', 20),
  ('scale-1-10', '1/10', 'scale', 30),
  ('scale-1-12', '1/12', 'scale', 40),
  ('scale-1-14', '1/14', 'scale', 50),
  ('scale-mini', 'Mini / micro', 'scale', 60),
  ('surface-on-road', 'On-road', 'surface', 10),
  ('surface-off-road', 'Off-road', 'surface', 20),
  ('surface-carpet', 'Carpet', 'surface', 30),
  ('surface-dirt', 'Dirt', 'surface', 40),
  ('surface-astro', 'Astro / clay', 'surface', 50),
  ('surface-turf', 'Turf / grass', 'surface', 60),
  ('power-electric', 'Electric (EP)', 'power', 10),
  ('power-nitro', 'Nitro (IC)', 'power', 20),
  ('power-gas', 'Gas / petrol', 'power', 30),
  ('power-glow', 'Glow / nitro plane', 'power', 40),
  ('disc-touring', 'Touring', 'discipline', 10),
  ('disc-drift', 'Drift', 'discipline', 20),
  ('disc-pan', 'Pan car', 'discipline', 30),
  ('disc-buggy', 'Buggy', 'discipline', 40),
  ('disc-truggy', 'Truggy', 'discipline', 50),
  ('disc-short-course', 'Short course', 'discipline', 60),
  ('disc-crawler', 'Rock crawler', 'discipline', 70),
  ('disc-rally', 'Rally', 'discipline', 80),
  ('disc-stadium', 'Stadium truck', 'discipline', 90),
  ('disc-onroad-gt', 'On-road GT', 'discipline', 100),
  ('disc-fixed-wing', 'Fixed-wing', 'discipline', 110),
  ('disc-helicopter', 'Helicopter', 'discipline', 120),
  ('disc-fpv-drone', 'FPV / drone', 'discipline', 130),
  ('disc-boat', 'Boat / marine', 'discipline', 140),
  ('disc-jet', 'Jet boat', 'discipline', 150),
  ('disc-submarine', 'Submarine', 'discipline', 160)
on conflict (slug) do update set
  label = excluded.label,
  tag_group = excluded.tag_group,
  sort_order = excluded.sort_order,
  active = true;

comment on column public.clubs.directory_profile is
  'Public directory: tagline, scales_offered[], classes_offered, environments[], location{}, discipline_slugs[] (platform tags), discipline_suggestion (optional club note).';
