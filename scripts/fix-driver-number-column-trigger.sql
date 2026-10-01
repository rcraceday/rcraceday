-- Fixes driver INSERT failures:
--   column "number" of relation "drivers" does not exist
-- Cause: trigger function assign_number_on_driver_insert() wrote to drivers.number
-- Run once in Supabase SQL editor, then re-run:
--   pnpm import:households --create-drivers

CREATE OR REPLACE FUNCTION public.assign_number_on_driver_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_number integer;
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    UPDATE public.numbers
    SET assigned_to_driver = NEW.id,
        assigned_driver_name = COALESCE(
          trim(NEW.first_name || ' ' || NEW.last_name),
          assigned_driver_name
        ),
        status = 'assigned',
        updated_at = now()
    WHERE (NEW.club_id IS NULL OR club_id = NEW.club_id)
      AND assigned_to_driver IS NULL
      AND assigned_driver_name IS NOT NULL
      AND lower(trim(assigned_driver_name)) =
          lower(trim(NEW.first_name || ' ' || NEW.last_name))
    RETURNING number INTO v_number;
  END IF;

  IF v_number IS NOT NULL THEN
    UPDATE public.drivers
    SET permanent_number = v_number,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Optional: drop or rewrite claim_number_and_insert_driver if you still use that RPC.
-- It also inserts drivers.number; the app uses claim via drivers + assign_driver_number instead.
