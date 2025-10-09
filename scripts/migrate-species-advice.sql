-- Migrate advice data from species_advice_staging_clean to species table
-- For Hake (HKE) and Anchovies/Pilchard (PIL)

-- Update Hake advice
UPDATE species
SET advice = staging.advice
FROM species_advice_staging_clean staging
WHERE species.species_code = 'HKE'
  AND staging.species_code = 'HKE'
  AND staging.advice IS NOT NULL;

-- Update Anchovies/Pilchard advice
UPDATE species
SET advice = staging.advice
FROM species_advice_staging_clean staging
WHERE species.species_code = 'PIL'
  AND staging.species_code = 'PIL'
  AND staging.advice IS NOT NULL;

-- Verify the updates
SELECT 
  species_code,
  scientific_name,
  name_en,
  CASE 
    WHEN advice IS NULL THEN 'MISSING'
    WHEN jsonb_typeof(advice) = 'array' THEN 'ARRAY (' || jsonb_array_length(advice) || ' items)'
    ELSE 'OBJECT'
  END as advice_status
FROM species
WHERE species_code IN ('HKE', 'PIL', 'GAR')
ORDER BY species_code;
