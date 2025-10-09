# Species Advice Deployment Guide

## Overview
This guide will help you migrate species advice from staging tables to production and deploy the code changes that display the advice on species cards.

## Steps

### 1. Migrate Advice Data from Staging to Production

Run this SQL script in your Supabase SQL Editor:

```sql
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
```

### 2. Verify the Advice Data

Check that the advice was correctly migrated:

```sql
-- View the full advice data for Hake
SELECT 
  species_code,
  name_en,
  jsonb_pretty(advice) as advice
FROM species
WHERE LOWER(name_en) LIKE '%hake%'
   OR scientific_name LIKE '%Merluccius%';

-- View the full advice data for Anchovies
SELECT 
  species_code,
  name_en,
  jsonb_pretty(advice) as advice
FROM species
WHERE LOWER(name_en) LIKE '%anchov%'
   OR scientific_name LIKE '%Engraulis%';
```

### 3. Ensure the RPC Function Returns Advice

The `get_fishing_predictions` RPC function should return the advice field. If it doesn't, you may need to update it to include the advice field in the JOIN with the species table.

Check what fields the RPC returns:

```sql
-- Test the RPC function to see what it returns
SELECT * FROM get_fishing_predictions('20C5', CURRENT_DATE, 'en')
LIMIT 1;
```

If the advice field is NOT included in the results, you'll need to update the RPC function definition to include it.

### 4. Deploy the Code Changes

The code changes have been made to:
- `lib/findr/mapPrediction.ts` - Added SpeciesAdvice interface and advice field to CardData
- `components/findr/ActiveSpeciesCard.tsx` - Already has logic to display advice dynamically
- `pages/findr/favourites.tsx` - Pass advice through to ActiveSpeciesCard component

Commit and deploy:

```bash
git add .
git commit -m "Add species advice display for Hake and Anchovies"
git push origin main
```

### 5. Verify the UI

1. Navigate to the Findr Favourites page
2. Add Hake or Anchovies to your favourites
3. Click to expand the "Show how to catch" section
4. You should see the advice from the database instead of the generic hardcoded tips

## What Was Changed

### Database
- Migrated advice data from `species_advice_staging_clean` to `species.advice` column
- Advice is stored as JSONB array with structured objects containing:
  - type, regions, best_time, tide_sensitivity, favourite_baits_and_natural_diet
  - effect_of_temperature, effect_of_weather, typical_distance_depth
  - edibility_10, restrictions_notes, trusted_authority_rules
  - conservation_status, fun_fact

### Frontend
1. **CardData Interface** (`lib/findr/mapPrediction.ts`)
   - Added `SpeciesAdvice` interface
   - Added `advice?: SpeciesAdvice[]` field to CardData
   - Updated mapPrediction() to extract and pass through advice from API

2. **ActiveSpeciesCard Component** (`components/findr/ActiveSpeciesCard.tsx`)
   - Already had logic to display advice if present
   - Falls back to hardcoded tips if no advice available
   - Displays structured advice with icons and formatting

3. **Favourites Page** (`pages/findr/favourites.tsx`)
   - Added `advice` field to FavouriteEntry interface
   - Extract advice from card data
   - Pass advice to ActiveSpeciesCard component

## Troubleshooting

### Advice Not Showing

1. **Check if advice was migrated:**
   ```sql
   SELECT species_code, name_en, advice IS NOT NULL as has_advice
   FROM species
   WHERE LOWER(name_en) IN ('hake', 'anchovy', 'anchovies');
   ```

2. **Check if API returns advice:**
   - Open DevTools Network tab
   - Navigate to Findr page
   - Look at the `/api/findr/predictions` response
   - Verify that the `advice` field is present in the response

3. **Check console for errors:**
   - Open DevTools Console
   - Look for any TypeScript or rendering errors

### RPC Function Doesn't Return Advice

If the RPC function needs to be updated, you'll need to modify it to JOIN the species table and SELECT the advice column:

```sql
-- Example - your actual function may be different
CREATE OR REPLACE FUNCTION get_fishing_predictions(...)
RETURNS TABLE (..., advice jsonb, ...)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ...,
    s.advice,  -- Add this line
    ...
  FROM species_monthly_abundance sma
  LEFT JOIN species s ON s.species_code = sma.species_code
  ...
END;
$$ LANGUAGE plpgsql;
```

## Next Steps

- Add advice for more species in the staging table
- Run similar UPDATE statements to migrate advice for other species
- Consider creating a bulk migration script for all species at once
