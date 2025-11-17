-- Make V3 the default confidence function
-- November 17, 2025
-- Creates an alias so existing code using get_fishing_confidence will use v3

-- Create an alias function that calls v3
CREATE OR REPLACE FUNCTION get_fishing_confidence(
  target_rectangle TEXT,
  target_date DATE DEFAULT CURRENT_DATE,
  target_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  species_code VARCHAR(10),
  species_name VARCHAR(100),
  confidence_percent INTEGER,
  base_availability_score NUMERIC,
  environmental_match_score NUMERIC,
  seasonal_phase TEXT,
  seasonal_weight NUMERIC,
  availability_multiplier NUMERIC,
  seasonality_source TEXT,
  seasonality_source_confidence NUMERIC,
  breakdown JSONB
) AS $$
BEGIN
  -- Forward all calls to v3
  RETURN QUERY
  SELECT * FROM get_fishing_confidence_v3(
    target_rectangle,
    target_date,
    target_month
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_fishing_confidence IS 'Default confidence function - forwards to V3 with regional seasonality integration. Use get_fishing_confidence_v3 directly for explicit v3 calls or get_fishing_confidence_v2 for legacy v2 behavior.';
