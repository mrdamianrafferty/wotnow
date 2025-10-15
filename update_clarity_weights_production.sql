-- Standalone script to update water clarity weights for sight feeders
-- Run this directly against production database
-- Date: 2025-10-13

-- ============================================================================
-- SIGHT FEEDERS (High Visual Dependency)
-- ============================================================================

UPDATE species 
SET 
  water_clarity_weight = 0.18,
  turbidity_weight = 0.18
WHERE species_code = 'ple';

UPDATE species 
SET 
  water_clarity_weight = 0.15,
  turbidity_weight = 0.15
WHERE species_code = 'mul';

UPDATE species 
SET 
  water_clarity_weight = 0.16,
  turbidity_weight = 0.16
WHERE species_code = 'wrb';

UPDATE species 
SET 
  water_clarity_weight = 0.14,
  turbidity_weight = 0.14
WHERE species_code = 'mac';

UPDATE species 
SET 
  water_clarity_weight = 0.17,
  turbidity_weight = 0.17
WHERE species_code = 'pol';

-- ============================================================================
-- MODERATE VISUAL DEPENDENCY
-- ============================================================================

UPDATE species 
SET 
  water_clarity_weight = 0.10,
  turbidity_weight = 0.10
WHERE species_code = 'bss';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
SELECT 
  species_code,
  name_en,
  water_clarity_weight,
  turbidity_weight,
  diurnal_sensitivity,
  CASE 
    WHEN water_clarity_weight >= 0.15 THEN 'Sight Feeder'
    WHEN water_clarity_weight >= 0.08 THEN 'Mixed Hunter'
    ELSE 'Scent/Touch Feeder'
  END as hunter_type
FROM species
WHERE species_code IN ('ple','mul','wrb','mac','pol','bss','cod','fle')
ORDER BY water_clarity_weight DESC;
