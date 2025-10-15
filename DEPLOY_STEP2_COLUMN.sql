-- ============================================================================
-- PHASE 9 DEPLOYMENT - STEP 2: ENVIRONMENTAL PREFERENCES COLUMN
-- ============================================================================
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This creates:
--   1. environmental_preferences JSONB column on species table
--   2. GIN index for fast JSONB queries
--   3. Specific indexes for temperature and salinity queries
--   4. Validation constraint
--
-- ============================================================================

-- Add JSONB column to species table
ALTER TABLE species 
ADD COLUMN IF NOT EXISTS environmental_preferences JSONB;

-- Create GIN index for general JSONB queries
CREATE INDEX IF NOT EXISTS idx_species_env_preferences 
ON species USING GIN (environmental_preferences);

-- Create specific indexes for common queries
CREATE INDEX IF NOT EXISTS idx_species_temp 
ON species ((environmental_preferences->'temperature'));

CREATE INDEX IF NOT EXISTS idx_species_salinity 
ON species ((environmental_preferences->'salinity'));

-- Add validation constraint (requires at least temperature and depth)
-- Drop existing constraint if it exists, then recreate
DO $$ 
BEGIN
  ALTER TABLE species DROP CONSTRAINT IF EXISTS check_env_data_format;
  ALTER TABLE species ADD CONSTRAINT check_env_data_format 
  CHECK (
    environmental_preferences IS NULL 
    OR (
      environmental_preferences ? 'temperature' 
      AND environmental_preferences ? 'depth'
    )
  );
END $$;

-- Add helpful comment
COMMENT ON COLUMN species.environmental_preferences IS 
'JSONB storage for species environmental requirements: temperature, salinity, depth, substrate preferences. Used for environmental prediction scoring.';

-- ============================================================================
-- VALIDATION QUERIES (run these after the above completes)
-- ============================================================================

-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='species' 
  AND column_name='environmental_preferences';
-- Expected: environmental_preferences | jsonb

-- Check indexes created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename='species' 
  AND indexname LIKE '%env%'
ORDER BY indexname;
-- Expected: 3 indexes (gin, temp, salinity)

-- Check column is NULL initially (ready for population)
SELECT COUNT(*) as species_with_env_data
FROM species 
WHERE environmental_preferences IS NOT NULL;
-- Expected: 0 (will be 62 after Step 3)

-- Check constraint exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'check_env_data_format';
-- Expected: constraint definition

-- ============================================================================
-- SUCCESS! ✅
-- If all validation queries pass, proceed to Step 3
-- ============================================================================
