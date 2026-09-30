-- Nomination reminder alerts for members who have not nominated yet.
-- Run after scripts/process-nominations-open-notifications.sql.
-- Redeploy process-nominations-open after this script.

alter table public.events
  add column if not exists notify_nominations_reminder boolean not null default false;

alter table public.events
  add column if not exists nominations_reminder_at timestamptz;

alter table public.events
  add column if not exists nominations_reminder_message text;

alter table public.events
  add column if not exists nominations_reminder_notified_at timestamptz;

comment on column public.events.notify_nominations_reminder is
  'When true, send a reminder at nominations_reminder_at to members who have not nominated.';

comment on column public.events.nominations_reminder_at is
  'When to send the nomination reminder.';

comment on column public.events.nominations_reminder_message is
  'Short reminder body (lock-screen / email).';

comment on column public.events.nominations_reminder_notified_at is
  'Set when nomination reminders have been sent for this reminder time.';

create or replace function public.reset_nominations_reminder_notified_at()
returns trigger
language plpgsql
as $$
begin
  if new.nominations_reminder_at is distinct from old.nominations_reminder_at
     or new.notify_nominations_reminder is distinct from old.notify_nominations_reminder
     or coalesce(new.nominations_reminder_message, '') is distinct from coalesce(old.nominations_reminder_message, '')
  then
    new.nominations_reminder_notified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists events_reset_nominations_reminder_notified_at on public.events;
create trigger events_reset_nominations_reminder_notified_at
  before update of nominations_reminder_at, notify_nominations_reminder, nominations_reminder_message
  on public.events
  for each row
  execute function public.reset_nominations_reminder_notified_at();
