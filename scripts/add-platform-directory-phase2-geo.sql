-- Phase 2: geo search + club environment types (Air / Land / Water).
-- No new columns required — data lives in clubs.directory_profile jsonb:
--
-- {
--   "environments": ["land"],
--   "location": {
--     "suburb": "Sydney",
--     "state": "NSW",
--     "postcode": "2000",
--     "country": "Australia",
--     "lat": -33.8688,
--     "lng": 151.2093
--   }
-- }
--
-- Admins set these under Admin → Settings → Club Info (directory section).
-- Clubs need lat/lng for radius search on rcraceday.com club finder.

comment on column public.clubs.directory_profile is
  'Public directory: tagline, scales_offered[], classes_offered, environments[] (land|air|water), location { suburb, state, postcode, country, lat, lng }.';
