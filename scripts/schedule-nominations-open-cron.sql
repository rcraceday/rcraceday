-- Automatic nominations-open delivery.
-- Invokes process-nominations-open every minute via pg_cron + pg_net.
--
-- Prerequisites:
--   1. process-nominations-open-notifications.sql
--   2. Deploy process-nominations-open (--no-verify-jwt) after auth changes
--   3. setup-nominations-open-cron-vault.sql (CRON_SECRET in Edge + Vault cron_secret)
--   4. This file

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'cron_secret'
  ) and not exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) then
    raise exception
      'Add cron_secret to Vault (and matching CRON_SECRET Edge secret) OR service_role_key. See scripts/setup-nominations-open-cron-vault.sql';
  end if;

  if not exists (
    select 1 from vault.decrypted_secrets where name = 'project_url'
  ) then
    perform vault.create_secret(
      'https://mvcttnmclrvaatdgzhpb.supabase.co',
      'project_url',
      'Supabase project URL for scheduled Edge Function calls'
    );
  end if;
end $$;

create or replace function public.invoke_process_nominations_open()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  request_id bigint;
  project_url text;
  service_role_key text;
  anon_key text;
  cron_secret text;
  gateway_key text;
  headers jsonb;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select trim(decrypted_secret) into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  select trim(decrypted_secret) into anon_key
  from vault.decrypted_secrets
  where name = 'anon_key'
  limit 1;

  select trim(decrypted_secret) into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  gateway_key := coalesce(nullif(service_role_key, ''), nullif(anon_key, ''));

  if project_url is null or gateway_key is null then
    raise warning 'invoke_process_nominations_open: missing project_url or anon_key/service_role_key for gateway';
    return null;
  end if;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', gateway_key,
    'Authorization', 'Bearer ' || gateway_key
  );

  if cron_secret is not null and length(cron_secret) > 0 then
    headers := headers || jsonb_build_object('x-cron-secret', cron_secret);
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/process-nominations-open',
    headers := headers,
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_process_nominations_open() from public;
grant execute on function public.invoke_process_nominations_open() to postgres;

do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid
  from cron.job
  where jobname = 'process-nominations-open'
  limit 1;

  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;

  perform cron.schedule(
    'process-nominations-open',
    '* * * * *',
    $cron$select public.invoke_process_nominations_open();$cron$
  );
end $$;
