-- ==============================================================================
-- Migration: Add Multi-Location Support to user_location_preferences
-- Date: 2025-11-03
-- Purpose: Enable users to save multiple named locations (home, coastal, etc.)
--          with latest-wins conflict resolution across Go Daisy and Findr
-- ==============================================================================

-- Add new columns for multi-location support
ALTER TABLE user_location_preferences
ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_location_id TEXT,
ADD COLUMN IF NOT EXISTS last_modified_slot TEXT;

-- Create index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_locations
ON user_location_preferences USING GIN (locations);

-- Add comment explaining JSONB structure
COMMENT ON COLUMN user_location_preferences.locations IS
'Array of saved locations in format:
[{
  "id": "uuid-v4",
  "slot": "home" | "coastal" | "findr_primary" | "custom",
  "name": "Brighton Beach",
  "lat": 50.8198,
  "lon": -0.1367,
  "rectangleCode": "31F1" | null,
  "rectangleRegion": "English Channel" | null,
  "accuracy": 10 | null,
  "source": "manual" | "gps" | "ip",
  "updatedAt": "2025-11-03T14:00:00Z",
  "usageCount": 5
}]';

COMMENT ON COLUMN user_location_preferences.active_location_id IS
'ID of the currently active location (references locations[].id)';

COMMENT ON COLUMN user_location_preferences.last_modified_slot IS
'Most recently modified location slot ("home", "coastal", "findr_primary", etc.)';

-- ==============================================================================
-- Data Migration Function: Convert home_coordinates to locations array
-- ==============================================================================
CREATE OR REPLACE FUNCTION migrate_home_coordinates_to_locations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  location_obj JSONB;
  location_id TEXT;
BEGIN
  -- Loop through all user_location_preferences rows with home_coordinates
  FOR rec IN
    SELECT user_id, home_coordinates, home_region, home_place_name, home_location_name
    FROM user_location_preferences
    WHERE home_coordinates IS NOT NULL
      AND (locations IS NULL OR jsonb_array_length(locations) = 0)
  LOOP
    -- Generate UUID for this location
    location_id := gen_random_uuid()::text;

    -- Build location object
    location_obj := jsonb_build_object(
      'id', location_id,
      'slot', 'home',
      'name', COALESCE(
        rec.home_location_name,
        rec.home_place_name,
        rec.home_region,
        'Home Location'
      ),
      'lat', (rec.home_coordinates->>'lat')::numeric,
      'lon', (rec.home_coordinates->>'lon')::numeric,
      'rectangleCode', rec.home_coordinates->>'rectangleCode',
      'rectangleRegion', COALESCE(
        rec.home_coordinates->>'rectangleRegion',
        rec.home_region,
        rec.home_place_name
      ),
      'accuracy', COALESCE((rec.home_coordinates->>'accuracy')::numeric, NULL),
      'source', COALESCE(
        (SELECT location_source FROM user_location_preferences WHERE user_id = rec.user_id),
        'manual'
      ),
      'updatedAt', COALESCE(
        rec.home_coordinates->>'updatedAt',
        (SELECT updated_at FROM user_location_preferences WHERE user_id = rec.user_id)::text,
        NOW()::text
      ),
      'usageCount', 1
    );

    -- Update row with new locations array and active_location_id
    UPDATE user_location_preferences
    SET
      locations = jsonb_build_array(location_obj),
      active_location_id = location_id,
      last_modified_slot = 'home'
    WHERE user_id = rec.user_id;

    RAISE NOTICE 'Migrated home_coordinates for user %', rec.user_id;
  END LOOP;

  RAISE NOTICE 'Migration complete: Migrated % users',
    (SELECT COUNT(*) FROM user_location_preferences WHERE jsonb_array_length(locations) > 0);
END;
$$;

-- ==============================================================================
-- Helper Function: Get location by slot
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_location_by_slot(
  p_user_id UUID,
  p_slot TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_array_elements(locations)
  INTO result
  FROM user_location_preferences
  WHERE user_id = p_user_id
    AND locations @> jsonb_build_array(jsonb_build_object('slot', p_slot))
  LIMIT 1;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_location_by_slot IS
'Retrieve a specific location by slot name (e.g., "home", "coastal")';

-- ==============================================================================
-- Helper Function: Upsert location by slot (latest wins)
-- ==============================================================================
CREATE OR REPLACE FUNCTION upsert_location_by_slot(
  p_user_id UUID,
  p_slot TEXT,
  p_location JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  existing_locations JSONB;
  new_locations JSONB;
  location_id TEXT;
  existing_id TEXT;
  result JSONB;
BEGIN
  -- Get existing locations array
  SELECT COALESCE(locations, '[]'::jsonb)
  INTO existing_locations
  FROM user_location_preferences
  WHERE user_id = p_user_id;

  -- Check if slot already exists
  SELECT elem->>'id'
  INTO existing_id
  FROM jsonb_array_elements(existing_locations) AS elem
  WHERE elem->>'slot' = p_slot
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Update existing location (preserve ID, increment usageCount)
    location_id := existing_id;

    new_locations := (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'slot' = p_slot THEN
            elem
            || p_location
            || jsonb_build_object(
              'id', existing_id,
              'slot', p_slot,
              'usageCount', COALESCE((elem->>'usageCount')::int, 0) + 1,
              'updatedAt', NOW()::text
            )
          ELSE elem
        END
      )
      FROM jsonb_array_elements(existing_locations) AS elem
    );
  ELSE
    -- Create new location
    location_id := gen_random_uuid()::text;

    new_locations := existing_locations || jsonb_build_array(
      p_location
      || jsonb_build_object(
        'id', location_id,
        'slot', p_slot,
        'usageCount', 1,
        'updatedAt', NOW()::text
      )
    );
  END IF;

  -- Update user_location_preferences
  UPDATE user_location_preferences
  SET
    locations = new_locations,
    active_location_id = location_id,
    last_modified_slot = p_slot,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no row exists, insert new one
  IF NOT FOUND THEN
    INSERT INTO user_location_preferences (user_id, locations, active_location_id, last_modified_slot)
    VALUES (
      p_user_id,
      jsonb_build_array(
        p_location
        || jsonb_build_object(
          'id', location_id,
          'slot', p_slot,
          'usageCount', 1,
          'updatedAt', NOW()::text
        )
      ),
      location_id,
      p_slot
    );
  END IF;

  -- Return the created/updated location
  SELECT jsonb_array_elements(locations)
  INTO result
  FROM user_location_preferences
  WHERE user_id = p_user_id
    AND jsonb_array_elements(locations)->>'id' = location_id;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION upsert_location_by_slot IS
'Insert or update a location by slot name. Latest update always wins.';

-- ==============================================================================
-- Execute Migration (Commented out - run manually when ready)
-- ==============================================================================
-- Uncomment below to auto-migrate all existing home_coordinates
-- SELECT migrate_home_coordinates_to_locations();

-- ==============================================================================
-- Rollback Instructions
-- ==============================================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS upsert_location_by_slot(UUID, TEXT, JSONB);
-- DROP FUNCTION IF EXISTS get_location_by_slot(UUID, TEXT);
-- DROP FUNCTION IF EXISTS migrate_home_coordinates_to_locations();
-- DROP INDEX IF EXISTS idx_user_location_preferences_locations;
-- ALTER TABLE user_location_preferences DROP COLUMN IF EXISTS last_modified_slot;
-- ALTER TABLE user_location_preferences DROP COLUMN IF EXISTS active_location_id;
-- ALTER TABLE user_location_preferences DROP COLUMN IF EXISTS locations;
