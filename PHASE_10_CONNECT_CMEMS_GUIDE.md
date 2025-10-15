# Phase 10: Connect Real CMEMS Data to Predictions
## Making Predictions Location-Specific and Live

**Status:** Ready for Deployment  
**Estimated Time:** 30 minutes  
**Breaking Changes:** None (backwards compatible, adds data_freshness field)  
**Expected Improvement:** Predictions become location-specific and real-time!

---

## 🎯 What's Changing?

### Before (Phase 9.5):
```sql
-- Hardcoded test values for ALL rectangles
v_avg_temp := 16.5;          -- Same everywhere!
v_avg_salinity := 34.2;      -- Same everywhere!
v_substrate_type := 'rock';  -- Same everywhere!
v_avg_depth := 15;           -- Same everywhere!
```

**Problem:**  
- Cornwall gets same predictions as Scotland ❌
- Summer predictions same as winter ❌
- Can't see effect of guild weighting on real data ❌

### After (Phase 10):
```sql
-- REAL data from findr_conditions_snapshots
SELECT temperature_c, salinity, substrate_type, fishing_depth_m
FROM rectangle_environmental_conditions
WHERE rectangle_code = p_rectangle_code;
```

**Benefits:**  
- Cornwall: 16.5°C, Scotland: 10°C ✅
- Seasonal temperature variation ✅
- Guild weighting works with real conditions ✅
- Data freshness indicators (fresh/recent/older/stale) ✅

---

## 📊 Expected Results

### Cornwall Summer (31F1):
```json
{
  "temperature": 16.5,
  "salinity": 35.1,
  "substrate": "mixed",
  "data_freshness": "fresh",
  "top_species": ["Bass", "Wrasse", "Pollock"]  // Warm water reef fish
}
```

### Scotland (42F2):
```json
{
  "temperature": 10.2,
  "salinity": 34.8,
  "substrate": "rock",
  "data_freshness": "fresh",
  "top_species": ["Cod", "Haddock", "Pollock"]  // Cold water species
}
```

### Channel Islands (37F4):
```json
{
  "temperature": 17.8,
  "salinity": 35.3,
  "substrate": "rock",
  "data_freshness": "fresh",
  "top_species": ["Bass", "Bream", "Mullet"]  // Warmer still
}
```

---

## 🚀 Deployment Steps

### Step 1: Check Current Data (5 mins)

Before deploying, verify you have environmental data:

```sql
-- Check findr_conditions_snapshots has data
SELECT 
  rectangle_code,
  sea_temp_c,
  salinity_psu,
  captured_at,
  source,
  COUNT(*) OVER () as total_rectangles
FROM findr_conditions_snapshots
WHERE captured_at > NOW() - INTERVAL '7 days'
ORDER BY captured_at DESC
LIMIT 10;
```

**Expected:** Should see rows with temperature/salinity data  
**If empty:** Run `npx tsx scripts/ingestFindrConditions.ts` to populate data first

---

### Step 2: Deploy SQL (10 mins)

1. Open `DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql` in Supabase SQL Editor
2. Click "Run" to execute all queries
3. Queries will execute in order:
   - ✅ Create `rectangle_environmental_conditions` view
   - ✅ Create `get_rectangle_substrate()` helper function  
   - ✅ Replace `get_environmental_predictions_basic()` function with real data version

---

### Step 3: Run Validation Tests (10 mins)

Copy each test query into Supabase and run:

#### Test 1: View Environmental Conditions
```sql
SELECT 
  rectangle_code,
  temperature_c,
  salinity,
  substrate_type,
  fishing_depth_m,
  ROUND(data_age_hours, 1) as age_hours,
  data_source
FROM rectangle_environmental_conditions
WHERE rectangle_code = '31F1';
```

**Expected Output:**
```json
{
  "rectangle_code": "31F1",
  "temperature_c": 16.5,      // REAL data from findr_conditions_snapshots
  "salinity": 35.1,
  "substrate_type": "mixed",
  "fishing_depth_m": 15,
  "age_hours": 6.2,
  "data_source": "met"
}
```

#### Test 2: Run Predictions with Real Data
```sql
SELECT 
  species_code,
  species_name,
  environmental_score,
  weight_profile,
  temperature_match,
  substrate_match,
  data_freshness,
  (factors->>'data_age_hours')::numeric as age_hours,
  factors->'temperature'->>'actual' as actual_temp,
  factors->'substrate'->>'actual' as actual_substrate
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
LIMIT 10;
```

**Expected Output:**
```json
[
  {
    "species_code": "bss",
    "species_name": "Sea Bass",
    "environmental_score": 9.6,
    "weight_profile": "surf_estuary",
    "temperature_match": "optimal",
    "substrate_match": "suitable",
    "data_freshness": "fresh",       // NEW!
    "age_hours": 6.2,                // NEW!
    "actual_temp": "16.5",           // REAL data!
    "actual_substrate": "mixed"
  }
]
```

#### Test 3: Location Comparison
```sql
-- Compare Cornwall vs Scotland vs Channel Islands
SELECT 
  '31F1 (Cornwall)' as location,
  (factors->'temperature'->>'actual')::numeric as temp,
  environmental_score,
  data_freshness
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'bss'

UNION ALL

SELECT 
  '37F4 (Channel Is)' as location,
  (factors->'temperature'->>'actual')::numeric as temp,
  environmental_score,
  data_freshness
FROM get_environmental_predictions_basic('37F4', CURRENT_DATE)
WHERE species_code = 'bss'

UNION ALL

SELECT 
  '42F2 (Scotland)' as location,
  (factors->'temperature'->>'actual')::numeric as temp,
  environmental_score,
  data_freshness
FROM get_environmental_predictions_basic('42F2', CURRENT_DATE)
WHERE species_code = 'bss';
```

**Expected Output:**
```json
[
  {
    "location": "31F1 (Cornwall)",
    "temp": 16.5,
    "environmental_score": 9.6,
    "data_freshness": "fresh"
  },
  {
    "location": "37F4 (Channel Is)",
    "temp": 17.8,              // Warmer!
    "environmental_score": 9.8,
    "data_freshness": "fresh"
  },
  {
    "location": "42F2 (Scotland)",
    "temp": 10.2,              // Colder!
    "environmental_score": 7.8,
    "data_freshness": "fresh"
  }
]
```

**Key Validation:**
- ✅ Temperatures should be DIFFERENT for different locations
- ✅ Bass score should be HIGHER in warmer water (Channel Islands > Cornwall > Scotland)
- ✅ Data freshness should be "fresh" (< 24 hours)

---

### Step 4: Test Guild Weighting with Real Data (5 mins)

Now test that guild-specific weighting works with real environmental conditions:

```sql
-- Test Mackerel (pelagic) - should be less sensitive to substrate
SELECT 
  species_code,
  species_name,
  weight_profile,
  environmental_score,
  (factors->'temperature'->>'score')::numeric as temp_contribution,
  (factors->'substrate'->>'score')::numeric as substrate_contribution,
  (factors->'temperature'->>'actual') as actual_temp
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'mac';

-- Expected: substrate_contribution ~0.045 (15% weight, pelagic guild)
```

```sql
-- Test Wrasse (reef_kelp) - should be MORE sensitive to substrate
SELECT 
  species_code,
  species_name,
  weight_profile,
  environmental_score,
  (factors->'temperature'->>'score')::numeric as temp_contribution,
  (factors->'substrate'->>'score')::numeric as substrate_contribution,
  (factors->'substrate'->>'actual') as actual_substrate
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'wrb';

-- Expected: substrate_contribution ~0.30 (35% weight, reef_kelp guild)
```

---

## 🔍 Monitoring & Data Quality

### Check Data Freshness
```sql
-- How many rectangles have fresh data?
SELECT 
  CASE 
    WHEN data_age_hours < 24 THEN 'Fresh (< 24h)'
    WHEN data_age_hours < 72 THEN 'Recent (< 3 days)'
    WHEN data_age_hours < 168 THEN 'Older (< 1 week)'
    ELSE 'Stale (> 1 week)'
  END as freshness,
  COUNT(*) as rectangle_count,
  AVG(temperature_c) as avg_temp,
  AVG(salinity) as avg_salinity
FROM rectangle_environmental_conditions
GROUP BY 
  CASE 
    WHEN data_age_hours < 24 THEN 'Fresh (< 24h)'
    WHEN data_age_hours < 72 THEN 'Recent (< 3 days)'
    WHEN data_age_hours < 168 THEN 'Older (< 1 week)'
    ELSE 'Stale (> 1 week)'
  END
ORDER BY freshness;
```

### Check Missing Data
```sql
-- Which rectangles have no environmental data?
SELECT 
  r.code as rectangle_code,
  r.biogeo_zone,
  r.centroid_lat,
  r.centroid_lon
FROM ices_rectangles r
LEFT JOIN rectangle_environmental_conditions rec ON r.code = rec.rectangle_code
WHERE rec.temperature_c IS NULL
LIMIT 20;
```

---

## 📱 Frontend Integration (Next Step)

After deploying this, update your frontend to show real-time data:

```typescript
// Before
<p>Temperature: 16.5°C (test value)</p>

// After
<p>Temperature: {prediction.factors.temperature.actual}°C</p>
<span className={`badge badge-${
  prediction.data_freshness === 'fresh' ? 'success' : 
  prediction.data_freshness === 'recent' ? 'warning' : 
  'error'
}`}>
  {prediction.data_freshness}
</span>
```

Add data freshness indicators:
- 🟢 **Fresh** (< 24 hours) - Green badge
- 🟡 **Recent** (< 3 days) - Yellow badge  
- 🟠 **Older** (< 1 week) - Orange badge
- 🔴 **Stale** (> 1 week) - Red badge, show warning

---

## 🐛 Troubleshooting

### Issue: All predictions show "stale" data
**Cause:** `findr_conditions_snapshots` not being updated  
**Fix:** Run ingestion script:
```bash
cd /Users/damianrafferty/Projects/WotNow
npx tsx scripts/ingestFindrConditions.ts
```

### Issue: All temperatures are 16.5°C (fallback value)
**Cause:** No data in `findr_conditions_snapshots` for target rectangles  
**Fix:** Check which rectangles have data:
```sql
SELECT DISTINCT rectangle_code 
FROM findr_conditions_snapshots 
ORDER BY rectangle_code;
```

### Issue: Substrate always shows "mixed"
**Cause:** Substrate data not yet integrated  
**Next:** Need to connect EMODnet substrate data to rectangles  
**Workaround:** Function will use "mixed" as default, predictions still work

---

## 🎉 Success Criteria

✅ **Step 1 Passed:** `rectangle_environmental_conditions` view returns data  
✅ **Step 2 Passed:** Predictions function runs without errors  
✅ **Step 3 Passed:** Different rectangles show different temperatures  
✅ **Step 4 Passed:** Guild weighting applied correctly to real data  
✅ **Step 5 Passed:** Data freshness indicator shows in results  

Once all 5 pass, Phase 10 is LIVE! 🚀

---

## 📈 What's Next?

After Phase 10, consider:

1. **Phase 10.1:** Connect EMODnet substrate data (rock/sand/mud classification)
2. **Phase 10.2:** Add seasonal temperature trends (3-month average vs current)
3. **Phase 10.3:** Bio-bands modifiers (oxygen/chlorophyll 10-15% adjustments)
4. **Phase 10.4:** Tidal effects for surf/estuary species
5. **Phase 11:** User-facing data quality indicators in UI

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Rollback to Phase 9.5 (sample data)
DROP FUNCTION IF EXISTS get_environmental_predictions_basic(TEXT, DATE);

-- Re-run DEPLOY_PHASE9.5_STEP2_GUILD_PREDICTIONS.sql
-- This will restore the sample data version
```

No data loss, easy rollback! ✅

---

## 📚 Related Documentation

- `DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql` - SQL deployment file
- `scripts/ingestFindrConditions.ts` - Data ingestion script
- `PHASE_9.5_WEIGHT_PROFILES.md` - Guild weighting reference
- `CONDITIONS_FEATURE_STATUS.md` - Data source audit

---

**Ready to deploy?** Open `DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql` in Supabase SQL Editor and click Run! 🎣
