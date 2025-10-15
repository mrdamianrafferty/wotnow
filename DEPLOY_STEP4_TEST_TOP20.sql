-- ============================================================================
-- PHASE 9 VALIDATION - TOP 20 SPECIES PREDICTIONS TEST
-- ============================================================================
--
-- Testing environmental predictions for Cornwall summer conditions:
-- - Temperature: 16.5°C (typical summer)
-- - Salinity: 34.2 ppt (normal marine)
-- - Substrate: rock (coastal reefs)
-- - Depth: 15m (shallow coastal)
--
-- Expected high scorers: Bass, Wrasse, Pollock, Bib, Poor Cod
-- Expected lower scorers: Cold water species (Cod, Haddock), Deep species
--
-- ============================================================================

-- Test 1: Top 20 species with all details
SELECT 
  species_code,
  species_name,
  environmental_score,
  confidence,
  temperature_match,
  salinity_match,
  depth_match,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
ORDER BY environmental_score DESC
LIMIT 20;

-- ============================================================================

-- Test 2: Top 10 with score breakdown
SELECT 
  species_code,
  species_name,
  environmental_score,
  confidence,
  (factors->'temperature'->>'score')::numeric as temp_score,
  (factors->'salinity'->>'score')::numeric as sal_score,
  (factors->'depth'->>'score')::numeric as depth_score,
  (factors->'substrate'->>'score')::numeric as substrate_score,
  temperature_match,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
ORDER BY environmental_score DESC
LIMIT 10;

-- ============================================================================

-- Test 3: Check specific expected high scorers
SELECT 
  species_code,
  species_name,
  environmental_score,
  confidence,
  temperature_match,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code IN ('bss', 'wrb', 'pol', 'bib', 'pok')  -- Bass, Wrasse, Pollock, Bib, Poor Cod
ORDER BY environmental_score DESC;

-- ============================================================================

-- Test 4: Check cold water species (should score lower)
SELECT 
  species_code,
  species_name,
  environmental_score,
  confidence,
  temperature_match,
  (factors->'temperature'->>'actual')::numeric as actual_temp,
  (factors->'temperature'->>'score')::numeric as temp_score
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code IN ('cod', 'had', 'whg', 'sai')  -- Cod, Haddock, Whiting, Saithe
ORDER BY environmental_score DESC;

-- ============================================================================

-- Test 5: Score distribution - how many in each band?
SELECT 
  CASE 
    WHEN environmental_score >= 9.0 THEN '9.0-10.0 (Excellent)'
    WHEN environmental_score >= 8.0 THEN '8.0-8.9 (Very Good)'
    WHEN environmental_score >= 7.0 THEN '7.0-7.9 (Good)'
    WHEN environmental_score >= 6.0 THEN '6.0-6.9 (Fair)'
    WHEN environmental_score >= 5.0 THEN '5.0-5.9 (Moderate)'
    ELSE '< 5.0 (Poor)'
  END as score_band,
  COUNT(*) as species_count
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
GROUP BY score_band
ORDER BY score_band DESC;

-- ============================================================================

-- Test 6a: Rock lovers (should score high with rock substrate)
SELECT 
  'ROCK LOVERS' as category,
  species_code,
  species_name,
  environmental_score,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code IN ('bss', 'wrb', 'pol', 'bib')  -- Known rock species
ORDER BY environmental_score DESC;

-- ============================================================================

-- Test 6b: Sand lovers (should score lower with rock substrate)
SELECT 
  'SAND LOVERS' as category,
  species_code,
  species_name,
  environmental_score,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code IN ('ple', 'dab', 'sol', 'fle')  -- Known sand/flatfish species
ORDER BY environmental_score DESC;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Top 5 should include:
-- 1. Bass (bss) - 9.7 ✅ (loves 15-20°C, rock substrate)
-- 2. Wrasse (wrb) - ~9.5 (temperate, rock reefs)
-- 3. Pollock (pol) - ~9.0 (temperate, rocky areas)
-- 4. Bib (bib) - ~8.5 (temperate, rocky substrate)
-- 5. Poor Cod (pok) - ~8.5 (temperate coastal)
--
-- Lower scorers:
-- - Cod (cod) - prefers colder water (4-12°C optimal)
-- - Haddock (had) - prefers colder water
-- - Deep species - 15m might be too shallow
--
-- Rock substrate (current test) should favor:
-- - Bass, Wrasse, Pollock, Bib over
-- - Flatfish (Plaice, Dab, Sole) which prefer sand
--
-- ============================================================================
