-- Qualifying metrics from LiveRC round rankings (Top 5 avg, etc.). Safe to run once.

alter table public.event_result_races
  add column if not exists qualifying_rank_method text,
  add column if not exists qualifying_rank_label text;

alter table public.event_result_entries
  add column if not exists top2_con_ms integer,
  add column if not exists top5_avg_ms integer,
  add column if not exists qual_heat_label text;

comment on column public.event_result_races.qualifying_rank_method is
  'LiveRC view_round_ranking o= value when race_kind is qualifying.';
