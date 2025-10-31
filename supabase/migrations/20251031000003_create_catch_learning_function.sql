-- Create function to learn from catch data and improve regional availability
-- This function is called whenever a new catch is logged

CREATE OR REPLACE FUNCTION update_species_availability_from_catch()
RETURNS TRIGGER AS $$
DECLARE
  v_region_type text;
  v_region_id text;
  v_month integer;
  v_existing_record RECORD;
BEGIN
  -- Determine region type and ID from the catch
  -- Priority: rectangle_code (ICES) > derive from lat/lon (grid cell)

  IF NEW.rectangle_code IS NOT NULL THEN
    v_region_type := 'ices';
    v_region_id := NEW.rectangle_code;
  ELSIF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Derive grid cell from coordinates (0.25° grid)
    -- Format: G025_N{lat}E/W{lon}
    v_region_type := 'grid';
    v_region_id := 'G025_' ||
      CASE WHEN NEW.latitude >= 0 THEN 'N' ELSE 'S' END ||
      LPAD(ABS(FLOOR(NEW.latitude / 0.25) * 0.25)::text, 2, '0') ||
      CASE WHEN NEW.longitude >= 0 THEN 'E' ELSE 'W' END ||
      LPAD(ABS(FLOOR(NEW.longitude / 0.25) * 0.25)::text, 3, '0');
  ELSE
    -- No location data, can't update regional availability
    RETURN NEW;
  END IF;

  -- Extract month from catch date
  v_month := EXTRACT(MONTH FROM COALESCE(NEW.caught_at, NOW()));

  -- Check if record exists
  SELECT * INTO v_existing_record
  FROM species_regional_availability
  WHERE region_type = v_region_type
    AND region_id = v_region_id
    AND species_code = NEW.species_id
    AND (month = v_month OR month IS NULL);  -- Match specific month or year-round

  IF FOUND THEN
    -- Update existing record
    UPDATE species_regional_availability
    SET
      -- Increase availability score (weighted average favoring new data)
      availability_score = CASE
        WHEN catch_count = 0 THEN
          -- First catch: blend baseline with strong positive signal
          LEAST(1.00, availability_score * 0.7 + 0.30)
        WHEN catch_count < 5 THEN
          -- Few catches: gradual increase
          LEAST(1.00, availability_score * 0.85 + 0.15)
        ELSE
          -- Many catches: small boost
          LEAST(1.00, availability_score * 0.95 + 0.05)
      END,

      -- Increase confidence as catch count grows
      confidence = CASE
        WHEN catch_count = 0 THEN 0.70
        WHEN catch_count < 5 THEN LEAST(0.85, confidence + 0.05)
        WHEN catch_count < 10 THEN LEAST(0.90, confidence + 0.03)
        ELSE LEAST(0.95, confidence + 0.01)
      END,

      -- Update data source once we have enough catches
      data_source = CASE
        WHEN catch_count >= 3 THEN 'catch_data'
        ELSE data_source
      END,

      -- Mark as primary habitat if consistently caught
      is_primary_habitat = CASE
        WHEN catch_count >= 5 AND availability_score > 0.75 THEN true
        ELSE is_primary_habitat
      END,

      -- Increment catch count and update timestamp
      catch_count = catch_count + 1,
      last_catch_at = COALESCE(NEW.caught_at, NOW()),
      updated_at = NOW()

    WHERE region_type = v_region_type
      AND region_id = v_region_id
      AND species_code = NEW.species_id
      AND (month = v_month OR month IS NULL);

  ELSE
    -- No existing record: create new one from catch data
    INSERT INTO species_regional_availability (
      region_type,
      region_id,
      species_code,
      month,
      availability_score,
      is_primary_habitat,
      data_source,
      confidence,
      catch_count,
      last_catch_at
    ) VALUES (
      v_region_type,
      v_region_id,
      NEW.species_id,
      NULL::integer,  -- Start with year-round, will add monthly breakdown later
      0.75,  -- Strong initial score from actual catch
      false,  -- Need multiple catches to confirm primary habitat
      'catch_data',
      0.70,  -- Good confidence from actual catch
      1,
      COALESCE(NEW.caught_at, NOW())
    )
    ON CONFLICT (region_type, region_id, species_code, month) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on catch entries table
-- This runs after each catch is inserted
DROP TRIGGER IF EXISTS update_availability_from_catch ON findr_catch_entries;

CREATE TRIGGER update_availability_from_catch
  AFTER INSERT ON findr_catch_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_species_availability_from_catch();

-- Add comments
COMMENT ON FUNCTION update_species_availability_from_catch() IS
  'Automatically updates species regional availability based on user catch logs. Improves availability scores, confidence, and data source as catches accumulate.';

-- Create a helper function to get regional species list
-- This is used by the /api/findr/species/regional endpoint
CREATE OR REPLACE FUNCTION get_regional_species(
  p_region_type text,
  p_region_id text,
  p_month integer DEFAULT NULL,
  p_min_score numeric DEFAULT 0.30
)
RETURNS TABLE (
  species_code text,
  availability_score numeric,
  is_primary_habitat boolean,
  confidence numeric,
  catch_count integer,
  data_source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sra.species_code,
    sra.availability_score,
    sra.is_primary_habitat,
    sra.confidence,
    sra.catch_count,
    sra.data_source
  FROM species_regional_availability sra
  WHERE sra.region_type = p_region_type
    AND sra.region_id = p_region_id
    AND (p_month IS NULL OR sra.month IS NULL OR sra.month = p_month)
    AND sra.availability_score >= p_min_score
  ORDER BY
    sra.availability_score DESC,
    sra.catch_count DESC,
    sra.confidence DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_regional_species(text, text, integer, numeric) IS
  'Get species available in a specific region, optionally filtered by month and minimum availability score. Returns results ordered by availability, catch count, and confidence.';

-- Create a helper function to get seasonal availability for a species
CREATE OR REPLACE FUNCTION get_species_seasonal_availability(
  p_species_code text,
  p_region_type text DEFAULT 'ices'
)
RETURNS TABLE (
  region_id text,
  month integer,
  availability_score numeric,
  is_primary_habitat boolean,
  catch_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sra.region_id,
    sra.month,
    sra.availability_score,
    sra.is_primary_habitat,
    sra.catch_count
  FROM species_regional_availability sra
  WHERE sra.species_code = p_species_code
    AND sra.region_type = p_region_type
    AND sra.availability_score > 0
  ORDER BY
    sra.region_id,
    COALESCE(sra.month, 0);  -- NULL (year-round) sorts first
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_species_seasonal_availability(text, text) IS
  'Get seasonal availability pattern for a species across all regions. Useful for migration and seasonal behavior analysis.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_regional_species(text, text, integer, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_species_seasonal_availability(text, text) TO authenticated, anon;
