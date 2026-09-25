-- Minimum entries per class for event inclusion (from event type defaults).
-- class_minimum_livetime_when_unmet: still export sub-minimum classes in LiveTime CSV.

alter table public.events
  add column if not exists class_minimum_entries integer null;

alter table public.events
  add column if not exists class_minimum_livetime_when_unmet boolean not null default false;
