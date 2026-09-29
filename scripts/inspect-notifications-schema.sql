-- Run in SQL editor to see your current notifications columns before/after migrate.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
order by ordinal_position;
