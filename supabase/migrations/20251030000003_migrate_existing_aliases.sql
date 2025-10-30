-- Phase 2: Migrate existing alias data into species.aliases column
-- This consolidates species_name_alias and species_alias tables into the new aliases array
-- Date: 2025-10-30
-- Part of Species Schema Migration Plan

-- Step 1: Migrate formal English names from species_name_alias table
-- These are entries like "Atlantic Cod" → Gadus morhua
UPDATE species s
SET aliases = array_append(aliases, sna.name_en_alias)
FROM species_name_alias sna
WHERE s.scientific_name = sna.scientific_name
  AND sna.name_en_alias IS NOT NULL
  AND sna.name_en_alias != ''
  -- Don't add if it's already in the array or matches name_en
  AND NOT (sna.name_en_alias = ANY(s.aliases))
  AND sna.name_en_alias != s.name_en;

-- Step 2: Migrate common aliases from species_alias table
-- These are entries like "Dolphin (Mahi-mahi)", "Tarpon"
UPDATE species s
SET aliases = array_append(aliases, sa.name_en_alias)
FROM species_alias sa
WHERE s.id = sa.species_id
  AND sa.name_en_alias IS NOT NULL
  AND sa.name_en_alias != ''
  -- Don't add if it's already in the array or matches name_en
  AND NOT (sa.name_en_alias = ANY(s.aliases))
  AND sa.name_en_alias != s.name_en;

-- Step 3: Also add lowercase versions for case-insensitive search
-- (This helps with fuzzy matching, e.g., "atlantic cod" finds "Atlantic Cod")
WITH lowercase_aliases AS (
  SELECT
    id,
    unnest(aliases) as alias
  FROM species
  WHERE array_length(aliases, 1) > 0
)
UPDATE species s
SET aliases = array_append(s.aliases, lower(la.alias))
FROM lowercase_aliases la
WHERE s.id = la.id
  AND lower(la.alias) != la.alias  -- Only add if it's different
  AND NOT (lower(la.alias) = ANY(s.aliases));  -- Don't duplicate

-- Verification: Check migration results
DO $$
DECLARE
  species_with_aliases INTEGER;
  total_alias_count INTEGER;
BEGIN
  -- Count species with aliases
  SELECT COUNT(*) INTO species_with_aliases
  FROM species
  WHERE array_length(aliases, 1) > 0;

  -- Count total aliases
  SELECT SUM(array_length(aliases, 1)) INTO total_alias_count
  FROM species;

  RAISE NOTICE '✅ Alias Migration Complete!';
  RAISE NOTICE '  Species with aliases: %', species_with_aliases;
  RAISE NOTICE '  Total aliases: %', COALESCE(total_alias_count, 0);
  RAISE NOTICE '';
  RAISE NOTICE 'Sample species with aliases:';
END $$;

-- Show some examples
SELECT
  species_code,
  scientific_name,
  name_en,
  aliases,
  array_length(aliases, 1) as alias_count
FROM species
WHERE array_length(aliases, 1) > 0
ORDER BY array_length(aliases, 1) DESC
LIMIT 5;

-- Add comment documenting the migration
COMMENT ON COLUMN species.aliases IS 'Common English names and alternative names for species search. Migrated from species_name_alias and species_alias tables on 2025-10-30.';
