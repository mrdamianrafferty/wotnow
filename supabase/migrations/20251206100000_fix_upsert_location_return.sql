-- Fix upsert_location_by_slot return query
-- The previous version had a problematic query using jsonb_array_elements in WHERE clause

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
    
    -- Set new_locations for the return query
    new_locations := jsonb_build_array(
      p_location
      || jsonb_build_object(
        'id', location_id,
        'slot', p_slot,
        'usageCount', 1,
        'updatedAt', NOW()::text
      )
    );
  END IF;

  -- Return the created/updated location (fixed query)
  SELECT elem INTO result
  FROM jsonb_array_elements(new_locations) AS elem
  WHERE elem->>'id' = location_id
  LIMIT 1;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION upsert_location_by_slot IS
'Insert or update a location by slot name. Latest update always wins. Fixed return query.';
