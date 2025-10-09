# Species Advice Migration and Display Guide

## Problem
Hake and Anchovies are showing on the Findr homepage but lack species-specific tactical advice. The advice data exists in the staging tables (`species_advice_staging_clean`) but needs to be migrated to the production `species` table and displayed in the UI.

## Solution Overview
1. ✅ Created SQL migration script to copy advice from staging to production
2. ✅ Updated `ActiveSpeciesCard` component to display dynamic advice
3. ⏳ Need to run the migration and deploy

---

## Step 1: Run the Database Migration

Execute the SQL script to migrate advice from staging to production:

```bash
# From the project root
psql "postgresql://postgres:whalelovesoverthere@db.swmviqpxetwziqxhzldh.supabase.co:5432/postgres" -f scripts/migrate-species-advice.sql
```

Or run it directly in the Supabase SQL editor:

```sql
-- Migrate advice data from species_advice_staging_clean to species table
UPDATE species
SET advice = staging.advice
FROM species_advice_staging_clean staging
WHERE species.species_code = 'HKE'
  AND staging.species_code = 'HKE'
  AND staging.advice IS NOT NULL;

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
```

**Expected output:**
```
 species_code | scientific_name  |   name_en    |  advice_status  
--------------+------------------+--------------+----------------
 GAR          | Belone belone    | Garfish      | ARRAY (2 items)
 HKE          | Merluccius...    | Hake         | ARRAY (2 items)
 PIL          | Sardina...       | Pilchard     | ARRAY (2 items)
```

---

## Step 2: Verify Data Structure

Check that the advice data has the expected structure:

```sql
-- View the advice structure for Hake
SELECT 
  species_code,
  name_en,
  jsonb_pretty(advice) as advice_data
FROM species
WHERE species_code = 'HKE';
```

The advice should be an array with objects containing:
- `type`: "Shore" or "Boat"
- `best_time`: e.g., "Dawn and dusk, particularly during tide changes"
- `favourite_baits_and_natural_diet`: e.g., "Squid, mackerel strips, sand eels"
- `tide_sensitivity`: e.g., "Best around slack water and tide turns"
- `typical_distance_depth`: e.g., "50-200m offshore"
- `effect_of_weather`: e.g., "Prefers calm conditions"
- And other fields...

---

## Step 3: Code Changes Made

### A. Updated ActiveSpeciesCard Component

**File:** `components/findr/ActiveSpeciesCard.tsx`

**Changes:**
1. Added `SpeciesAdvice` interface definition (lines 10-24)
2. Updated `ActiveSpeciesCardProps` to include optional `advice` field (line 39)
3. Replaced hardcoded tactical advice with dynamic rendering (lines 222-257)

**Key logic:**
- If `species.advice` exists and has items, it displays them dynamically
- Supports both "Shore" and "Boat" advice types with emojis (🏖️ / 🚤)
- Displays key advice fields: best_time, bait, tide, depth, weather
- Falls back to generic advice if no species-specific advice exists

---

## Step 4: Ensure API Returns Advice Field

The `get_fishing_predictions` RPC function must return the advice field. Check that the function includes it in the SELECT:

```sql
-- In your get_fishing_predictions function, ensure it selects advice:
SELECT 
  s.species_code,
  s.scientific_name,
  s.name_en,
  s.advice,  -- <-- Make sure this is included
  -- ... other fields
FROM species s
-- ... rest of query
```

If the RPC function doesn't return advice, you'll need to update it.

---

## Step 5: Update mapPrediction to Include Advice

**File:** `lib/findr/mapPrediction.ts`

The `CardData` interface and `mapPrediction` function need to pass through the advice field from the API response.

**Check if needed:**
```typescript
// In mapPrediction.ts, the CardData interface should include:
export interface CardData {
  // ... existing fields
  advice?: Array<{
    type: string;
    best_time?: string;
    favourite_baits_and_natural_diet?: string;
    // ... etc
  }>;
}

// And in the mapping function:
export function mapPrediction(prediction: FishingPrediction): CardData {
  return {
    // ... existing mappings
    advice: prediction.advice, // <-- Pass through advice
  };
}
```

---

## Step 6: Deploy to Production

```bash
# Commit changes
git add .
git commit -m "Add dynamic species advice display for Hake and Anchovies"

# Deploy to production
npx vercel deploy --prod --yes
```

---

## Step 7: Test the Changes

1. **Open Findr homepage** at https://www.godaisy.io/findr
2. **Select a location** where Hake or Anchovies appear
3. **View a card** for Hake or Anchovies
4. **Expand the "Show how to catch" section**
5. **Verify** that tactical advice shows species-specific tips instead of generic ones

**Expected to see:**
```
🏖️ Shore
• Best time: Dawn and dusk, particularly during tide changes
• Bait: Squid, mackerel strips, sand eels
• Tide: Best around slack water and tide turns
• Depth: 50-200m offshore
• Weather: Prefers calm conditions

🚤 Boat
• Best time: Night fishing very productive
• Bait: Live bait fish, feathers, pirks
• Tide: Slack water periods
• Depth: 100-300m
• Weather: Can fish in moderate conditions
```

---

## Troubleshooting

### Advice still not showing?

1. **Check the API response:**
   ```bash
   curl 'https://www.godaisy.io/api/findr/predictions?rectangleCode=YOUR_CODE&predictionDate=2025-10-09' | jq '.predictions[] | select(.species_code == "HKE") | .advice'
   ```

2. **Verify database has advice:**
   ```sql
   SELECT species_code, advice IS NOT NULL as has_advice 
   FROM species 
   WHERE species_code IN ('HKE', 'PIL');
   ```

3. **Check RPC function returns advice:**
   ```sql
   SELECT * FROM get_fishing_predictions('20C5', '2025-10-09', 'en')
   WHERE species_code = 'HKE';
   ```

4. **Clear cache:**
   The predictions are cached for 3 hours. Either wait or force refresh:
   ```sql
   DELETE FROM findr_prediction_sessions 
   WHERE rectangle_code = 'YOUR_CODE';
   ```

---

## Files Changed

1. ✅ `components/findr/ActiveSpeciesCard.tsx` - Updated to display dynamic advice
2. ✅ `scripts/migrate-species-advice.sql` - Migration script created
3. ⏳ `lib/findr/mapPrediction.ts` - May need to add advice field
4. ⏳ RPC function - Verify it returns advice field

---

## Next Steps

1. Run the migration script (Step 1)
2. Verify the data (Step 2)
3. Check if mapPrediction needs updating (Step 5)
4. Deploy to production (Step 6)
5. Test on live site (Step 7)
