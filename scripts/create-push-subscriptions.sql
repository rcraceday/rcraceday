-- Web Push (PWA) device subscriptions + preference flag.
-- Generate VAPID keys (run once locally): npx web-push generate-vapid-keys
--   Public  -> VITE_VAPID_PUBLIC_KEY (.env) + VAPID_PUBLIC_KEY (Edge secrets)
--   Private -> VAPID_PRIVATE_KEY (Edge secrets only)
--   VAPID_SUBJECT -> mailto:you@yourdomain.com (Edge secrets)

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  club_id uuid references public.clubs (id) on delete set null,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on table public.push_subscriptions is
  'Browser Web Push subscriptions (one row per device endpoint).';

-- Optional: document push_enabled on membership notification_preferences JSON
comment on column public.household_memberships.notification_preferences is
  'JSON: in_app_enabled, email_enabled, push_enabled, nominations_open_enabled, membership_renewal_enabled, track_ids';
