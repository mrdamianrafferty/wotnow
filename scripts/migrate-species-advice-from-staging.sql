-- Migrate advice data from species_advice_staging_clean to species table
-- This script transforms the staging data into the proper JSONB array format

-- First, let's update Hake (assuming species_code is 'HKE')
UPDATE species
SET advice = (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'type', 'General',
      'regions', COALESCE(s.regions, 'Various coastal waters'),
      'best_time', COALESCE(s.best_time, 'Dawn and dusk'),
      'tide_sensitivity', COALESCE(s.tide_sensitivity, 'Moderate'),
      'favourite_baits_and_natural_diet', COALESCE(s.favourite_baits_and_natural_diet, 'Small fish, squid'),
      'effect_of_temperature', COALESCE(s.effect_of_temperature, 'Prefers cooler waters'),
      'effect_of_weather', COALESCE(s.effect_of_weather, 'Active in stable conditions'),
      'typical_distance_depth', COALESCE(s.typical_distance_depth, 'Deep water, 50-400m'),
      'edibility_10', COALESCE(s.edibility_10, '8'),
      'restrictions_notes', COALESCE(s.restrictions_notes, 'Check local regulations'),
      'trusted_authority_rules', COALESCE(s.trusted_authority_rules, 'Follow local fishing regulations'),
      'conservation_status', COALESCE(s.conservation_status, 'Stable'),
      'fun_fact', COALESCE(s.fun_fact, 'Excellent eating fish with mild, white flesh')
    )
  )
  FROM species_advice_staging_clean s
  WHERE LOWER(s.species) = 'hake'
    OR LOWER(s.scientific_name) LIKE '%merluccius%'
  LIMIT 1
)
WHERE species_code = 'HKE'
  OR scientific_name LIKE '%Merluccius%'
  OR LOWER(name_en) = 'hake';

-- Update European Anchovy (assuming species_code is 'PIL' for Pilchard/Anchovy)
UPDATE species
SET advice = (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'type', 'General',
      'regions', COALESCE(s.regions, 'Coastal waters'),
      'best_time', COALESCE(s.best_time, 'Summer months, dawn'),
      'tide_sensitivity', COALESCE(s.tide_sensitivity, 'Active on moving tides'),
      'favourite_baits_and_natural_diet', COALESCE(s.favourite_baits_and_natural_diet, 'Plankton, small organisms'),
      'effect_of_temperature', COALESCE(s.effect_of_temperature, 'Prefers warm waters'),
      'effect_of_weather', COALESCE(s.effect_of_weather, 'Active in calm conditions'),
      'typical_distance_depth', COALESCE(s.typical_distance_depth, 'Surface to mid-water, 0-50m'),
      'edibility_10', COALESCE(s.edibility_10, '9'),
      'restrictions_notes', COALESCE(s.restrictions_notes, 'Check seasonal restrictions'),
      'trusted_authority_rules', COALESCE(s.trusted_authority_rules, 'Follow local fishing regulations'),
      'conservation_status', COALESCE(s.conservation_status, 'Varies by region'),
      'fun_fact', COALESCE(s.fun_fact, 'Delicious when fresh, popular in Mediterranean cuisine')
    )
  )
  FROM species_advice_staging_clean s
  WHERE LOWER(s.species) LIKE '%anchov%'
    OR LOWER(s.scientific_name) LIKE '%engraulis%'
  LIMIT 1
)
WHERE scientific_name LIKE '%Engraulis%'
  OR LOWER(name_en) LIKE '%anchov%';

-- Verify the updates
SELECT 
  species_code,
  name_en,
  scientific_name,
  CASE 
    WHEN advice IS NULL THEN 'NO ADVICE'
    WHEN jsonb_array_length(advice) = 0 THEN 'EMPTY ARRAY'
    ELSE 'HAS ADVICE (' || jsonb_array_length(advice) || ' items)'
  END as advice_status,
  (advice->0->>'fun_fact') as sample_fun_fact
FROM species
WHERE species_code IN ('HKE', 'PIL')
   OR scientific_name LIKE '%Merluccius%'
   OR scientific_name LIKE '%Engraulis%'
   OR LOWER(name_en) IN ('hake', 'anchovy', 'anchovies')
ORDER BY species_code;
