-- Fix findr_catch_entries with invalid species_id values
-- Replace species codes with proper UUID references

-- This migration fixes catch entries that were logged with species codes (e.g., 'MAC', 'BSS')
-- instead of proper UUID references to the species table.

-- Update species_id from code to UUID for all catch entries where species_id is a code
UPDATE findr_catch_entries
SET species_id = (
  SELECT id
  FROM species
  WHERE species_code = findr_catch_entries.species_id
)
WHERE
  -- Only update entries where species_id is NOT a valid UUID (i.e., it's a code)
  species_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM species
    WHERE species_code = findr_catch_entries.species_id
  );

-- Log the number of entries that couldn't be fixed
DO $$
DECLARE
  unfixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unfixed_count
  FROM findr_catch_entries
  WHERE species_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF unfixed_count > 0 THEN
    RAISE WARNING 'Found % catch entries with invalid species_id that could not be automatically fixed', unfixed_count;
  END IF;
END $$;
