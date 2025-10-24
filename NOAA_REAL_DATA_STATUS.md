# NOAA Real Data Integration - Status Report

**Date:** October 24, 2025
**Status:** ✅ **GITHUB ACTIONS WORKFLOW READY** - Automated ingestion configured

---

## Summary

Successfully integrated real NOAA OISST data using the existing Supabase Edge Function. The integration works perfectly with small batches but hits timeout limits with larger batches.

---

## What Works ✅

### 1. Supabase Edge Function Integration

**Function:** `supabase/functions/ingest-conditions/index.ts`

**Proven to work:**
- ✅ Fetches real NOAA OISST temperature data
- ✅ Successfully populated 10 California coastal grids
- ✅ Handles time windows and fallback offsets correctly
- ✅ Upinserts to `grid_conditions_latest` table
- ✅ Returns diagnostics (attempts, successes, errors)

**Test Results:**
```
Region: California (10 cells)
Upserted: 10
Successes: 10/10 (100%)
Attempts: 70 (with time offset fallbacks)
Time: ~30 seconds
```

### 2. Calling the Edge Function

**Script:** `scripts/call-ingest-function.ts`

**Usage:**
```bash
# California (10 grids) - WORKS
npx tsx scripts/call-ingest-function.ts --california --limit=10

# Florida (10 grids)
npx tsx scripts/call-ingest-function.ts --florida --limit=10

# New York (10 grids)
npx tsx scripts/call-ingest-function.ts --newyork --limit=10

# All American waters (10 grids at a time)
npx tsx scripts/call-ingest-function.ts --americas --limit=10
```

---

## Known Limitations ⚠️

### Edge Function Timeouts

**Problem:**
- 10 cells: ✅ Works (~30s)
- 50 cells: ❌ Timeout (504 Gateway Timeout)
- 100 cells: ❌ Timeout (504 Gateway Timeout)

**Root Cause:**
- NOAA ERDDAP API is slow (~3-7 seconds per grid cell)
- Edge Functions have timeout limits (60 seconds on Supabase)
- Each cell tries multiple time offsets (up to 8 offsets = 8 API calls per cell)

**Impact:**
- Can only populate 10-15 grids per function call
- Need multiple sequential batches to populate all American waters
- Not suitable for real-time bulk ingestion

---

## Current Data Coverage

**Total Grid Cells:** 65,884 worldwide

**Cells with Data:** ~739 (1.1%)
- European grids: 222 cells (real CMEMS data)
- American grids: 502 cells (mock data) + 10 cells (real NOAA data)
- Test grids: 5 cells (old NOAA OISST samples)

**Quality by Region:**
| Region | Grids | Data Source | Quality | Production Ready |
|--------|-------|-------------|---------|------------------|
| **European Waters** | 222 | CMEMS (real) | High | ✅ Yes |
| **California (sample)** | 10 | NOAA OISST (real) | High | ✅ Yes |
| **American Waters (bulk)** | 492 | MOCK | Low | ❌ No |
| **Global Ocean** | 65,151 | None | N/A | ❌ No |

---

## Recommended Approach

### Option A: GitHub Actions Cron Job (Recommended)

**Strategy:** Run Edge Function on schedule with small batches

**Implementation:**
1. Create GitHub Action workflow
2. Run every 6 hours or daily
3. Call Edge Function with `--limit=10` for different regions
4. Rotate through regions: California → Florida → NY → Gulf → Pacific NW → Hawaii
5. Over time, build up comprehensive coverage

**Pros:**
- Works within Edge Function timeout limits
- Automated and hands-off
- Data stays fresh (daily updates)
- No infrastructure changes needed

**Cons:**
- Slow initial population (10 grids per run × multiple runs needed)
- Need to orchestrate region rotation

**Example Workflow:**
```yaml
name: Ingest NOAA Data
on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - name: Ingest California
        run: npx tsx scripts/call-ingest-function.ts --california --limit=10
      - name: Ingest Florida
        run: npx tsx scripts/call-ingest-function.ts --florida --limit=10
      - name: Ingest New York
        run: npx tsx scripts/call-ingest-function.ts --newyork --limit=10
```

### Option B: Direct NOAA Bulk Downloads

**Strategy:** Download NOAA NetCDF files directly, process offline

**Implementation:**
1. Download NOAA OISST 0.25° global NetCDF files
2. Process with Python/Node NetCDF libraries
3. Bulk insert to `grid_conditions_latest`

**Pros:**
- Much faster (process thousands of grids)
- No API rate limits or timeouts
- One-time bulk population

**Cons:**
- Requires NetCDF file processing libraries
- More complex setup
- Manual download/update process

**NOAA OISST Downloads:**
- https://www.ncei.noaa.gov/products/optimum-interpolation-sst
- Global 0.25° resolution (perfect match for our grid!)
- Daily updates available

### Option C: Increase Edge Function Timeout

**Strategy:** Deploy with longer timeout limits

**Requirements:**
- Upgrade Supabase plan (if needed)
- Configure longer timeouts in Edge Function settings
- May still hit hard limits

**Not recommended** - Better to use small batches or bulk downloads

---

## Production Deployment Plan

### Phase 1: Proven Components (Complete ✅)
1. ✅ Global grid system working
2. ✅ Biogeographic region mapping
3. ✅ Environmental matching with grid data
4. ✅ European grids populated (CMEMS)
5. ✅ American predictions working (mock data for testing)
6. ✅ NOAA integration proven (small batches)

### Phase 2: Data Population (In Progress)
1. ✅ Set up GitHub Actions cron job for NOAA ingestion - **COMPLETE**
   - Workflow file: `.github/workflows/ingest-noaa-data.yml`
   - Schedule: Every 6 hours (00:15, 06:15, 12:15, 18:15 UTC)
   - Ingests: California (10), Florida (10), New York (10) per run
   - Rate: 120 grids/day
   - See: `NOAA_GITHUB_ACTIONS_GUIDE.md` for setup instructions
2. ⏳ Enable workflow and monitor initial runs
3. ⏳ Populate American coastal grids (automated, 1-2 weeks)
4. ⏳ Monitor data coverage and freshness
5. ⏳ Replace remaining mock data with real NOAA

### Phase 3: Global Coverage (Future)
1. ⏳ Implement NOAA bulk NetCDF processing
2. ⏳ Populate all ocean grids with temperature (40,000+ grids)
3. ⏳ Add regional high-resolution data sources
4. ⏳ Automated daily refresh for all regions

---

## Commands Reference

### Test Real NOAA Ingestion (Small Batch)
```bash
# California (10 grids) - Safe, works reliably
npx tsx scripts/call-ingest-function.ts --california --limit=10

# Florida (10 grids)
npx tsx scripts/call-ingest-function.ts --florida --limit=10

# New York (10 grids)
npx tsx scripts/call-ingest-function.ts --newyork --limit=10
```

### Check Data Coverage
```bash
# Count grids with real NOAA data
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data } = await supabase.from('grid_conditions_latest')
  .select('cell_id, sources')
  .contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);
console.log(\`Real NOAA grids: \${data?.length || 0}\`);
"
```

### Remove Mock Data (After Replacing with Real)
```bash
# Delete grids with mock data sources
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await supabase.from('grid_conditions_latest')
  .delete()
  .contains('sources', ['MOCK_DATA_FOR_TESTING']);
console.log(\`Removed \${data?.length || 0} mock data records\`);
"
```

---

## NOAA OISST API Details

### Working Endpoint
```
https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180
```

### Query Format
```
?sst[(startTime):1:(endTime)][(lat):1:(lat)][(lon):1:(lon)]
```

### Time Offset Strategy
Try multiple time offsets (hours back from now):
- 0h (current)
- 24h (yesterday)
- 72h (3 days ago)
- 168h (1 week ago)
- 336h (2 weeks ago)
- etc.

**Why:** NOAA data has ingestion delays. Trying multiple offsets ensures we get the most recent available data.

### Current Status
- ⚠️ API is slow (~3-7 seconds per grid cell)
- ⚠️ Many cells return 404 (land cells or no data coverage)
- ✅ When data is available, it's high quality
- ✅ Global coverage (where ocean data exists)

---

## Success Metrics

### What We've Achieved ✅
1. Proven real NOAA data integration works
2. Successfully populated 10 California grids with real temperature data
3. Identified Edge Function timeout limitations
4. Created reusable scripts for batch ingestion
5. Documented production deployment strategy

### What's Left ⏳
1. ✅ ~~Set up automated GitHub Actions cron job~~ - **COMPLETE**
2. ⏳ Enable GitHub Actions workflow in repo
3. ⏳ Populate remaining American coastal grids (automated, 1-2 weeks)
4. ⏳ Remove mock data after replacement
5. ⏳ Monitor data freshness and quality
6. ⏳ Expand to global ocean coverage (bulk NetCDF processing)

---

**Status:** ✅ Real NOAA integration proven and working. GitHub Actions workflow created and ready to deploy.

**Next Step:** Enable the workflow in GitHub Actions tab and run manual test to verify setup.

**Workflow Details:**
- File: `.github/workflows/ingest-noaa-data.yml`
- Schedule: Every 6 hours (00:15, 06:15, 12:15, 18:15 UTC)
- Regions: California, Florida, New York (10 grids each)
- Rate: 120 grids/day = ~500 grids in 1 week
- Documentation: `NOAA_GITHUB_ACTIONS_GUIDE.md`

**Timeline:**
- Week 1: ~500 grids with real NOAA data
- Week 2: All mock data replaced
- Production ready: 1-2 weeks

**Created:** October 24, 2025
**Last Updated:** October 24, 2025 (GitHub Actions workflow added)
