# Enhanced Confidence Scoring Algorithm

**Date:** 16 October 2025  
**Purpose:** Replace hardcoded 85% confidence with nuanced, data-driven scoring  
**Impact:** Accurate, species-specific, location-aware confidence levels

---

## Current Problem

All species show 85% confidence regardless of:
- Species-specific data quality
- Environmental data freshness
- Habitat suitability
- Temperature match
- Chemical tolerance match

**Example:** Atlantic Bonito in 28E5 (no bio data) shows 50%, but in 31F1 (with bio data) shows 85% - same for ALL species in that location.

---

## Proposed Solution: 5-Component Weighted Scoring

### Component 1: Bio-Band Match Score (0-30 points)
**Weight:** HIGHEST - Chemical environment directly affects species presence

**Data Sources:**
- `species_bio_bands` (210 records) - Species chemical tolerance
- `bio_bands_thresholds` (35 thresholds) - Classification lookup
- Copernicus chlorophyll, oxygen, nutrients, pH data

**Algorithm:**
```sql
FOR EACH bio_band (chlorophyll, oxygen, salinity, nutrients):
  1. Classify current value using bio_bands_thresholds
     Example: chlorophyll = 0.85 mg/m³ → "normal" band
  
  2. Check species_bio_bands for this species + parameter
     - IF current_band IN species.happy_bands: +8 points
     - IF current_band IN species.unhappy_bands: -5 points
     - IF no preference data: +3 points (neutral)
  
  3. Bonus for optimal ranges: +2 points if in middle of happy band
  
  4. Total: Sum across all parameters (max 30 points)
```

**Example Calculation:**
```
Species: Mackerel
Location: 31F1 with data (chl=0.85, o2=8.14, sal=35.3)

Chlorophyll 0.85 mg/m³ = "normal" band
  - Mackerel happy_bands includes "normal": +8 pts

Oxygen 8.14 mg/L = "optimal" band  
  - Mackerel happy_bands includes "optimal": +8 pts
  - In middle of optimal range: +2 pts bonus

Salinity 35.3 PSU = "oceanic" band
  - Mackerel happy_bands includes "oceanic": +8 pts

No nutrient preference data: +3 pts (neutral)

Total Bio-Band Score: 8 + 10 + 8 + 3 = 29/30 points ✅
```

---

### Component 2: Temperature Match Score (0-25 points)
**Weight:** HIGH - Temperature critically affects fish activity

**Data Sources:**
- Copernicus water_temp_c (from surface temperature)
- `bio_bands_thresholds` where parameter = 'surfaceTemperature' (35 thresholds)
- Species temperature ranges (if available in species_meta or similar)

**Algorithm:**
```sql
1. Get current water temperature from Copernicus
2. Classify temperature using bio_bands_thresholds
   Example: 16.8°C → "optimal" band (15-20°C)

3. Match against species temperature classification:
   - Species prefers "cold": only happy in cold/cool bands
   - Species prefers "warm": only happy in warm/hot bands
   - Species prefers "temperate": happy in cool/optimal/warm
   
4. Scoring:
   - Perfect match (optimal for species): 25 points
   - Good match (species tolerates): 18 points
   - Marginal (edge of tolerance): 10 points
   - Poor match (outside comfort): 3 points
   - No data available: 12 points (50% credit)
```

**Example:**
```
Species: Sea Bass (temperate species)
Temperature: 16.8°C → "optimal" band

Bio band classification: "optimal" (15-20°C)
Species prefers: temperate/optimal
Match: Perfect ✅

Temperature Score: 25/25 points
```

---

### Component 3: Substrate/Habitat Match Score (0-20 points)
**Weight:** MEDIUM-HIGH - Habitat suitability affects presence likelihood

**Data Sources:**
- `species_substrates` (79 records) - Species habitat preferences
- `ices_rectangles` substrate flags (has_sand, has_rock, has_mud, has_gravel, has_mixed)

**Algorithm:**
```sql
1. Get location substrates from ices_rectangles
   Example: 31F1 has_rock=true, has_sand=true, has_mixed=true

2. Get species substrate preferences from species_substrates
   Example: Sea Bass prefers rock, mixed

3. Calculate overlap:
   matches = COUNT(location_substrates ∩ species_preferences)
   total = COUNT(species_preferences)
   
4. Scoring:
   - 100% overlap (all preferred substrates present): 20 points
   - 75%+ overlap: 16 points
   - 50%+ overlap: 12 points
   - 25%+ overlap: 8 points
   - No overlap: 3 points
   - No species data: 10 points (50% credit)
```

**Example:**
```
Species: Sea Bass
Location: 31F1 (has rock, sand, mixed)
Species prefers: rock, mixed

Overlap: 2/2 = 100% ✅
Substrate Score: 20/20 points
```

---

### Component 4: Data Freshness Score (0-15 points)
**Weight:** MEDIUM - Recent data = more reliable predictions

**Data Source:**
- Copernicus `data_date` timestamp
- Current prediction date

**Algorithm:**
```sql
1. Calculate data age:
   age_days = prediction_date - data_date

2. Score based on freshness:
   - Same day (0 days): 15 points
   - 1 day old: 13 points
   - 2-3 days old: 11 points
   - 4-7 days old: 8 points
   - 8-14 days old: 5 points
   - 15-30 days old: 3 points
   - 30+ days old: 1 point
   - No data: 0 points
```

**Example:**
```
Prediction date: 2025-10-16
Data date: 2025-10-16
Age: 0 days

Freshness Score: 15/15 points ✅
```

---

### Component 5: Species Data Completeness Score (0-10 points)
**Weight:** MEDIUM-LOW - More complete species profile = better prediction

**Data Sources:**
- `species_bio_bands` count for this species
- `species_substrates` exists for this species
- Temperature thresholds defined for this species
- Scientific name, bio, taxonomy data populated

**Algorithm:**
```sql
1. Count available data points for species:
   - Has bio_bands data: +3 points
   - Has substrate preferences: +3 points  
   - Has temperature classification: +2 points
   - Has playful_bio populated: +1 point
   - Has scientific name: +1 point

2. Total: Sum data availability (max 10 points)
```

**Example:**
```
Species: Sea Bass
- Bio bands: 7 parameters ✅ +3 pts
- Substrate prefs: rock, mixed ✅ +3 pts
- Temp classification: temperate ✅ +2 pts
- Playful bio: "Just a local legend..." ✅ +1 pt
- Scientific name: Dicentrarchus labrax ✅ +1 pt

Completeness Score: 10/10 points ✅
```

---

## Total Confidence Score

```
CONFIDENCE = Bio-Band (30) 
           + Temperature (25)
           + Substrate (20)
           + Freshness (15)
           + Completeness (10)
           = 100 points max
```

---

## Expected Score Distribution

### High Confidence (85-100 points)
- All environmental data available AND recent
- Species preferences match current conditions
- Complete species profile
- **Example:** Sea Bass in 31F1 with fresh data, optimal temp, matching substrate

### Good Confidence (70-84 points)
- Most environmental data available
- Good but not perfect condition match
- OR perfect match but slightly older data (3-7 days)
- **Example:** Mackerel in 37I0 with 3-day-old data

### Moderate Confidence (55-69 points)
- Partial environmental data (missing 1-2 variables)
- OR complete data but marginal condition match
- OR old data (1-2 weeks)
- **Example:** Cod in Baltic with only satellite data (no in-situ)

### Low Confidence (40-54 points)
- Limited environmental data
- Poor condition match for species
- Very old data (2-4 weeks)
- **Example:** Tropical species in cold water

### Very Low Confidence (<40 points)
- No environmental data
- No species preference data
- Prediction based purely on historical patterns
- **Example:** New rectangle with no Copernicus coverage

---

## Implementation Phases

### Phase 1: Core Scoring (Components 1-3)
- Bio-band matching (30 pts)
- Temperature matching (25 pts)
- Substrate matching (20 pts)
- **Total possible:** 75 points

### Phase 2: Data Quality (Components 4-5)
- Freshness scoring (15 pts)
- Completeness scoring (10 pts)
- **Total possible:** 25 points

### Phase 3: Advanced Modifiers
- Seasonal adjustments (spawning periods, migration)
- Tidal/lunar influence
- Weather conditions (wind, pressure)
- Recent catch reports

---

## RPC Function Changes Required

**File:** Supabase RPC function `get_environmental_predictions_basic`

**Current logic:**
```sql
confidence = CASE 
  WHEN has_bio_data THEN 85
  ELSE 50
END;
```

**New logic:**
```sql
-- Calculate bio-band match score (0-30)
bio_score := calculate_bio_band_match(
  species_id, 
  current_chlorophyll, 
  current_oxygen,
  current_salinity,
  current_nutrients
);

-- Calculate temperature match score (0-25)
temp_score := calculate_temperature_match(
  species_id,
  current_temperature
);

-- Calculate substrate match score (0-20)
substrate_score := calculate_substrate_match(
  species_id,
  rectangle_code
);

-- Calculate freshness score (0-15)
freshness_score := calculate_data_freshness(
  data_date,
  prediction_date
);

-- Calculate completeness score (0-10)
completeness_score := calculate_species_completeness(
  species_id
);

-- Total confidence
confidence := bio_score + temp_score + substrate_score + 
              freshness_score + completeness_score;

-- Cap at 100
confidence := LEAST(confidence, 100);
```

---

## Testing Strategy

1. **Baseline Test:** Run current function, save all confidence scores
2. **Implement Phase 1:** Add bio-band + temp + substrate scoring
3. **Compare:** Verify scores now vary by species/location
4. **Validate:** Check high-confidence species match angler expectations
5. **Phase 2:** Add freshness + completeness
6. **Production:** Deploy with monitoring

---

## Success Metrics

✅ **Confidence scores vary by species** (not all 85%)  
✅ **Confidence scores vary by location** (not all same for one rectangle)  
✅ **High scores correlate with good conditions** (manual validation)  
✅ **Low scores flag poor conditions** (cold-water species in warm water)  
✅ **Scores improve with more data** (satellite + in-situ > satellite only)

---

## Next Steps

1. ✅ Audit data sources (COMPLETE)
2. ⏳ Extract current RPC function definition
3. ⏳ Implement Phase 1 scoring logic
4. ⏳ Test with real data (31F1, 37I0, 28E5)
5. ⏳ Deploy and monitor
