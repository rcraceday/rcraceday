-- Run ONE query at a time in Supabase SQL editor.
-- Driver INSERT error: column "number" of relation "drivers" does not exist
-- App column is drivers.permanent_number (race numbers live in public.numbers).

-- 1) Triggers on public.drivers
select t.tgname as trigger_name,
       p.proname as function_name,
       pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname = 'drivers'
  and not t.tgisinternal
order by t.tgname;

-- 2) Trigger functions whose source mentions drivers + number (run separately)
select p.proname as function_name,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and coalesce(p.prosrc, '') ilike '%driver%'
  and coalesce(p.prosrc, '') ilike '%number%'
order by p.proname;
