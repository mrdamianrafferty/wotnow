-- FIX: Update get_environmental_predictions_basic to use correct column name
-- Issue: Function references s.common_name but species table uses name_en
-- Error: column s.common_name does not exist

DROP FUNCTION IF EXISTS get_environmental_predictions_basic(text, date);

CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  target_rectangle text,
  target_date date
)
RETURNS TABLE (
  species_name text,
  base_score numeric,
  baitfish_index numeric,
  visibility_index numeric,
  habitat_index numeric,
  bio_multiplier numeric,
  final_score numeric,
  confidence numeric,
  has_bio_data boolean,
  species_code text,
  scientific_name text,
  rationale jsonb
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log the function call
  RAISE NOTICE 'get_environmental_predictions_basic called with rectangle: %, date: %', target_rectangle, target_date;

  -- Check if we have environmental data (using captured_at date matching)
  IF NOT EXISTS (
    SELECT 1 FROM findr_conditions_snapshots 
    WHERE rectangle_code = target_rectangle 
    AND DATE(captured_at) = target_date
  ) THEN
    RAISE NOTICE 'No biogeochemical data found for rectangle % on date %', target_rectangle, target_date;
  END IF;

  RETURN QUERY
  WITH species_base_scores AS (
    SELECT 
      s.scientific_name,
      s.name_en,
      -- Base prediction score (existing logic - simplified for example)
      -- In production, this would use your existing complex prediction logic
      (CASE 
        WHEN s.name_en IN ('Mackerel', 'Bass', 'Pollock') THEN 70
        WHEN s.name_en IN ('Cod', 'Whiting', 'Plaice') THEN 65
        ELSE 55
      END)::numeric as base_prediction_score
    FROM species s
    WHERE s.name_en IS NOT NULL
    ORDER BY s.name_en
    LIMIT 30  -- Use the new species limit
  ),
  biogeochemical_enhancements AS (
    SELECT 
      sbs.name_en,
      sbs.scientific_name,
      sbs.base_prediction_score,
      
      -- Baitfish index (chlorophyll as proxy for productivity)
      COALESCE(
        (SELECT AVG(chlorophyll_mg_m3)::numeric 
         FROM findr_conditions_snapshots
         WHERE rectangle_code = target_rectangle
         AND DATE(captured_at) = target_date
         AND chlorophyll_mg_m3 IS NOT NULL), 
        0.5
      ) * 10 as baitfish_index,
      
      -- Visibility index (using salinity as proxy since suspended_matter doesn't exist)
      COALESCE(
        (SELECT AVG(salinity_psu)::numeric 
         FROM findr_conditions_snapshots
         WHERE rectangle_code = target_rectangle
         AND DATE(captured_at) = target_date
         AND salinity_psu IS NOT NULL), 
        35
      ) / 3.5 as visibility_index,
      
      -- Habitat quality (oxygen only, since ph doesn't exist in table)
      COALESCE(
        (SELECT AVG(dissolved_oxygen_mg_l)::numeric 
         FROM findr_conditions_snapshots
         WHERE rectangle_code = target_rectangle
         AND DATE(captured_at) = target_date
         AND dissolved_oxygen_mg_l IS NOT NULL), 
        8
      ) as habitat_index,
      
      -- Check if we have actual bio data
      EXISTS (
        SELECT 1 FROM findr_conditions_snapshots
        WHERE rectangle_code = target_rectangle
        AND DATE(captured_at) = target_date
      ) as has_bio_data
      
    FROM species_base_scores sbs
  ),
  scored_predictions AS (
    SELECT 
      be.name_en,  -- FIXED: was be.common_name
      be.scientific_name,
      be.base_prediction_score,
      be.baitfish_index,
      be.visibility_index,
      be.habitat_index,
      
      -- Bio multiplier (1.0 to 1.5 based on conditions)
      1.0 + (
        (be.baitfish_index + be.visibility_index + be.habitat_index) / 30.0 * 0.5
      ) as bio_multiplier,
      
      be.has_bio_data
      
    FROM biogeochemical_enhancements be
  )
  SELECT 
    sp.name_en::text,  -- FIXED: was sp.common_name
    sp.base_prediction_score,
    sp.baitfish_index,
    sp.visibility_index,
    sp.habitat_index,
    sp.bio_multiplier,
    (sp.base_prediction_score * sp.bio_multiplier)::numeric as final_score,
    CASE 
      WHEN sp.has_bio_data THEN 85.0
      ELSE 50.0
    END as confidence,
    sp.has_bio_data,
    s.species_code::text,
    sp.scientific_name::text,
    jsonb_build_array(
      -- Generate human-readable rationale based on environmental conditions
      CASE 
        WHEN sp.baitfish_index > 7 THEN 'High chlorophyll levels indicate abundant baitfish in the area'
        WHEN sp.baitfish_index > 4 THEN 'Moderate baitfish activity detected from water conditions'
        ELSE 'Baseline feeding conditions present'
      END,
      CASE 
        WHEN sp.visibility_index > 8 THEN 'Excellent water clarity for hunting and feeding'
        WHEN sp.visibility_index > 6 THEN 'Good water conditions for fish activity'
        ELSE 'Stable water conditions'
      END,
      CASE 
        WHEN sp.habitat_index > 9 THEN 'Optimal oxygen levels support high fish activity'
        WHEN sp.habitat_index > 7 THEN 'Healthy oxygen levels promote feeding'
        ELSE 'Adequate habitat conditions'
      END,
      CASE 
        WHEN sp.bio_multiplier > 1.3 THEN 'Environmental conditions are highly favorable'
        WHEN sp.bio_multiplier > 1.15 THEN 'Conditions are conducive to good catches'
        ELSE 'Standard conditions for this species'
      END
    ) as rationale
  FROM scored_predictions sp
  JOIN species s ON s.scientific_name = sp.scientific_name
  ORDER BY final_score DESC, sp.name_en;
END;
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_environmental_predictions_basic(text, date) TO anon, authenticated;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Returns environmental fishing predictions with biogeochemical enhancements. Uses name_en column from species table and actual findr_conditions_snapshots columns (chlorophyll_mg_m3, salinity_psu, dissolved_oxygen_mg_l).';

-- Test the function
SELECT * FROM get_environmental_predictions_basic('31F1', CURRENT_DATE) LIMIT 5;
