-- Late entry windows are event configuration (AdminEventEdit / EventNominationsCard).
-- They do NOT belong on public.nominations (driver rows only store total_fee, merchandise, etc.).
--
-- Late fee amount is in events.pricing JSONB: pricing.late_fee (EventPricingCard).

alter table public.events
  add column if not exists late_entries_enabled boolean not null default false;

alter table public.events
  add column if not exists late_fee_activation timestamptz null;

alter table public.events
  add column if not exists late_entries_close timestamptz null;
