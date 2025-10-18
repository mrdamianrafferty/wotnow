-- Remove Duplicate Fish Entries
-- Date: 2025-10-18
-- Issue: Scientific names as baseline - found 2 duplicates

-- ISSUE 1: Remove SAI (Saithe/Pollock) - Duplicate of POK
-- "Saithe/Pollock" is not a valid scientific name
-- This is a duplicate of Pollachius virens (species_code: pok)
-- POK is the correct entry with proper scientific name

-- First, check if there are any aliases pointing to this entry
DELETE FROM species_name_alias 
WHERE scientific_name = 'Saithe/Pollock';

-- Delete the duplicate species entry
DELETE FROM species 
WHERE species_code = 'sai' 
AND scientific_name = 'Saithe/Pollock';

-- Verify POK has the right aliases (Saithe, Coalfish, Coley)
-- These should already exist from migration 20251018012


-- ISSUE 2: Remove SBG (Gilthead Seabream) - Duplicate of SBA
-- "Gilthead Seabream" is not a valid scientific name
-- This is a duplicate of Sparus aurata (species_code: sba)
-- SBA is the correct entry with proper scientific name Sparus aurata
-- SBG has no associated data (substrates, depths, bait)
-- All "Gilthead Seabream" aliases already point to Sparus aurata

-- First, check if there are any aliases pointing to this entry
DELETE FROM species_name_alias 
WHERE scientific_name = 'Gilthead Seabream';

-- Delete the duplicate species entry  
DELETE FROM species 
WHERE species_code = 'sbg' 
AND scientific_name = 'Gilthead Seabream';

-- Verify SBA (Sparus aurata) has correct name and aliases
-- The current name is "Sea Bream (Dorada)" which is fine
-- Aliases already include: Gilthead Seabream, Dorada, etc. from migration 20251018012


-- VERIFICATION QUERIES
-- Run these after migration to verify cleanup:

-- Should return 0 rows (all species should have valid scientific names):
-- SELECT species_code, name_en, scientific_name 
-- FROM species 
-- WHERE scientific_name NOT SIMILAR TO '[A-Z][a-z]+ [a-z]+%';

-- Should return 1 row (only POK):
-- SELECT species_code, name_en, scientific_name 
-- FROM species 
-- WHERE name_en ILIKE '%saithe%' OR scientific_name ILIKE '%pollachius virens%';

-- Should return 1 row (only SBA):
-- SELECT species_code, name_en, scientific_name 
-- FROM species 
-- WHERE name_en ILIKE '%gilthead%' OR name_en ILIKE '%dorada%' OR scientific_name = 'Sparus aurata';

-- Check all seabream species are unique:
-- SELECT scientific_name, COUNT(*), STRING_AGG(species_code, ', ') as codes
-- FROM species
-- WHERE name_en ILIKE '%bream%'
-- GROUP BY scientific_name
-- HAVING COUNT(*) > 1;  -- Should return 0 rows
