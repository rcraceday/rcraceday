-- Household nomination credits (apply to future events / nominations).
--
-- Current app behaviour: EventNominate.jsx only writes a snapshot into
-- nominations.merchandise.nomination_credit_amount. That is NOT a wallet and
-- is overwritten on the next save. Run this script to store credits properly.
--
-- Balance for a household in a club:
--   select coalesce(sum(amount), 0)
--   from public.nomination_credits
--   where group_id = '<household_memberships.id>'
--     and club_id = '<clubs.id>';
--
-- amount > 0  = credit issued (nomination reduced after payment)
-- amount < 0  = credit applied to a later nomination

create table if not exists public.nomination_credits (
  id uuid not null default gen_random_uuid(),
  group_id uuid not null,
  club_id uuid not null,
  amount numeric not null,
  source_event_id uuid null,
  applied_event_id uuid null,
  notes text null,
  created_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  constraint nomination_credits_pkey primary key (id),
  constraint nomination_credits_group_id_fkey
    foreign key (group_id) references public.household_memberships (id) on delete cascade,
  constraint nomination_credits_club_id_fkey
    foreign key (club_id) references public.clubs (id),
  constraint nomination_credits_source_event_id_fkey
    foreign key (source_event_id) references public.events (id) on delete set null,
  constraint nomination_credits_applied_event_id_fkey
    foreign key (applied_event_id) references public.events (id) on delete set null,
  constraint nomination_credits_amount_nonzero check (amount <> 0)
);

create index if not exists nomination_credits_group_id_idx
  on public.nomination_credits (group_id);

create index if not exists nomination_credits_club_id_idx
  on public.nomination_credits (club_id);

create or replace view public.nomination_credit_balances as
select
  group_id,
  club_id,
  coalesce(sum(amount), 0) as balance
from public.nomination_credits
group by group_id, club_id;

alter table public.nomination_credits enable row level security;

drop policy if exists "nomination_credits_select_household" on public.nomination_credits;
create policy "nomination_credits_select_household"
  on public.nomination_credits
  for select
  to authenticated
  using (
    group_id in (select public.user_household_membership_ids())
    or public.user_is_club_admin()
  );

drop policy if exists "nomination_credits_insert_household" on public.nomination_credits;
create policy "nomination_credits_insert_household"
  on public.nomination_credits
  for insert
  to authenticated
  with check (
    group_id in (select public.user_household_membership_ids())
    or public.user_is_club_admin()
  );

grant select, insert on public.nomination_credits to authenticated;
grant select on public.nomination_credit_balances to authenticated;
