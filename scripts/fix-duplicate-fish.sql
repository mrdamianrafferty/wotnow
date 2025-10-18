-- Fix Duplicate Fish Issues
-- Based on scientific names as source of truth

-- ISSUE 1: Saithe/Pollock Duplicate
-- We have:
--   pok: "Pollachius virens" = Saithe (CORRECT)
--   sai: "Saithe/Pollock" = NOT A REAL SCIENTIFIC NAME (INCORRECT - should be removed or fixed)
-- 
-- Pollachius virens = Saithe (also called Coalfish, Coley)
-- Pollachius pollachius = Pollock/Pollack
-- The "sai" entry appears to be a duplicate/confused entry

-- Check what we have:
SELECT species_code, name_en, scientific_name 
FROM species 
WHERE scientific_name ILIKE '%pollachius%' OR name_en ILIKE '%saithe%' OR name_en ILIKE '%pollock%'
ORDER BY scientific_name;

-- Expected result:
-- pol | Pollack | Pollachius pollachius ✅
-- pok | Saithe (Pollachius virens) | Pollachius virens ✅
-- sai | Saithe/Pollock | Saithe/Pollock ❌ (INVALID - not a scientific name)

-- DECISION: Delete the 'sai' entry as it's a duplicate of 'pok' with invalid scientific name
DELETE FROM species WHERE species_code = 'sai' AND scientific_name = 'Saithe/Pollock';


-- ISSUE 2: Gilthead Seabream confusion
-- We have:
--   sbg: "Gilthead Seabream" with scientific name "Gilthead Seabream" ❌ (not a scientific name)
--   sba: "Sea Bream (Dorada)" with scientific name "Sparus aurata" ✅ (this IS Gilthead Seabream)

-- Check what we have:
SELECT species_code, name_en, scientific_name 
FROM species 
WHERE name_en ILIKE '%gilthead%' OR name_en ILIKE '%dorada%' OR scientific_name ILIKE '%sparus%aurata%'
ORDER BY scientific_name;

-- Expected result:
-- sbg | Gilthead Seabream | Gilthead Seabream ❌ (INVALID - not a scientific name)
-- sba | Sea Bream (Dorada) | Sparus aurata ✅ (This IS Gilthead Seabream)

-- DECISION: Update sbg to have correct scientific name, or delete if it's truly a duplicate
-- Let's check if sbg has any data associated with it first:
SELECT 'species_substrates' as table_name, COUNT(*) FROM species_substrates WHERE species_code = 'sbg'
UNION ALL
SELECT 'species_depths', COUNT(*) FROM species_depths WHERE species_code = 'sbg'
UNION ALL
SELECT 'species_bait', COUNT(*) FROM species_bait WHERE species_code = 'sbg';

-- If sbg has no associated data, we should delete it and keep sba as the canonical Gilthead Seabream
-- If sbg has data, we need to migrate it to sba first

-- For now, let's update sbg to have the correct scientific name (assuming it's meant to be the same fish)
-- UPDATE species 
-- SET scientific_name = 'Sparus aurata',
--     name_en = 'Gilthead Seabream'
-- WHERE species_code = 'sbg';

-- Actually, looking at the aliases, sba is "Sea Bream (Dorada)" and has "Gilthead Seabream" as an alias
-- sbg is "Gilthead Seabream" standalone
-- These might be intentionally separate entries, but sbg needs a proper scientific name

-- Let's check if they're meant to be different species:
-- Sparus aurata = Gilthead Seabream (Mediterranean/Atlantic)
-- If sbg is meant to be the same, it should be deleted as duplicate
-- If sbg is meant to be different, it needs a proper scientific name

-- SAFEST ACTION: Check with user first, but likely these are duplicates


-- ISSUE 3: Check for other invalid scientific names
SELECT species_code, name_en, scientific_name
FROM species
WHERE scientific_name = name_en  -- Scientific name shouldn't equal English name
   OR scientific_name NOT LIKE '% %'  -- Scientific names should be binomial (two words)
   OR scientific_name LIKE '%(%'  -- Scientific names shouldn't have parentheses
ORDER BY scientific_name;
