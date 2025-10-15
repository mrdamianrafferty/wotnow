-- Comprehensive Species Table Completeness Audit
-- Run this to assess bite score parameter coverage across all species
-- Date: 2025-10-13

-- ============================================================================
-- SUMMARY STATISTICS
-- ============================================================================

-- Overall coverage statistics
SELECT 
  COUNT(*) as total_species,
  COUNT(CASE WHEN preferred_tide_stage IS NOT NULL THEN 1 END) as has_tide_stage,
  COUNT(CASE WHEN temp_opt_c IS NOT NULL THEN 1 END) as has_temp_range,
  COUNT(CASE WHEN context_bias IS NOT NULL THEN 1 END) as has_context_bias,
  COUNT(CASE WHEN diurnal_sensitivity IS NOT NULL THEN 1 END) as has_diurnal,
  COUNT(CASE WHEN tidal_sensitivity IS NOT NULL AND tidal_sensitivity > 0 THEN 1 END) as has_tidal_sens,
  COUNT(CASE WHEN water_clarity_weight > 0 THEN 1 END) as has_clarity_weight,
  -- Species with ALL critical parameters
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN 1 
  END) as fully_complete
FROM species;

-- ============================================================================
-- COMPLETION STATUS BY SPECIES
-- ============================================================================

-- Detailed breakdown showing what each species has/lacks
SELECT 
  species_code,
  name_en,
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN '✅ COMPLETE'
    WHEN preferred_tide_stage IS NULL 
    AND temp_opt_c IS NULL 
    AND context_bias IS NULL 
    THEN '❌ DEFAULTS ONLY'
    ELSE '⚠️ PARTIAL'
  END as status,
  diurnal_sensitivity,
  tidal_sensitivity,
  CASE WHEN preferred_tide_stage IS NOT NULL THEN '✓' ELSE '✗' END as has_tide_stage,
  CASE WHEN temp_opt_c IS NOT NULL THEN '✓' ELSE '✗' END as has_temp,
  CASE WHEN context_bias IS NOT NULL THEN '✓' ELSE '✗' END as has_context,
  water_clarity_weight,
  temp_opt_c as temp_range,
  preferred_tide_stage
FROM species
ORDER BY 
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN 1
    WHEN preferred_tide_stage IS NULL 
    AND temp_opt_c IS NULL 
    AND context_bias IS NULL 
    THEN 3
    ELSE 2
  END,
  species_code;

-- ============================================================================
-- COMPLETE SPECIES (Production Ready)
-- ============================================================================

-- Show all species with complete bite score parameters
SELECT 
  species_code,
  name_en,
  diurnal_sensitivity,
  tidal_sensitivity,
  preferred_tide_stage,
  temp_opt_c,
  water_clarity_weight,
  context_bias
FROM species
WHERE preferred_tide_stage IS NOT NULL 
  AND temp_opt_c IS NOT NULL 
  AND context_bias IS NOT NULL 
  AND diurnal_sensitivity IS NOT NULL 
  AND tidal_sensitivity IS NOT NULL 
  AND tidal_sensitivity > 0
ORDER BY species_code;

-- ============================================================================
-- INCOMPLETE SPECIES (Need Work)
-- ============================================================================

-- Species with defaults only (highest priority to complete)
SELECT 
  species_code,
  name_en,
  scientific_name,
  eating_quality,
  preferred_habitat
FROM species
WHERE preferred_tide_stage IS NULL 
  AND temp_opt_c IS NULL 
  AND context_bias IS NULL
ORDER BY eating_quality DESC, species_code;

-- ============================================================================
-- WATER CLARITY COVERAGE
-- ============================================================================

-- Check which species have clarity weights configured
SELECT 
  species_code,
  name_en,
  water_clarity_weight,
  turbidity_weight,
  diurnal_sensitivity,
  CASE 
    WHEN water_clarity_weight >= 0.15 THEN 'High Visual Dependency'
    WHEN water_clarity_weight >= 0.08 THEN 'Moderate Visual'
    WHEN water_clarity_weight > 0 THEN 'Low Visual'
    ELSE 'Scent/Touch Based'
  END as hunting_strategy
FROM species
WHERE diurnal_sensitivity IS NOT NULL
ORDER BY water_clarity_weight DESC, species_code;

-- ============================================================================
-- SPECIES BY REGION/TYPE
-- ============================================================================

-- UK species coverage
SELECT 
  COUNT(*) as uk_species,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as uk_complete
FROM species
WHERE species_code IN (
  'bss', 'cod', 'mac', 'pol', 'ple', 'fle', 'dab', 'sol', 
  'wrb', 'mul', 'sha', 'ray', 'ska', 'tor', 'gar', 'con', 'eel'
);

-- Mediterranean species coverage
SELECT 
  COUNT(*) as med_species,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as med_complete
FROM species
WHERE species_code IN (
  '2bd-bream', 'wht-bream', 'pandora', 'red-porgy', 'bonito', 
  'leerfish', 'bluefish', 'dusk-group', 'whit-group', 'meagre',
  'red-scorp', 'euro-cuda', 'yel-cuda'
);

-- ============================================================================
-- PRIORITY SPECIES (High Eating Quality, Incomplete)
-- ============================================================================

-- Species that anglers care about most but still need parameters
SELECT 
  species_code,
  name_en,
  scientific_name,
  eating_quality,
  preferred_habitat,
  'PRIORITY - Great eating quality but missing bite params' as note
FROM species
WHERE eating_quality >= 4
  AND (preferred_tide_stage IS NULL 
    OR temp_opt_c IS NULL 
    OR context_bias IS NULL)
ORDER BY eating_quality DESC, species_code;
