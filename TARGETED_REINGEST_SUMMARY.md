# Targeted Re-ingestion Script - Created October 18, 2025

## Quick Summary

Created a robust script to re-ingest Copernicus biogeochemical data for specific rectangles (particularly 28E5) with comprehensive retry logic and fallback strategies.

## Files Created

1. **`scripts/targeted-reingest.ts`** - Main implementation
   - Retry logic (3 attempts per variable)
   - Date fallback (up to 7 days back)
   - Multi-product fallback (regional → global)
   - Works for any rectangle

2. **`scripts/reingest-28e5.ts`** - Convenience wrapper
   - Defaults to rectangle 28E5
   - Forwards all args to targeted-reingest.ts

3. **`TARGETED_REINGEST_GUIDE.md`** - Comprehensive documentation
   - Usage examples
   - How it works
   - Troubleshooting
   - Configuration options

## Usage

### Re-ingest 28E5
```bash
npx tsx scripts/reingest-28e5.ts
```

### Re-ingest any rectangle
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=29E5
```

### With custom date
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-16
```

## Key Features

✅ **Retry Logic**: 3 attempts per variable with exponential backoff  
✅ **Date Fallback**: Tries up to 7 days back if current data unavailable  
✅ **Regional Routing**: Uses `regionRouterV2.ts` for optimal dataset selection  
✅ **Comprehensive Logging**: Track every attempt and result  
✅ **Flexible**: Works for any rectangle, not hardcoded to 28E5  
✅ **Robust Error Handling**: Graceful failures with clear error messages  

## What It Fetches

- Chlorophyll (mg/m³) - baitfish activity indicator
- Water clarity/KD490 (m⁻¹) - lure visibility
- Temperature (°C) - habitat suitability
- Salinity (PSU) - species distribution
- Nitrate (µmol/L) - productivity
- Phosphate (µmol/L) - productivity
- Dissolved oxygen (mg/L) - habitat quality

## Retry Strategy

```
For each variable:
  For each dataset (regional, fallback, global):
    For each attempt (1-3):
      Try fetch with increasing delay
      If success → return value
      If fail → wait (2s, 4s, 8s) and retry
    If all attempts fail → try next dataset
  If all datasets fail → variable = null
```

## Date Fallback Strategy

```
Target date (usually yesterday)
  ↓ No data
Try yesterday (D-1)
  ↓ No data
Try 2 days ago (D-2)
  ↓ No data
Try 3 days ago (D-3)
  ... continue up to 7 days
  ↓ Still no data
Fail with error
```

## Prerequisites

- Copernicus CLI installed and authenticated
- Supabase credentials in `.env.local`
- `ncdump` tool (NetCDF utilities)

## Testing

Before using in production:

```bash
# Test with a known-good rectangle
npx tsx scripts/targeted-reingest.ts --rectangle=21D8

# Test date fallback
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-01

# Test error handling (invalid rectangle)
npx tsx scripts/targeted-reingest.ts --rectangle=99Z9
```

## Integration Points

- Uses `lib/copernicus/regionRouterV2.ts` for dataset routing
- Stores in `findr_conditions_snapshots` table
- Follows same patterns as `ingestCopernicusBiogeochemical.ts`
- Compatible with existing ingestion pipeline

## Why This Was Needed

Rectangle 28E5 was missing from daily ingestion on October 18, 2025:
- Caused "fish are quiet" message for users
- No quick way to re-ingest a single rectangle
- Needed robust retry logic for unreliable data sources

This script solves all three problems and provides a reusable tool for future issues.

## Next Steps

1. ✅ Scripts created and documented
2. ⏳ Test with real 28E5 data
3. ⏳ Verify data appears in `findr_conditions_latest`
4. ⏳ Confirm app shows predictions for 28E5
5. ⏳ Consider adding to daily ingestion validation

## Future Enhancements

- Parallel variable fetching for speed
- Batch mode for multiple rectangles
- Email notifications on failure
- Dry-run mode for testing
- Integration with monitoring/alerting

---

**Status**: ✅ Ready for testing  
**Created**: October 18, 2025  
**Purpose**: Targeted re-ingestion with retry logic and date fallback  
**Primary Use Case**: Re-ingest 28E5 and handle similar issues in future
