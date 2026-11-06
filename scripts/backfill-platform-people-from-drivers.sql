-- Phase 2: one platform_person per (created_by user, normalized name, junior flag); link drivers.
-- Run after scripts/add-platform-people.sql

insert into public.platform_people (user_id, first_name, last_name, is_junior)
select distinct on (d.created_by, lf, ll, ij)
  d.created_by,
  trim(both from d.first_name),
  trim(both from d.last_name),
  coalesce(d.is_junior, false)
from public.drivers d
cross join lateral (
  select
    lower(trim(both from d.first_name)) as lf,
    lower(trim(both from d.last_name)) as ll,
    coalesce(d.is_junior, false) as ij
) norm
where d.created_by is not null
order by d.created_by, lf, ll, ij, d.created_at;

update public.drivers d
set platform_person_id = p.id
from public.platform_people p
where d.created_by = p.user_id
  and lower(trim(both from d.first_name)) = lower(trim(both from p.first_name))
  and lower(trim(both from d.last_name)) = lower(trim(both from p.last_name))
  and coalesce(d.is_junior, false) = coalesce(p.is_junior, false)
  and d.platform_person_id is null;
