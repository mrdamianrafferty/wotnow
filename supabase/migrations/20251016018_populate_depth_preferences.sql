-- Add sample depth preferences for testing
-- Based on typical habitat depths for common species

UPDATE species SET 
  depth_min_m = 1,
  depth_max_m = 30,
  depth_optimal_min_m = 2,
  depth_optimal_max_m = 15
WHERE species_code IN ('wrb', 'wra', 'wr1') -- Wrasse species (shallow rocky reefs)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 5,
  depth_max_m = 100,
  depth_optimal_min_m = 10,
  depth_optimal_max_m = 40
WHERE species_code = 'bss' -- Bass (coastal to offshore)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 0,
  depth_max_m = 20,
  depth_optimal_min_m = 1,
  depth_optimal_max_m = 8
WHERE species_code IN ('mul', 'rmu', 'gmu') -- Mullet species (shallow estuarine/coastal)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 2,
  depth_max_m = 50,
  depth_optimal_min_m = 5,
  depth_optimal_max_m = 30
WHERE species_code = 'cod' -- Cod (demersal, varied depths)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 5,
  depth_max_m = 200,
  depth_optimal_min_m = 20,
  depth_optimal_max_m = 80
WHERE species_code = 'pol' -- Pollack (mid to deep water)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 10,
  depth_max_m = 300,
  depth_optimal_min_m = 40,
  depth_optimal_max_m = 150
WHERE species_code = 'lin' -- Ling (deep water specialist)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 2,
  depth_max_m = 150,
  depth_optimal_min_m = 20,
  depth_optimal_max_m = 60
WHERE species_code IN ('pla', 'ple') -- Plaice (flatfish, sand/mud)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 10,
  depth_max_m = 200,
  depth_optimal_min_m = 30,
  depth_optimal_max_m = 80
WHERE species_code = 'meg' -- Megrim (deeper flatfish)
  AND depth_min_m IS NULL;

UPDATE species SET 
  depth_min_m = 0,
  depth_max_m = 40,
  depth_optimal_min_m = 3,
  depth_optimal_max_m = 20
WHERE species_code IN ('dab', 'fle') -- Dab/Flounder (shallow flatfish)
  AND depth_min_m IS NULL;

-- Verify updates
SELECT 
  species_code,
  name_en,
  depth_min_m,
  depth_max_m,
  depth_optimal_min_m,
  depth_optimal_max_m
FROM species
WHERE depth_min_m IS NOT NULL
ORDER BY depth_optimal_min_m;
