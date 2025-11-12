# RPC Fix & Documentation Summary - November 12, 2025

## Overview

Successfully resolved all RPC type mismatches in `get_environmental_predictions_enhanced` and created comprehensive documentation to prevent future issues.

---

## What Was Fixed

### 1. Type Casting Issues (Multiple Iterations)

**Problem:** PostgreSQL is strict about type matching between `RETURNS TABLE` and actual SELECT results.

**Fixed Columns:**

| Column | Issue | Solution |
|--------|-------|----------|
| `species_code` | VARCHAR(10) vs TEXT | Added `::TEXT` cast |
| `name_en` | VARCHAR(100) vs TEXT | Added `::TEXT` cast |
| `scientific_name` | VARCHAR(200) vs TEXT | Added `::TEXT` cast |
| `guild` | ENUM fish_guild vs TEXT | Added `::TEXT` cast |
| `diurnal_sensitivity` | TEXT (with CHECK) vs TEXT | Added explicit `::TEXT` cast |
| `flow_preference` | TEXT (with CHECK) vs TEXT | Added explicit `::TEXT` cast |
| `habitat_bonus` | INTEGER literal vs NUMERIC | Changed `5` to `5.0`, added `::NUMERIC` cast |

**Final Migration:** `supabase/migrations/20251112200000_fix_all_type_casting.sql`

### 2. Column Name Mismatches (From Previous Sessions)

**Fixed References:**

| Table | Old Name | New Name |
|-------|----------|----------|
| `ices_rectangles` | `code` | `rectangle_code` |
| `ices_rectangles` | `biogeographic_region` | `region` |
| `findr_conditions_latest` | `temperature_c` | `sea_temp_c` / `water_temp_c` |
| `findr_conditions_latest` | `salinity_ppt` | `salinity_psu` |
| `moon_cache` | `date` | `local_date` |
| `moon_cache` | `phase` | `moon_phase_name` |
| `moon_cache` | `illumination` | `moon_illumination_pct` |
| `species` | `species_id` | `id` |

**Previous Migrations:** `20251112000005_comprehensive_rpc_column_fix.sql`, `20251112000006_fix_rpc_type_casting.sql`

---

## Documentation Created

### 1. DATABASE_SCHEMA_REFERENCE.md ✅

**Purpose:** Comprehensive reference for all key database tables

**Contents:**
- Complete column lists with SQL types, JS types, and max lengths
- Nullable/non-nullable indicators
- Common pitfalls for each table
- Type casting examples
- Custom enum type definitions
- Quick reference for RPC development

**Key Tables Documented:**
- `species` (68 columns)
- `ices_rectangles` (24 columns)
- `findr_conditions_latest` (42 columns)
- `moon_cache` (20 columns)
- `findr_prediction_sessions`
- `findr_prediction_impressions`
- `findr_catch_entries`
- `user_favourites`
- `user_location_preferences`
- `translation_cache`

**Features:**
- Warning badges (⚠️) for columns requiring casts
- Side-by-side old/new column name reference
- Type casting checklist
- Common error codes reference

### 2. RPC_TYPE_CASTING_GUIDE.md ✅

**Purpose:** Practical guide to preventing RPC type mismatches

**Contents:**
- The problem explained
- PostgreSQL type strictness rules
- Common type mismatches with examples
- The fix pattern (step-by-step)
- Real-world example from today's fixes
- Testing strategy with code samples
- Prevention checklist
- Quick reference table for casts

**Key Sections:**
1. **Common Type Mismatches** - VARCHAR→TEXT, ENUM→TEXT, INTEGER→NUMERIC, UUID→TEXT
2. **The Fix Pattern** - 5-step process for diagnosing and fixing type issues
3. **Real-World Example** - Complete journey through 4 iterations of fixes
4. **Testing Strategy** - TypeScript test script template, error parsing guide
5. **Prevention Checklist** - Design, implementation, testing, and documentation phases

### 3. Integration into Existing Docs ✅

**CLAUDE.md Updates:**
- Added prominent reference to schema docs in Database Schema section
- Added to Documentation Index under "Core System Documentation"
- Marked as ✅ **ESSENTIAL** for visibility

**GETTING_STARTED.md Updates:**
- Added reference block at top of Database Schema section
- Links to both DATABASE_SCHEMA_REFERENCE.md and RPC_TYPE_CASTING_GUIDE.md

---

## Test Results

### Before Fixes

```
❌ Test 1 FAILED: structure of query does not match function result type
Error code: 42804
Details: Returned type character varying(10) does not match expected type text in column 1
```

### After Fixes

```
✅ Test 1 PASSED: Returned 2 predictions
✅ Test 2 PASSED: Returned 2 predictions (with GPS coordinates)
✅ All data types correct

Sample prediction:
{
  "species_code": "MULR",
  "species_common_name": "Thin-lipped grey mullet",
  "confidence_percent": 7,
  "guild": "surf_estuary",
  "habitat_bonus": 0,
  "bio_band_score": 7,
  ...
}
```

**Test Script:** `tmp/test-rpc-fix.ts`

---

## Migrations Applied

**November 12, 2025:**

1. `20251112000001_fix_biogeographic_region_column_ref.sql` - Fixed ices_rectangles.biogeographic_region → region
2. `20251112000002_fix_conditions_column_names.sql` - Fixed findr_conditions_latest column names
3. `20251112000003_fix_moon_cache_column_names.sql` - Fixed moon_cache.phase → moon_phase_name
4. `20251112000004_fix_species_id_column.sql` - Fixed species.species_id → id
5. `20251112000005_comprehensive_rpc_column_fix.sql` - Comprehensive column reference fixes
6. `20251112000006_fix_rpc_type_casting.sql` - Initial type casting (species_code::TEXT)
7. `20251112180000_reapply_rpc_with_numeric_fix.sql` - Added habitat_bonus numeric fix
8. `20251112190000_fix_varchar_to_text_casting.sql` - Added name_en, scientific_name casts
9. `20251112200000_fix_all_type_casting.sql` - **FINAL** - All type casts including guild, diurnal_sensitivity, flow_preference

**Total:** 9 migrations applied on November 12, 2025

---

## Key Learnings

### 1. PostgreSQL Type Strictness

PostgreSQL does NOT automatically convert between similar types in RPC functions:
- `VARCHAR(n)` ≠ `TEXT`
- `ENUM foo` ≠ `TEXT`
- Integer literals (5) ≠ `NUMERIC`

**Solution:** Always use explicit casts: `column_name::TARGET_TYPE`

### 2. Incremental Fixing

Type mismatches often require multiple iterations:
- Fix one column
- Test
- Next error reveals next column
- Repeat

**Strategy:** Fix, test, iterate until all pass.

### 3. Error Details Are Crucial

The `error.details` field tells you:
```
"Returned type X does not match expected type Y in column N"
```

- **X** = what database returned
- **Y** = what function expects
- **N** = column number (count from 1 in RETURNS TABLE)

### 4. Numeric Literals Matter

```sql
-- ❌ Returns INTEGER
THEN 5

-- ✅ Returns NUMERIC
THEN 5.0
```

Always use decimal literals (`.0`) when returning NUMERIC type.

### 5. Documentation Prevents Recurrence

Having a comprehensive schema reference:
- Speeds up development
- Prevents type mismatches before they happen
- Serves as single source of truth
- Reduces debugging time

---

## Developer Workflow (New Best Practice)

### Before Writing RPC Function:

1. ✅ Check [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) for column types
2. ✅ Review [RPC_TYPE_CASTING_GUIDE.md](./RPC_TYPE_CASTING_GUIDE.md) for common pitfalls
3. ✅ Use the prevention checklist

### While Writing RPC Function:

1. ✅ Cast all VARCHAR to TEXT: `column::TEXT`
2. ✅ Cast all ENUM to TEXT: `column::TEXT`
3. ✅ Use decimal literals in CASE: `5.0` not `5`
4. ✅ Add explicit casts for safety: `(CASE ...)::NUMERIC`

### After Writing RPC Function:

1. ✅ Create test script (see guide for template)
2. ✅ Test with real data
3. ✅ Check error.details if it fails
4. ✅ Fix one column at a time
5. ✅ Document in migration

---

## Impact

### ✅ Immediate Benefits:

1. **RPC Function Works** - `get_environmental_predictions_enhanced` now returns predictions successfully
2. **Comprehensive Documentation** - Two essential reference documents created
3. **Integrated Guidance** - References added to CLAUDE.md and GETTING_STARTED.md
4. **Prevention System** - Checklists and guides prevent future issues

### ✅ Long-Term Benefits:

1. **Faster Development** - Developers can reference schema docs instead of trial-and-error
2. **Fewer Bugs** - Type mismatches caught during design phase
3. **Easier Onboarding** - New developers have clear references
4. **Reduced Debugging Time** - Common issues documented with solutions
5. **Knowledge Preservation** - Today's learnings captured for future reference

---

## Files Modified

### New Documentation:
- `DATABASE_SCHEMA_REFERENCE.md` (470+ lines)
- `RPC_TYPE_CASTING_GUIDE.md` (500+ lines)
- `RPC_FIX_AND_DOCUMENTATION_SUMMARY_20251112.md` (this file)

### Updated Documentation:
- `CLAUDE.md` (added schema references to 2 sections)
- `GETTING_STARTED.md` (added schema reference block)

### Migrations:
- 9 migration files applied (see list above)

### Test Scripts:
- `tmp/test-rpc-fix.ts`
- `tmp/extract-schema.ts`
- `tmp/extract-schema-simple.ts`

---

## Next Steps

### Recommended Actions:

1. **Apply to Other RPC Functions** - Review and fix `get_fishing_predictions_v2` and other RPC functions
2. **Team Review** - Share new documentation with team
3. **Update Migration Template** - Include type casting checklist in migration template
4. **Add to CI/CD** - Consider adding type checking to deployment pipeline
5. **Periodic Review** - Update schema docs after each schema migration

### Future Considerations:

1. **Automated Schema Export** - Script to generate schema docs from database
2. **Type Checking Tools** - Investigate pgTAP or similar for automated RPC testing
3. **Migration Linting** - Check for common type casting issues in PR reviews
4. **Documentation Updates** - Keep schema docs in sync with migrations

---

## Resources

### Essential Reading:

1. [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Complete table and column reference
2. [RPC_TYPE_CASTING_GUIDE.md](./RPC_TYPE_CASTING_GUIDE.md) - Guide to preventing type mismatches
3. [CLAUDE.md](./CLAUDE.md#database-schema) - Database Schema section
4. [GETTING_STARTED.md](./GETTING_STARTED.md#-database-schema-key-tables) - Database overview

### Related Documentation:

- `RPC_FIX_SUMMARY.md` - October 2025 RPC fixes (similar issues)
- `RPC_CURRENT_STATE.md` - Current state of RPC functions
- `CONFIDENCE_SCORING_ALGORITHM.md` - How predictions are scored

---

## Status

✅ **COMPLETE** - All issues resolved, documentation created and integrated

**Date:** November 12, 2025
**Tested:** ✅ Both basic and GPS-enhanced prediction calls working
**Deployed:** ✅ All migrations applied to production database
**Documented:** ✅ Comprehensive schema and casting guides created

**No further action required** - System is operational and documented.

---

## Acknowledgments

**Problem Identified:** RPC function returning type mismatch errors (42804)

**Root Causes Found:**
1. VARCHAR vs TEXT type strictness
2. ENUM types not auto-casting to TEXT
3. INTEGER literals in NUMERIC-returning CASE statements
4. Legacy column names from previous migrations

**Solutions Applied:**
- Explicit type casting throughout function
- Updated column references
- Decimal numeric literals
- Comprehensive documentation

**Outcome:** Fully functional RPC with comprehensive prevention documentation.

---

**Maintained By:** Development Team
**Last Updated:** November 12, 2025
**Next Review:** After any schema changes or new RPC functions
