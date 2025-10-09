# Findr Homepage - Show Full Species Lineup

## Current Situation

The Findr homepage (tinder-style cards) is showing only a couple of fish species instead of the full lineup.

## Code Analysis

### Data Flow
```
1. useFishingPredictions hook → /api/findr/predictions
2. API calls Supabase RPC: get_fishing_predictions(rectangle, date, language)
3. Returns predictions array (all species)
4. Frontend maps predictions with mapPrediction()
5. Sorts by confidence: (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity)
6. Shows all in tinder cards
```

### Key Files
- **pages/findr/index.tsx** (line 625-633): Maps and sorts cards
- **pages/api/findr/predictions.ts**: No LIMIT clause found
- **lib/findr/mapPrediction.ts**: Maps each prediction to CardData

## Issue Discovery

Looking at the code in `pages/findr/index.tsx` line 625-633:

```typescript
const cards = useMemo(() => {
  if (!predictions) return [];
  return predictions
    .map((prediction, index) => mapPrediction(prediction, index))
    .filter((card): card is CardData => card !== null)
    .sort((a, b) => (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity));
}, [predictions]);
```

**The code is correct** - it shows ALL predictions sorted by confidence.

## Likely Cause

The issue is **at the database level** - the `get_fishing_predictions` RPC is probably only returning a few species.

### Hypothesis 1: Database Query Limit
The Supabase RPC function `get_fishing_predictions` might have a LIMIT clause that restricts results.

### Hypothesis 2: Species Filter
The RPC might be filtering species based on:
- Minimum confidence threshold
- Stock status (only certain statuses shown)
- Seasonal availability
- Data quality flags

### Hypothesis 3: Rectangle-Specific Data
Some rectangles might only have predictions for a few species due to:
- Limited historical catch data
- Regional species distribution
- Incomplete ML model training data

## Solution Options

### Option 1: Check Database RPC (Recommended)
```sql
-- Connect to Supabase and check the RPC function
SELECT * FROM get_fishing_predictions(
  rectangle_code_input := '21D8',
  prediction_date_input := CURRENT_DATE,
  user_language := 'en'
);

-- Check how many rows are returned
```

### Option 2: Remove Confidence Threshold
If the RPC has a confidence filter (e.g., `WHERE confidence >= 60`), lower it or remove it:

```sql
-- In the RPC function definition
-- BEFORE:
WHERE confidence >= 60

-- AFTER:
WHERE confidence >= 0  -- Show all species
-- OR remove the WHERE clause entirely
```

### Option 3: Add More Species to Database
If the data simply doesn't exist, add predictions for more species:
- Check `findr_predictions` or similar table
- Ensure all target species have rows
- Run ML prediction pipeline for more species

### Option 4: Frontend Fallback Display
While fixing the database, show placeholder cards for common species:

```typescript
const cards = useMemo(() => {
  if (!predictions) return [];
  const mapped = predictions
    .map((prediction, index) => mapPrediction(prediction, index))
    .filter((card): card is CardData => card !== null)
    .sort((a, b) => (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity));
  
  // If we have fewer than 10 species, add placeholders for common ones
  if (mapped.length < 10) {
    const commonSpecies = ['Atlantic Cod', 'Sea Bass', 'Mackerel', 'Pollack', 'Plaice', 'Whiting'];
    // Add placeholder cards for species not in predictions
    // ...
  }
  
  return mapped;
}, [predictions]);
```

## Recommended Action Plan

1. **Check database first** - Query the RPC directly
2. **Identify the constraint** - LIMIT clause, WHERE filter, or missing data
3. **Fix at source** - Modify RPC or add more prediction data
4. **Verify frontend** - Confirm all species show after DB fix

## Testing

After implementing fix:

```bash
# Test API returns more species
curl -X POST 'https://wotnow.fish/api/findr/predictions' \
  -H 'Content-Type: application/json' \
  -d '{"rectangleCode":"21D8"}' | jq '.predictions | length'

# Should return: 15-30 species (or however many are in the area)
```

Check in browser:
1. Go to https://wotnow.fish/findr
2. Select a location
3. Count cards shown
4. Should see full species lineup ordered by confidence

## Expected Result

**Before:** 2-3 species  
**After:** 15-30 species (all available for the area, ordered by catch likelihood)

---

**Next Step:** Access Supabase SQL editor and inspect the `get_fishing_predictions` RPC function to find the limiting factor.
