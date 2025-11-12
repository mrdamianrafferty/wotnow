# RPC Region Mapping Fix - November 12, 2025

## Problem Summary

After fixing all type casting issues in `get_environmental_predictions_enhanced`, the RPC function was only returning **2 species** instead of the expected **50+ species**.

### Root Cause

**Biogeographic region mismatch between two systems:**

1. **`ices_rectangles.region`** contains human-readable region names:
   - "English Channel"
   - "Celtic Sea"
   - "North Sea"
   - "Irish Southwest"
   - etc.

2. **`species.biogeographic_regions`** contains broad biogeographic codes:
   - "NE_Atlantic"
   - "Mediterranean"
   - "NW_Atlantic"
   - "Gulf_of_Mexico"
   - "Caribbean"
   - "NE_Pacific"
   - etc.

**The RPC was using `rectangle.region` directly** → didn't match any species → filtered out 180 of 182 species.

---

## Discovery Process

### 1. Initial Diagnosis

```bash
SUPABASE_URL="..." npx tsx tmp/diagnose-species-filtering.ts
```

**Findings:**
- Rectangle 31F1 has region: "English Channel"
- Total species in database: 182
- Species with biogeographic_regions: 180
- Species matching "English Channel": **0** ❌

**Species biogeographic regions found:**
- Caribbean
- Gulf_of_Alaska
- Gulf_of_Mexico
- Hawaii
- Mediterranean
- **NE_Atlantic** ← Should match European waters
- NE_Pacific
- NW_Atlantic
- Sea_of_Cortez
- US_Atlantic

### 2. Historical Investigation

Found that migration `20251106082000_properly_fix_biogeographic_regions.sql` **had** the correct mapping:

```sql
rectangle_region := CASE
  WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'
  WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'NE_Atlantic'
  WHEN target_rectangle LIKE '30%' OR target_rectangle LIKE '31%' THEN 'NE_Atlantic'
  ...
  ELSE 'NE_Atlantic'
END;
```

**But:** Our November 12 type casting fixes (migrations 20251112200000) **lost this mapping logic** when rewriting the function from scratch.

---

## Solution

### Migration 20251112210000_add_region_mapping_to_rpc.sql

**Key Changes:**

1. **Removed** incorrect logic:
```sql
-- ❌ WRONG (old approach)
SELECT region INTO rectangle_region
FROM ices_rectangles
WHERE rectangle_code = target_rectangle;
```

2. **Added** CASE statement mapping:
```sql
-- ✅ CORRECT (new approach)
rectangle_region := CASE
  -- Mediterranean rectangles (07xx, 08xx)
  WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'

  -- Northeast Atlantic - All European waters (20xx-65xx)
  WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'NE_Atlantic'
  WHEN target_rectangle LIKE '22%' OR target_rectangle LIKE '23%' THEN 'NE_Atlantic'
  -- ... (complete mapping for codes 20-65)

  -- Northwest Atlantic - US East Coast (70xx-76xx)
  WHEN target_rectangle LIKE '70%' OR target_rectangle LIKE '71%' THEN 'NW_Atlantic'
  -- ... (complete mapping for codes 70-76)

  -- Gulf of Mexico (90xx-94xx)
  WHEN target_rectangle LIKE '90%' OR target_rectangle LIKE '91%' THEN 'Gulf_of_Mexico'
  -- ... (complete mapping for codes 90-94)

  -- Caribbean (95xx-97xx)
  WHEN target_rectangle LIKE '95%' OR target_rectangle LIKE '96%' THEN 'Caribbean'

  -- Northeast Pacific - US/Canada West Coast (77xx-85xx)
  WHEN target_rectangle LIKE '77%' OR target_rectangle LIKE '78%' THEN 'NE_Pacific'
  -- ... (complete mapping for codes 77-85)

  -- Gulf of Alaska (86xx-88xx)
  WHEN target_rectangle LIKE '86%' OR target_rectangle LIKE '87%' THEN 'Gulf_of_Alaska'

  -- Hawaii (98xx)
  WHEN target_rectangle LIKE '98%' THEN 'Hawaii'

  -- Default to NE_Atlantic for European waters
  ELSE 'NE_Atlantic'
END;
```

3. **Kept** the species filtering WHERE clause:
```sql
WHERE
  rectangle_region = ANY(s.biogeographic_regions)
  OR s.biogeographic_regions IS NULL
  OR array_length(s.biogeographic_regions, 1) IS NULL
```

---

## Test Results

### Before Fix

```
Rectangle 31F1 (English Channel)
├─ Biogeographic region used: "English Channel" (from ices_rectangles.region)
├─ Species matching: 0
└─ Species with NULL regions: 2
   Total: 2 species ❌
```

### After Fix

```
Rectangle 31F1 (English Channel)
├─ ICES code: 31F1
├─ Mapped to: "NE_Atlantic" (via CASE statement)
├─ Species matching NE_Atlantic: 54
├─ Species with NULL regions: 2
└─ Total: 56 species ✅
```

### Comprehensive Test Results

Tested 5 rectangles across 2 biogeographic regions:

| Rectangle | Region Name | Biogeographic Region | Species Count | Status |
|-----------|-------------|---------------------|---------------|--------|
| 31F1 | English Channel | NE_Atlantic | 56 | ✅ Pass |
| 31F2 | English Channel | NE_Atlantic | 56 | ✅ Pass |
| 28E5 | Celtic Sea | NE_Atlantic | 56 | ✅ Pass |
| 39F3 | North Sea | NE_Atlantic | 56 | ✅ Pass |
| 07E7 | Mediterranean | Mediterranean | 63 | ✅ Pass |

**All tests passed: 5/5**
**All return 20+ species: 5/5 ✅**

**Top predictions** (consistent across NE_Atlantic rectangles):
1. GAR: Garfish (Needlefish) (12%)
2. SQC: Common Squid (12%)
3. CHUB-MACK: Atlantic Chub Mackerel (11%)
4. CUT: Common Cuttlefish (11%)
5. FGM/EURO-CUDA: Grey Mullet / European Barracuda (8%)

---

## Biogeographic Region Mapping Reference

### Complete ICES Code → Region Mapping

| ICES Codes | Biogeographic Region | Geographic Area |
|------------|---------------------|-----------------|
| 07xx - 08xx | Mediterranean | Mediterranean Sea |
| 20xx - 65xx | NE_Atlantic | European Atlantic waters (English Channel, North Sea, Celtic Sea, Bay of Biscay, Norwegian waters, etc.) |
| 70xx - 76xx | NW_Atlantic | US/Canada East Coast |
| 77xx - 85xx | NE_Pacific | US/Canada West Coast |
| 86xx - 88xx | Gulf_of_Alaska | Alaska waters |
| 90xx - 94xx | Gulf_of_Mexico | Gulf of Mexico |
| 95xx - 97xx | Caribbean | Caribbean Sea |
| 98xx | Hawaii | Hawaiian waters |
| *Other | NE_Atlantic | Default (European waters) |

### Species Distribution by Region

Based on current database (182 total species):

| Biogeographic Region | Species Count | % of Total |
|---------------------|---------------|------------|
| NE_Atlantic | ~54 | 30% |
| Mediterranean | ~63 | 35% |
| NW_Atlantic | ? | ? |
| Gulf_of_Mexico | ? | ? |
| Caribbean | ? | ? |
| NE_Pacific | ? | ? |
| Gulf_of_Alaska | ? | ? |
| Hawaii | ? | ? |
| US_Atlantic | ? | ? |
| Sea_of_Cortez | ? | ? |
| NULL/Empty | 2 | 1% |

*Note: Many species appear in multiple regions*

---

## Key Learnings

### 1. Don't Use Human-Readable Names for Filtering

Human-readable region names ("English Channel") are great for UI display but terrible for data matching. They:
- Change over time
- Have variations/translations
- Aren't standardized
- Don't map to broad biogeographic classifications

**Use:** Standardized codes (ICES rectangle codes) → Broad biogeographic regions (NE_Atlantic, etc.)

### 2. Document Region Mappings

The mapping between ICES codes and biogeographic regions is **critical domain knowledge** that must be documented:
- In migrations (as comments)
- In schema documentation
- In RPC function comments
- In developer guides

**Without documentation**, the mapping gets lost during refactoring (as happened today).

### 3. Test with Real-World Expectations

Type-correct code ≠ Functionally correct code.

Today's type fixes made the RPC technically work (no errors), but functionally it was broken (only 2 species).

**Always test with domain knowledge:**
- "Should return 20+ species for European waters" ← Caught the bug
- "Should vary by region" ← Validated the fix
- "Top species should make sense" ← Sanity check

### 4. Preserve Intent When Refactoring

When rewriting RPC functions:
1. **Read the old version** - understand WHY certain logic exists
2. **Check git history** - see what problems were solved
3. **Find related migrations** - discover domain logic (like region mapping)
4. **Test comprehensively** - ensure functional equivalence

Today we rewrote the function for type safety but lost the region mapping logic because we didn't check what the previous version was doing.

---

## Files Modified

### New Migration
- `supabase/migrations/20251112210000_add_region_mapping_to_rpc.sql` ✅

### Updated Documentation
- `DATABASE_SCHEMA_REFERENCE.md` - Added "Biogeographic Region Mapping" section
- `RPC_TYPE_CASTING_GUIDE.md` - Added region mapping example with test results
- `RPC_REGION_MAPPING_FIX_20251112.md` - This file

### Test Scripts
- `tmp/diagnose-species-filtering.ts` - Initial diagnosis
- `tmp/comprehensive-rpc-test.ts` - Full test suite

---

## Developer Checklist (Updated)

### Before Modifying RPC Functions:

- [ ] Check current function definition
- [ ] Read function comments
- [ ] Check git history for related migrations
- [ ] Understand WHY certain logic exists (not just WHAT it does)
- [ ] Note any domain-specific mappings (like region mapping)
- [ ] Check DATABASE_SCHEMA_REFERENCE.md for table relationships

### While Modifying RPC Functions:

- [ ] Preserve existing domain logic
- [ ] Add comments explaining non-obvious mappings
- [ ] Cast all types correctly (see RPC_TYPE_CASTING_GUIDE.md)
- [ ] Include region mapping CASE statement if filtering by geography
- [ ] Test with multiple rectangles across different regions

### After Modifying RPC Functions:

- [ ] Test returns expected number of results (not just "no errors")
- [ ] Verify results make domain sense (species appropriate for region)
- [ ] Test across multiple biogeographic regions
- [ ] Document any new mappings or logic
- [ ] Update schema documentation if schema changed

---

## Prevention: Region Mapping as Separate Function

**Recommendation:** Extract region mapping to a separate function to prevent future loss.

```sql
-- Suggested improvement
CREATE FUNCTION map_rectangle_to_biogeographic_region(rectangle_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE
    WHEN rectangle_code LIKE '07%' OR rectangle_code LIKE '08%' THEN 'Mediterranean'
    WHEN rectangle_code LIKE '20%' OR rectangle_code LIKE '21%' THEN 'NE_Atlantic'
    -- ... full mapping
    ELSE 'NE_Atlantic'
  END;
END;
$$;

-- Then use in RPC functions
rectangle_region := map_rectangle_to_biogeographic_region(target_rectangle);
```

**Benefits:**
- Single source of truth
- Reusable across multiple RPC functions
- Can't be lost during refactoring
- Easier to test independently
- Clear intent ("this is important domain logic")

---

## Status

✅ **RESOLVED** - November 12, 2025

- Migration applied: 20251112210000
- All tests passing: 5/5
- Species count: 56-63 per rectangle
- Documentation updated: 3 files
- Test scripts created: 2 files

**Next Review:** After any RPC function modifications or biogeographic region changes.

---

## Summary for Future Maintainers

**If RPC returns very few species (< 10):**

1. Check if biogeographic region mapping is present
2. Verify ICES code mapping (see migration 20251112210000)
3. Test with: `npx tsx tmp/comprehensive-rpc-test.ts`
4. Expected: 50+ species for European waters, 60+ for Mediterranean

**If mapping is missing:**
1. Copy CASE statement from `20251112210000_add_region_mapping_to_rpc.sql`
2. Add **before** the main RETURN QUERY
3. Use in WHERE clause: `rectangle_region = ANY(s.biogeographic_regions)`

**Critical:** Rectangle codes (31F1) → Biogeographic regions (NE_Atlantic) → Species filtering. Don't skip the middle step!

---

**Maintained By:** Development Team
**Last Updated:** November 12, 2025
**See Also:** DATABASE_SCHEMA_REFERENCE.md, RPC_TYPE_CASTING_GUIDE.md
