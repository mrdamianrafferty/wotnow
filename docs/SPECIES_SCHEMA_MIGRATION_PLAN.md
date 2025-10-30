# Species Schema Migration Plan

**Date**: 2025-10-30
**Status**: PLANNING
**Goal**: Standardize species naming with scientific name as canonical key, add aliases for common names

---

## Current State Analysis

### Existing Schema (180 species)
```typescript
species {
  id: UUID                    // Primary key (Supabase RLS, foreign keys)
  species_code: VARCHAR       // UNIQUE - legacy identifier (e.g., "COD", "BSS")
  scientific_name: VARCHAR    // UNIQUE - already enforced
  name_en: VARCHAR            // English common name
  name_fr, name_es, name_de, name_it, name_pt: VARCHAR  // Localized names
  // ... 50+ other columns
}
```

### Current Usage Patterns
- `species_code` used as lookup key in 20+ files
- `id` (UUID) used for foreign keys (favourites, catch logs, etc.)
- `scientific_name` currently underutilized but already unique

---

## Target State

### New Schema
```typescript
species {
  id: UUID                    // UNCHANGED - Primary key
  species_code: VARCHAR       // DEPRECATED BUT KEPT - for backward compat
  scientific_name: VARCHAR    // CANONICAL LOOKUP KEY
  name_en: VARCHAR            // Official English common name
  aliases: TEXT[]             // NEW - common names like "dogfish", "common dogfish"
  name_fr, name_es, ...       // UNCHANGED - keep localized columns
  slug: VARCHAR               // NEW - URL-friendly scientific name
  // ... other columns unchanged
}
```

### Example Data
```typescript
{
  id: "uuid-here",
  species_code: "DOGFISH",  // deprecated
  scientific_name: "Scyliorhinus canicula",  // CANONICAL
  name_en: "Small-spotted Catshark",
  aliases: ["dogfish", "common dogfish", "lesser spotted dogfish", "rough hound"],
  slug: "scyliorhinus-canicula",
  name_fr: "Petite roussette",
  name_es: "Pintarroja",
  // ...
}
```

---

## Migration Strategy: 7-Phase Approach

### **Phase 1: Schema Enhancement (NON-BREAKING)**
**Goal**: Add new fields without breaking existing functionality

**Actions**:
1. Add `aliases TEXT[]` column (default empty array)
2. Add `slug VARCHAR` column (generated from scientific_name)
3. Add index on `scientific_name` (already unique, add performance index)
4. Add GIN index on `aliases` for fast array search
5. Add generated column for `slug` (lowercase, hyphenated scientific_name)

**Migration**: `20251030000002_add_species_aliases_and_slug.sql`

**Risk**: LOW - additive only, no breaking changes

---

### **Phase 2: Data Population**
**Goal**: Populate `aliases` with common names

**Actions**:
1. Research common names for all 180 species
2. Create mapping: `scientific_name` → `aliases[]`
3. Run migration to populate `aliases` column
4. Verify data quality

**Sources for Common Names**:
- FishBase (fishbase.org)
- ICES vocabulary
- Regional fishing guides
- User feedback

**Migration**: Manual data script + migration

**Risk**: MEDIUM - requires research and validation

---

### **Phase 3: Helper Functions & Utilities**
**Goal**: Create lookup helpers that work with any identifier

**Actions**:
1. Create `find_species_by_identifier(identifier TEXT)` RPC function
   - Accepts: scientific_name, species_code, name_en, or any alias
   - Returns: full species record
2. Create TypeScript helper: `lib/species/lookup.ts`
   - `findSpecies(identifier: string)`
   - `findSpeciesByScientificName(name: string)`
   - `findSpeciesByAlias(alias: string)`
3. Add species search endpoint: `/api/species/search`

**Migration**: `20251030000003_add_species_lookup_function.sql`

**Risk**: LOW - new functions, no breaking changes

---

### **Phase 4: API Layer Migration**
**Goal**: Update API endpoints to use `scientific_name` as primary key

**Files to Update**:
- `/pages/api/findr/predictions.ts` - Add scientific_name to response
- `/pages/api/findr/species-details.ts` - Accept scientific_name param
- `/pages/api/findr/catch-log.ts` - Link catches to scientific_name
- `/pages/api/findr/favourites.ts` - Accept scientific_name

**Strategy**:
- Return BOTH `species_code` and `scientific_name` during transition
- Add deprecation warnings to API docs
- Frontend can start using scientific_name immediately

**Risk**: LOW - backward compatible

---

### **Phase 5: Frontend Component Updates**
**Goal**: Update UI components to use new schema

**Components to Update**:
- `SpeciesCard` - use scientific_name as key
- `SpeciesDetailsModal` - fetch by scientific_name
- `FavouritesPage` - display with aliases
- `CatchLogForm` - search with aliases
- `PredictionsDisplay` - show aliases in UI

**TypeScript Types**:
```typescript
interface Species {
  id: string;  // UUID
  scientificName: string;  // CANONICAL
  speciesCode: string;  // @deprecated
  nameEn: string;
  aliases: string[];
  slug: string;
  // ...
}
```

**Risk**: MEDIUM - UI changes, testing required

---

### **Phase 6: Search & Autocomplete**
**Goal**: Enable fuzzy search using aliases

**Actions**:
1. Create species search component with autocomplete
2. Search across: scientific_name, name_en, aliases, localized names
3. Add "aka" badge in UI to show aliases
4. Update catch log species selector with alias search

**Example UI**:
```
Sea Bass (Dicentrarchus labrax)
aka: European Bass, Bar, Lubina
```

**Risk**: LOW - new feature, no breaking changes

---

### **Phase 7: Cache Clear & Verification**
**Goal**: Ensure all systems work with new schema

**Actions**:
1. Clear `findr_prediction_sessions` cache table
2. Run comprehensive tests across all endpoints
3. Verify RPC functions still work
4. Check frontend displays correctly
5. Test search/autocomplete
6. Monitor logs for deprecation warnings

**Verification Script**: `/scripts/test-species-schema-migration.ts`

**Risk**: LOW - final validation step

---

## Database Migrations Timeline

### Migration 1: `20251030000002_add_species_aliases_and_slug.sql`
```sql
-- Add aliases column
ALTER TABLE species ADD COLUMN aliases TEXT[] DEFAULT '{}';

-- Add slug column (generated from scientific_name)
ALTER TABLE species ADD COLUMN slug VARCHAR
  GENERATED ALWAYS AS (
    lower(regexp_replace(scientific_name, '[^a-zA-Z0-9]+', '-', 'g'))
  ) STORED;

-- Add indexes for fast lookup
CREATE INDEX idx_species_scientific_name ON species(scientific_name);
CREATE INDEX idx_species_slug ON species(slug);
CREATE INDEX idx_species_aliases_gin ON species USING GIN (aliases);

-- Add comment
COMMENT ON COLUMN species.aliases IS 'Common names and alternative names for species search';
COMMENT ON COLUMN species.slug IS 'URL-friendly version of scientific_name';
```

### Migration 2: `20251030000003_add_species_lookup_function.sql`
```sql
CREATE OR REPLACE FUNCTION find_species_by_identifier(identifier TEXT)
RETURNS SETOF species
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM species
  WHERE
    scientific_name ILIKE identifier
    OR species_code ILIKE identifier
    OR name_en ILIKE identifier
    OR identifier = ANY(aliases)
  LIMIT 1;
END;
$$;
```

---

## Key Decisions

### ✅ What We're Keeping
- `id` (UUID) as primary key - used by Supabase RLS
- `species_code` - deprecated but kept for backward compat
- Localized name columns (name_fr, name_es, etc.)
- All environmental/behavioral data

### ✅ What We're Adding
- `aliases TEXT[]` - common English names
- `slug VARCHAR` - URL-friendly scientific name
- Search/lookup helper functions
- Indexes for performance

### ✅ What We're Changing
- **Canonical Key**: `species_code` → `scientific_name`
- **API Responses**: Add `scientific_name` and `aliases`
- **Frontend**: Use `scientific_name` as React keys
- **Search**: Enable alias-based fuzzy search

### ❌ What We're NOT Doing
- Removing `species_code` (backward compat)
- Changing foreign key relationships
- Modifying RLS policies
- Removing or renaming localized columns

---

## Rollback Plan

If issues arise at any phase:

**Phase 1-3**: Simple rollback
- Drop new columns: `aliases`, `slug`
- Drop new indexes
- Drop helper functions

**Phase 4-6**: Partial rollback
- Revert API changes (git)
- Keep database changes (they're non-breaking)
- Frontend continues using `species_code`

**Phase 7**: Full rollback requires:
- Database backup restore
- Code revert to previous version
- Cache clear

---

## Testing Strategy

### Unit Tests
- [ ] Species lookup helper functions
- [ ] Alias search functionality
- [ ] Slug generation

### Integration Tests
- [ ] API endpoints return correct data
- [ ] RPC functions work with new schema
- [ ] Catch logs link correctly
- [ ] Favourites use new identifiers

### E2E Tests
- [ ] Species search with aliases
- [ ] Species details page loads
- [ ] Predictions display correctly
- [ ] Catch log form works

---

## Timeline Estimate

**Total Time**: 2-3 days

- **Phase 1** (Schema): 1 hour
- **Phase 2** (Data): 4-6 hours (research + populate)
- **Phase 3** (Helpers): 2 hours
- **Phase 4** (API): 3-4 hours
- **Phase 5** (Frontend): 6-8 hours
- **Phase 6** (Search): 3-4 hours
- **Phase 7** (Testing): 2-3 hours

---

## Success Criteria

✅ All 180 species have populated `aliases`
✅ Species lookup works with any identifier
✅ API returns `scientific_name` and `aliases`
✅ Frontend displays aliases in UI
✅ Search/autocomplete works with aliases
✅ All existing functionality preserved
✅ No breaking changes to external APIs
✅ Performance maintained or improved

---

## Next Steps

1. ✅ Create this migration plan document
2. [ ] Start Phase 1: Create schema migration
3. [ ] Get sample aliases for testing (10-20 species)
4. [ ] Test Phase 1 migration on development
5. [ ] Proceed with subsequent phases

---

## Notes

- This migration is **non-breaking** by design
- Can pause at any phase without breaking production
- Aliases can be populated gradually (not all at once)
- Frontend migration can happen incrementally
- Users will see improvements as each phase completes
