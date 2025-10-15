-- Migration: Update water clarity weights for sight-feeding species
-- Date: 2025-10-13
-- Purpose: Populate water_clarity_weight column for species that rely heavily on visual hunting
-- Context: Preparing for CMEMS kd490 water clarity data integration
--
-- Sight feeders perform significantly better in clear water and poorly in turbid conditions
-- These weights will be used when CMEMS optical data becomes available

-- ============================================================================
-- SIGHT FEEDERS (High Visual Dependency)
-- ============================================================================

-- Plaice (ple) - Ambush predator, relies heavily on spotting prey on seabed
-- In turbid water, feeding success drops dramatically
UPDATE species 
SET 
  water_clarity_weight = 0.18,
  turbidity_weight = 0.18
WHERE species_code = 'ple';

-- Red Mullet (mul) - Uses barbels but also visual hunting in daylight
-- Benefits from clear water but can adapt to moderate turbidity
UPDATE species 
SET 
  water_clarity_weight = 0.15,
  turbidity_weight = 0.15
WHERE species_code = 'mul';

-- Ballan Wrasse (wrb) - Visual predator, hunts by sight in kelp forests
-- Clear water essential for spotting crabs and molluscs
UPDATE species 
SET 
  water_clarity_weight = 0.16,
  turbidity_weight = 0.16
WHERE species_code = 'wrb';

-- Mackerel (mac) - Pelagic visual hunter, chases baitfish by sight
-- Prefers clear blue water, avoids murky inshore areas
UPDATE species 
SET 
  water_clarity_weight = 0.14,
  turbidity_weight = 0.14
WHERE species_code = 'mac';

-- Pollack (pol) - Visual predator around structure
-- Hunts by sight, particularly in midwater column
UPDATE species 
SET 
  water_clarity_weight = 0.17,
  turbidity_weight = 0.17
WHERE species_code = 'pol';

-- ============================================================================
-- MODERATE VISUAL DEPENDENCY
-- ============================================================================

-- Bass (bss) - Mixed hunter, uses lateral line + vision
-- Still benefits from clear water but less dependent than pure sight feeders
UPDATE species 
SET 
  water_clarity_weight = 0.10,
  turbidity_weight = 0.10
WHERE species_code = 'bss';

-- ============================================================================
-- SCENT/VIBRATION FEEDERS (Low Visual Dependency)
-- ============================================================================
-- These species are NOT updated - they should remain at 0.00 or very low

-- Cod (cod) - Scent feeder, can hunt in zero visibility
-- Already set to 0 or very low, no update needed

-- Flounder (fle) - Scent + touch sensitive, hunts in murky estuaries
-- Already set to 0 or very low, no update needed

-- Conger (con) - Night hunter, scent-based
-- Already set to 0, no update needed

-- Smoothhounds - Scent-based shark hunters
-- Already set to 0, no update needed

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check updated species:
-- SELECT species_code, species_name, water_clarity_weight, turbidity_weight
-- FROM species
-- WHERE water_clarity_weight > 0
-- ORDER BY water_clarity_weight DESC;

-- Check sight feeders vs scent feeders side by side:
-- SELECT 
--   species_code,
--   species_name,
--   water_clarity_weight,
--   diurnal_sensitivity,
--   CASE 
--     WHEN water_clarity_weight >= 0.15 THEN 'Sight Feeder'
--     WHEN water_clarity_weight >= 0.08 THEN 'Mixed Hunter'
--     ELSE 'Scent/Touch Feeder'
--   END as hunter_type
-- FROM species
-- WHERE species_code IN ('ple','mul','wrb','mac','pol','bss','cod','fle','con')
-- ORDER BY water_clarity_weight DESC;

-- Expected output after this migration:
-- ple  | Plaice         | 0.18 | Sight Feeder
-- pol  | Pollack        | 0.17 | Sight Feeder
-- wrb  | Ballan Wrasse  | 0.16 | Sight Feeder
-- mul  | Red Mullet     | 0.15 | Sight Feeder
-- mac  | Mackerel       | 0.14 | Sight Feeder
-- bss  | Bass           | 0.10 | Mixed Hunter
-- cod  | Cod            | 0.00 | Scent/Touch Feeder
-- fle  | Flounder       | 0.00 | Scent/Touch Feeder
-- con  | Conger         | 0.00 | Scent/Touch Feeder
