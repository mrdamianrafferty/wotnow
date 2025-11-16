# Confidence Formula V2 - Implementation Status
## November 16, 2025

## ✅ Completed

### 1. Migration: New Columns (8 total)
**File**: `supabase/migrations/202511160002_add_confidence_formula_columns.sql`

Added to `species` table:
- `catches_2024` (INTEGER) - 2024 ICES catch count as availability proxy
- `peak_months` (INTEGER[]) - Peak abundance/catchability months
- `good_months` (INTEGER[]) - Good catch rate months
- `possible_months` (INTEGER[]) - Present but less active months
- `chlorophyll_preference` (TEXT) - 'high', 'medium', 'low', 'indifferent'
- `oxygen_comfortable` (NUMERIC) - Comfortable DO level (mg/L)
- `oxygen_survival` (NUMERIC) - Survival DO threshold (mg/L)
- `wave_tolerance` (NUMERIC) - Max wave height tolerance (meters), NULL = indifferent

### 2. New RPC Function with Normalized Scoring
**File**: `supabase/migrations/202511160003_create_confidence_v2_function.sql`
**Function**: `get_fishing_confidence_v2(target_rectangle, target_date, target_month)`

**Formula Structure**:
```
CONFIDENCE (0-100) = Base Availability (40) + Environmental Match (60)
```

**Base Availability (40 points)**:
- Catch data (30 pts): Using `catches_2024` as proxy
  - 50+ catches = 30 pts
  - 25-50 = 25 pts
  - 10-24 = 20 pts
  - 5-9 = 15 pts
  - 1-4 = 10 pts
  - 0 but in bioregion = 5 pts
  - Not in bioregion = filtered out
- Seasonal patterns (10 pts): Using peak/good/possible months

**Environmental Match (60 points) - NORMALIZED**:
- Temperature (25 pts weight): Optimal/tolerance/marginal ranges
- Chlorophyll (10 pts weight): High/medium/low preference matching
- Oxygen (10 pts weight): Comfortable/survival thresholds
- Clarity (5 pts weight): Based on kd490 and water_clarity_weight
- Currents (3 pts weight): Gentle/moderate/strong flow preference
- Waves (3 pts weight): Placeholder - currently neutral (7/10)
- Wind (2 pts weight): Based on wind_sensitivity
- Lunar (2 pts weight): Placeholder - currently neutral (7/10)

**Key Innovation: Data Normalization**
```sql
-- Only count weights for available data
available_weight = 25 + -- Temperature (always counted)
  (chlorophyll IS NOT NULL ? 10 : 0) +
  (oxygen IS NOT NULL ? 10 : 0) +
  (clarity IS NOT NULL ? 5 : 0) +
  ... etc

-- Normalize score to 60 points
environmental_match = (weighted_sum / available_weight) * 60 / 10
```

**Species Neutrality**:
- Indifferent species get neutral scores (7/10)
- Missing preferences treated as neutral, not penalized

### 3. Data Discovery
**File**: `scripts/check-seasonal-data-coverage.ts`

Found existing seasonal data in `species_availability_by_grid`:
- **19 species** with location-specific `best_months` arrays
- **26,448 rows** with 100% coverage
- Species: BONITO, BRS, BSS, COD, GAR, HER, HOM, LTA, MAC, MUG, PIL, POK, POL, SBA, SPR, SQC, WHG, WRA, WRB

### 4. Documentation
**Updated/Created**:
- `EXISTING_VS_NEEDED_DATA.md` - Documented what data exists vs needs population
- `CONFIDENCE_FORMULA_REDESIGN.md` - Complete formula specification
- `CONFIDENCE_V2_IMPLEMENTATION_STATUS.md` - This file

---

## ⏳ Pending

### 1. Apply Migrations to Supabase
```bash
supabase db push
```

This will:
- Add the 8 new columns to the `species` table
- Create the `get_fishing_confidence_v2()` RPC function

### 2. Populate Missing Species Preference Data

**Catches 2024** (182 species):
- Option A: Import from ICES API/database
- Option B: Use placeholder values based on existing data

**Seasonal Patterns** (182 species):
- Option A: Derive from `species_availability_by_grid.best_months` for 19 species
- Option B: Manual population based on fishing knowledge
- Option C: Hybrid - use grid data where available, manual for rest

**Chlorophyll Preference** (182 species):
- Map based on guild and feeding ecology:
  - Pelagic feeders (MAC, HER) → 'high' (productive waters)
  - Offshore predators (Tuna) → 'low' (oceanic clear water)
  - Coastal species → 'medium'
  - Bottom-dwellers → 'indifferent'

**Oxygen Thresholds** (182 species):
- Active species (pelagic, reef): comfortable >6 mg/L, survival >4 mg/L
- Bottom-dwellers: comfortable >5 mg/L, survival >3 mg/L
- Species-specific research for key species

**Wave Tolerance** (182 species):
- Offshore species: NULL (indifferent to waves)
- Coastal/surf species: 2-3 meters
- Estuarine species: 0.5-1 meter

### 3. Data Population Scripts

Create scripts to help populate:
```bash
scripts/populate-catches-2024.ts
scripts/populate-seasonal-patterns.ts
scripts/populate-chlorophyll-preferences.ts
scripts/populate-oxygen-thresholds.ts
scripts/populate-wave-tolerance.ts
```

### 4. Testing

Create test script to validate formula:
```bash
scripts/test-confidence-v2.ts
```

Test scenarios:
- **Mackerel in summer** (July, North Sea) → Expect ~90-100%
- **Mackerel in winter** (January, North Sea) → Expect ~20-30%
- **Cod in winter** (February, North Sea) → Expect ~80-90%
- **Bass in winter** (January, North Sea) → Expect ~30-45%
- **Bass in summer** (August, English Channel) → Expect ~85-95%

### 5. Integration

Update API endpoint to use new function:
- Add optional `?version=v2` query param to `/api/findr/predictions`
- Test with real CMEMS data
- Compare v1 vs v2 results
- Gradual rollout

---

## Reusable Existing Data (No Migration Needed)

✅ **Temperature**: `environmental_preferences.temperature` or `temp_opt_c` array
✅ **Clarity**: `water_clarity_weight`, `turbidity_weight`
✅ **Currents**: `flow_preference` ('gentle', 'moderate', 'strong')
✅ **Wind**: `wind_sensitivity`, `wind_weight`
✅ **Lunar**: `lunar_weight`
✅ **Tide**: `preferred_tide_stage` (for favorites page)
✅ **Time of day**: `diurnal_sensitivity` (for favorites page)
✅ **Biogeographic regions**: `biogeographic_regions`
✅ **Guild**: `guild`

---

## Design Decisions Made

1. **Normalization over Penalization**: Missing data doesn't reduce scores - only available factors are scored
2. **Species Neutrality**: Indifferent species get 7/10 (neutral), not 0/10
3. **Minimal Schema Changes**: Only 8 new columns needed, reuse 90% of existing data
4. **Backward Compatible**: Old `get_environmental_predictions_enhanced()` still works
5. **Hybrid Seasonal Approach**: Use grid data where available, fall back to species-level patterns

---

## Example Query

```sql
SELECT *
FROM get_fishing_confidence_v2(
  target_rectangle => '28E5',
  target_date => '2025-07-15',
  target_month => 7
)
ORDER BY confidence_percent DESC
LIMIT 10;
```

**Expected Output**:
```json
{
  "species_code": "MAC",
  "species_name": "Mackerel",
  "confidence_percent": 95,
  "base_availability_score": 40,
  "environmental_match_score": 55,
  "breakdown": {
    "base_availability": {
      "catch_score": 30,
      "seasonal_score": 10,
      "total": 40
    },
    "environmental_match": {
      "temperature": 10,
      "chlorophyll": 10,
      "oxygen": 10,
      "clarity": 7,
      "currents": 7,
      "waves": 7,
      "wind": 10,
      "lunar": 7,
      "weighted_sum": 544,
      "available_weight": 60,
      "total": 55
    }
  }
}
```

---

## Next Steps

1. **Apply migrations**: `supabase db push`
2. **Create data population scripts**
3. **Populate species data** (catches, seasonal, preferences)
4. **Test with real scenarios**
5. **Update API endpoint**
6. **Deploy and monitor**

---

## Benefits of This Approach

✅ **Grounded in reality**: Catch data prevents fantasy predictions
✅ **Scientifically sound**: Environmental factors based on marine biology
✅ **Fair scoring**: Normalization prevents data availability bias
✅ **Species-aware**: Neutral scores for indifferent species
✅ **Transparent**: Each component explainable and debuggable
✅ **Tunable**: Can adjust weights without changing structure
✅ **Backward compatible**: Old function still works
✅ **Minimal migration**: Only 8 new columns, reuse existing data
