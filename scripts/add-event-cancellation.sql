-- Event cancellation (rain-out): keep the event, credit paid nominations,
-- and notify nominated households. Run in the Supabase SQL editor.
--
-- Club refund/credit policy lives in clubs.driver_settings.cancellation
-- (no slug hardcoding in app code). The seed below is for the Chargers
-- production club only.

alter table public.events
  add column if not exists is_cancelled boolean not null default false;

alter table public.events
  add column if not exists cancelled_at timestamptz;

alter table public.events
  add column if not exists cancelled_by uuid references auth.users (id) on delete set null;

comment on column public.events.is_cancelled is
  'True when the meeting was rained out or otherwise cancelled. Nominations are kept and paid entry fees are credited.';

comment on column public.events.cancelled_at is
  'When an admin cancelled the event.';

create index if not exists events_club_id_is_cancelled_idx
  on public.events (club_id, is_cancelled);

alter table public.nomination_credits
  add column if not exists refund_deadline timestamptz;

alter table public.nomination_credits
  add column if not exists expires_at timestamptz;

comment on column public.nomination_credits.refund_deadline is
  'If set, the household may ask the club for a cash refund until this instant (typically 6am on the next meeting morning).';

comment on column public.nomination_credits.expires_at is
  'If set, unused positive credit no longer applies after this instant.';

drop policy if exists "notifications_insert_club_admin" on public.notifications;
create policy "notifications_insert_club_admin"
  on public.notifications
  for insert
  to authenticated
  with check (public.user_is_club_admin());

-- Chargers RC: refund until 6am the morning of the next meeting, then 6 months credit.
update public.clubs
set driver_settings = coalesce(driver_settings, '{}'::jsonb) || jsonb_build_object(
  'cancellation', jsonb_build_object(
    'refund_request_until_next_meeting', true,
    'refund_deadline_hour', 6,
    'credit_expiry_months', 6,
    'timezone', 'Australia/Brisbane'
  )
)
where slug = 'chargers-rc';
