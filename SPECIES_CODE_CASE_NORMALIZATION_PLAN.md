# Species Code Case Normalization - Action Plan

**Date**: October 19, 2025  
**Issue**: Inconsistent casing of species codes causing lookup failures and bugs

---

## 🚨 Problem Summary

Species codes are currently **inconsistent** across the codebase:

### Current State

| Location | Normalization | Examples |
|----------|--------------|----------|
| Database (`species` table) | **Mixed Case** | `bss`, `mac`, `WRK`, `RJM`, `CSH` |
| `predictions.ts` | **lowercase** | `code.toLowerCase()` |
| `favourites/index.ts` | **UPPERCASE** | `code.toUpperCase()` |
| `speciesAdvice.ts` | **UPPERCASE** | `code.toUpperCase()` |
| `mapPrediction.ts` | **UPPERCASE** | `code.toUpperCase()` |
| `SPECIES_IMAGE_MAP` keys | **Mixed Case** | `bss`, `mac`, `BUH`, `CSH`, `WRK` |

### Issues This Causes

1. **Image lookup failures** - code `bss` doesn't match uppercase key `BSS`
2. **Advice lookup failures** - lowercase codes don't match uppercase aliases
3. **Favourites matching errors** - case mismatches between live predictions and stored favourites
4. **Unpredictable behavior** - depends on which function normalizes first

---

## ✅ Recommended Solution

**Standardize ALL species codes to UPPERCASE**

### Why Uppercase?

1. ✅ **FAO standard** - Official FAO species codes are uppercase (BSS, COD, MAC)
2. ✅ **Already majority** - Most normalization functions use uppercase
3. ✅ **Visual distinction** - Easier to spot species codes in logs
4. ✅ **Database convention** - Most SQL conventions use uppercase for codes

---

## 📋 Implementation Plan

### Phase 1: Database Normalization (Critical)

**Update all lowercase species codes in database to uppercase:**

```sql
-- Step 1: Check current state
SELECT 
  species_code,
  CASE 
    WHEN species_code != UPPER(species_code) THEN 'Mixed/Lower'
    ELSE 'Upper'
  END as case_type,
  name_en
FROM species
WHERE species_code != UPPER(species_code)
ORDER BY species_code;

-- Step 2: Update to uppercase (DRY RUN FIRST)
UPDATE species
SET species_code = UPPER(species_code)
WHERE species_code != UPPER(species_code);

-- Step 3: Verify
SELECT COUNT(*) FROM species WHERE species_code != UPPER(species_code);
-- Should return 0

-- Step 4: Create constraint to enforce uppercase
ALTER TABLE species
ADD CONSTRAINT species_code_uppercase CHECK (species_code = UPPER(species_code));
```

**Impact**: Updates approximately 20-30 species records  
**Affected species**: bss → BSS, mac → MAC, cod → COD, brs → BRS, etc.

---

### Phase 2: Code Normalization Functions

**Update all normalization functions to use UPPERCASE:**

#### File: `pages/api/findr/predictions.ts`

```typescript
// BEFORE (Line 203):
function normalizeSpeciesCode(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;  // ❌ WRONG
}

// AFTER:
function normalizeSpeciesCode(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;  // ✅ CORRECT
}
```

**Status**: ⚠️ NEEDS FIX

---

#### File: `pages/api/findr/favourites/index.ts`

```typescript
// Line 132-136:
const normalizeSpeciesCode = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;  // ✅ ALREADY CORRECT
};
```

**Status**: ✅ Already correct

---

#### File: `data/speciesAdvice.ts`

```typescript
// Line 169:
function resolveEntryKey(commonName?: string | null, speciesCode?: string | null): string | null {
  if (speciesCode) {
    const normalisedCode = speciesCode.trim().toUpperCase();  // ✅ ALREADY CORRECT
    const byCode = SPECIES_CODE_ALIASES[normalisedCode];
    // ...
  }
}
```

**Status**: ✅ Already correct

---

#### File: `lib/findr/mapPrediction.ts`

```typescript
// Line 460:
function resolveSpeciesImage(
  speciesCode?: string | null,
  commonName?: string | null
): SpeciesImageInfo | undefined {
  if (speciesCode) {
    const normalized = speciesCode.trim().toUpperCase();  // ✅ ALREADY CORRECT
    if (normalized && SPECIES_IMAGE_MAP[normalized]) {
      return SPECIES_IMAGE_MAP[normalized];
    }
  }
  // ...
}
```

**Status**: ✅ Already correct

---

### Phase 3: SPECIES_IMAGE_MAP Regeneration

**Regenerate image map with uppercase keys:**

```bash
# Run the species image map generator
npx tsx scripts/generate-species-image-map.ts

# Then run blur placeholder generator  
npx tsx scripts/update-species-image-map-with-blur.ts
```

**File to update**: `data/speciesImageMap.ts`

**Changes**:
- All keys must be uppercase: `BSS`, `COD`, `MAC`, `BUH`, `CSH`, etc.
- Currently mixed: `bss` (lowercase) and `BUH` (uppercase)

**Example transformation**:
```typescript
// BEFORE:
export const SPECIES_IMAGE_MAP: Record<string, SpeciesImageInfo> = {
  'bss': { code: 'bss', name: 'Sea Bass', ... },  // ❌ lowercase
  'BUH': { code: 'BUH', name: 'Bull Huss', ... },  // ✅ uppercase
  'cod': { code: 'cod', name: 'Cod', ... },        // ❌ lowercase
  'CSH': { code: 'CSH', name: 'Smoothhound', ... }, // ✅ uppercase
};

// AFTER:
export const SPECIES_IMAGE_MAP: Record<string, SpeciesImageInfo> = {
  'BSS': { code: 'BSS', name: 'Sea Bass', ... },  // ✅ uppercase
  'BUH': { code: 'BUH', name: 'Bull Huss', ... },  // ✅ uppercase
  'COD': { code: 'COD', name: 'Cod', ... },        // ✅ uppercase
  'CSH': { code: 'CSH', name: 'Smoothhound', ... }, // ✅ uppercase
};
```

---

### Phase 4: Update Species Code Aliases

**File**: `data/speciesAdvice.ts` (Lines 120-165)  
**File**: `pages/findr/favourites.tsx` (Lines 70-77)

Ensure all alias mappings use **UPPERCASE** keys and values:

```typescript
// CORRECT:
const SPECIES_CODE_ALIASES: Record<string, string> = {
  'AMB': 'greater-amberjack',  // ✅ uppercase key
  'BBR': 'black-seabream',
  'COD': 'cod',
  'FLE': 'FLO',  // ✅ uppercase alias mapping
  'CSH': 'DOG',
  'BRS': 'BBR',
  // ...
};
```

**Status**: ✅ Already correct in both files

---

### Phase 5: SQL Migration Scripts

**Update historical SQL scripts that reference species codes:**

Files to check:
- `batch_complete_*.sql`
- `DEPLOY_*.sql`
- `TEST_*.sql`
- `scripts/migrate-*.sql`

**Example fix**:
```sql
-- BEFORE:
WHERE species_code = 'bss'

-- AFTER:
WHERE species_code = 'BSS'
```

⚠️ **Note**: Only update new/future scripts. Leave historical scripts as documentation.

---

### Phase 6: Frontend Hardcoded References

**Search for hardcoded species codes in frontend:**

```bash
grep -r "species.*code.*=.*['\"]" pages/ components/ --include="*.tsx" --include="*.ts"
```

**Update any hardcoded references**:
```typescript
// BEFORE:
if (speciesCode === 'bss') { ... }

// AFTER:
if (speciesCode === 'BSS') { ... }
```

---

### Phase 7: Testing & Validation

#### Unit Tests

```typescript
// Add test cases
describe('normalizeSpeciesCode', () => {
  it('should normalize to uppercase', () => {
    expect(normalizeSpeciesCode('bss')).toBe('BSS');
    expect(normalizeSpeciesCode('BSS')).toBe('BSS');
    expect(normalizeSpeciesCode('Bss')).toBe('BSS');
  });
  
  it('should handle null/empty', () => {
    expect(normalizeSpeciesCode(null)).toBe(null);
    expect(normalizeSpeciesCode('')).toBe(null);
    expect(normalizeSpeciesCode('  ')).toBe(null);
  });
});
```

#### Integration Tests

1. **Image Resolution Test**:
   ```typescript
   const image = resolveSpeciesImage('BSS', 'Sea Bass');
   expect(image).toBeDefined();
   expect(image?.image).toContain('sea-bass');
   ```

2. **Advice Lookup Test**:
   ```typescript
   const advice = getSpeciesAdvice('Sea Bass', 'BSS');
   expect(advice).toBeDefined();
   expect(advice?.shore?.baits).toBeDefined();
   ```

3. **Predictions API Test**:
   ```bash
   curl http://localhost:3000/api/findr/predictions?rectangleCode=39F3 | jq '.predictions[0].species_code'
   # Should return uppercase: "BSS"
   ```

4. **Favourites API Test**:
   ```bash
   curl http://localhost:3000/api/findr/favourites -H "Authorization: Bearer TOKEN"
   # All species_code fields should be uppercase
   ```

---

## 📊 Impact Analysis

### Database Changes

| Table | Column | Rows Affected | Change |
|-------|--------|--------------|--------|
| `species` | `species_code` | ~25 rows | lowercase → UPPERCASE |
| `species_frequency` | `species_code` (FK) | 0 (cascades) | Auto-updated |
| `favourite_species` | Species ID matching | 0 (uses UUID) | No change |

### Breaking Changes

**None** - All changes are internal normalization. External APIs already accept any case and normalize internally.

### Performance Impact

**Negligible** - Case conversion is O(n) where n = string length (3 chars), adds ~0.001ms per call.

---

## ✅ Implementation Checklist

### Pre-Deployment

- [ ] Back up `species` table
- [ ] Test SQL updates on staging database
- [ ] Run species image map generator
- [ ] Update all normalization functions
- [ ] Add database constraint
- [ ] Run TypeScript compilation check
- [ ] Run ESLint check

### Deployment

- [ ] Execute database migration
- [ ] Deploy code changes
- [ ] Verify no console errors
- [ ] Test image loading (check network tab)
- [ ] Test species advice lookup
- [ ] Test favourites matching
- [ ] Check predictions API response

### Post-Deployment Validation

- [ ] Monitor error logs for case-related issues
- [ ] Verify image CDN cache warming
- [ ] Check favourites confidence scores still match
- [ ] Validate species modal opens correctly
- [ ] Test on mobile devices

---

## 🔍 Verification Queries

### Check Database Consistency

```sql
-- All species codes should be uppercase
SELECT species_code, name_en
FROM species
WHERE species_code != UPPER(species_code);
-- Should return 0 rows

-- Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'species_code_uppercase';
```

### Check API Responses

```bash
# Predictions API
curl -s "http://localhost:3000/api/findr/predictions?rectangleCode=39F3" | \
  jq -r '.predictions[] | .species_code' | \
  grep -v '^[A-Z]*$'
# Should return nothing (all uppercase)

# Favourites API  
curl -s "http://localhost:3000/api/findr/favourites" \
  -H "Authorization: Bearer $TOKEN" | \
  jq -r '.favourites[] | .species_code' | \
  grep -v '^[A-Z]*$'
# Should return nothing (all uppercase)
```

---

## 📝 Files to Modify

### Critical (Must Fix)

1. ✅ `pages/api/findr/predictions.ts` - Line 203 (toLowerCase → toUpperCase)
2. ⚠️ Database - UPDATE species SET species_code = UPPER(species_code)
3. ⚠️ `data/speciesImageMap.ts` - Regenerate with uppercase keys

### Already Correct (No Changes)

1. ✅ `pages/api/findr/favourites/index.ts` - Line 132 (already uppercase)
2. ✅ `data/speciesAdvice.ts` - Line 169 (already uppercase)
3. ✅ `lib/findr/mapPrediction.ts` - Line 460 (already uppercase)
4. ✅ `pages/findr/favourites.tsx` - Line 70 (SPECIES_CODE_ALIASES already uppercase)

### Optional (SQL Scripts - Historical Record)

- `batch_complete_*.sql` - Leave as-is (historical)
- `DEPLOY_*.sql` - Leave as-is (historical)
- Future SQL scripts - Use uppercase

---

## 🎯 Expected Outcome

After implementation:

1. **All species codes in database**: UPPERCASE
2. **All normalization functions**: Return UPPERCASE
3. **All SPECIES_IMAGE_MAP keys**: UPPERCASE
4. **All API responses**: Return UPPERCASE codes
5. **Database constraint**: Enforces uppercase on INSERT/UPDATE
6. **Zero lookup failures**: Due to case mismatches

---

## 🚀 Next Steps

1. **Review this plan** with team
2. **Test on staging** database first
3. **Execute Phase 1** (database migration)
4. **Execute Phase 2** (code normalization)
5. **Execute Phase 3** (regenerate image map)
6. **Execute Phase 7** (testing)
7. **Deploy to production**
8. **Monitor for 24 hours**

---

**Estimated Implementation Time**: 2-3 hours  
**Risk Level**: Low (internal normalization, no API changes)  
**Rollback Plan**: Restore database backup, revert code commits
