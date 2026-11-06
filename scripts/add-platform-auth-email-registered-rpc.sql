-- Anonymous-safe check for platform login UX (boolean only; no user data leaked).
-- Run in Supabase SQL editor, then grant is applied below.

create or replace function public.platform_auth_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from auth.users u
    where lower(trim(u.email)) = lower(trim(coalesce(p_email, '')))
  );
$$;

revoke all on function public.platform_auth_email_registered(text) from public;
grant execute on function public.platform_auth_email_registered(text) to anon, authenticated;
