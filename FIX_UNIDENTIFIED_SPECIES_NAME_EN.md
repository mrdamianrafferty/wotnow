# Fix: Unidentified Species Bug (Missing name_en)

## Problem
Fish species were showing as "Unidentified species" in the swipable cards, even though they had scientific names like "(Scomber colias)".

## Root Cause
The augmentation function in `/pages/api/findr/predictions.ts` was not:
1. Collecting `name_en` from predictions to query the species table
2. Populating `name_en` back into the results when it was missing

This meant that when the database function returned predictions with `scientific_name` but potentially missing or malformed `species_code`, the augmentation couldn't match the species and populate the common name.

## Solution

### 1. Added name_en to SpeciesLocalizationRow interface
```typescript
interface SpeciesLocalizationRow {
  species_code: string | null;
  scientific_name: string | null;
  name_en: string | null;  // ← ADDED
  name_fr: string | null;
  // ... other localized names
}
```

### 2. Collect name_en from predictions
Now we collect common names alongside species codes and scientific names:
```typescript
const commonNames = new Set<string>();
// ... collect name_en, species_name, common_name from predictions
```

### 3. Query species table by name_en
Added a third query fallback using `name_en`:
```typescript
if (remainingCommonNames.length > 0) {
  const { data, error } = await supabase
    .from('species')
    .select('species_code, scientific_name, name_en, name_fr, ..., playful_bio_en')
    .in('name_en', remainingCommonNames);
}
```

### 4. Create byCommonName lookup map
```typescript
const byCommonName = new Map<string, SpeciesLocalizationRow>();
// Map name_en to localization rows
```

### 5. Match by common name as fallback
```typescript
let match: SpeciesLocalizationRow | undefined;
if (normalizedCode && byCode.has(normalizedCode)) {
  match = byCode.get(normalizedCode);
} else if (normalizedScientific && byScientific.has(normalizedScientific)) {
  match = byScientific.get(normalizedScientific);
} else if (commonName && byCommonName.has(commonName)) {
  match = byCommonName.get(commonName);  // ← NEW FALLBACK
}
```

### 6. Populate name_en in results
Most importantly, now we populate the common name if it's missing:
```typescript
// Populate name_en if missing (critical for avoiding "Unidentified species")
if (!result.name_en && match.name_en) {
  result.name_en = match.name_en as unknown as JsonValue;
}

if (!result.species_name && match.name_en) {
  result.species_name = match.name_en as unknown as JsonValue;
}

// Also populate species_code if missing
if (!result.species_code && match.species_code) {
  result.species_code = match.species_code as unknown as JsonValue;
}
```

## Matching Priority
The augmentation now tries to match species in this order:
1. `species_code` (most reliable)
2. `scientific_name` (good fallback)
3. `name_en` (common name - new fallback)

## Data Flow
1. Database function returns predictions with `name_en`, `scientific_name`, `species_code`, `playful_bio_en`
2. API collects all three identifiers from predictions
3. API queries species table using all three methods
4. API matches predictions to species data by trying code → scientific → common name
5. API populates missing fields (`name_en`, `species_code`, `playful_bio`) into results
6. Frontend receives complete data with proper common names
7. Cards display proper species names instead of "Unidentified species"

## Files Modified
- `/pages/api/findr/predictions.ts` - Enhanced augmentation logic

## Testing
Clear cache and reload Findr to see proper species names instead of "Unidentified species".

## Date
17 October 2025
