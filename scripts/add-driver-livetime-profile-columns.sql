-- Optional LiveTime export fields on club driver profiles.
alter table public.drivers add column if not exists phonetic_name text;
alter table public.drivers add column if not exists chassis_manufacturer text;