-- Club-wide background behind news item images (carousel, detail, list).
alter table public.clubs
  add column if not exists news_background_url text;

comment on column public.clubs.news_background_url is
  'Optional image shown behind club news item artwork across the member app.';
