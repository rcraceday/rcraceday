-- One-time: stop automatic nominations-open for all past events (in-app + push cron).
-- Safe to re-run. Does not delete notification rows.
--
-- After this, only events whose nominations_open is still in the future will fire
-- when that time passes (and nominations_open_notified_at is still null).
--
-- To re-test one event:
--   update public.events
--   set nominations_open_notified_at = null
--   where id = '<event-uuid>';
-- (Changing nominations_open also clears notified_at if the trigger is installed.)

update public.events
set nominations_open_notified_at = coalesce(
  nominations_open_notified_at,
  greatest(nominations_open, now())
)
where nominations_open is not null
  and nominations_open <= now();

-- Optional: remove duplicate backlog in-app rows from the first successful cron burst
-- (uncomment if you want a clean notifications feed for testers)
-- delete from public.notifications
-- where metadata->>'type' = 'nominations_open'
--   and created_at >= '2026-09-30 03:14:00+00'
--   and created_at <= '2026-09-30 03:20:00+00';

select
  count(*) filter (where nominations_open <= now()) as past_events,
  count(*) filter (
    where nominations_open <= now() and nominations_open_notified_at is not null
  ) as past_marked_sent,
  count(*) filter (
    where nominations_open > now() and nominations_open_notified_at is null
  ) as future_ready_for_auto
from public.events
where nominations_open is not null;
