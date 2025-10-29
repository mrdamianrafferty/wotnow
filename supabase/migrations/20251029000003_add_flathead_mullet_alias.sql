-- Fix Grey Mullet species naming
--
-- CURRENT STATE:
--   Chelon labrosus: "Grey Mullet"
--   Mugil cephalus: "Flathead Grey Mullet"
--
-- CORRECT STATE:
--   Chelon labrosus: "Thicklip Grey Mullet"
--   Mugil cephalus: "Grey Mullet" (canonical)
--   "Flathead Grey Mullet" → alias for Mugil cephalus

-- Step 1: Rename Chelon labrosus to "Thicklip Grey Mullet"
UPDATE species
SET name_en = 'Thicklip Grey Mullet'
WHERE scientific_name = 'Chelon labrosus';

-- Step 2: Rename Mugil cephalus to "Grey Mullet" (canonical name)
UPDATE species
SET name_en = 'Grey Mullet'
WHERE scientific_name = 'Mugil cephalus';

-- Step 3: Add "Flathead Grey Mullet" as alias for Mugil cephalus
INSERT INTO species_name_alias (name_en_alias, scientific_name)
VALUES ('Flathead Grey Mullet', 'Mugil cephalus')
ON CONFLICT (name_en_alias) DO NOTHING;

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '✅ Grey Mullet species fixed:';
  RAISE NOTICE '  Chelon labrosus → "Thicklip Grey Mullet"';
  RAISE NOTICE '  Mugil cephalus → "Grey Mullet" (canonical)';
  RAISE NOTICE '  "Flathead Grey Mullet" → alias for Mugil cephalus';
  RAISE NOTICE '';
  RAISE NOTICE 'Users searching "Flathead Grey Mullet" will see "Grey Mullet" results.';
END $$;
