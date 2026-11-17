-- Multi-day event results: one import row per event day (result_day_index).
-- Run in the Supabase SQL editor after create-event-results.sql.

alter table public.event_results
  add column if not exists result_day_index integer,
  add column if not exists result_day_date date;

alter table public.event_results
  drop constraint if exists event_results_event_unique;

create unique index if not exists event_results_event_single_day_idx
  on public.event_results (event_id)
  where result_day_index is null;

create unique index if not exists event_results_event_multi_day_idx
  on public.event_results (event_id, result_day_index)
  where result_day_index is not null;

comment on column public.event_results.result_day_index is
  'Zero-based index into events.days for multi-day events. Null for single-day events.';

comment on column public.event_results.result_day_date is
  'Calendar date for this result day (from event day record).';

comment on table public.event_results is
  'Imported result sets per event (single-day) or per event day (multi-day).';