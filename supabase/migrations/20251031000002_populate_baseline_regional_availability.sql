-- Populate baseline species regional availability
-- Strategy: Use species biogeographic regions and environmental preferences to create
-- initial availability data that works without user catch data

-- PART 1: Populate ICES rectangles based on species biogeographic regions
-- =========================================================================

-- For each species, find all ICES rectangles in their known biogeographic regions
-- and create baseline availability records

INSERT INTO public.species_regional_availability (
  region_type,
  region_id,
  species_code,
  month,  -- NULL = year-round baseline
  availability_score,
  is_primary_habitat,
  data_source,
  confidence,
  catch_count
)
SELECT DISTINCT
  'ices' AS region_type,
  ir.rectangle_code AS region_id,
  s.species_code,
  NULL::integer AS month,  -- Start with year-round availability, seasonal data comes later

  -- Baseline availability score logic:
  -- - 0.70 if rectangle region matches species primary regions (Atlantic, North Sea, etc.)
  -- - 0.50 for broader coverage (Mediterranean, Celtic Sea, etc.)
  CASE
    WHEN ir.region = ANY(s.biogeographic_regions) THEN 0.70
    WHEN ir.region ILIKE ANY(
      SELECT unnest(s.biogeographic_regions) || '%'
    ) THEN 0.50
    ELSE 0.40
  END AS availability_score,

  -- Mark as primary habitat if species is known for this region type
  CASE
    WHEN ir.region = ANY(s.biogeographic_regions) THEN true
    ELSE false
  END AS is_primary_habitat,

  'baseline' AS data_source,
  0.60 AS confidence,  -- Moderate confidence in baseline data
  0 AS catch_count

FROM species s
CROSS JOIN ices_rectangles ir

WHERE
  -- Only include if rectangle region matches species biogeographic regions
  ir.region = ANY(s.biogeographic_regions)
  OR ir.region ILIKE ANY(
    SELECT '%' || unnest(s.biogeographic_regions) || '%'
  )

  -- Only include species with biogeographic data
  AND s.biogeographic_regions IS NOT NULL
  AND array_length(s.biogeographic_regions, 1) > 0

ON CONFLICT (region_type, region_id, species_code, month)
DO NOTHING;  -- Don't overwrite existing data

-- Log the results
DO $$
DECLARE
  inserted_count integer;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Inserted % baseline ICES rectangle availability records', inserted_count;
END $$;


-- PART 2: Migrate existing grid cell data from species_availability_by_grid
-- ===========================================================================

-- If species_availability_by_grid table exists, migrate data to unified table
-- This preserves existing grid cell seasonality data

DO $$
BEGIN
  -- Check if old table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'species_availability_by_grid'
  ) THEN

    -- Migrate data with new schema
    INSERT INTO public.species_regional_availability (
      region_type,
      region_id,
      species_code,
      month,  -- Extract from cell_id if it contains month info, otherwise NULL
      availability_score,
      is_primary_habitat,
      data_source,
      confidence,
      catch_count
    )
    SELECT DISTINCT
      'grid' AS region_type,
      cell_id AS region_id,
      species_code,
      NULL::integer AS month,  -- Grid data doesn't have month breakdown yet

      -- Convert availability_multiplier to availability_score (0-1 scale)
      -- Multipliers typically range from 0.0 to 2.0+, normalize to 0-1
      CASE
        WHEN availability_multiplier >= 1.0 THEN 1.00
        WHEN availability_multiplier <= 0.0 THEN 0.00
        ELSE ROUND(availability_multiplier::numeric, 2)
      END AS availability_score,

      -- Mark high-availability cells as primary habitat
      CASE
        WHEN availability_multiplier >= 1.5 THEN true
        ELSE false
      END AS is_primary_habitat,

      'model' AS data_source,  -- Existing grid data likely came from models
      0.70 AS confidence,
      0 AS catch_count

    FROM species_availability_by_grid

    ON CONFLICT (region_type, region_id, species_code, month)
    DO UPDATE SET
      -- If migrating, update scores but preserve catch data
      availability_score = EXCLUDED.availability_score,
      is_primary_habitat = EXCLUDED.is_primary_habitat,
      data_source = CASE
        WHEN species_regional_availability.catch_count > 0 THEN 'catch_data'
        ELSE EXCLUDED.data_source
      END,
      updated_at = now();

    RAISE NOTICE 'Migrated existing grid cell availability data';
  ELSE
    RAISE NOTICE 'No existing species_availability_by_grid table found, skipping migration';
  END IF;
END $$;


-- PART 3: Add some common species to high-traffic ICES rectangles
-- ================================================================

-- For commonly caught species, ensure they appear in key fishing areas
-- even if biogeographic data is incomplete
-- This section dynamically matches species by common name to avoid hardcoding species_code

DO $$
DECLARE
  v_inserted_count integer := 0;
BEGIN
  -- North Sea common species (31F1, 32F1, 33F1)
  INSERT INTO public.species_regional_availability (
    region_type, region_id, species_code, month, availability_score,
    is_primary_habitat, data_source, confidence, catch_count
  )
  SELECT 'ices', '31F1', s.species_code, NULL::integer, 0.75, true, 'expert', 0.80, 0
  FROM species s
  WHERE s.name_en IN ('Cod', 'Atlantic Cod', 'European Cod')
  ON CONFLICT (region_type, region_id, species_code, month) DO UPDATE SET
    availability_score = CASE WHEN EXCLUDED.confidence > species_regional_availability.confidence
      THEN EXCLUDED.availability_score ELSE species_regional_availability.availability_score END,
    confidence = GREATEST(species_regional_availability.confidence, EXCLUDED.confidence),
    updated_at = now();
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  INSERT INTO public.species_regional_availability (
    region_type, region_id, species_code, month, availability_score,
    is_primary_habitat, data_source, confidence, catch_count
  )
  SELECT 'ices', '31F1', s.species_code, NULL::integer, 0.80, true, 'expert', 0.85, 0
  FROM species s
  WHERE s.name_en IN ('Plaice', 'European Plaice')
  ON CONFLICT (region_type, region_id, species_code, month) DO UPDATE SET
    availability_score = CASE WHEN EXCLUDED.confidence > species_regional_availability.confidence
      THEN EXCLUDED.availability_score ELSE species_regional_availability.availability_score END,
    confidence = GREATEST(species_regional_availability.confidence, EXCLUDED.confidence),
    updated_at = now();

  INSERT INTO public.species_regional_availability (
    region_type, region_id, species_code, month, availability_score,
    is_primary_habitat, data_source, confidence, catch_count
  )
  SELECT 'ices', '31F1', s.species_code, NULL::integer, 0.70, true, 'expert', 0.75, 0
  FROM species s
  WHERE s.name_en IN ('Whiting', 'European Whiting')
  ON CONFLICT (region_type, region_id, species_code, month) DO UPDATE SET
    availability_score = CASE WHEN EXCLUDED.confidence > species_regional_availability.confidence
      THEN EXCLUDED.availability_score ELSE species_regional_availability.availability_score END,
    confidence = GREATEST(species_regional_availability.confidence, EXCLUDED.confidence),
    updated_at = now();

  INSERT INTO public.species_regional_availability (
    region_type, region_id, species_code, month, availability_score,
    is_primary_habitat, data_source, confidence, catch_count
  )
  SELECT 'ices', rectangle, s.species_code, NULL::integer, score, is_primary, 'expert', conf, 0
  FROM species s,
  LATERAL (VALUES
    ('31F1', 0.65, false, 0.70),
    ('29E1', 0.85, true, 0.85),
    ('30E1', 0.85, true, 0.85),
    ('27E1', 0.80, true, 0.85)
  ) AS rects(rectangle, score, is_primary, conf)
  WHERE s.name_en IN ('Bass', 'Sea Bass', 'European Bass', 'European Seabass')
  ON CONFLICT (region_type, region_id, species_code, month) DO UPDATE SET
    availability_score = CASE WHEN EXCLUDED.confidence > species_regional_availability.confidence
      THEN EXCLUDED.availability_score ELSE species_regional_availability.availability_score END,
    confidence = GREATEST(species_regional_availability.confidence, EXCLUDED.confidence),
    updated_at = now();

  INSERT INTO public.species_regional_availability (
    region_type, region_id, species_code, month, availability_score,
    is_primary_habitat, data_source, confidence, catch_count
  )
  SELECT 'ices', rectangle, s.species_code, NULL::integer, 0.75, true, 'expert', 0.80, 0
  FROM species s,
  LATERAL (VALUES ('31F1'), ('29E1')) AS rects(rectangle)
  WHERE s.name_en IN ('Mackerel', 'Atlantic Mackerel')
  ON CONFLICT (region_type, region_id, species_code, month) DO UPDATE SET
    availability_score = CASE WHEN EXCLUDED.confidence > species_regional_availability.confidence
      THEN EXCLUDED.availability_score ELSE species_regional_availability.availability_score END,
    confidence = GREATEST(species_regional_availability.confidence, EXCLUDED.confidence),
    updated_at = now();

  RAISE NOTICE 'Added expert-curated species to high-traffic ICES rectangles';
END $$;

-- Summary stats
DO $$
DECLARE
  total_records integer;
  ices_count integer;
  grid_count integer;
  expert_count integer;
BEGIN
  SELECT COUNT(*) INTO total_records FROM species_regional_availability;
  SELECT COUNT(*) INTO ices_count FROM species_regional_availability WHERE region_type = 'ices';
  SELECT COUNT(*) INTO grid_count FROM species_regional_availability WHERE region_type = 'grid';
  SELECT COUNT(*) INTO expert_count FROM species_regional_availability WHERE data_source = 'expert';

  RAISE NOTICE '=== Baseline Population Complete ===';
  RAISE NOTICE 'Total records: %', total_records;
  RAISE NOTICE 'ICES rectangles: %', ices_count;
  RAISE NOTICE 'Grid cells: %', grid_count;
  RAISE NOTICE 'Expert-curated: %', expert_count;
END $$;
