# 🎯 Enhanced Re-Ingestion Quick Reference

## What Changed?

**Before:** Required all 7 variables or rejected data  
**Now:** Accepts partial data if ≥3 variables present

## Why?

Satellite data (chlorophyll, clarity) has 5-14 day lag  
Model data (temperature, salinity, nutrients) has 1-2 day lag  

**Old way:** Wait for slowest variable → 7-day old data for everything  
**New way:** Accept what's available → 1-2 day old data for most variables

## Usage

### Basic (default to 28E5)
```bash
npx tsx scripts/targeted-reingest.ts
```

### Specific rectangle
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=29E5
```

### Specific date
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-17
```

### With detailed logging
```bash
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

## Output Interpretation

### Success with Full Data
```
📈 Retrieved 7/7 variables (minimum 3 required)
✅ Threshold met - accepting partial data

✅ Successfully ingested 28E5
   Date: 2025-10-17
   Days back: 0
   Variables stored: 7/7
```
**Meaning:** All variables available! 🎉

### Success with Partial Data
```
📊 Data Retrieval Summary:
✅ Temperature:  ✓
✅ Salinity:     ✓
✅ Chlorophyll:  ✗  ← Missing
✅ Clarity:      ✗  ← Missing
✅ Nitrate:      ✓
✅ Phosphate:    ✓
✅ Oxygen:       ✓

📈 Retrieved 5/7 variables (minimum 3 required)
✅ Threshold met - accepting partial data

✅ Successfully ingested 28E5
   Date: 2025-10-17
   Days back: 0
   Variables stored: 5/7

   ℹ️  Note: Partial data accepted (5/7 variables)
      This is normal for:
      • Satellite data lag (chlorophyll, clarity: 5-14 day delay)
      • Model data more current (temperature, salinity: 1-2 day delay)
```
**Meaning:** Got fresh model data, satellite data delayed. This is NORMAL and EXPECTED! ✅

### Success After Fallback
```
Try Oct 17 → 2/7 variables (below threshold)
⏭️  No data available, trying previous day...

Try Oct 16 → 2/7 variables (below threshold)
⏭️  No data available, trying previous day...

Try Oct 15 → 7/7 variables
✅ Threshold met - accepting partial data

✅ Successfully ingested 28E5
   Date: 2025-10-15
   Days back: 2
   Variables stored: 7/7
```
**Meaning:** Recent dates only had satellite data, went back to find complete data set.

### Failure
```
❌ Failed to ingest 28E5 after 7 days of attempts
```
**Meaning:** No data available for last 7 days. Check:
1. Authentication: `copernicusmarine login`
2. Dataset status with diagnostic: `npx tsx scripts/diagnose-ingestion-failure.ts --rectangle=28E5`

## Configuration Constants

Located in `scripts/targeted-reingest.ts`:

```typescript
const MIN_VARIABLES_REQUIRED = 3;  // Minimum to accept (3-7)
const MAX_DAYS_BACK = 7;           // Date fallback range (1-30)
const MAX_RETRIES = 3;             // Retries per variable (1-5)
const RETRY_DELAY_MS = 2000;       // Delay between retries (ms)
```

### Tuning Recommendations

**More aggressive (accept less complete data):**
```typescript
const MIN_VARIABLES_REQUIRED = 2;  // Just temp + salinity
const MAX_DAYS_BACK = 3;           // Fail faster
```

**More conservative (require complete data):**
```typescript
const MIN_VARIABLES_REQUIRED = 7;  // All variables required
const MAX_DAYS_BACK = 14;          // Try further back
```

**Current (balanced):**
```typescript
const MIN_VARIABLES_REQUIRED = 3;  // Core + one biogeochem
const MAX_DAYS_BACK = 7;           // One week back
```

## Monitoring Data Completeness

### Check variable counts
```sql
SELECT 
  rectangle_code,
  captured_at::date,
  CASE WHEN sea_temperature_c IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN salinity_psu IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN chlorophyll_ug_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN clarity_m IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN nitrate_umol_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN phosphate_umol_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN dissolved_oxygen_mg_l IS NOT NULL THEN 1 ELSE 0 END as var_count
FROM findr_conditions_snapshots
WHERE source = 'copernicus'
  AND captured_at::date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY var_count ASC, captured_at DESC;
```

### Find missing variables
```sql
SELECT 
  rectangle_code,
  captured_at::date,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN sea_temperature_c IS NULL THEN 'Temperature' END,
    CASE WHEN salinity_psu IS NULL THEN 'Salinity' END,
    CASE WHEN chlorophyll_ug_l IS NULL THEN 'Chlorophyll' END,
    CASE WHEN clarity_m IS NULL THEN 'Clarity' END,
    CASE WHEN nitrate_umol_l IS NULL THEN 'Nitrate' END,
    CASE WHEN phosphate_umol_l IS NULL THEN 'Phosphate' END,
    CASE WHEN dissolved_oxygen_mg_l IS NULL THEN 'Oxygen' END
  ], NULL) as missing_variables
FROM findr_conditions_snapshots
WHERE source = 'copernicus'
  AND captured_at::date >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    sea_temperature_c IS NULL OR
    salinity_psu IS NULL OR
    chlorophyll_ug_l IS NULL OR
    clarity_m IS NULL OR
    nitrate_umol_l IS NULL OR
    phosphate_umol_l IS NULL OR
    dissolved_oxygen_mg_l IS NULL
  )
ORDER BY captured_at DESC;
```

## Common Patterns

### Pattern 1: Chlorophyll + Clarity Missing
```
✅ Temperature:  ✓
✅ Salinity:     ✓
❌ Chlorophyll:  ✗
❌ Clarity:      ✗
✅ Nitrate:      ✓
✅ Phosphate:    ✓
✅ Oxygen:       ✓
```
**Cause:** Satellite data lag (5-14 days)  
**Action:** None needed, this is normal

### Pattern 2: Only Temperature + Salinity
```
✅ Temperature:  ✓
✅ Salinity:     ✓
❌ Chlorophyll:  ✗
❌ Clarity:      ✗
❌ Nitrate:      ✗
❌ Phosphate:    ✗
❌ Oxygen:       ✗
```
**Cause:** Biogeochemical datasets offline or lagging  
**Action:** Check with diagnostic tool, may need to increase MAX_DAYS_BACK

### Pattern 3: Everything Missing
```
❌ Temperature:  ✗
❌ Salinity:     ✗
❌ Chlorophyll:  ✗
❌ Clarity:      ✗
❌ Nitrate:      ✗
❌ Phosphate:    ✗
❌ Oxygen:       ✗
```
**Cause:** Authentication failure, dataset offline, or invalid coordinates  
**Action:** Run diagnostic: `npx tsx scripts/diagnose-ingestion-failure.ts --rectangle=CODE`

## Troubleshooting

### "No data available" immediately
1. Check authentication: `copernicusmarine describe --include-datasets`
2. If fails, authenticate: `copernicusmarine login`
3. Re-run ingestion

### "Only X variables available - below minimum threshold"
1. Increase MAX_DAYS_BACK: `const MAX_DAYS_BACK = 14;`
2. Or lower MIN_VARIABLES_REQUIRED: `const MIN_VARIABLES_REQUIRED = 2;`
3. Or accept that data genuinely unavailable

### "Some of your subset selection exceed the dataset coordinates"
1. This is normal! Means dataset hasn't updated yet
2. Script will automatically try previous days
3. Wait for diagnostic message showing which day succeeded

### Debug mode shows errors but script succeeds
This is normal with partial data strategy:
- Errors for chlorophyll/clarity = satellite lag (expected)
- Success with 5/7 variables = model data available (good!)

## Best Practices

1. **Run daily** to keep data fresh
2. **Use DEBUG_INGESTION=true** first time per rectangle to verify
3. **Monitor with SQL** to track data completeness patterns
4. **Accept 5-7 variables as excellent**, 3-4 as good, <3 as needs investigation
5. **Don't panic** if satellite variables missing - this is weather/cloud dependent

## Links to Documentation

- **Full Strategy:** `PARTIAL_DATA_ACCEPTANCE_STRATEGY.md`
- **Usage Guide:** `TARGETED_REINGEST_GUIDE.md`
- **Diagnostic Tool:** `COPERNICUS_FAILURE_DIAGNOSIS_GUIDE.md`
- **Root Cause Example:** `28E5_ROOT_CAUSE_ANALYSIS.md`
- **Dataset Freshness:** `DATASET_FRESHNESS_ANALYSIS.md`
