-- Keep legacy is_read in sync with read (your table has both).

update public.notifications
set is_read = coalesce(read, is_read, false)
where is_read is distinct from coalesce(read, false);

update public.notifications
set read = coalesce(is_read, read, false)
where read is distinct from coalesce(is_read, false);

create or replace function public.sync_notifications_read_columns()
returns trigger
language plpgsql
as $$
begin
  if new.read is null and new.is_read is not null then
    new.read := new.is_read;
  elsif new.is_read is null and new.read is not null then
    new.is_read := new.read;
  elsif new.read is distinct from new.is_read then
    new.is_read := new.read;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_sync_read_columns on public.notifications;
create trigger notifications_sync_read_columns
  before insert or update on public.notifications
  for each row
  execute function public.sync_notifications_read_columns();
