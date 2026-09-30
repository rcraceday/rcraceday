-- Vault + Edge secrets for automatic nominations-open (pg_cron).
-- Run in Supabase SQL Editor, then scripts/schedule-nominations-open-cron.sql
--
-- STEP 1 — Dashboard → Edge Functions → Secrets → add:
--   CRON_SECRET = (pick a long random string, e.g. 32+ chars)
--
-- STEP 2 — Same SQL Editor, store the SAME string in Vault:
--   select vault.create_secret(
--     'paste-the-same-CRON_SECRET-here',
--     'cron_secret',
--     'Must match Edge Function secret CRON_SECRET'
--   );
--
-- STEP 3 — Gateway apikey for pg_net (anon public is fine):
--   select vault.create_secret(
--     'YOUR_ANON_PUBLIC_KEY',
--     'anon_key',
--     'Anon key for Supabase gateway on scheduled invoke'
--   );
--
-- STEP 4 — project_url (if missing):
--   select vault.create_secret(
--     'https://mvcttnmclrvaatdgzhpb.supabase.co',
--     'project_url',
--     'Supabase project URL for scheduled Edge Function calls'
--   );
--
-- Optional (instead of cron_secret): service_role JWT from Dashboard → API → service_role
--   select vault.create_secret('YOUR_SERVICE_ROLE_JWT', 'service_role_key', '...');
--
-- Verify service_role is NOT the same as anon (first ~15 chars should differ):
--   select name, left(decrypted_secret, 12) as prefix
--   from vault.decrypted_secrets
--   where name in ('anon_key', 'service_role_key', 'cron_secret')
--   order by name;

select name, description
from vault.secrets
where name in ('project_url', 'anon_key', 'service_role_key', 'cron_secret')
order by name;
