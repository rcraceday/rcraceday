-- Automatic nominations-open delivery.
-- Invokes process-nominations-open every minute via pg_cron + pg_net.
-- Run after process-nominations-open-notifications.sql and deploying the Edge Function.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Store project URL + anon/publishable key in Vault if missing.
-- Replace the placeholders only if these secret names do not already exist.
do $$
declare
  has_url boolean;
  has_key boolean;
begin
  select exists (
    select 1 from vault.decrypted_secrets where name = 'project_url'
  ) into has_url;
  select exists (
    select 1 from vault.decrypted_secrets where name = 'anon_key'
  ) into has_key;

  if not has_url then
    perform vault.create_secret(
      'https://mvcttnmclrvaatdgzhpb.supabase.co',
      'project_url',
      'Supabase project URL for scheduled Edge Function calls'
    );
  end if;

  if not has_key then
    raise exception
      'Vault secret anon_key is missing. In SQL Editor run: select vault.create_secret(''<anon/publishable key>'', ''anon_key''); then rerun this script.';
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
  anon_key text;
  cron_secret text;
  headers jsonb;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into anon_key
  from vault.decrypted_secrets
  where name = 'anon_key'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if project_url is null or anon_key is null then
    raise warning 'invoke_process_nominations_open: missing vault secrets project_url/anon_key';
    return null;
  end if;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', anon_key,
    'Authorization', 'Bearer ' || anon_key
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
