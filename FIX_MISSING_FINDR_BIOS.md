# Fix: Missing Findr Bios in Swipable Cards

## Problem
Atlantic Bonito, Meagre, and other fish species were not showing their Findr bios in the swipable cards.

## Root Cause
The database prediction functions (`get_environmental_predictions_basic` and `get_environmental_predictions_enhanced`) were not returning the `playful_bio_en` field from the species table. 

The bio data existed in the database (verified in migration `20251016004_upsert_species_playful_bio_en.sql`), but it wasn't being included in the prediction results sent to the frontend.

## Solution

### 1. Updated Database Functions
Modified both prediction functions to include `playful_bio_en`, `species_code`, and `scientific_name` in their output:

- **Migration**: `20251017001_add_bio_to_predictions.sql`
  - Updated `get_environmental_predictions_basic()` to return these fields
  
- **Migration**: `20251017002_add_bio_to_enhanced_predictions.sql`
  - Updated `get_environmental_predictions_enhanced()` to return these fields

### 2. Updated API Augmentation Logic
Modified `/pages/api/findr/predictions.ts` to transform `playful_bio_en` from the database to `playful_bio` for the frontend:

```typescript
// Transform playful_bio_en from database function to playful_bio for frontend
if (!result.playful_bio && original.playful_bio_en && typeof original.playful_bio_en === 'string' && original.playful_bio_en.trim().length > 0) {
  result.playful_bio = original.playful_bio_en.trim() as unknown as JsonValue;
}
```

This ensures the bio is available whether it comes:
- Directly from the database function (new behavior)
- From the separate augmentation query (fallback)

### 3. Data Flow
1. User requests predictions for a rectangle
2. Database function returns species with `playful_bio_en`
3. API transforms `playful_bio_en` → `playful_bio`
4. Frontend receives prediction with `playful_bio` field
5. `mapPrediction()` function uses `playful_bio` to populate card
6. Swipable card displays the bio

## Species with Bios
All species with `playful_bio_en` in the database will now show their bios, including:
- Atlantic Bonito: "Fast, flashy, and never still. Always chasing shimmer and excitement — silver stripes, no filter, pure cardio."
- Meagre: "I move with the tide and live by instinct. Always hungry, mostly harmless, occasionally brilliant."
- And 75+ other species

## Files Modified
1. `/supabase/migrations/20251017001_add_bio_to_predictions.sql` - New
2. `/supabase/migrations/20251017002_add_bio_to_enhanced_predictions.sql` - New
3. `/pages/api/findr/predictions.ts` - Updated augmentation logic

## Testing
To verify the fix:
1. Clear browser cache
2. Navigate to Findr swipable cards
3. Verify Atlantic Bonito and Meagre show their bios
4. Check other species as well

## Date
17 October 2025
