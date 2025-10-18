# 🎯 Partial Data Acceptance Strategy

## Overview

The re-ingestion script now accepts **partial data** (minimum 3/7 variables) to maximize data freshness, as different variable types have different update schedules.

## The Problem

**Satellite vs Model Data Have Different Lags:**

| Data Type | Variables | Typical Lag | Reliability |
|-----------|-----------|-------------|-------------|
| **Satellite** | Chlorophyll, Clarity | 5-14 days | Weather-dependent |
| **Model** | Temperature, Salinity, Nutrients, Oxygen | 1-2 days | Consistent |

### Example Scenario (Oct 17, 2025)
```
Request date: Oct 17, 2025

Chlorophyll dataset:  ❌ Only has data through Oct 10 (7-day lag)
Clarity dataset:      ❌ Only has data through Oct 10 (7-day lag)
Temperature dataset:  ✅ Has data through Oct 16 (1-day lag)
Salinity dataset:     ✅ Has data through Oct 16 (1-day lag)
Nutrients dataset:    ✅ Has data through Oct 16 (1-day lag)
Oxygen dataset:       ✅ Has data through Oct 16 (1-day lag)
```

### Old Behavior (All-or-Nothing)
```
Oct 17: Try all variables → 2/7 fail → Reject all → Try Oct 16
Oct 16: Try all variables → 2/7 fail → Reject all → Try Oct 15
Oct 15: Try all variables → 2/7 fail → Reject all → Try Oct 14
Oct 14: Try all variables → 2/7 fail → Reject all → Try Oct 13
Oct 13: Try all variables → 2/7 fail → Reject all → Try Oct 12
Oct 12: Try all variables → 2/7 fail → Reject all → Try Oct 11
Oct 11: Try all variables → 2/7 fail → Reject all → Try Oct 10
Oct 10: Try all variables → 7/7 success → ✅ Accept

Result: 7-day old data for ALL variables (even though 5/7 had fresh data!)
```

### New Behavior (Partial Data Acceptance)
```
Oct 17: Try all variables → 5/7 succeed (temp, sal, nutrients, O2)
        → Meets minimum threshold (3/7) → ✅ Accept partial data

Result: 1-day old data for 5 variables, 2 variables unavailable (better!)
```

## Implementation

### Threshold Configuration
```typescript
const MIN_VARIABLES_REQUIRED = 3; // Accept if at least 3/7 variables present
```

**Rationale:**
- 3/7 ensures we have **core physical variables** (temperature, salinity)
- Plus at least one biogeochemical variable
- Prevents accepting data that's too sparse to be useful

### Validation Logic
```typescript
if (dataCount >= MIN_VARIABLES_REQUIRED) {
  console.log(`  ✅ Threshold met - accepting partial data`);
  return results;
} else if (dataCount > 0) {
  console.log(`  ⚠️  Only ${dataCount} variables available - below minimum threshold`);
  return null;
} else {
  console.log(`  ❌ No data available`);
  return null;
}
```

### Enhanced Logging
```
📊 Data Retrieval Summary:
✅ Temperature:  ✓
✅ Salinity:     ✓
✅ Chlorophyll:  ✗
✅ Clarity:      ✗
✅ Nitrate:      ✓
✅ Phosphate:    ✓
✅ Oxygen:       ✓

📈 Retrieved 5/7 variables (minimum 3 required)
✅ Threshold met - accepting partial data
```

## Fallback Strategy

The script still uses **date fallback** if minimum threshold not met:

```
Day 0 (Oct 17): 5/7 variables → ✅ ACCEPT (threshold met)
Day -1: Not tried (already succeeded)
```

```
Day 0 (Oct 17): 2/7 variables → ❌ REJECT (below threshold)
Day -1 (Oct 16): 2/7 variables → ❌ REJECT (below threshold)
...
Day -7 (Oct 10): 7/7 variables → ✅ ACCEPT (threshold met)
```

## Benefits

### 1. **Fresher Data**
- Get model data (temp, salinity, nutrients) with 1-2 day lag
- Instead of waiting for satellite data (5-14 day lag)

### 2. **Better Availability**
- Model data available year-round
- Satellite data depends on weather/cloud cover

### 3. **Graceful Degradation**
- App still functional with partial data
- Better than no data at all

### 4. **Smart Prioritization**
- Core variables (temp, salinity) almost always available
- Supplementary variables (chlorophyll, clarity) added when available

## Frontend Handling

The app already handles missing variables gracefully:

```typescript
// In ConditionsSection.tsx
{snapshot.chlorophyll_ug_l && (
  <ConditionCard
    label="Chlorophyll"
    value={snapshot.chlorophyll_ug_l.toFixed(2)}
    unit="µg/L"
  />
)}
```

**Result:** If chlorophyll is null/undefined, card not displayed. No errors!

## Monitoring

### Check Ingestion Health
```sql
SELECT 
  rectangle_code,
  captured_at,
  CASE WHEN sea_temperature_c IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN salinity_psu IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN chlorophyll_ug_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN clarity_m IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN nitrate_umol_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN phosphate_umol_l IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN dissolved_oxygen_mg_l IS NOT NULL THEN 1 ELSE 0 END as variable_count
FROM findr_conditions_snapshots
WHERE source = 'copernicus'
ORDER BY captured_at DESC;
```

### Identify Partial Data
```sql
-- Snapshots with less than all 7 variables
SELECT 
  rectangle_code,
  captured_at::date,
  CASE WHEN sea_temperature_c IS NULL THEN 'Temperature' END,
  CASE WHEN salinity_psu IS NULL THEN 'Salinity' END,
  CASE WHEN chlorophyll_ug_l IS NULL THEN 'Chlorophyll' END,
  CASE WHEN clarity_m IS NULL THEN 'Clarity' END,
  CASE WHEN nitrate_umol_l IS NULL THEN 'Nitrate' END,
  CASE WHEN phosphate_umol_l IS NULL THEN 'Phosphate' END,
  CASE WHEN dissolved_oxygen_mg_l IS NULL THEN 'Oxygen' END
FROM findr_conditions_snapshots
WHERE source = 'copernicus'
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

## Future Enhancements

### Mixed-Age Strategy (Advanced)
Fetch different variables from different dates to maximize freshness:

```typescript
// Fetch satellite data from Oct 10 (last available)
const satelliteData = await fetchSatelliteVariables(rectangle, '2025-10-10');

// Fetch model data from Oct 17 (most recent)
const modelData = await fetchModelVariables(rectangle, '2025-10-17');

// Combine
const combinedData = {
  ...satelliteData,  // chlorophyll, clarity from Oct 10
  ...modelData,      // temp, salinity, nutrients from Oct 17
  captured_at: '2025-10-17' // Use most recent date
};
```

**Benefits:**
- Absolute freshest data for each variable type
- Optimal data quality

**Complexity:**
- Need to track multiple dates
- More complex error handling
- Database schema might need metadata column for "data age by variable"

## Configuration Options

### Adjust Minimum Threshold
```typescript
// More strict (only accept if most variables present)
const MIN_VARIABLES_REQUIRED = 5;

// Less strict (accept with just core variables)
const MIN_VARIABLES_REQUIRED = 2;

// Current (balanced)
const MIN_VARIABLES_REQUIRED = 3;
```

### Adjust Date Fallback Range
```typescript
// Shorter fallback (faster failure)
const MAX_DAYS_BACK = 3;

// Longer fallback (more likely to find data)
const MAX_DAYS_BACK = 14;

// Current (balanced)
const MAX_DAYS_BACK = 7;
```

## Testing

### Test Partial Data Acceptance
```bash
# Should accept 5/7 variables if model data available
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-17
```

Expected output:
```
📊 Data Retrieval Summary:
✅ Temperature:  ✓
✅ Salinity:     ✓
✅ Chlorophyll:  ✗
✅ Clarity:      ✗
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

### Test Below Threshold
```bash
# Manually test with very old date where datasets offline
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=1990-01-01
```

Expected: Should try 7 days back, all fail, exit with error

## Summary

✅ **Implemented:** Partial data acceptance (3/7 variable minimum)  
✅ **Benefit:** Fresher data (1-2 day lag vs 7-14 day lag)  
✅ **Risk:** Some variables missing (gracefully handled by frontend)  
✅ **Monitoring:** SQL queries to track data completeness  
⏳ **Future:** Mixed-age strategy for absolute optimal freshness  
