alter table events
  add column if not exists class_limit_per_day integer;
