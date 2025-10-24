# NOAA Data Ingestion - GitHub Actions Guide

**Date:** October 24, 2025
**Status:** ✅ **WORKFLOW CREATED - READY TO ENABLE**

---

## Overview

Automated GitHub Actions workflow for gradually populating American coastal grids with real NOAA OISST data. Uses the proven Supabase Edge Function approach with small batches (10 grids) to stay within timeout limits.

---

## Workflow Configuration

**File:** `.github/workflows/ingest-noaa-data.yml`

**Schedule:** Every 6 hours at :15 past the hour (00:15, 06:15, 12:15, 18:15 UTC)

**Regions Ingested Per Run:**
- California (10 grids)
- Florida (10 grids)
- New York (10 grids)

**Total:** 30 grids every 6 hours = 120 grids per day

---

## How It Works

### Automatic Runs (Scheduled)

1. Workflow triggers every 6 hours via cron schedule
2. Runs three ingestion steps in sequence (California → Florida → New York)
3. Each step calls `scripts/call-ingest-function.ts` with `--limit=10`
4. Supabase Edge Function fetches real NOAA data for 10 cells per region
5. Coverage summary displayed at end showing progress
6. Continues on error (one region failure doesn't stop others)

### Manual Runs (workflow_dispatch)

Can be triggered manually from GitHub Actions UI with options:
- **Region:** Choose specific region or "all" (default: all)
- **Limit:** Max cells per region (default: 10)

**Example manual triggers:**
- Test California only: region=`california`, limit=`10`
- Aggressive ingestion: region=`all`, limit=`15`
- Single region focus: region=`florida`, limit=`20`

---

## Setup Instructions

### 1. Verify GitHub Secrets

Required secrets (should already exist):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key)

**Check secrets:**
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Verify both secrets exist
3. If missing, add them from your `.env.local` file

### 2. Enable Workflow

**First time activation:**
1. Push the workflow file to GitHub (already done)
2. Go to GitHub repo → Actions tab
3. Find "Ingest NOAA OISST Data" workflow
4. Click "Enable workflow" if disabled
5. Workflow will start running on schedule automatically

### 3. Manual Test Run (Recommended)

Before relying on scheduled runs, test manually:

1. Go to Actions → "Ingest NOAA OISST Data"
2. Click "Run workflow" dropdown
3. Select:
   - Region: `california`
   - Limit: `10`
4. Click "Run workflow"
5. Monitor logs to verify success

**Expected output:**
```
🌊 Calling ingest-conditions Edge Function

Options: {
  "bbox": [-125, 32, -117, 42],
  "providers": ["NOAA"],
  "vars": ["surface_temperature_c"],
  "limit": 10
}

✅ Success!

Results: {
  "upserted": 10,
  "diagnostics": {
    "noaa": {
      "sampledCells": 10,
      "attempted": 70,
      "successes": 10
    }
  }
}

📊 Data Coverage Summary:
  Total grids with data: 729 / 65,884 (1.11%)
  Real NOAA grids: 10
  Mock data grids: 502
  Real data coverage: 2.0%
```

---

## Monitoring Progress

### Check Workflow Runs

**Location:** GitHub repo → Actions → "Ingest NOAA OISST Data"

**What to look for:**
- ✅ Green checkmarks = successful ingestion
- ❌ Red X = failed (check logs for errors)
- Coverage summary in final step shows real vs mock data ratio

### Check Database Coverage

**Script:**
```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { count: totalCount } = await supabase.from('grid_conditions_latest').select('*', { count: 'exact', head: true });
const { count: noaaCount } = await supabase.from('grid_conditions_latest').select('*', { count: 'exact', head: true }).contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);
const { count: mockCount } = await supabase.from('grid_conditions_latest').select('*', { count: 'exact', head: true }).contains('sources', ['MOCK_DATA_FOR_TESTING']);

console.log('Total grids with data:', totalCount);
console.log('Real NOAA grids:', noaaCount);
console.log('Mock data grids:', mockCount);
console.log('Real data coverage:', ((noaaCount/(noaaCount+mockCount))*100).toFixed(1) + '%');
"
```

### Query Supabase Directly

**Check real NOAA data count:**
```sql
SELECT COUNT(*)
FROM grid_conditions_latest
WHERE sources @> ARRAY['ncdcOisst21Agg_LonPM180.sst'];
```

**Check mock data count:**
```sql
SELECT COUNT(*)
FROM grid_conditions_latest
WHERE sources @> ARRAY['MOCK_DATA_FOR_TESTING'];
```

**View recent NOAA ingestions:**
```sql
SELECT cell_id, surface_temperature_c, collected_at, sources
FROM grid_conditions_latest
WHERE sources @> ARRAY['ncdcOisst21Agg_LonPM180.sst']
ORDER BY updated_at DESC
LIMIT 20;
```

---

## Expected Timeline

### Current State (Before Workflow)
- European grids: 222 (real CMEMS data)
- American grids: 10 (real NOAA) + 492 (mock)
- Total: 729 grids with data

### After 1 Week (28 runs × 30 grids)
- New real NOAA grids: ~840
- Total real American data: ~850 grids
- Mock data remaining: 0 (fully replaced if no duplicates)

### After 1 Month
- All American coastal grids should have real NOAA data
- Can disable workflow or reduce frequency to daily updates only
- Ready for production deployment

---

## Troubleshooting

### Workflow Not Running

**Check:**
1. Is workflow enabled in Actions tab?
2. Is main branch the default branch?
3. Are GitHub Actions enabled for the repo?

**Fix:**
- Go to Settings → Actions → General → Allow all actions
- Check workflow file syntax (YAML indentation)

### Ingestion Failures

**Common causes:**
- Supabase Edge Function timeout (normal for NOAA API slowness)
- Invalid credentials in GitHub secrets
- NOAA API temporarily down

**Solutions:**
- Workflow uses `continue-on-error: true` so partial failures are OK
- Check Edge Function logs in Supabase dashboard
- Verify secrets match `.env.local` values

### Slow Progress

**Current rate:** 120 grids/day (30 grids × 4 runs)

**To speed up:**
1. Increase frequency: Change cron to `*/3 * * * *` (every 3 hours)
2. Increase batch size: Change limit to `15` or `20` (test first - may timeout)
3. Add more regions: Uncomment Gulf, Pacific NW, Hawaii steps

**Caution:** Don't exceed Edge Function timeout limits (keep batches ≤20)

---

## Maintenance

### When to Disable

Once all American grids have real data:
1. Check coverage: `100% real data coverage`
2. Disable scheduled runs: Comment out `schedule:` section
3. Keep workflow for manual updates when needed

### When to Modify

**Add new regions:**
1. Add region flag to `scripts/call-ingest-function.ts`
2. Add new step to workflow with appropriate bbox
3. Test manually before enabling in schedule

**Change frequency:**
- Daily updates: `cron: '15 2 * * *'` (once per day at 02:15 UTC)
- Twice daily: `cron: '15 2,14 * * *'` (02:15 and 14:15 UTC)
- Keep current: `cron: '15 */6 * * *'` (every 6 hours)

---

## Integration with Existing System

### How It Fits

1. **Global Grid System** (already complete)
   - 65,884 worldwide grid cells at 0.25° resolution
   - Biogeographic region mapping
   - `get_global_fishing_predictions()` RPC function

2. **European Data** (already complete)
   - 222 grids with real CMEMS data
   - Automated daily refresh via separate workflow

3. **American Data** (this workflow)
   - Gradually replacing 502 mock grids with real NOAA data
   - 10 grids proven working
   - Automated every 6 hours

4. **API Endpoint** (already updated)
   - `/api/findr/predictions` uses global predictions
   - Works with both real and mock data
   - Higher confidence (60-80%) with real data

### Production Readiness

**Currently production-ready:**
- ✅ European waters (real CMEMS data)
- ✅ Global predictions with biogeographic fallback (never empty)
- ✅ API endpoint integration

**In progress (this workflow):**
- ⏳ American waters real data population
- ⏳ Replacing mock data gradually

**Timeline to full production:**
- 1-2 weeks: Majority of American coastal grids
- 1 month: Complete American coverage
- Future: Global ocean coverage via bulk downloads

---

## Commands Reference

### Manual Ingestion (Local)

```bash
# California (10 grids)
npx tsx scripts/call-ingest-function.ts --california --limit=10

# Florida (10 grids)
npx tsx scripts/call-ingest-function.ts --florida --limit=10

# New York (10 grids)
npx tsx scripts/call-ingest-function.ts --newyork --limit=10

# All Americas (10 grids sample)
npx tsx scripts/call-ingest-function.ts --americas --limit=10
```

### Check Coverage

```bash
# Quick check
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { count } = await supabase.from('grid_conditions_latest').select('*', { count: 'exact', head: true }).contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);
console.log('Real NOAA grids:', count);
"
```

### Test Predictions

```bash
# Test San Francisco with real data
npx tsx scripts/test-multiple-locations.ts
```

---

## Next Steps

### Immediate (Now)
1. ✅ Workflow file created
2. ⏳ Push to GitHub
3. ⏳ Enable workflow in Actions tab
4. ⏳ Run manual test (California, 10 grids)
5. ⏳ Verify coverage increase

### Short-term (This Week)
1. Monitor first 4-5 automatic runs
2. Verify no persistent failures
3. Check coverage growth (should be ~120 grids/day)
4. Adjust frequency/batch size if needed

### Medium-term (This Month)
1. Wait for ~500 American grids to be populated
2. Remove mock data once real coverage sufficient
3. Verify all test locations (SF, FL, NY) using real data
4. Deploy to production with confidence

---

**Status:** Workflow ready for activation. Enable and test manually, then let it run automatically every 6 hours.

**Created:** October 24, 2025
**Last Updated:** October 24, 2025
