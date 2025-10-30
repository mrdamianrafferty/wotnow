# Species Schema Migration - Phase 4 Proposal

**Date**: 2025-10-30
**Status**: AWAITING DECISION
**Context**: Phases 1-3 Complete, Phase 4 In Progress

---

## Executive Summary

We've successfully completed the first 3 phases of the species schema migration:
- ✅ **Phase 1**: Added `aliases` and `slug` columns to the species table
- ✅ **Phase 2**: Migrated 130 existing aliases from legacy tables (44 species now have 88 total aliases)
- ✅ **Phase 3**: Created lookup helper functions (`find_species_by_identifier`, `search_species_by_name`)

**Phase 4 Discovery**: The predictions API already returns `scientific_name`, but is missing `slug` and `aliases` fields. The blocker is that these fields need to be added to the `get_global_fishing_predictions()` RPC function, which is a large (~700 line) database function.

---

## Current State Analysis

### What's Working
- ✅ Database has `species.aliases` and `species.slug` columns with data
- ✅ Helper functions work: `find_species_by_identifier('cod')` returns correct species
- ✅ `scientific_name` is already in the predictions RPC function return type
- ✅ All migrations applied successfully with no breaking changes

### What's Missing
The `get_global_fishing_predictions()` RPC function needs two additions:

**1. Return Type (RETURNS TABLE)**
```sql
-- Current (missing):
RETURNS TABLE (
  species_id uuid,
  species_code text,
  name_en text,
  scientific_name text,  -- ✅ Already present
  playful_bio_en text,
  -- ... other fields
)

-- Needs to become:
RETURNS TABLE (
  species_id uuid,
  species_code text,
  name_en text,
  scientific_name text,
  slug text,              -- ➕ ADD THIS
  aliases text[],         -- ➕ ADD THIS
  playful_bio_en text,
  -- ... other fields
)
```

**2. SELECT Statement (in function body)**
```sql
-- Current query selects from species:
SELECT
  s.id as species_id,
  s.species_code,
  s.name_en,
  s.scientific_name,  -- ✅ Already present
  -- ... other fields

-- Needs to add:
SELECT
  s.id as species_id,
  s.species_code,
  s.name_en,
  s.scientific_name,
  s.slug,              -- ➕ ADD THIS
  s.aliases,           -- ➕ ADD THIS
  -- ... other fields
```

---

## Options for Completion

### **Option 1: Automated Migration (Recommended for Speed)**

**Approach**: Export the function, programmatically modify it, and apply via migration.

**Steps**:
1. Export current function definition from database
2. Parse and modify to add `slug` and `aliases`:
   - Add to `RETURNS TABLE` signature
   - Add to main `SELECT` statement (likely around line 400-500)
3. Create migration file with `CREATE OR REPLACE FUNCTION`
4. Apply with `supabase db push`
5. Test predictions API to verify new fields

**Pros**:
- Fast: Can be completed in ~30 minutes
- Automated: Less risk of typos
- Testable: Can verify changes before applying

**Cons**:
- Risk of breaking function if parsing is incorrect
- Need to handle complex SQL parsing

**Risk Level**: 🟡 MEDIUM (function is complex, but changes are minimal)

---

### **Option 2: Manual Database Update (Safest)**

**Approach**: Manually update the function via Supabase Dashboard or psql.

**Steps**:
1. Run query to export function:
   ```sql
   SELECT pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname = 'get_global_fishing_predictions';
   ```
2. Copy output to text editor
3. Manually add `slug text,` and `aliases text[],` to RETURNS TABLE
4. Manually add `s.slug,` and `s.aliases,` to SELECT statement
5. Run `CREATE OR REPLACE FUNCTION` via Supabase Dashboard SQL Editor
6. Test with direct query:
   ```sql
   SELECT species_code, scientific_name, slug, aliases
   FROM get_global_fishing_predictions(43.5, -5.25, '2025-10-29', 'en')
   LIMIT 3;
   ```
7. Create empty migration file documenting the manual change

**Pros**:
- Full control over changes
- Can test incrementally
- Visual verification in SQL editor

**Cons**:
- Slower: ~1-2 hours manual work
- Risk of typos
- No automatic rollback (need manual revert)

**Risk Level**: 🟢 LOW (direct control, can test before applying)

---

### **Option 3: Defer Phase 4 (Pragmatic)**

**Approach**: Skip updating the RPC function for now, add fields in API layer instead.

**Steps**:
1. Leave RPC function unchanged
2. Update `/pages/api/findr/predictions.ts` to join species data:
   ```typescript
   const predictions = await rpc('get_global_fishing_predictions', ...)

   // Fetch species details with slug/aliases
   const speciesIds = predictions.map(p => p.species_id)
   const speciesDetails = await from('species')
     .select('id, slug, aliases')
     .in('id', speciesIds)

   // Merge data in API layer
   return predictions.map(p => ({
     ...p,
     slug: speciesDetails.find(s => s.id === p.species_id)?.slug,
     aliases: speciesDetails.find(s => s.id === p.species_id)?.aliases
   }))
   ```
3. Document this as technical debt to fix later

**Pros**:
- Zero database risk
- Can continue with Phases 5-7 immediately
- API gets the fields it needs

**Cons**:
- Additional database query (N+1 problem if not batched)
- Performance hit (though likely minimal)
- Technical debt

**Risk Level**: 🟢 LOW (no database changes)

---

### **Option 4: Hybrid Approach (Balanced)**

**Approach**: Do Option 3 now, schedule Option 1 or 2 for next maintenance window.

**Steps**:
1. Implement Option 3 to unblock frontend work
2. Complete Phases 5-7 (frontend updates)
3. Schedule proper RPC function update for later
4. When updating RPC, can remove API-layer workaround

**Pros**:
- Unblocks progress immediately
- Allows time to plan RPC function change carefully
- Can test frontend with real data before committing to DB changes

**Cons**:
- Two-step process
- Temporary performance impact

**Risk Level**: 🟢 LOW (incremental approach)

---

##  Recommendation

**Recommended**: **Option 4 (Hybrid Approach)**

**Rationale**:
1. **Unblocks Progress**: We can continue with frontend work (Phases 5-7) immediately
2. **Low Risk**: No database function changes yet
3. **Flexibility**: Gives time to decide on Option 1 vs 2 for the RPC update
4. **Testable**: Can verify the full system works before committing to database changes

**Implementation Timeline**:
- **Now** (30 min): Implement API-layer data merging (Option 3)
- **Today** (2-3 hours): Complete Phases 5-7 (frontend updates)
- **Next Session** (1-2 hours): Update RPC function (choose Option 1 or 2)

---

## Technical Details

### Current RPC Function Signature
```sql
CREATE OR REPLACE FUNCTION get_global_fishing_predictions(
  user_lat numeric,
  user_lon numeric,
  target_date date DEFAULT CURRENT_DATE,
  p_lang text DEFAULT 'en',
  user_depth_m numeric DEFAULT NULL
)
RETURNS TABLE (
  species_id uuid,
  species_code text,
  name_en text,
  scientific_name text,
  playful_bio_en text,
  grid_cell_id text,
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bite_score integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
  depth_score integer,
  light_score integer,
  habitat_bonus integer,
  lunar_score integer,
  weather_score integer,
  tidal_score integer,
  freshness_score integer,
  completeness_score integer,
  moon_phase text,
  moon_illumination numeric,
  biogeographic_regions text[],
  has_environmental_data boolean,
  data_source text,
  factors jsonb
)
```

### Required Changes Location
Based on analysis of migration `20251024000006_fix_temp_opt_c_case_types.sql`:
- **Line ~15**: Add to RETURNS TABLE after `scientific_name text,`
- **Line ~400-500**: Add to main SELECT statement where species fields are selected

### Testing Commands
```bash
# Test RPC directly (after update)
PGPASSWORD="..." psql -h db.supabase... -d postgres -c "
  SELECT species_code, scientific_name, slug, aliases
  FROM get_global_fishing_predictions(43.5, -5.25, '2025-10-29', 'en')
  LIMIT 3;
"

# Test API endpoint
curl -X POST http://localhost:3000/api/findr/predictions \
  -H 'Content-Type: application/json' \
  -d '{"latitude":43.5,"longitude":-5.25,"predictionDate":"2025-10-29","language":"en","bypassCache":true}' \
  | jq '.predictions[0] | {species_code, scientific_name, slug, aliases}'
```

---

## Decision Required

**Please choose one of the following**:

- [ ] **Option 1**: Automated migration (fastest, medium risk)
- [ ] **Option 2**: Manual database update (safest, slower)
- [ ] **Option 3**: API-layer workaround only (low risk, technical debt)
- [ ] **Option 4**: Hybrid approach (recommended - do Option 3 now, RPC update later)

**Additional Questions**:
1. Do you have a preference for timing? (now vs later maintenance window)
2. Is performance critical? (affects Option 3 vs Options 1/2)
3. Are you comfortable with the ~700 line RPC function being modified?

---

## Files Changed So Far

### Migrations Created
- ✅ `20251030000002_add_species_aliases_and_slug.sql` - Phase 1
- ✅ `20251030000003_migrate_existing_aliases.sql` - Phase 2
- ✅ `20251030000004_add_species_lookup_functions.sql` - Phase 3
- ⏳ `20251030000005_add_slug_aliases_to_predictions_rpc.sql` - Phase 4 (placeholder)

### Documentation Created
- ✅ `SPECIES_SCHEMA_MIGRATION_PLAN.md` - Master plan
- 📄 `SPECIES_SCHEMA_MIGRATION_PHASE4_PROPOSAL.md` - **THIS FILE**

---

## Next Steps (After Decision)

**If Option 1 or 2 chosen**:
1. Update RPC function definition
2. Apply migration
3. Test predictions API
4. Proceed to Phase 5 (frontend updates)

**If Option 3 or 4 chosen**:
1. Modify `/pages/api/findr/predictions.ts`
2. Test API response
3. Proceed to Phase 5 (frontend updates)
4. (Option 4 only) Schedule RPC update for later

---

## Rollback Plan

**If RPC update fails**:
```sql
-- Revert to previous function definition
-- (backed up in migration history or can export before changes)
```

**If API-layer workaround has issues**:
```typescript
// Simply remove the species details fetch
// API will return without slug/aliases (non-breaking)
```

---

**Status**: ⏸️ PAUSED - Awaiting user decision on approach
