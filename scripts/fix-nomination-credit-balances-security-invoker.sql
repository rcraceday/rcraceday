-- Fix Supabase lint: Security Definer View on public.nomination_credit_balances.
-- With security_invoker, SELECT uses the querying user's RLS on nomination_credits.

create or replace view public.nomination_credit_balances
with (security_invoker = true)
as
select
  group_id,
  club_id,
  coalesce(sum(amount), 0) as balance
from public.nomination_credits
group by group_id, club_id;

grant select on public.nomination_credit_balances to authenticated;
