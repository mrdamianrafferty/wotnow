-- Species Code Case Normalization
-- Date: 2025-10-19
-- Purpose: Standardize all species codes to UPPERCASE for consistency

-- =============================================================================
-- STEP 1: ANALYSIS - Check current state
-- =============================================================================

-- Count species with lowercase/mixed case codes
SELECT 
  COUNT(*) as lowercase_count,
  COUNT(*) FILTER (WHERE species_code = UPPER(species_code)) as uppercase_count,
  COUNT(*) FILTER (WHERE species_code != UPPER(species_code)) as needs_update_count
FROM species;

-- List all species codes that need updating
SELECT 
  species_code as current_code,
  UPPER(species_code) as new_code,
  name_en,
  scientific_name
FROM species
WHERE species_code != UPPER(species_code)
ORDER BY species_code;

-- =============================================================================
-- STEP 2: BACKUP (Optional but recommended)
-- =============================================================================

-- Create a backup table (optional)
-- CREATE TABLE species_backup_20251019 AS SELECT * FROM species;

-- =============================================================================
-- STEP 3: UPDATE - Normalize to UPPERCASE
-- =============================================================================

-- Update all lowercase/mixed case species codes to uppercase
UPDATE species
SET species_code = UPPER(species_code)
WHERE species_code != UPPER(species_code);

-- =============================================================================
-- STEP 4: VERIFICATION
-- =============================================================================

-- Verify all species codes are now uppercase
SELECT 
  species_code,
  name_en,
  CASE 
    WHEN species_code = UPPER(species_code) THEN '✅ Correct'
    ELSE '❌ Still lowercase'
  END as status
FROM species
ORDER BY species_code;

-- Count check (should be 0)
SELECT COUNT(*) as remaining_lowercase
FROM species
WHERE species_code != UPPER(species_code);

-- =============================================================================
-- STEP 5: ADD CONSTRAINT - Prevent future lowercase codes
-- =============================================================================

-- Add constraint to enforce uppercase species codes
ALTER TABLE species
ADD CONSTRAINT species_code_uppercase CHECK (species_code = UPPER(species_code));

-- Test the constraint (should fail)
-- INSERT INTO species (species_code, name_en, scientific_name) 
-- VALUES ('test', 'Test Species', 'Testus testicus');
-- Expected error: new row for relation "species" violates check constraint "species_code_uppercase"

-- =============================================================================
-- STEP 6: RELATED TABLES - Check for impacts
-- =============================================================================

-- Check if any other tables reference species_code
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'species'
  AND ccu.column_name = 'species_code';

-- Check species_frequency table (if exists)
-- SELECT DISTINCT species_code 
-- FROM species_frequency 
-- WHERE species_code != UPPER(species_code);

-- =============================================================================
-- ROLLBACK (If needed)
-- =============================================================================

-- If something goes wrong, restore from backup:
-- DROP TABLE species;
-- ALTER TABLE species_backup_20251019 RENAME TO species;

-- Or remove the constraint:
-- ALTER TABLE species DROP CONSTRAINT species_code_uppercase;

-- =============================================================================
-- EXPECTED RESULTS
-- =============================================================================

-- After running this script:
-- 1. All species_code values should be UPPERCASE
-- 2. Constraint species_code_uppercase should exist
-- 3. Any future INSERT/UPDATE with lowercase will fail
-- 4. Approximately 20-30 species should have been updated

-- Sample expected changes:
-- bss → BSS (Sea Bass)
-- mac → MAC (Mackerel)
-- cod → COD (Cod)
-- brs → BRS (Black Seabream)
-- wrb → WRB (Ballan Wrasse)
-- etc.

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. This migration is SAFE - species_code is not used as a foreign key
--    in most tables (they use UUID primary keys instead)
-- 2. The change is purely cosmetic - affects display/matching only
-- 3. All code normalization functions now use .toUpperCase()
-- 4. SPECIES_IMAGE_MAP will be regenerated with uppercase keys
-- 5. No downtime required - can run on live database
