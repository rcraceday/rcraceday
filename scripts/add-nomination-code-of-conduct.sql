-- Code of Conduct acceptance on nomination checkout.
-- Club URL lives in clubs.driver_settings.nomination (no slug hardcoding in app code).
-- The seed below is for the Chargers production club only.

update public.clubs
set driver_settings = coalesce(driver_settings, '{}'::jsonb) || jsonb_build_object(
  'nomination', jsonb_build_object(
    'require_code_of_conduct', true,
    'code_of_conduct_url', '/ChargersRC_Code_of_Conduct.pdf'
  )
)
where slug = 'chargers-rc';
