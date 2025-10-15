-- ============================================================================
-- PHASE 9.5 DEPLOYMENT - STEP 1: ADD WEIGHT PROFILE COLUMN
-- ============================================================================
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This adds:
--   weight_profile column to species table
--   Constraint to ensure valid profile values
--   Index for query performance
--
-- ============================================================================

-- Step 1: Add weight_profile column with default
ALTER TABLE species 
ADD COLUMN IF NOT EXISTS weight_profile TEXT DEFAULT 'default_coastal';

-- Step 2: Add constraint to ensure valid profiles only
DO $$ 
BEGIN
  -- Drop if exists (for re-running)
  ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_weight_profile;
  
  -- Add constraint
  ALTER TABLE species ADD CONSTRAINT valid_weight_profile 
  CHECK (weight_profile IN (
    'default_coastal',
    'pelagic',
    'surf_estuary',
    'reef_kelp',
    'benthic',
    'cephalopod'
  ));
END $$;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_species_weight_profile 
ON species(weight_profile);

-- Step 4: Add helpful comment
COMMENT ON COLUMN species.weight_profile IS 
'Guild-specific environmental weight profile. Determines relative importance of temperature/salinity/depth/substrate in predictions. Options: default_coastal (balanced), pelagic (temp-driven), surf_estuary (salinity-sensitive), reef_kelp (substrate-dominant), benthic (bottom-dwelling), cephalopod (temp & clarity).';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Test 1: Verify column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'species' 
  AND column_name = 'weight_profile';

-- Expected: weight_profile | text | 'default_coastal'::text | YES

-- ============================================================================

-- Test 2: Verify constraint exists
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'valid_weight_profile';

-- Expected: valid_weight_profile | CHECK (weight_profile IN (...))

-- ============================================================================

-- Test 3: Verify index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'species' 
  AND indexname = 'idx_species_weight_profile';

-- Expected: idx_species_weight_profile | CREATE INDEX ...

-- ============================================================================

-- Test 4: Check all species have default value
SELECT 
  weight_profile,
  COUNT(*) as species_count
FROM species
GROUP BY weight_profile
ORDER BY weight_profile;

-- Expected: All species should have 'default_coastal' initially

-- ============================================================================

-- Test 5: Try invalid value (should FAIL)
-- UPDATE species SET weight_profile = 'invalid' WHERE species_code = 'bss';

-- Expected: ERROR: new row for relation "species" violates check constraint "valid_weight_profile"

-- ============================================================================
-- SUCCESS! ✅
-- Column added, constraint created, index ready
-- Next: Populate species with their guild classifications
-- ============================================================================
