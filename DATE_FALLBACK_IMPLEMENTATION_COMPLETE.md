# Date Fallback Implementation Complete - November 12, 2025

**Status:** ✅ **TESTED** (commit `29950b47`)

## Problem Summary

CMEMS data ingestion was failing when data wasn't available for the requested date due to:
- Processing lag (1-2 days for model data)
- Satellite gaps (cloud coverage blocking transparency/kd490 measurements)
- Occasional dataset unavailability

This resulted in NULL values even when slightly older data was available and still valid for predictions.

## Solution: Intelligent Date Fallback

Implemented a smart date fallback strategy that tries progressively older dates when current data is unavailable, while respecting the temporal stability of different data types.

### Fallback Strategy

**Stable Data (up to 3 days back):**
- **Temperature** - Stable over days
- **Salinity** - Stable over days
- **BGC (biogeochemical)** - Chlorophyll, oxygen, nutrients stable over days
- **Transparency (kd490)** - Water clarity stable, but satellite gaps common

**Dynamic Data (max 1 day back):**
- **Ocean currents** - Change rapidly, only accept 1-day-old data
- **Waves** - Change rapidly, only accept 1-day-old data

### Implementation Details

**Date Sequence:**
```typescript
const stableDateFallbacks = [0, 1, 2, 3]; // days back for stable data
const dynamicDateFallbacks = [0, 1]; // days back for dynamic data
```

**Example Fallback Flow for Temperature:**
1. Try today's date (0 days back)
2. If no data, try yesterday (1 day back)
3. If no data, try 2 days back
4. If no data, try 3 days back
5. If still no data, give up and warn

**For each date attempt:**
- Try all spatial paddings (0.25°)
- Stop immediately when data is found
- Track which date was successful
- Use that date for dependent fetches (salinity uses same date as temperature)

### Logging Improvements

**Success with Fallback:**
```
✅ Temperature data found with 0.25° padding (~28km) (1d old)
✅ Salinity data found with 0.25° padding (2d old)
✅ BGC data found with 0.25° padding (~28km) (3d old)
```

**Current Data (no fallback needed):**
```
✅ Temperature data found with 0.25° padding (~28km)
✅ Currents data found with 0.25° padding
```

**All Attempts Failed:**
```
⚠️  No transparency data available (satellite gaps after 4 days)
⚠️  No BGC data available after trying 4 days × 1 paddings (last: ❌ Error)
```

## Testing Results

**Test Rectangle: 31E8 (English Channel)**

**Before Fallback:**
```
❌ Temperature: Failed (data from 1 day ago was available but not tried)
❌ Salinity: Failed
✅ BGC: Success (happened to be available)
❌ Transparency: Failed
```

**After Fallback:**
```
✅ Temperature: Success (1d old)
✅ Salinity: Success (1d old)
✅ BGC: Success
⚠️  Transparency: Still no data (satellite gaps across all 4 days)
```

**Test Rectangle: 30E8 (English Channel)**
```
✅ Temperature: Success (current day)
✅ Salinity: Success (current day)
✅ Currents: Success (current day)
✅ BGC: Success (current day)
✅ Waves: Success (current day)
⚠️  Transparency: No data (satellite gaps)
```

## Expected Behavior

### ✅ Improved Coverage

**Temperature/Salinity:**
- Will now find data even when current day is processing
- Accepts up to 3-day-old data (marine conditions stable)
- Most rectangles should have nearly 100% coverage

**BGC Data:**
- Same 3-day fallback as temperature
- Chlorophyll, oxygen, nutrients stable over days
- Dramatically improved availability

**Transparency (kd490):**
- Up to 3 days fallback
- Satellite data still subject to cloud gaps
- Expected to remain patchy, but better than before

**Currents:**
- Max 1 day fallback (dynamic data)
- Only accepts current or yesterday's data
- Some rectangles still won't have currents (dataset limitation)

**Waves:**
- Max 1 day fallback (dynamic data)
- Generally good availability across all regions

### ⚠️ Still Expected Gaps

**Transparency will continue to show gaps:**
- Satellite ocean color depends on clear skies
- No amount of date fallback can fix multi-day cloud coverage
- This is expected and acceptable

**Currents may be unavailable:**
- Some regional datasets don't include ocean current variables
- Not a date issue - dataset configuration issue
- May show `current: null m/s`

## Performance Impact

**Additional API Calls:**
- Best case: 0 extra calls (current date works)
- Average case: 1-2 extra calls (fall back 1-2 days)
- Worst case: 3-4 extra calls per data type

**Time Impact:**
- Minimal - failed attempts are fast (timeout after error)
- Success stops the loop immediately
- Overall ingestion time similar or slightly longer

**Data Freshness:**
- Most data will be current day (0 days old)
- Some data will be 1-2 days old (clearly marked in logs)
- 3-day-old data rare but acceptable for stable variables

## Files Changed

1. **`lib/copernicus/realClient.ts`** (commit `29950b47`)
   - Added `stableDateFallbacks` and `dynamicDateFallbacks` arrays
   - Refactored temperature fetch to loop through dates first, then padding
   - Updated salinity to use successful temperature date
   - Added date fallback to currents (max 1 day)
   - Added date fallback to transparency (up to 3 days)
   - Added date fallback to BGC (up to 3 days)
   - Added date fallback to waves (max 1 day)
   - Enhanced logging with age indicators: "(1d old)", "(2d old)", etc.

## Key Lessons

### 1. Different Data Types Have Different Temporal Stability

**Stable over days:**
- Temperature, salinity (ocean thermal mass changes slowly)
- BGC (biological processes are gradual)
- Transparency (water clarity stable over days)

**Dynamic (changes rapidly):**
- Ocean currents (tides, wind-driven)
- Waves (weather-dependent)

### 2. Acceptable Staleness Varies by Use Case

For fishing predictions:
- 2-3 day old temperature is fine (fish preferences broad)
- 1 day old currents acceptable (general patterns)
- Current day waves ideal (safety considerations)

### 3. Satellite Data Naturally Patchy

No amount of date fallback can fix cloud coverage gaps. The transparency implementation correctly tries multiple days but gracefully accepts failure.

### 4. Progressive Fallback is Efficient

Try most recent first, stop on first success. Don't waste time trying all dates if early date succeeds.

## Next Steps

1. ✅ **Monitor ingestion coverage** - Track how often fallback is used and how old data typically is
2. ⏳ **Consider caching strategy** - Should we cache 1-2 day old data differently?
3. ⏳ **User-facing transparency** - Should users see data age in predictions?
4. ⏳ **Metrics tracking** - Log which dates are actually used for analytics

## Related Documentation

- **`KD490_BGC_FIX_COMPLETE_20251112.md`** - Satellite transparency datasets (kd490)
- **`COPERNICUS_DATA_INGESTION_GUIDE.md`** - Overall CMEMS ingestion process
- **`PARTIAL_DATA_IMPLEMENTATION_COMPLETE.md`** - Accepting incomplete data (3/7 variables minimum)

## Summary

**Date fallback significantly improves data coverage with intelligent handling of temporal stability:**

- ✅ Temperature/salinity/BGC: Up to 3 days fallback
- ✅ Currents/waves: Max 1 day fallback
- ✅ Clear age indicators in logs
- ✅ Efficient (stops on first success)
- ✅ Respects data type temporal characteristics

The implementation balances data freshness with coverage, accepting slightly stale data when it's appropriate for the data type and use case.
