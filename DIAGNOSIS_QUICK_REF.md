# 🔍 Quick Diagnosis Reference Card

## Problem: Data Ingestion Failed

### Step 1: Run Diagnostic (30 seconds)
```bash
npx tsx scripts/diagnose-ingestion-failure.ts --rectangle=28E5
```

This tests 5 things and tells you exactly what's wrong.

---

## Common Issues & Fixes

### ❌ "Authentication failed"
```bash
copernicusmarine login
# Enter your Copernicus username/password
```

### ❌ "Date exceeds dataset coordinates"
```bash
# Use older date
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-10

# Or let automatic fallback handle it (tries up to 7 days back)
npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

### ❌ "No data available" / "On land"
```bash
# Try adjacent rectangle
npx tsx scripts/targeted-reingest.ts --rectangle=28E4

# Or enable wider margin fallback (already automatic for coastal areas)
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

### ❌ "Dataset not found"
Check `lib/copernicus/regionRouterV2.ts` - may need to add dataset for this region

---

## Automatic Fallbacks (Built-in)

1. **Retry**: 3 attempts with 2s, 4s, 8s delays
2. **Dataset**: Regional satellite → Regional model → Global
3. **Date**: Today → Yesterday → ... → 7 days ago
4. **Margin**: 0.5° → 0.7° (for coastal areas)
5. **Graceful**: Partial data accepted (3/7 variables OK)

---

## Debug Mode

```bash
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

Shows:
- Bbox coordinates
- File sizes
- CLI output
- Retry attempts
- Why data was rejected

---

## Verify Success

```bash
# Check database
psql $DATABASE_URL -c "
  SELECT rectangle_code, captured_at, 
         chlorophyll_mg_m3, water_temp_c 
  FROM findr_conditions_snapshots 
  WHERE rectangle_code = '28E5' 
  ORDER BY created_at DESC 
  LIMIT 1;
"
```

---

## Files Created

- `scripts/diagnose-ingestion-failure.ts` - Identifies root cause
- `scripts/targeted-reingest.ts` - Ingestion with fallbacks (enhanced)
- `COPERNICUS_FAILURE_DIAGNOSIS_GUIDE.md` - Detailed guide
- `28E5_ROOT_CAUSE_ANALYSIS.md` - Specific 28E5 issue

---

## Key Learning: 28E5 Issue

**Problem:** Dataset only has data up to Oct 10, we requested Oct 17  
**Cause:** Satellite data has 7+ day processing lag  
**Solution:** Date fallback automatically tries older dates  
**Prevention:** Default to D-7 (week ago) instead of D-1 (yesterday)

---

**TL;DR:** Run diagnostic first, it tells you exactly what to fix!
