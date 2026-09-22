-- Nomination workflow support for grouped household submissions and LiveTime export.
alter table public.drivers
  rename column chassis_manufacturer to manufacturer;

alter table public.nominations
  add column if not exists paid boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'nominations_group_id_fkey'
  ) then
    alter table public.nominations
      add constraint nominations_group_id_fkey
      foreign key (group_id) references public.household_memberships(id);
  end if;
end $$;

create unique index if not exists nominations_event_driver_unique
  on public.nominations (event_id, driver_id);
