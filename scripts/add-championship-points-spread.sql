-- Optional saved point-spread generator settings (first place, step, count, floor).

alter table public.championships
  add column if not exists points_spread jsonb;

comment on column public.championships.points_spread is
  'Last-used spread generator: { firstPlace, step, positionCount, belowLast }.';
