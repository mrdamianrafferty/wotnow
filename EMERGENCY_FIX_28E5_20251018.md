# 🚨 EMERGENCY FIX SUMMARY - October 18, 2025

## Problem
Rectangle **28E5** showing "fish are quiet" - no predictions returned

## Root Cause Analysis

### Issue 1: Wrong Table Query ✅ FIXED
**Problem**: RPC function was querying `findr_conditions_snapshots` (EMPTY table)
**Data Location**: Data is in `findr_conditions_latest` VIEW (283 records)

**Fix Applied**: Migration `20251018016_emergency_fix_conditions_table.sql`
- Changed `recent_conditions` CTE to query `findr_conditions_latest` instead
- Deployed successfully

### Issue 2: Missing Rectangle ❌ NOT FIXED
**Problem**: Rectangle 28E5 was NOT included in this morning's ingestion
**Evidence**: Only 283 rectangles in `findr_conditions_latest`, 28E5 not among them

**Rectangles starting with 28** (available):
- 28D8, 28D9, 28F2, 28F4, 28M1, 28N5, 28O2, 28P5, 28R3, 28T9

**28E5 is MISSING from ingestion**

## Immediate Actions Taken

### ✅ Fixed RPC Function
```sql
-- Changed from:
FROM findr_conditions_snapshots
WHERE rectangle_code = target_rectangle
  AND DATE(captured_at) BETWEEN target_date - INTERVAL '30 days' AND target_date

-- Changed to:
FROM findr_conditions_latest
WHERE rectangle_code = target_rectangle
```

**Impact**: All rectangles that WERE ingested now work properly

### ❌ 28E5 Still Missing
**Status**: Rectangle needs to be added to ingestion script
**Workaround**: Use nearby rectangles until 28E5 is added

## Systeminc Issues & Robustness Plan

### Problem 1: Table Name Confusion
**Issue**: Code references `findr_conditions_snapshots` but data is in `findr_conditions_latest`

**Solutions**:
1. **Immediate**: Keep RPC querying `findr_conditions_latest` ✅ DONE
2. **Short-term**: Decide on ONE source of truth:
   - Option A: Populate `findr_conditions_snapshots` from ingestion
   - Option B: Always use `findr_conditions_latest` view
   - Option C: Create synonym/alias
3. **Long-term**: Document which table/view is canonical

### Problem 2: No Validation of Ingestion
**Issue**: Morning ingestion ran but we didn't know 28E5 failed

**Solutions**:
1. **Add ingestion validation script**:
   ```typescript
   // After ingestion, verify:
   - Total rectangles matches expected (currently 283, should be 284+)
   - Critical rectangles present (21D8, 28E5, 31F2, etc.)
   - All rectangles have fresh data (< 24 hours old)
   - Log missing rectangles
   ```

2. **Add monitoring/alerts**:
   - Slack/email notification if ingestion misses rectangles
   - Dashboard showing last update time per rectangle

3. **Add retry logic**:
   - If rectangle fetch fails, retry 3 times
   - Log failures for manual review

### Problem 3: Empty vs Missing Data
**Issue**: RPC returns empty results whether data is missing OR rectangle excluded by biogeographic filter

**Solutions**:
1. **Add debug mode** to RPC:
   ```sql
   -- Return diagnostic info:
   - Did rectangle have conditions data?
   - How many species passed biogeographic filter?
   - What region was rectangle mapped to?
   ```

2. **Better error messages**:
   - "No environmental data for this rectangle"
   - "No species in this biogeographic region"
   - vs current: Empty array (ambiguous)

### Problem 4: Repeated Table Name Issues
**Issue**: This is the 2nd time today we've had table name confusion

**Solution - Create Canonical Reference**:
```typescript
// lib/constants/database-tables.ts
export const DB_TABLES = {
  CONDITIONS: 'findr_conditions_latest',  // ← CANONICAL
  RECTANGLES: 'findr_rectangles',
  SPECIES: 'species',
  PREDICTIONS_CACHE: 'findr_prediction_sessions'
} as const;

// Use everywhere:
supabase.from(DB_TABLES.CONDITIONS).select('*')
```

## Next Steps

### Immediate (NOW)
1. ✅ Fix RPC to query correct table - DONE
2. ❌ Add 28E5 to ingestion script
3. ❌ Re-run ingestion for 28E5
4. ❌ Test 28E5 works

### Short-term (Today)
1. ❌ Create ingestion validation script
2. ❌ Document which table is canonical source
3. ❌ Add DB_TABLES constants file
4. ❌ Update all queries to use constants

### Medium-term (This Week)
1. ❌ Add monitoring/alerts for ingestion
2. ❌ Add retry logic to ingestion
3. ❌ Add debug mode to RPC
4. ❌ Better error messages

## Files Changed

### Migrations
- `20251018016_emergency_fix_conditions_table.sql` - Query findr_conditions_latest

### Test Scripts
- `scripts/test-28e5.ts` - Test specific rectangle
- `scripts/emergency-find-data.ts` - Diagnostic tool

## Testing

### Verify Fix Works
```bash
# Test a rectangle that WAS ingested
npx tsx scripts/test-bite-score-favourites.ts

# Should now return predictions for 21D8, 22D8, etc.
```

### Check Missing Rectangles
```bash
npx tsx scripts/emergency-find-data.ts
# Shows 283 rectangles available
# 28E5 not in list
```

## Ingestion Script Location
**TODO**: Find and update ingestion script to include 28E5
- Likely in `/scripts/ingest-*.ts` or external cron job
- Add 28E5 to rectangle list
- Add validation after ingestion runs

## Lessons Learned

1. **Table naming matters**: `findr_conditions_snapshots` vs `findr_conditions_latest` caused confusion
2. **Silent failures are dangerous**: Ingestion ran but we didn't know 28E5 failed
3. **Validation is critical**: Should verify ingestion success before users encounter issues
4. **Constants prevent errors**: Hardcoding table names in multiple places = bugs

## Status Summary

| Issue | Status | Impact |
|-------|--------|---------|
| RPC querying wrong table | ✅ FIXED | All ingested rectangles now work |
| 28E5 missing from ingestion | ❌ OPEN | 28E5 still shows "fish quiet" |
| No ingestion validation | ❌ OPEN | Future missing rectangles won't be detected |
| Table name confusion | ⚠️ PARTIAL | Fixed RPC, need constants |

---

**Next Priority**: Add 28E5 to ingestion script and re-run
