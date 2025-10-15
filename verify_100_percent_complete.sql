-- ============================================================================
-- FINAL VERIFICATION - 100% SPECIES COMPLETION CHECK
-- ============================================================================
-- Run this after all batch scripts to confirm full coverage
-- Date: 2025-10-13

-- ============================================================================
-- OVERALL COMPLETION STATUS
-- ============================================================================

SELECT 
  COUNT(*) as total_species,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN 1 
  END) as fully_complete,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NULL 
    OR temp_opt_c IS NULL 
    OR context_bias IS NULL
    THEN 1 
  END) as still_incomplete,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      AND diurnal_sensitivity IS NOT NULL 
      AND tidal_sensitivity IS NOT NULL 
      AND tidal_sensitivity > 0
      THEN 1 
    END) / COUNT(*),
    1
  ) as percent_complete
FROM species;

-- Expected: 79 total, 79 complete, 0 incomplete, 100.0% complete

-- ============================================================================
-- LIST ANY REMAINING INCOMPLETE (Should be empty!)
-- ============================================================================

SELECT 
  species_code,
  name_en,
  scientific_name,
  eating_quality,
  CASE 
    WHEN preferred_tide_stage IS NULL THEN '❌ Missing tide stages'
    WHEN temp_opt_c IS NULL THEN '❌ Missing temperature'
    WHEN context_bias IS NULL THEN '❌ Missing habitat context'
    WHEN diurnal_sensitivity IS NULL THEN '❌ Missing diurnal pattern'
    WHEN tidal_sensitivity IS NULL OR tidal_sensitivity = 0 THEN '❌ Missing tidal sensitivity'
  END as missing_parameter
FROM species
WHERE preferred_tide_stage IS NULL 
  OR temp_opt_c IS NULL 
  OR context_bias IS NULL
  OR diurnal_sensitivity IS NULL
  OR tidal_sensitivity IS NULL
  OR tidal_sensitivity = 0
ORDER BY eating_quality DESC NULLS LAST, species_code;

-- Expected: 0 rows (empty result)

-- ============================================================================
-- COMPLETION BY SPECIES GROUP
-- ============================================================================

SELECT 
  CASE 
    WHEN species_code LIKE 'RJ%' OR species_code IN ('ska','RJB') THEN 'Rays'
    WHEN species_code IN ('CSH','SSH','BUH','tor','lsd','spu','bsh','scy') THEN 'Sharks'
    WHEN species_code IN ('cod','had','whg','pok','sai','lin','pou') THEN 'Cod Family'
    WHEN species_code IN ('ple','fle','dab','tur','bll','sol','ldb','lem','wit','meg') THEN 'Flatfish'
    WHEN species_code LIKE 'wr%' OR species_code IN ('WRK','WRG','WRO','wra','wrb') THEN 'Wrasse'
    WHEN species_code IN ('bss','mac','pol','gar') THEN 'UK Predators'
    WHEN species_code IN ('sba','sbg','brs','wht-bream','2bd-bream','pandora','red-porgy','sadd-bream','sbr') THEN 'Seabreams'
    WHEN species_code IN ('bonito','leerfish','bluefish','lta','gaj','meagre') THEN 'Med Predators'
    WHEN species_code IN ('dusk-group','whit-group','red-scorp') THEN 'Med Groupers/Scorpion'
    ELSE 'Other'
  END as species_type,
  COUNT(*) as total,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as complete,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END) / COUNT(*),
    0
  ) as pct_complete
FROM species
GROUP BY 
  CASE 
    WHEN species_code LIKE 'RJ%' OR species_code IN ('ska','RJB') THEN 'Rays'
    WHEN species_code IN ('CSH','SSH','BUH','tor','lsd','spu','bsh','scy') THEN 'Sharks'
    WHEN species_code IN ('cod','had','whg','pok','sai','lin','pou') THEN 'Cod Family'
    WHEN species_code IN ('ple','fle','dab','tur','bll','sol','ldb','lem','wit','meg') THEN 'Flatfish'
    WHEN species_code LIKE 'wr%' OR species_code IN ('WRK','WRG','WRO','wra','wrb') THEN 'Wrasse'
    WHEN species_code IN ('bss','mac','pol','gar') THEN 'UK Predators'
    WHEN species_code IN ('sba','sbg','brs','wht-bream','2bd-bream','pandora','red-porgy','sadd-bream','sbr') THEN 'Seabreams'
    WHEN species_code IN ('bonito','leerfish','bluefish','lta','gaj','meagre') THEN 'Med Predators'
    WHEN species_code IN ('dusk-group','whit-group','red-scorp') THEN 'Med Groupers/Scorpion'
    ELSE 'Other'
  END
ORDER BY pct_complete ASC, total DESC;

-- Expected: All groups at 100%

-- ============================================================================
-- WATER CLARITY COVERAGE (For CMEMS integration readiness)
-- ============================================================================

SELECT 
  CASE 
    WHEN water_clarity_weight >= 0.14 THEN '🎯 Sight Feeders (High Priority)'
    WHEN water_clarity_weight >= 0.08 THEN '👁️ Mixed Hunters'
    WHEN water_clarity_weight > 0 THEN '🔍 Low Visual'
    ELSE '👃 Scent/Touch Only'
  END as hunter_type,
  COUNT(*) as species_count,
  ROUND(AVG(water_clarity_weight), 3) as avg_clarity_weight,
  string_agg(species_code, ', ' ORDER BY water_clarity_weight DESC) as example_species
FROM species
WHERE preferred_tide_stage IS NOT NULL  -- Only complete species
GROUP BY 
  CASE 
    WHEN water_clarity_weight >= 0.14 THEN '🎯 Sight Feeders (High Priority)'
    WHEN water_clarity_weight >= 0.08 THEN '👁️ Mixed Hunters'
    WHEN water_clarity_weight > 0 THEN '🔍 Low Visual'
    ELSE '👃 Scent/Touch Only'
  END
ORDER BY avg_clarity_weight DESC;

-- Shows species ready to benefit from CMEMS water clarity data

-- ============================================================================
-- EATING QUALITY COVERAGE (Premium species verification)
-- ============================================================================

SELECT 
  eating_quality,
  COUNT(*) as total_species,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as complete_species,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END) / COUNT(*),
    0
  ) as pct_complete,
  string_agg(
    CASE 
      WHEN preferred_tide_stage IS NOT NULL THEN species_code 
      ELSE NULL 
    END, 
    ', ' 
    ORDER BY species_code
  ) as complete_species_codes
FROM species
GROUP BY eating_quality
ORDER BY eating_quality DESC NULLS LAST;

-- Expected: All eating quality levels at 100%

-- ============================================================================
-- REGIONAL DISTRIBUTION
-- ============================================================================

SELECT 
  CASE 
    WHEN temp_opt_c[1] >= 16 THEN '🌡️ Mediterranean (16°C+)'
    WHEN temp_opt_c[1] >= 10 THEN '🌊 Atlantic/UK (10-15°C)'
    ELSE '❄️ Cold Water (<10°C)'
  END as thermal_zone,
  COUNT(*) as species_count,
  ROUND(AVG(temp_opt_c[1]), 1) as avg_min_temp,
  ROUND(AVG(temp_opt_c[2]), 1) as avg_max_temp,
  ROUND(AVG(tidal_sensitivity), 2) as avg_tidal_sens
FROM species
WHERE preferred_tide_stage IS NOT NULL
GROUP BY 
  CASE 
    WHEN temp_opt_c[1] >= 16 THEN '🌡️ Mediterranean (16°C+)'
    WHEN temp_opt_c[1] >= 10 THEN '🌊 Atlantic/UK (10-15°C)'
    ELSE '❄️ Cold Water (<10°C)'
  END
ORDER BY avg_min_temp DESC;

-- Shows thermal distribution and tidal patterns by region

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  complete_count INTEGER;
  total_count INTEGER;
  pct NUMERIC;
BEGIN
  SELECT 
    COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END),
    COUNT(*),
    ROUND(
      100.0 * COUNT(CASE 
        WHEN preferred_tide_stage IS NOT NULL 
        AND temp_opt_c IS NOT NULL 
        AND context_bias IS NOT NULL 
        THEN 1 
      END) / COUNT(*),
      1
    )
  INTO complete_count, total_count, pct
  FROM species;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BITE SCORE SYSTEM - FINAL STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Complete: % / % species (% percent)', complete_count, total_count, pct;
  RAISE NOTICE '';
  
  IF pct = 100.0 THEN
    RAISE NOTICE '🎉 SUCCESS! 100 percent COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All species have bite score parameters';
    RAISE NOTICE '✅ Ready for CMEMS water clarity integration';
    RAISE NOTICE '✅ Production-ready bite predictions';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Deploy to production';
    RAISE NOTICE '  2. Integrate CMEMS kd490 data';
    RAISE NOTICE '  3. Monitor prediction accuracy';
  ELSIF pct >= 95 THEN
    RAISE NOTICE '⚠️  Nearly complete - % species remain', total_count - complete_count;
  ELSE
    RAISE NOTICE '❌ More work needed - % species incomplete', total_count - complete_count;
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- HABITAT COMPLETENESS (no empty arrays & substrate flags present)
-- ============================================================================

-- Summary: should show 0 missing_any if all species have at least one canonical
-- habitat token and at least one substrate flag set via the species_substrates view.
SELECT
  COUNT(*) AS total_species,
  COUNT(*) FILTER (WHERE COALESCE(cardinality(preferred_habitat),0) > 0) AS with_habitat,
  COUNT(*) FILTER (WHERE ss.has_sand OR ss.has_gravel OR ss.has_rock OR ss.has_mud OR ss.has_mixed) AS with_substrate_flag,
  COUNT(*) FILTER (
    WHERE COALESCE(cardinality(preferred_habitat),0) = 0
       OR NOT (ss.has_sand OR ss.has_gravel OR ss.has_rock OR ss.has_mud OR ss.has_mixed)
  ) AS missing_any
FROM public.species s
LEFT JOIN public.species_substrates ss USING (id);

-- List any offenders (should be empty)
SELECT s.species_code, s.name_en, s.preferred_habitat
FROM public.species s
LEFT JOIN public.species_substrates ss USING (id)
WHERE COALESCE(cardinality(s.preferred_habitat),0) = 0
   OR NOT (ss.has_sand OR ss.has_gravel OR ss.has_rock OR ss.has_mud OR ss.has_mixed)
ORDER BY s.species_code;

-- ============================================================================
-- UNIT TESTS: substrate scoring sanity checks
-- ============================================================================

-- Expect 1.0 for these on a sand+rock spot
-- Use v2 if you installed it; otherwise switch to substrate_match_score
SELECT s.species_code,
       public.substrate_match_score_v2(s.id, ARRAY['sand','rock']) AS substrate_score
FROM public.species s
WHERE s.species_code IN ('bluefish','trs','BUH')
ORDER BY s.species_code;

-- Quick distribution for a sand+rock spot (spotlight top/bottom)
SELECT s.species_code,
       public.substrate_match_score_v2(s.id, ARRAY['sand','rock']) AS substrate_score
FROM public.species s
JOIN public.species_substrates ss USING (id)
ORDER BY substrate_score DESC NULLS LAST, s.species_code
LIMIT 25;

-- ============================================================================
-- OPTIONAL GUARDRAIL: prevent empty habitat arrays
-- (Keeps preferred_habitat either NULL or non-empty; safe to skip in dev)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'species_preferred_habitat_not_empty'
      AND conrelid = 'public.species'::regclass
  ) THEN
    ALTER TABLE public.species
      ADD CONSTRAINT species_preferred_habitat_not_empty
      CHECK (preferred_habitat IS NULL OR cardinality(preferred_habitat) > 0);
  END IF;
END$$;
