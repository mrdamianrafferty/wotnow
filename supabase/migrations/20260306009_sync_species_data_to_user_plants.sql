-- Sync frost_tolerance, water_needs, and temperature bounds from plant_species
-- to grow_user_plants. The weather-tasks API reads from grow_user_plants, not
-- plant_species, so these columns must be populated for frost alerts and
-- watering nudges to work correctly.
--
-- This migration:
-- 1. Backfills all existing grow_user_plants rows from plant_species
-- 2. Creates a trigger to auto-populate on future inserts/updates

BEGIN;

-- ============================================================================
-- SECTION 1: Backfill existing user plants from species data
-- ============================================================================

-- Backfill frost_tolerance where NULL
UPDATE grow_user_plants gup
SET frost_tolerance = ps.frost_tolerance
FROM plant_species ps
WHERE gup.species_slug = ps.slug
  AND gup.frost_tolerance IS NULL
  AND ps.frost_tolerance IS NOT NULL;

-- Backfill temperature_min_c where NULL
UPDATE grow_user_plants gup
SET temperature_min_c = ps.min_temp_c
FROM plant_species ps
WHERE gup.species_slug = ps.slug
  AND gup.temperature_min_c IS NULL
  AND ps.min_temp_c IS NOT NULL;

-- Backfill water_needs from species watering column where possible
-- Map Perenual watering values to our enum
UPDATE grow_user_plants gup
SET water_needs = CASE
  WHEN ps.watering ILIKE '%frequent%' OR ps.watering ILIKE '%high%' THEN 'high'
  WHEN ps.watering ILIKE '%minimum%' OR ps.watering ILIKE '%low%' OR ps.watering ILIKE '%none%' THEN 'low'
  ELSE 'medium'
END
FROM plant_species ps
WHERE gup.species_slug = ps.slug
  AND gup.water_needs IS NULL
  AND ps.watering IS NOT NULL
  AND ps.watering != '';

-- For any still NULL water_needs, set medium as sensible default
UPDATE grow_user_plants
SET water_needs = 'medium'
WHERE water_needs IS NULL;

-- Set temperature_max_c defaults based on category for heat stress detection
-- (most plants stress above 30-35C; tender tropicals handle heat better)
UPDATE grow_user_plants gup
SET temperature_max_c = CASE
  WHEN ps.frost_tolerance = 'tender' THEN 38
  WHEN ps.frost_tolerance = 'half_hardy' THEN 35
  ELSE 32
END
FROM plant_species ps
WHERE gup.species_slug = ps.slug
  AND gup.temperature_max_c IS NULL
  AND ps.frost_tolerance IS NOT NULL;

-- ============================================================================
-- SECTION 2: Trigger to auto-populate on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_species_data_to_user_plant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if species_slug is set and weather fields are NULL
  IF NEW.species_slug IS NOT NULL THEN
    -- Frost tolerance
    IF NEW.frost_tolerance IS NULL THEN
      SELECT frost_tolerance INTO NEW.frost_tolerance
      FROM plant_species WHERE slug = NEW.species_slug;
    END IF;

    -- Temperature min
    IF NEW.temperature_min_c IS NULL THEN
      SELECT min_temp_c INTO NEW.temperature_min_c
      FROM plant_species WHERE slug = NEW.species_slug;
    END IF;

    -- Temperature max (derive from frost tolerance if not on species)
    IF NEW.temperature_max_c IS NULL THEN
      NEW.temperature_max_c := CASE
        WHEN NEW.frost_tolerance = 'tender' THEN 38
        WHEN NEW.frost_tolerance = 'half_hardy' THEN 35
        ELSE 32
      END;
    END IF;

    -- Water needs
    IF NEW.water_needs IS NULL THEN
      SELECT CASE
        WHEN watering ILIKE '%frequent%' OR watering ILIKE '%high%' THEN 'high'
        WHEN watering ILIKE '%minimum%' OR watering ILIKE '%low%' OR watering ILIKE '%none%' THEN 'low'
        ELSE 'medium'
      END INTO NEW.water_needs
      FROM plant_species WHERE slug = NEW.species_slug;

      -- Default to medium if species has no watering data
      IF NEW.water_needs IS NULL THEN
        NEW.water_needs := 'medium';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_species_data ON grow_user_plants;

-- Create trigger for INSERT and UPDATE of species_slug
CREATE TRIGGER trg_sync_species_data
  BEFORE INSERT OR UPDATE OF species_slug
  ON grow_user_plants
  FOR EACH ROW
  EXECUTE FUNCTION sync_species_data_to_user_plant();

COMMIT;
