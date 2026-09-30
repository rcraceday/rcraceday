-- Nominations-open notification delivery (in-app + push + email).
-- Also run scripts/create-notifications.sql (in-app feed).
-- Run after create-notification-preferences.sql.
-- Deploy edge functions: process-nominations-open, send-web-push (generic push API)
-- Run scripts/create-push-subscriptions.sql and configure VAPID keys before push delivery.
-- Automatic send: run scripts/schedule-nominations-open-cron.sql (pg_cron + pg_net every minute).

alter table public.events
  add column if not exists nominations_open_notified_at timestamptz;

comment on column public.events.nominations_open_notified_at is
  'Set when nominations-open alerts have been sent for this event open time.';

create or replace function public.reset_nominations_open_notified_at()
returns trigger
language plpgsql
as $$
begin
  if new.nominations_open is distinct from old.nominations_open then
    new.nominations_open_notified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists events_reset_nominations_open_notified_at on public.events;
create trigger events_reset_nominations_open_notified_at
  before update of nominations_open on public.events
  for each row
  execute function public.reset_nominations_open_notified_at();
