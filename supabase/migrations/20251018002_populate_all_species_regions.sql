-- Populate biogeographic_regions for all species
-- Simple approach: Give all species broad coverage EXCEPT known Mediterranean specialists

-- Default: All species get broad Atlantic + Mediterranean coverage (permissive)
UPDATE species
SET biogeographic_regions = ARRAY['Atlantic', 'Mediterranean', 'North Sea', 'Celtic Sea', 'English Channel', 'Irish Sea', 'Bay of Biscay', 'IBI']
WHERE biogeographic_regions IS NULL;

-- Override for known Mediterranean specialists based on temp preferences
-- Mediterranean specialists have min temp >= 16°C
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean']
WHERE temp_opt_c IS NOT NULL 
  AND array_length(temp_opt_c, 1) = 2
  AND temp_opt_c[1] >= 16
  AND temp_opt_c[2] >= 20;

-- Verify
SELECT 
  name_en,
  temp_opt_c,
  biogeographic_regions
FROM species
WHERE name_en IN ('Bogue', 'Sea Bass', 'Cod', 'Plaice', 'Mackerel')
ORDER BY name_en;
