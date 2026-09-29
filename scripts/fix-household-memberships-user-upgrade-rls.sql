-- Lets authenticated users update their own household row (e.g. upgrade to family during testing).
-- Run if upgrade fails with row-level security on household_memberships.

drop policy if exists "household_memberships_update_own" on public.household_memberships;

create policy "household_memberships_update_own"
  on public.household_memberships
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
