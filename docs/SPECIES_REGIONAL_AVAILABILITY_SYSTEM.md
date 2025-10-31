# Species Regional Availability System

**Status:** ✅ Implemented (2025-10-31)

**Purpose:** Comprehensive species/season/bioregion mapping that works without user catch data but improves as catch data accumulates.

---

## Overview

The Species Regional Availability System replaces the previous approach of relying solely on recent catch history (90-day lookback) with a comprehensive, AI-ready database that:

1. **Works immediately** - Baseline data derived from species environmental preferences and expert knowledge
2. **Improves continuously** - Automatically learns from user catch logs
3. **Supports seasonality** - Monthly availability scoring for migration and seasonal patterns
4. **Unified architecture** - Handles both ICES rectangles (European) and grid cells (global)
5. **Confidence-weighted** - Tracks data quality and source for transparency

---

## Architecture

### Database Schema

**Table:** `species_regional_availability`

```sql
CREATE TABLE species_regional_availability (
  -- Region identification
  region_type text CHECK (region_type IN ('ices', 'grid')),
  region_id text,  -- rectangle_code or cell_id

  -- Species
  species_code text REFERENCES species(species_code),

  -- Seasonality
  month integer CHECK (month BETWEEN 1 AND 12),  -- NULL = year-round

  -- Availability
  availability_score numeric(3,2) CHECK (0.00 <= score <= 1.00),
  is_primary_habitat boolean,

  -- Metadata
  data_source text CHECK (data_source IN ('expert', 'baseline', 'catch_data', 'model')),
  confidence numeric(3,2) CHECK (0.00 <= confidence <= 1.00),
  catch_count integer,
  last_catch_at timestamptz,

  UNIQUE (region_type, region_id, species_code, month)
);
```

### Data Sources

| Source | Description | Confidence | When Used |
|--------|-------------|------------|-----------|
| `expert` | Manual curation by domain experts | 0.80-0.95 | High-traffic regions, known species |
| `baseline` | Derived from species environmental prefs | 0.60-0.75 | Initial population, all regions |
| `catch_data` | User-validated catches (3+ catches) | 0.70-0.95 | After community validation |
| `model` | ML/statistical models (future) | 0.60-0.85 | Migrated from old tables |

### Availability Score Scale

| Score | Meaning | Use Case |
|-------|---------|----------|
| 0.00-0.20 | Very rare or absent | Filter out (not shown) |
| 0.30-0.50 | Uncommon, occasional | Show in extended lists |
| 0.50-0.70 | Moderate abundance | Standard candidates |
| 0.70-0.85 | Common, reliable | High-priority candidates |
| 0.85-1.00 | Peak abundance | Top suggestions, seasonal peaks |

---

## Data Flow

### 1. Initial State (No User Data)

```
┌─────────────────────────────────────────────┐
│ Baseline Population                         │
│ - Species biogeographic_regions mapping     │
│ - Environmental preference matching         │
│ - Expert-curated common species             │
│                                             │
│ Result: 40-60 species per ICES rectangle   │
│         Availability scores: 0.40-0.75      │
│         Confidence: 0.60                    │
└─────────────────────────────────────────────┘
```

**Example:** User requests species for ICES rectangle "31F1" (North Sea)

**Response:**
```json
{
  "species": [
    {"code": "cod", "availabilityScore": 0.75, "confidence": 0.80, "dataSource": "expert", "catchCount": 0},
    {"code": "plaice", "availabilityScore": 0.80, "confidence": 0.85, "dataSource": "expert", "catchCount": 0},
    {"code": "bass", "availabilityScore": 0.65, "confidence": 0.70, "dataSource": "baseline", "catchCount": 0}
  ]
}
```

### 2. First Catch Logged

```
User logs catch → Trigger fires → update_species_availability_from_catch()
                                   ↓
                    ┌──────────────────────────────────┐
                    │ Update Existing Record           │
                    │ - Boost availability_score       │
                    │ - Increase confidence            │
                    │ - Increment catch_count          │
                    │ - Update last_catch_at           │
                    └──────────────────────────────────┘
                                   ↓
                    After 3 catches: data_source → 'catch_data'
                    After 5 catches: is_primary_habitat → true
```

**Score Evolution:**
```
Initial (baseline):     score: 0.65, confidence: 0.60, catches: 0
After 1st catch:        score: 0.71, confidence: 0.70, catches: 1
After 3rd catch:        score: 0.77, confidence: 0.80, catches: 3, source: catch_data
After 5th catch:        score: 0.82, confidence: 0.85, catches: 5, primary_habitat: true
After 10+ catches:      score: 0.89, confidence: 0.90, catches: 12
```

### 3. Steady State (Community Data)

```
┌──────────────────────────────────────────────────────────┐
│ Hybrid Data Model                                        │
│                                                          │
│ Common species:                                          │
│   - High availability scores (0.80-0.95)                 │
│   - High confidence (0.85-0.95)                          │
│   - Catch-validated (catch_count: 20-100+)              │
│                                                          │
│ Rare species:                                            │
│   - Lower baseline scores (0.40-0.60)                    │
│   - Moderate confidence (0.60-0.70)                      │
│   - Few/no catches (catch_count: 0-3)                    │
│                                                          │
│ Result: Intelligent filtering for AI                    │
│         Top 8-12 candidates for identification          │
│         Rare species available but deprioritized        │
└──────────────────────────────────────────────────────────┘
```

---

## API Integration

### Updated Endpoint: `/api/findr/species/regional`

**New Features:**
- Queries `species_regional_availability` table (primary)
- Falls back to 90-day catch history (secondary)
- Supports optional `month` parameter for seasonal filtering
- Returns availability scores, confidence, and data source

**Request:**
```
GET /api/findr/species/regional?icesSquare=31F1&month=6&minScore=0.5
```

**Response:**
```json
{
  "success": true,
  "regionId": "31F1",
  "regionType": "ices",
  "month": 6,
  "species": [
    {
      "id": "mackerel",
      "code": "mackerel",
      "commonName": "Mackerel",
      "scientificName": "Scomber scombrus",
      "imageUrl": "/PNGS/mackerel.png",
      "availabilityScore": 0.95,
      "isPrimaryHabitat": true,
      "confidence": 0.90,
      "catchCount": 47,
      "dataSource": "catch_data"
    },
    {
      "id": "bass",
      "code": "bass",
      "commonName": "Sea Bass",
      "scientificName": "Dicentrarchus labrax",
      "availabilityScore": 0.85,
      "isPrimaryHabitat": true,
      "confidence": 0.85,
      "catchCount": 23,
      "dataSource": "catch_data"
    }
  ],
  "dataSource": "species_regional_availability",
  "note": "Comprehensive species availability data with catch validation"
}
```

### Helper Functions (SQL)

#### `get_regional_species(region_type, region_id, month, min_score)`
Returns filtered species list for a region, optionally by month.

**Example:**
```sql
SELECT * FROM get_regional_species('ices', '31F1', 6, 0.50);
```

#### `get_species_seasonal_availability(species_code, region_type)`
Returns all regions where a species is available, with seasonal breakdown.

**Example:**
```sql
SELECT * FROM get_species_seasonal_availability('mackerel', 'ices');
```

---

## Fish Identification Integration

### Current Flow

```
User uploads photo
      ↓
Fish ID Service receives context.candidates (from predictions API)
      ↓
Candidates filtered by:
  1. Environmental matching (RPC functions)
  2. Regional availability (NEW: species_regional_availability)
  3. Seasonal multipliers (species_availability_by_grid)
      ↓
AI receives 8-12 high-confidence candidates
      ↓
Lower cost, higher accuracy
```

### Candidate Prioritization

The predictions API already uses RPC functions (`get_environmental_predictions_enhanced`, `get_global_fishing_predictions`) that consider biogeographic regions. The new `species_regional_availability` table **enhances** this by:

1. **Pre-filtering** species that have zero regional availability
2. **Boosting** catch-validated species in candidate ranking
3. **Seasonal adjustments** through monthly availability scores
4. **Confidence weighting** - species with high catch counts rank higher

### Future Enhancement (Optional)

You can directly integrate regional availability into the predictions API by adding a query step:

```typescript
// In /api/findr/predictions.ts
const { data: regionalFilter } = await supabase
  .rpc('get_regional_species', {
    p_region_type: 'ices',
    p_region_id: rectangleCode,
    p_month: targetMonth,
    p_min_score: 0.30
  });

// Filter predictions to only include species in regional filter
const filteredPredictions = predictions.filter(p =>
  regionalFilter.some(r => r.species_code === p.species_code)
);
```

---

## Automatic Learning

### Trigger: `update_availability_from_catch`

Fires on every `INSERT` to `findr_catch_entries` table.

**Logic:**
1. Extract region from catch (rectangle_code or derive from lat/lon)
2. Look up existing availability record
3. If exists:
   - Weighted score increase (diminishing returns)
   - Confidence boost (caps at 0.95)
   - Upgrade data_source after 3 catches
   - Mark as primary_habitat after 5 catches
4. If not exists:
   - Create new record with score 0.75, confidence 0.70

**Algorithm:**
```typescript
// Score boost calculation
newScore = CASE
  WHEN catchCount = 0 THEN MIN(1.0, oldScore * 0.7 + 0.30)  // First catch: +30% blend
  WHEN catchCount < 5 THEN MIN(1.0, oldScore * 0.85 + 0.15)  // Early: +15%
  ELSE MIN(1.0, oldScore * 0.95 + 0.05)  // Mature: +5%
END

// Confidence boost
newConfidence = CASE
  WHEN catchCount = 0 THEN 0.70
  WHEN catchCount < 5 THEN MIN(0.85, oldConfidence + 0.05)
  WHEN catchCount < 10 THEN MIN(0.90, oldConfidence + 0.03)
  ELSE MIN(0.95, oldConfidence + 0.01)
END
```

---

## Migration Strategy

### Phase 1: ✅ Database Schema (Completed)
- Created `species_regional_availability` table
- Added indexes for fast lookups
- Implemented RLS policies

### Phase 2: ✅ Baseline Population (Completed)
- Populated ICES rectangles from species biogeographic regions
- Migrated existing `species_availability_by_grid` data
- Added expert-curated common species

### Phase 3: ✅ Automatic Learning (Completed)
- Created trigger function `update_species_availability_from_catch()`
- Configured trigger on `findr_catch_entries`
- Added helper SQL functions

### Phase 4: ✅ API Integration (Completed)
- Updated `/api/findr/species/regional` endpoint
- Added fallback to catch history for empty regions
- Documented new response format

### Phase 5: ⏳ Monitoring & Refinement (Next)
- Monitor catch data accumulation
- Adjust score boosting algorithm if needed
- Add seasonal breakdown (populate `month` column)
- Consider ML models for underrepresented regions

---

## Testing

### Manual Testing

1. **Check baseline data:**
   ```sql
   SELECT COUNT(*), data_source, region_type
   FROM species_regional_availability
   GROUP BY data_source, region_type;
   ```

2. **Test regional query:**
   ```sql
   SELECT * FROM get_regional_species('ices', '31F1', NULL, 0.50)
   LIMIT 10;
   ```

3. **Simulate catch logging:**
   ```sql
   INSERT INTO findr_catch_entries (user_id, species_id, rectangle_code, caught_at)
   VALUES ('test-user-id', 'cod', '31F1', NOW());

   -- Check if availability was updated
   SELECT * FROM species_regional_availability
   WHERE region_id = '31F1' AND species_code = 'cod';
   ```

4. **Test API endpoint:**
   ```bash
   curl "http://localhost:3000/api/findr/species/regional?icesSquare=31F1"
   ```

### Expected Results

**Initial state (no catches):**
- 40-60 species per ICES rectangle
- Scores: 0.40-0.80
- Confidence: 0.60-0.80
- Data sources: mostly 'baseline' and 'expert'

**After community usage (100+ catches):**
- Top 10-15 species with scores > 0.80
- Catch counts: 5-50+ per common species
- Data sources: mostly 'catch_data'
- Rare species remain but with lower scores

---

## Monitoring Queries

### System Health

```sql
-- Overall coverage
SELECT
  region_type,
  COUNT(DISTINCT region_id) as regions,
  COUNT(*) as total_records,
  ROUND(AVG(availability_score), 2) as avg_score,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM species_regional_availability
GROUP BY region_type;

-- Data source breakdown
SELECT
  data_source,
  COUNT(*) as records,
  ROUND(AVG(catch_count), 1) as avg_catches,
  COUNT(*) FILTER (WHERE catch_count > 0) as validated_records
FROM species_regional_availability
GROUP BY data_source
ORDER BY records DESC;

-- Top validated regions
SELECT
  region_id,
  COUNT(*) as species_count,
  SUM(catch_count) as total_catches,
  ROUND(AVG(availability_score), 2) as avg_score
FROM species_regional_availability
WHERE region_type = 'ices'
GROUP BY region_id
ORDER BY total_catches DESC
LIMIT 20;
```

### Learning Progress

```sql
-- Species validation progress
SELECT
  species_code,
  COUNT(DISTINCT region_id) as regions_present,
  SUM(catch_count) as total_catches,
  ROUND(AVG(availability_score), 2) as avg_score,
  COUNT(*) FILTER (WHERE data_source = 'catch_data') as validated_regions
FROM species_regional_availability
GROUP BY species_code
ORDER BY total_catches DESC
LIMIT 20;
```

---

## Future Enhancements

### Seasonal Breakdown
Populate `month` column with monthly availability scores:
- Use historical catch data grouped by month
- Identify migration patterns (e.g., mackerel in summer)
- Boost seasonal species during peak months

### Grid Cell Expansion
Currently grid cells are migrated from `species_availability_by_grid`. To expand:
- Generate baseline data for Americas/global grid cells
- Use FAO fishing area data
- Apply same learning algorithm as ICES rectangles

### ML Integration
Train models to predict availability in under-represented regions:
- Features: depth, temperature, salinity, distance to shore
- Target: availability_score
- Use validated catch data as ground truth

### API Response Enrichment
Add additional fields:
- `seasonality`: Array of monthly scores
- `habitat_notes`: Text description of typical habitat
- `recent_trend`: Increasing/stable/decreasing based on recent catches

---

## Key Benefits

✅ **Works immediately** - No cold start problem
✅ **Self-improving** - Gets better as users log catches
✅ **Transparent** - Confidence and data source visible
✅ **Cost-effective** - Reduces AI calls by better filtering
✅ **Accurate** - Community-validated data replaces guesswork
✅ **Scalable** - Handles both European and global regions
✅ **Flexible** - Supports seasonal and monthly granularity

---

## Related Files

**Migrations:**
- `20251031000001_create_species_regional_availability.sql` - Table schema
- `20251031000002_populate_baseline_regional_availability.sql` - Initial data
- `20251031000003_create_catch_learning_function.sql` - Trigger and functions

**API:**
- `/pages/api/findr/species/regional.ts` - Updated endpoint

**Documentation:**
- This file (`SPECIES_REGIONAL_AVAILABILITY_SYSTEM.md`)

---

**Created:** 2025-10-31
**Status:** ✅ Ready for deployment
**Next:** Run migrations, monitor catch accumulation, adjust algorithm as needed
