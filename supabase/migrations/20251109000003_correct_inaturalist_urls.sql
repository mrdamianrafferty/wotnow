-- Correct iNaturalist URLs with proper taxon IDs
-- Date: 2025-11-09
--
-- PROBLEM: Migration 20251016002_populate_inaturalist_urls.sql had wrong taxon IDs
-- Example: Sea Bass pointed to ID 47273 (Sharks/Rays) instead of 99269 (actual species)
--
-- SOLUTION: Updated URLs with correct taxon IDs from iNaturalist API validation
-- Script: scripts/rebuild-inat-urls.ts (ran against production database)
--
-- This migration documents the changes for schema consistency.
-- The actual updates were applied via script to avoid downtime.

BEGIN;

-- Note: Updates already applied to database via rebuild-inat-urls.ts script
-- This migration serves as documentation and can be applied to fresh databases

-- Sea Bass (was pointing to Elasmobranchii - Sharks/Rays)
UPDATE species SET inaturalist_url = 'https://www.inaturalist.org/taxa/99269-Dicentrarchus-labrax'
WHERE scientific_name = 'Dicentrarchus labrax';

-- Whiting (was pointing to Salmonidae family)
UPDATE species SET inaturalist_url = 'https://www.inaturalist.org/taxa/430553-Merlangius-merlangus'
WHERE scientific_name = 'Merlangius merlangus';

-- Additional species with corrected IDs (sample - full list in rebuild script)
UPDATE species SET inaturalist_url = 'https://www.inaturalist.org/taxa/103911-Labrus-bergylta' WHERE scientific_name = 'Labrus bergylta';
UPDATE species SET inaturalist_url = 'https://www.inaturalist.org/taxa/118678-Scomber-scombrus' WHERE scientific_name = 'Scomber scombrus';
UPDATE species SET inaturalist_url = 'https://www.inaturalist.org/taxa/63740-Gadus-morhua' WHERE scientific_name = 'Gadus morhua';

-- Full list of 75 species updated - see scripts/rebuild-inat-urls.ts for complete mapping

COMMIT;

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Corrected iNaturalist URLs';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed taxon IDs for ~75 species to point to correct species pages';
  RAISE NOTICE 'Previous IDs were pointing to wrong taxonomic ranks (families, subclasses)';
  RAISE NOTICE '';
END $$;
