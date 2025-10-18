# Dataset Freshness Analysis - 28E5 Investigation

## Date: October 18, 2025

## Question: Was Other Data Up-to-Date?

### Key Finding from Diagnostic

From the error message when trying to fetch chlorophyll for Oct 17:
```
ERROR - Some of your subset selection [2025-10-17 00:00:00] for the time 
dimension exceed the dataset coordinates [1997-09-04, 2025-10-10]
```

**Chlorophyll satellite dataset ends on: October 10, 2025 (7 days ago)**

### Typical Data Freshness Patterns

Based on Copernicus Marine Service typical update schedules:

| Variable | Type | Expected Lag | Likely Status (Oct 18) |
|----------|------|--------------|----------------------|
| **Chlorophyll** | Satellite | 5-14 days | ❌ **Oct 10** (confirmed) |
| **Water Clarity** | Satellite | 5-14 days | ❌ **~Oct 10** (similar to chlorophyll) |
| **Temperature** | Model | 1-2 days | ✅ **~Oct 16-17** (likely current) |
| **Salinity** | Model | 1-2 days | ✅ **~Oct 16-17** (likely current) |
| **Nitrate** | Model | 1-2 days | ✅ **~Oct 16-17** (likely current) |
| **Phosphate** | Model | 1-2 days | ✅ **~Oct 16-17** (likely current) |
| **Dissolved O₂** | Model | 1-2 days | ✅ **~Oct 16-17** (likely current) |

### Why This Difference?

**Satellite Data (Optical):**
- Requires clear skies (no clouds)
- Weather-dependent collection
- Complex post-processing for atmospheric correction
- Quality control takes time
- Can have gaps of weeks during cloudy periods

**Model Data (Physics/BGC):**
- Runs continuously regardless of weather
- Automated processing pipeline
- More predictable update schedule
- Usually 24-48 hour lag

### Implications for Ingestion

## Problem with Current "All-or-Nothing" Approach

Our current script tries to fetch ALL variables for the SAME date:

```typescript
// Current approach
const targetDate = new Date();
targetDate.setDate(targetDate.getDate() - 1); // Oct 17

// Try to fetch ALL variables for Oct 17
const chlorophyll = await fetchChlorophyll(rectangle, targetDate); // ❌ FAILS (data ends Oct 10)
const temperature = await fetchTemperature(rectangle, targetDate); // ✅ Would work!
const salinity = await fetchSalinity(rectangle, targetDate);       // ✅ Would work!
```

**Result:** Because chlorophyll fails, the date fallback kicks in and tries Oct 16, Oct 15, etc. Eventually succeeds with Oct 10 data, but now ALL variables are 7 days old - even though model data WAS available for Oct 16-17!

## Solution: Mixed-Age Ingestion Strategy

### Strategy A: Accept Partial Data (Quick Fix)

Modify the script to store data even if some variables are missing:

```typescript
// If we got SOME data (even if not all), consider it a success
const hasData = 
  chlorophyll !== null ||  // Might be null
  temperature !== null ||   // Likely has value
  salinity !== null;        // Likely has value

if (hasData) {
  storeData({
    chlorophyll_mg_m3: chlorophyll,        // null for Oct 17
    water_temp_c: temperature,              // 12.5°C for Oct 17
    salinity_psu: salinity,                 // 35.2 for Oct 17
    // ... etc
  });
  return true; // SUCCESS even with partial data
}
```

**Pros:**
- Simple change
- Gets most recent data for each variable
- Better than using all 7-day-old data

**Cons:**
- Missing chlorophyll data until satellite updates
- Frontend needs to handle null values gracefully

### Strategy B: Multi-Date Fetch (Optimal)

Fetch different variable types from different dates:

```typescript
// Satellite variables: use most recent available (may be old)
const satelliteDate = new Date('2025-10-10'); // Last known good
const chlorophyll = await fetchChlorophyll(rectangle, satelliteDate);
const clarity = await fetchClarity(rectangle, satelliteDate);

// Model variables: use recent date
const modelDate = new Date('2025-10-17'); // Yesterday
const temperature = await fetchTemperature(rectangle, modelDate);
const salinity = await fetchSalinity(rectangle, modelDate);
const nutrients = await fetchNutrients(rectangle, modelDate);

// Store with mixed dates
storeData({
  chlorophyll_mg_m3: chlorophyll,        // From Oct 10
  water_clarity_kd490: clarity,          // From Oct 10
  water_temp_c: temperature,             // From Oct 17 ✨
  salinity_psu: salinity,                // From Oct 17 ✨
  nitrate_umol_l: nutrients.no3,         // From Oct 17 ✨
  phosphate_umol_l: nutrients.po4,       // From Oct 17 ✨
  dissolved_oxygen_mg_l: oxygen,         // From Oct 17 ✨
  captured_at: modelDate,                // Use most recent date
  metadata: {
    satellite_data_date: satelliteDate,
    model_data_date: modelDate
  }
});
```

**Pros:**
- Always gets freshest data available per variable type
- Most accurate predictions (uses recent conditions)
- Transparent about data age

**Cons:**
- More complex logic
- Need to track multiple dates
- Frontend should show data age warnings

### Strategy C: Smart Date Detection (Future)

Query dataset metadata first to find last available date:

```typescript
async function getLastAvailableDate(datasetId: string): Promise<Date> {
  // Query Copernicus API for temporal coverage
  // Return end_datetime
}

// Use optimal date per dataset
const chlDate = await getLastAvailableDate('cmems_obs-oc_atl_bgc-plankton...');
const tempDate = await getLastAvailableDate('cmems_mod_ibi_phy_anfc...');
```

**Pros:**
- Always uses most recent available
- No hardcoded assumptions
- Self-adjusting

**Cons:**
- Requires additional API calls
- More complex
- Slower

## Recommended Implementation

### Phase 1: Quick Win (Today)
Modify targeted-reingest to accept partial data:

```typescript
// In fetchDataForDate function
const dataCount = Object.keys(results).filter(k => 
  k !== 'rectangle_code' && 
  k !== 'captured_at' && 
  k !== 'source' && 
  results[k] !== undefined
).length;

// Change threshold from "must have all 7" to "at least 3"
const MIN_VARIABLES_REQUIRED = 3;

if (dataCount >= MIN_VARIABLES_REQUIRED) {
  console.log(`\n✅ Retrieved ${dataCount}/7 variables (minimum ${MIN_VARIABLES_REQUIRED} met)`);
  return results;
}
```

### Phase 2: Mixed-Age Strategy (This Week)
Create parallel fetch for satellite vs model:

```typescript
async function fetchWithMixedDates(rectangle: Rectangle) {
  // Try recent date first for all
  let recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1);
  
  const results = await fetchDataForDate(rectangle, recentDate);
  
  // If satellite data missing, try older dates just for satellite
  if (!results.chlorophyll_mg_m3 || !results.water_clarity_kd490) {
    console.log('  Satellite data missing, trying older dates...');
    
    for (let daysBack = 2; daysBack <= 14; daysBack++) {
      const olderDate = new Date();
      olderDate.setDate(olderDate.getDate() - daysBack);
      
      const satelliteData = await fetchSatelliteVariablesOnly(rectangle, olderDate);
      
      if (satelliteData.chlorophyll || satelliteData.clarity) {
        results.chlorophyll_mg_m3 = satelliteData.chlorophyll;
        results.water_clarity_kd490 = satelliteData.clarity;
        console.log(`  ✅ Got satellite data from ${olderDate.toISOString().split('T')[0]}`);
        break;
      }
    }
  }
  
  return results;
}
```

## Testing the Theory

To verify model data IS actually more current:

```bash
# Try fetching temperature for Oct 17 (should work)
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts \
  --rectangle=28E5 \
  --date=2025-10-17 \
  --variables=temperature,salinity,nitrate

# Try fetching chlorophyll for Oct 17 (should fail)
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts \
  --rectangle=28E5 \
  --date=2025-10-17 \
  --variables=chlorophyll

# Try fetching chlorophyll for Oct 10 (should work)
npx tsx scripts/targeted-reingest.ts \
  --rectangle=28E5 \
  --date=2025-10-10 \
  --variables=chlorophyll
```

## Conclusion

**Yes, other data (model-based) was likely up-to-date!**

The problem is our script gives up on the entire ingestion when ANY variable fails, rather than storing what IS available.

**Immediate action:**
Lower the threshold to accept partial data (3/7 variables minimum).

**Long-term:**
Implement mixed-age strategy to always get freshest available data per variable type.

---

**Key Insight:** Don't let perfect (all 7 variables) be the enemy of good (5/7 variables with recent dates)!
