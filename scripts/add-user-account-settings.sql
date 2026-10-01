-- User account settings: contact details, language, and timezone on profiles.
-- Run in the Supabase SQL editor.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists suburb text,
  add column if not exists state text,
  add column if not exists postcode text,
  add column if not exists country text,
  add column if not exists preferred_language text,
  add column if not exists timezone text;

comment on column public.profiles.phone is
  'Account contact phone number.';
comment on column public.profiles.preferred_language is
  'BCP 47 language tag for UI and communications, e.g. en-AU.';
comment on column public.profiles.timezone is
  'IANA timezone name, e.g. Australia/Sydney.';

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
