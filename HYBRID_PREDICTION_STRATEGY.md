# Hybrid Prediction Strategy: DATRAS + Environmental Fallback

**Date:** 11 October 2025  
**Goal:** Use real survey data where available, environmental modeling everywhere else

---

## 🎯 The Strategy

### Core Principle
```
IF rectangle has DATRAS data for this species AND region makes sense:
    → Use survey-based prediction (high confidence)
ELSE:
    → Use environmental matching (medium confidence)
```

### Why This Works
1. **DATRAS coverage is limited** (119/300 rectangles, 14/64 species)
2. **DATRAS has regional issues** (Atlantic fish in Baltic waters)
3. **Environmental data is universal** - we can model any species in any location
4. **Best of both worlds** - real data when available, intelligent fallback otherwise

---

## 📊 Current State Analysis

### DATRAS Coverage (species_monthly_abundance)
```
✅ Has data: 119 rectangles × 14 species = 1,666 combinations
❌ Missing: 181+ rectangles × 50 species = 9,000+ combinations
📈 Coverage: ~15% of needed predictions
```

### The 14 DATRAS Species (Atlantic-focused)
Based on typical DATRAS surveys:
- Anchovy (Engraulis encrasicolus)
- Bream (Abramis brama)
- Cod (Gadus morhua)
- Haddock (Melanogrammus aeglefinus)
- Hake (Merluccius merluccius)
- Herring (Clupea harengus)
- Mackerel (Scomber scombrus)
- Plaice (Pleuronectes platessa)
- Sardine (Sardina pilchardus)
- Sea bass (Dicentrarchus labrax)
- Sole (Solea solea)
- Sprat (Sprattus sprattus)
- Whiting (Merlangius merlangus)
- [One more - need to verify]

### Regional Validity Issues
```
🟢 Good: North Sea, Celtic Sea, Bay of Biscay (DATRAS native territory)
🟡 Questionable: Western Baltic (some Atlantic overlap)
🔴 Invalid: Eastern Baltic, Mediterranean, Arctic (wrong biogeographic zones)
```

---

## 🔧 Implementation Plan

### Phase 1: Add Environmental Data to Species Table

#### New Columns for `species` Table
```sql
ALTER TABLE species ADD COLUMN IF NOT EXISTS
  environmental_preferences JSONB DEFAULT '{}'::jsonb;

-- Structure:
{
  "temperature": {
    "optimal_min": 12,      // °C
    "optimal_max": 18,
    "tolerance_min": 8,
    "tolerance_max": 22
  },
  "salinity": {
    "optimal_min": 30,      // PSU (practical salinity units)
    "optimal_max": 35,
    "tolerance_min": 25,
    "tolerance_max": 38
  },
  "depth": {
    "optimal_min": 10,      // meters
    "optimal_max": 100,
    "tolerance_min": 5,
    "tolerance_max": 200
  },
  "habitat": {
    "preferred": ["sandy", "muddy"],  // reef, rock, sand, mud, mixed
    "spawning": ["coastal"],          // coastal, offshore, estuarine
    "feeding": ["bottom", "pelagic"]  // bottom, mid-water, surface, pelagic
  },
  "seasonal": {
    "spawning_months": [3, 4, 5],     // March-May
    "feeding_peak": [6, 7, 8, 9],     // June-September
    "migration_pattern": "north_summer_south_winter"
  }
}
```

#### Example: Cod Environmental Profile
```json
{
  "temperature": {"optimal_min": 4, "optimal_max": 10, "tolerance_min": 0, "tolerance_max": 15},
  "salinity": {"optimal_min": 32, "optimal_max": 35, "tolerance_min": 28, "tolerance_max": 38},
  "depth": {"optimal_min": 20, "optimal_max": 150, "tolerance_min": 10, "tolerance_max": 300},
  "habitat": {
    "preferred": ["rocky", "sandy"],
    "spawning": ["coastal", "offshore"],
    "feeding": ["bottom"]
  },
  "seasonal": {
    "spawning_months": [1, 2, 3],
    "feeding_peak": [5, 6, 7, 8],
    "migration_pattern": "offshore_winter_coastal_summer"
  }
}
```

---

### Phase 2: Add Environmental Data to Rectangles

We already have marine data integration! Check these existing sources:

#### Option A: Use Existing CMEMS Data
```sql
-- We already ingest this from fetch_cmems_daily.py!
SELECT 
  rectangle_code,
  AVG(temperature) as avg_temp,
  AVG(salinity) as avg_salinity,
  -- This data already exists in our marine data tables
FROM cmems_data 
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY rectangle_code;
```

#### Option B: Create Rectangle Environmental Profile
```sql
ALTER TABLE ices_rectangles ADD COLUMN IF NOT EXISTS
  environmental_profile JSONB DEFAULT '{}'::jsonb;

-- Structure:
{
  "temperature": {
    "winter_avg": 8,      // Dec-Feb average
    "spring_avg": 12,     // Mar-May
    "summer_avg": 18,     // Jun-Aug
    "autumn_avg": 14      // Sep-Nov
  },
  "salinity": {
    "average": 33,        // PSU
    "seasonal_variation": 2
  },
  "depth": {
    "min": 10,
    "max": 150,
    "average": 80
  },
  "seabed": {
    "type": "sandy",      // From EMODnet substrate data
    "folk_class": "muddy_sand"
  },
  "biogeographic_zone": "celtic_sea",  // atlantic_north, baltic, mediterranean
  "current_regime": "moderate",        // strong, moderate, weak
  "productivity": "high"               // high, medium, low (chlorophyll-a)
}
```

#### Use EMODnet Substrate Data (Already Available!)
```
substrate_legend.png
folk_5_legend.png
folk_7_legend.png
sample_substrate_tile.png
```
We already have seabed classification data integrated!

---

### Phase 3: Environmental Matching Algorithm

#### Scoring Function
```typescript
interface EnvironmentalMatch {
  species_id: string;
  rectangle_id: string;
  temperature_match: number;    // 0-1 score
  salinity_match: number;       // 0-1 score
  depth_match: number;          // 0-1 score
  habitat_match: number;        // 0-1 score
  seasonal_bonus: number;       // 0-0.2 bonus
  overall_score: number;        // 0-1 final score
  confidence: 'high' | 'medium' | 'low';
  data_source: 'environmental_model';
}

function calculateEnvironmentalMatch(
  speciesPrefs: EnvironmentalPreferences,
  rectangleConditions: EnvironmentalProfile,
  month: number
): EnvironmentalMatch {
  
  // Temperature match (Gaussian-like curve)
  const tempScore = calculateRangeMatch(
    rectangleConditions.temperature[getSeason(month)],
    speciesPrefs.temperature.optimal_min,
    speciesPrefs.temperature.optimal_max,
    speciesPrefs.temperature.tolerance_min,
    speciesPrefs.temperature.tolerance_max
  );
  
  // Salinity match
  const salinityScore = calculateRangeMatch(
    rectangleConditions.salinity.average,
    speciesPrefs.salinity.optimal_min,
    speciesPrefs.salinity.optimal_max,
    speciesPrefs.salinity.tolerance_min,
    speciesPrefs.salinity.tolerance_max
  );
  
  // Depth match
  const depthScore = calculateRangeMatch(
    rectangleConditions.depth.average,
    speciesPrefs.depth.optimal_min,
    speciesPrefs.depth.optimal_max,
    speciesPrefs.depth.tolerance_min,
    speciesPrefs.depth.tolerance_max
  );
  
  // Habitat match (categorical)
  const habitatScore = speciesPrefs.habitat.preferred.some(
    h => rectangleConditions.seabed.type.includes(h)
  ) ? 1.0 : 0.5;
  
  // Seasonal bonus (spawning/feeding seasons)
  const seasonalBonus = 
    speciesPrefs.seasonal.spawning_months.includes(month) ? 0.2 :
    speciesPrefs.seasonal.feeding_peak.includes(month) ? 0.1 : 0;
  
  // Weighted overall score
  const overallScore = (
    tempScore * 0.35 +      // Temperature is most important
    salinityScore * 0.25 +  // Salinity second
    depthScore * 0.20 +     // Depth third
    habitatScore * 0.20 +   // Habitat matters
    seasonalBonus           // Bonus points
  );
  
  return {
    temperature_match: tempScore,
    salinity_match: salinityScore,
    depth_match: depthScore,
    habitat_match: habitatScore,
    seasonal_bonus: seasonalBonus,
    overall_score: overallScore,
    confidence: overallScore > 0.7 ? 'high' : overallScore > 0.4 ? 'medium' : 'low',
    data_source: 'environmental_model'
  };
}

// Range matching helper (0 = worst, 1 = perfect)
function calculateRangeMatch(
  value: number,
  optimalMin: number,
  optimalMax: number,
  toleranceMin: number,
  toleranceMax: number
): number {
  // Perfect match: within optimal range
  if (value >= optimalMin && value <= optimalMax) {
    return 1.0;
  }
  
  // Partial match: within tolerance but outside optimal
  if (value >= toleranceMin && value < optimalMin) {
    // Linear interpolation from tolerance to optimal
    return 0.3 + (0.7 * (value - toleranceMin) / (optimalMin - toleranceMin));
  }
  
  if (value > optimalMax && value <= toleranceMax) {
    return 0.3 + (0.7 * (toleranceMax - value) / (toleranceMax - optimalMax));
  }
  
  // Outside tolerance: very poor match
  return 0.1;
}
```

---

### Phase 4: Regional Validation for DATRAS

#### Define Valid DATRAS Regions
```typescript
const DATRAS_VALID_REGIONS = {
  'north_sea': ['38*', '39*', '40*', '41*', '42*'],        // Rectangle prefixes
  'celtic_sea': ['32*', '33*', '34*', '35*'],
  'bay_of_biscay': ['26*', '27*', '28*'],
  'western_baltic': ['38F*', '39G*'],                       // Limited overlap
  'iberian_coast': ['20*', '21*', '22*', '23*']
};

const DATRAS_INVALID_REGIONS = {
  'eastern_baltic': ['28*', '29*', '30*'],                  // Too low salinity
  'mediterranean': ['51*', '52*', '53*'],                   // Different fauna
  'arctic': ['54*', '55*', '56*'],                          // Different species
  'irish_sea': ['37*']                                      // Mixed, needs case-by-case
};

function isDATRASValidForRectangle(rectangleCode: string): boolean {
  // Check if rectangle is in a valid DATRAS survey area
  const prefix = rectangleCode.substring(0, 2);
  
  for (const [region, patterns] of Object.entries(DATRAS_VALID_REGIONS)) {
    if (patterns.some(pattern => rectangleCode.startsWith(pattern.replace('*', '')))) {
      return true;
    }
  }
  
  return false;
}
```

---

### Phase 5: Hybrid RPC Function

#### Updated `get_fishing_predictions()` Logic
```sql
CREATE OR REPLACE FUNCTION get_fishing_predictions_hybrid(
  p_rectangle_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  species_id UUID,
  species_common_name TEXT,
  species_scientific_name TEXT,
  prediction_score NUMERIC,
  confidence TEXT,
  data_source TEXT,
  environmental_details JSONB
) AS $$
BEGIN
  -- Step 1: Check if rectangle has valid DATRAS data
  IF EXISTS (
    SELECT 1 FROM ices_rectangles r
    WHERE r.id = p_rectangle_id
    AND is_datras_valid_region(r.rectangle_code)
  ) THEN
    
    -- Try to get DATRAS-based predictions
    RETURN QUERY
    SELECT 
      s.id,
      s.common_name_en,
      s.scientific_name,
      sf.base_frequency,
      'high'::TEXT,
      'survey_data'::TEXT,
      NULL::JSONB
    FROM species_frequency sf
    JOIN species s ON s.id = sf.species_id
    WHERE sf.rectangle_id = p_rectangle_id
    AND sf.base_frequency > 0.1
    ORDER BY sf.base_frequency DESC
    LIMIT p_limit;
    
    -- If we got results, return them
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Step 2: Fall back to environmental matching
  RETURN QUERY
  WITH rectangle_env AS (
    SELECT 
      environmental_profile,
      lat_min, lat_max, lon_min, lon_max
    FROM ices_rectangles
    WHERE id = p_rectangle_id
  ),
  species_matches AS (
    SELECT 
      s.id,
      s.common_name_en,
      s.scientific_name,
      calculate_environmental_match(
        s.environmental_preferences,
        r.environmental_profile,
        EXTRACT(MONTH FROM p_target_date)
      ) as match_result
    FROM species s
    CROSS JOIN rectangle_env r
    WHERE s.environmental_preferences IS NOT NULL
  )
  SELECT 
    sm.id,
    sm.common_name_en,
    sm.scientific_name,
    (sm.match_result->>'overall_score')::NUMERIC,
    sm.match_result->>'confidence',
    'environmental_model'::TEXT,
    sm.match_result
  FROM species_matches sm
  WHERE (sm.match_result->>'overall_score')::NUMERIC > 0.3
  ORDER BY (sm.match_result->>'overall_score')::NUMERIC DESC
  LIMIT p_limit;
  
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 6: UI Updates

#### Prediction Card Badges
```tsx
interface PredictionCardProps {
  species: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  dataSource: 'survey_data' | 'environmental_model';
  environmentalDetails?: EnvironmentalMatch;
}

function PredictionCard({ species, score, confidence, dataSource, environmentalDetails }: PredictionCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{species}</h3>
        
        {/* Data Source Badge */}
        <div className={`badge ${dataSource === 'survey_data' ? 'badge-primary' : 'badge-secondary'}`}>
          {dataSource === 'survey_data' ? (
            <>📊 Survey Data</>
          ) : (
            <>🌊 Habitat Match</>
          )}
        </div>
        
        {/* Confidence Badge */}
        <div className={`badge badge-${confidence}`}>
          {confidence === 'high' && '🟢 High Confidence'}
          {confidence === 'medium' && '🟡 Medium Confidence'}
          {confidence === 'low' && '🔴 Low Confidence'}
        </div>
      </div>
      
      <div className="card-body">
        <div className="score">Match: {(score * 100).toFixed(0)}%</div>
        
        {/* Environmental breakdown for model-based predictions */}
        {dataSource === 'environmental_model' && environmentalDetails && (
          <div className="environmental-breakdown">
            <div className="breakdown-item">
              <span>🌡️ Temperature:</span>
              <ProgressBar value={environmentalDetails.temperature_match} />
            </div>
            <div className="breakdown-item">
              <span>💧 Salinity:</span>
              <ProgressBar value={environmentalDetails.salinity_match} />
            </div>
            <div className="breakdown-item">
              <span>📏 Depth:</span>
              <ProgressBar value={environmentalDetails.depth_match} />
            </div>
            <div className="breakdown-item">
              <span>🏝️ Habitat:</span>
              <ProgressBar value={environmentalDetails.habitat_match} />
            </div>
          </div>
        )}
        
        {/* Tooltip explaining data source */}
        <Tooltip>
          {dataSource === 'survey_data' ? (
            <>Based on actual fish catch surveys (DATRAS) in this area. High reliability.</>
          ) : (
            <>Based on species habitat preferences (temperature, salinity, depth, seabed). 
            Estimated likelihood - no survey data available for this location.</>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
```

---

## 📋 Data Collection Needed

### For Each of 64 Species, Research:

#### Temperature Preferences
- Optimal range (where species thrives)
- Tolerance range (where species survives)
- Sources: FishBase, SeaLifeBase, ICES stock assessments

#### Salinity Tolerance
- Optimal PSU range
- Tolerance limits (many species can't handle Baltic low salinity)
- Euryhaline vs stenohaline classification

#### Depth Range
- Typical fishing depths
- Spawning depths
- Seasonal vertical migration patterns

#### Habitat Preferences
- Seabed type: rocky, sandy, muddy, mixed
- Coastal vs offshore
- Structure (reefs, wrecks, kelp forests)

#### Seasonal Patterns
- Spawning months (when fish aggregate)
- Feeding peaks (when fish are most active)
- Migration patterns (summer/winter movements)

### Example Data Sources
1. **FishBase** (fishbase.org) - comprehensive species database
2. **SeaLifeBase** - marine invertebrates
3. **ICES Stock Assessments** - commercial species
4. **FAO Fisheries** - global species distribution
5. **Local fishing guides** - practical knowledge per region

---

## 🎯 Expected Outcomes

### Coverage Improvements
```
Before: 119 rectangles × 14 species = 1,666 predictions (15% coverage)
After:  300 rectangles × 64 species = 19,200 predictions (100% coverage!)
```

### Accuracy Improvements
```
DATRAS regions (North Sea, Celtic, Biscay):
  ✅ Use survey data → High confidence, regional accuracy ~90%

Non-DATRAS regions (Baltic, Mediterranean, Arctic):
  🌊 Use environmental model → Medium confidence, regional accuracy ~70%
  (Much better than current 25% with wrong species!)
```

### User Experience
- **Clear badges** showing data source
- **Confidence indicators** for each prediction
- **Environmental breakdown** explaining why fish are predicted
- **No more confusion** about Spanish fish in Polish waters!

---

## 🚀 Implementation Timeline

### Week 1: Data Collection
- [ ] Research environmental preferences for 64 species
- [ ] Create data entry template
- [ ] Validate with fishing experts/scientists

### Week 2: Database Schema
- [ ] Add `environmental_preferences` to species table
- [ ] Add `environmental_profile` to rectangles (or link CMEMS data)
- [ ] Create regional validation lookup table

### Week 3: Algorithm Development
- [ ] Implement environmental matching function
- [ ] Create regional validation logic
- [ ] Write unit tests for scoring

### Week 4: RPC Integration
- [ ] Update `get_fishing_predictions()` with hybrid logic
- [ ] Test DATRAS regions (should use survey data)
- [ ] Test non-DATRAS regions (should use environmental)

### Week 5: UI Updates
- [ ] Add data source badges
- [ ] Create environmental breakdown component
- [ ] Update tooltips and help text
- [ ] User testing

### Week 6: Validation & Launch
- [ ] Test all biogeographic zones
- [ ] Compare predictions with local fishing reports
- [ ] Soft launch with feedback collection
- [ ] Full deployment

---

## 📝 Success Criteria

✅ **Functional Requirements:**
- [ ] 100% coverage (all rectangles return predictions)
- [ ] Regional accuracy >70% (species match biogeographic zones)
- [ ] Clear data source labeling (survey vs model)
- [ ] Confidence scoring system working

✅ **User Experience:**
- [ ] No more "Unknown species" errors
- [ ] Predictions make sense for selected location
- [ ] Users understand data source and confidence
- [ ] Mobile-friendly environmental breakdown

✅ **Technical Quality:**
- [ ] Fast response times (<500ms for predictions)
- [ ] Proper caching of environmental data
- [ ] Graceful degradation if data missing
- [ ] Comprehensive logging for debugging

---

## 🤔 Open Questions

1. **How to populate environmental_profile for 300+ rectangles?**
   - Option A: Use existing CMEMS data (already ingesting)
   - Option B: Manual entry from EMODnet/GEBCO
   - Option C: Calculate from lat/lon boundaries

2. **How to validate environmental preferences for 64 species?**
   - Peer review with marine biologists?
   - Cross-reference multiple sources?
   - Start with commercial species (20), expand gradually?

3. **Should we show both predictions when DATRAS + environmental agree?**
   - "Survey says 0.8, habitat model says 0.75 → very high confidence!"
   - Could strengthen predictions in DATRAS areas

4. **How to handle seasonal CMEMS data updates?**
   - Cache environmental profiles per season?
   - Re-calculate monthly?
   - Use rolling 30-day averages?

---

## 💡 Future Enhancements

1. **Machine Learning Layer**
   - Train on DATRAS data where available
   - Predict environmental parameters from lat/lon
   - Improve scoring weights over time

2. **User Feedback Loop**
   - "Did you catch this species here?" thumbs up/down
   - Crowdsource validation data
   - Adjust regional accuracy over time

3. **Real-time Environmental Data**
   - Pull today's SST from CMEMS
   - Adjust predictions for current conditions
   - "Fish are moving deeper due to warm water"

4. **Species Interaction Modeling**
   - Predator-prey relationships
   - Competition for habitat
   - Schooling species (where one is, others likely are)

---

**Next Step:** Start with audit to identify which DATRAS rectangles are regionally accurate, then begin environmental preferences research for the 64 species.

Want to start with Phase 1 (adding environmental preferences schema) or do you want to audit DATRAS accuracy first?
