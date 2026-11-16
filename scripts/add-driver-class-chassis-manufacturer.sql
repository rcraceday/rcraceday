-- Chassis manufacturer per driver/class (set when nominating; used in LiveTime export).
alter table public.driver_classes add column if not exists chassis_manufacturer text not null default '';