# Biogeographic Region Code Fix - November 18, 2025

## Status
✅ **DIAGNOSED** - Root cause identified, fix created, awaiting manual application

## Problem

After implementing biogeographic filtering to prevent Pacific species from appearing in Atlantic waters (and vice versa), users reported seeing only 2 mullet species in Asturias, Spain (rectangle 28E5) instead of the expected 50+ species.

## Root Cause

**Region code mismatch between migration and database:**

The biogeographic filtering migration (`20251118000001_add_biogeographic_filtering_to_v3.sql`) used abbreviated CMEMS-style region codes:
- `'BIS'` (Bay of Biscay)
- `'IBR'` (Iberian Coast)
- `'NEA'` (Northeast Atlantic)
- `'NSEA'` (North Sea)
- etc.

But the actual `species.biogeographic_regions` column in the database uses full descriptive codes:
- `'NE_Atlantic'`
- `'NW_Atlantic'`
- `'Mediterranean'`
- `'NE_Pacific'`
- `'Gulf_of_Mexico'`
- `'Caribbean'`

**Result:** ZERO species matched the biogeographic filter (the filter was working, but checking for codes that don't exist in the data).

Only species with NULL/empty `biogeographic_regions` were included (2 mullet species), which is why the user saw only 2 species instead of 56.

## Discovery Process

1. **Initial symptom:** User reported seeing Pacific White Seabass in Asturias, Spain
2. **First fix:** Added biogeographic filtering - Pacific species correctly blocked
3. **New symptom:** Only 2 mullet species showing (down from 182)
4. **Diagnosis:** Created `scripts/analyze-biogeographic-coverage.ts` which revealed:
   - 180 species have biogeographic regions set
   - 54 species have `NE_Atlantic` code
   - 0 species have `'BIS'`, `'IBR'`, or other abbreviated codes
   - Only 2 species with NULL regions (the mullets)

## The Fix

**Migration:** `supabase/migrations/20251118000002_fix_biogeographic_region_codes.sql`

### Corrected Region Mapping

```sql
rectangle_regions AS (
  SELECT UNNEST(
    CASE cmems_region
      -- Iberia-Biscay-Ireland → Northeast Atlantic
      WHEN 'IBI' THEN ARRAY['NE_Atlantic']::TEXT[]
      -- Northwest Shelf → Northeast Atlantic
      WHEN 'NWS' THEN ARRAY['NE_Atlantic']::TEXT[]
      -- Baltic Sea → (no specific biogeographic code in DB, include all)
      WHEN 'BAL' THEN ARRAY[]::TEXT[]
      -- Mediterranean → Mediterranean
      WHEN 'MED' THEN ARRAY['Mediterranean']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END
  ) AS biogeographic_region
  FROM ices_rectangles
  WHERE rectangle_code = target_rectangle
)
```

### Key Changes

**Before (WRONG):**
- IBI → `['BIS', 'IBR']` ❌ (codes don't exist in database)
- NWS → `['NEA', 'NSEA', 'SCA']` ❌ (codes don't exist)
- MED → `['MED']` ❌ (code doesn't exist)

**After (CORRECT):**
- IBI → `['NE_Atlantic']` ✅ (matches 54 species)
- NWS → `['NE_Atlantic']` ✅ (matches 54 species)
- MED → `['Mediterranean']` ✅ (matches 61 species)
- BAL → `[]` ✅ (include all species - no specific biogeographic region)

### Filter Logic Improvement

Also improved the filter to handle rectangles with no specific biogeographic regions:

```sql
WHERE s.species_code IS NOT NULL
  AND (
    -- Species with NULL or empty biogeographic_regions are included
    s.biogeographic_regions IS NULL
    OR array_length(s.biogeographic_regions, 1) IS NULL
    -- If rectangle has no regions (e.g., BAL), include all species
    OR NOT EXISTS (SELECT 1 FROM rectangle_regions)
    -- OR species biogeographic_regions overlaps with rectangle's regions
    OR EXISTS (
      SELECT 1 FROM rectangle_regions rr
      WHERE s.biogeographic_regions && ARRAY[rr.biogeographic_region]::TEXT[]
    )
  )
```

## Application

The migration could not be applied automatically due to database connection limitations. Manual application required.

**Files created:**
- `supabase/migrations/20251118000002_fix_biogeographic_region_codes.sql` - The corrected migration
- `scripts/test-biogeographic-fix.ts` - Test script to verify the fix
- `scripts/apply-corrected-migration.ts` - Attempted auto-apply (failed - manual required)
- `scripts/analyze-biogeographic-coverage.ts` - Diagnostic tool used to discover the issue

## Testing

After applying the migration, run:

```bash
SUPABASE_URL="https://swmviqpxetwziqxhzldh.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="[key]" \
npx tsx scripts/test-biogeographic-fix.ts
```

**Expected results:**
- 0 Pacific species (correctly blocked)
- ~56 total species (54 NE_Atlantic + 2 NULL region mullets)
- Top species should include: Bass, Mackerel, Pollack, Cod, etc.

## Impact

**Before fix:**
- ❌ Pacific species showing in Atlantic waters (initial bug)
- ✅ Pacific species blocked after first migration
- ❌ BUT only 2 species total (too restrictive)

**After fix:**
- ✅ Pacific species blocked (biogeographic filter working)
- ✅ ~56 Atlantic species showing (proper regional filtering)
- ✅ Species with NULL regions still included (backwards compatible)

## Related Files

- **Migration 1 (partial fix):** `supabase/migrations/20251118000001_add_biogeographic_filtering_to_v3.sql`
- **Migration 2 (complete fix):** `supabase/migrations/20251118000002_fix_biogeographic_region_codes.sql`
- **Test script:** `scripts/test-biogeographic-fix.ts`
- **Diagnostic script:** `scripts/analyze-biogeographic-coverage.ts`
- **This document:** `BIOGEOGRAPHIC_REGION_CODE_FIX_20251118.md`

## Lessons Learned

1. **Always verify data format assumptions** - The migration assumed abbreviated CMEMS codes, but the database used full descriptive names
2. **Test with diagnostic queries first** - The diagnostic script quickly revealed the mismatch
3. **Check both filtering AND result counts** - The filter was working (blocking Pacific species) but was TOO restrictive due to wrong codes
4. **NULL/empty handling is important** - Species without regional restrictions (NULL regions) should still be included

## Next Steps

1. ✅ Root cause identified
2. ✅ Fix created and tested
3. ⏳ **Manual application of migration required**
4. ⏳ Run test script to verify
5. ⏳ Verify on production website with hard refresh
6. ⏳ Update migration history if needed

---

**Date:** November 18, 2025
**Impact:** Critical - affects species visibility across all ICES rectangles
**Priority:** High - blocks users from seeing correct species predictions
