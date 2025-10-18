-- Quick test: Populate ALL species with broad coverage
-- Run this in Supabase SQL Editor

UPDATE species
SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'North Sea', 'Celtic Sea', 'English Channel', 'Irish Sea', 'Bay of Biscay', 'IBI'];

-- Verify it worked
SELECT 
  COUNT(*) as total_species,
  COUNT(biogeographic_regions) as species_with_regions
FROM species;

-- Check a few examples
SELECT name_en, biogeographic_regions
FROM species
WHERE name_en IN ('Bogue', 'Sea Bass', 'Cod', 'Plaice')
ORDER BY name_en;

-- Test predictions for Bay of Biscay
SELECT COUNT(*) as prediction_count
FROM get_environmental_predictions_basic('25E1', '2025-10-18');
