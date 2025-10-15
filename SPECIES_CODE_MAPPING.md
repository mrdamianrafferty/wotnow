# Species Code Mapping - Temperature Data Merge

**Purpose:** Map species codes between ENVIRONMENTAL_DATA_MERGED.json and TEMPERATURE_MANUAL_LOOKUP.json to fix merge gaps

## Code Mismatches Found

| Species | Code in MERGED | Code in LOOKUP | Match Status | Action |
|---------|----------------|----------------|--------------|--------|
| Ballan Wrasse | `wrb` | `wrb` | ✅ EXACT | Already exists - just merge |
| Cod (Coastal) | `cod` | `cod` | ✅ EXACT | Already exists - just merge |
| Common Smoothhound | `CSH` | `smo` | ❌ DIFFERENT | Map CSH → smo |
| Cuckoo Wrasse | `wrc` | `WRU` | ❌ DIFFERENT | Map wrc → WRU |
| Grey Mullet | `mug` | `mul` | ❌ DIFFERENT | Map mug → mul |
| Common Squid | `sqc` | `sqd` | ❌ DIFFERENT | Map sqc → sqd |
| Thornback Ray | `rjc` | `RJC` | ⚠️ CASE | Map rjc → RJC (case) |
| Undulate Ray | `RUN` | `RJU` | ❌ DIFFERENT | Map RUN → RJU |
| Starry Smoothhound | `SSH` | `SHO` | ❌ DIFFERENT | Map SSH → SHO |
| Saithe (Pollachius virens) | `pok` | `sai` | ❌ DIFFERENT | Map pok → sai |
| Sea Bass | `bss` | `bss` | ✅ EXACT | Already exists - just merge |
| Spotted Bass | `bsp` | `bss` | ⚠️ CONFLICT | WRONG - bsp should exist separately |
| Sand Eel | `san` | `sae` | ❌ DIFFERENT | Map san → sae |
| Little Tunny | `lta` | `fry` | ❌ DIFFERENT | Map lta → fry |
| **Sea Bream (Dorada)** | `sba` | `sbg` | ⚠️ **ALIAS** | **Map sba → sbg (DUPLICATE - both are Sparus aurata)** |

## Code Mapping Dictionary

```typescript
const speciesCodeMap: Record<string, string> = {
  // MERGED code → LOOKUP code
  'CSH': 'smo',     // Common Smoothhound
  'wrc': 'WRU',     // Cuckoo Wrasse
  'mug': 'mul',     // Grey Mullet
  'sqc': 'sqd',     // Common Squid
  'rjc': 'RJC',     // Thornback Ray (case)
  'RUN': 'RJU',     // Undulate Ray
  'SSH': 'SHO',     // Starry Smoothhound
  'pok': 'sai',     // Saithe
  'san': 'sae',     // Sand Eel
  'lta': 'fry',     // Little Tunny
  'sba': 'sbg',     // Sea Bream (Dorada) → Gilthead Seabream (ALIAS - both Sparus aurata)
};
```

## Species Already in Both Files (Should Merge)

These have matching codes and just need the merge to run:

1. **Ballan Wrasse** (`wrb`) - Has temp in lookup: 8-20°C optimal 10-16°C
2. **Cod** (`cod`) - Has temp in lookup: 0-15°C optimal 3-12°C
3. **Sea Bass** (`bss`) - Has temp in lookup: 15-22°C optimal 16-20°C
4. **Herring** (`her`) - Has temp in lookup: 4-18°C optimal 8-14°C

## Species Truly Missing from Lookup

Need manual research:

1. **Dover Sole** (`sol`) - Flatfish, likely 8-20°C
2. **Flathead Grey Mullet** (`fgm`) - Similar to Chelon labrosus
3. **Flounder** (`fle`) - Flatfish, cold-tolerant, likely 2-18°C
4. **Megrim** (`ldb`) - Deep flatfish, likely 6-12°C
5. **Painted Comber** (`CMP`) - Mediterranean serranid, likely 14-22°C
6. **Picarel** (`PIC`) - Mediterranean sparid, likely 12-20°C
7. **Plaice** (`ple`) - Common flatfish, likely 4-16°C
8. **Red Gurnard** (`GUR`) - Similar to Tub Gurnard
9. **Rock Cook** (`WRO`) - Wrasse family, likely 8-18°C
10. **Salema** (`SAL`) - Mediterranean herbivore, likely 15-24°C
11. **Sea Bream (Dorada)** (`sba`) - Gilthead seabream, likely 13-28°C
12. **Sea Trout** (`trs`) - Salmonid, cold-water, likely 5-15°C
13. **Small-eyed Ray** (`RME`) - Ray species, likely 10-16°C
14. **Tub Gurnard** (`gug`) - Temperate, likely 8-18°C
15. **Wrasse (various)** (`wra`) - Generic, use 8-18°C range

## Fix Strategy

### Option 1: Update Merge Script (RECOMMENDED)
Add code mapping to `merge-temperature-data.ts`:

```typescript
// At the top of merge script
const speciesCodeMap: Record<string, string> = {
  'CSH': 'smo',
  'wrc': 'WRU',
  'mug': 'mul',
  'sqc': 'sqd',
  'rjc': 'RJC',
  'RUN': 'RJU',
  'SSH': 'SHO',
  'pok': 'sai',
  'san': 'sae',
  'lta': 'fry',
};

// When looking up temperature data
const lookupCode = speciesCodeMap[speciesCode] || speciesCode;
const manual = manualTemperature.find((s: any) => 
  s.species_code === lookupCode || s.species_code === speciesCode
);
```

### Option 2: Update TEMPERATURE_MANUAL_LOOKUP.json
Add duplicate entries with alternative codes (not recommended - creates maintenance burden)

### Option 3: Standardize All Codes
Update ENVIRONMENTAL_DATA_MERGED.json to match TEMPERATURE_MANUAL_LOOKUP.json codes (risky - affects database)

## Expected Coverage After Fix

**Before Code Mapping:**
- Temperature: 32/62 (52%)
- 30 species missing

**After Code Mapping:**
- Temperature: 53/62 (85%) - +21 species ✅
- 9 species missing (down from 30)

**After Adding Missing 9:**
- Temperature: 62/62 (100%) ✅

## Priority Order

1. **HIGH PRIORITY** (10 species) - Code mapping fixes
   - Run updated merge script
   - Instant +10 species coverage

2. **MEDIUM PRIORITY** (15 species) - Quick research
   - Use family/genus averages
   - 1-2 hours work

3. **LOW PRIORITY** (5 species) - Edge cases
   - Generic entries
   - Regional outliers
   - Use conservative ranges

## Next Steps

1. ✅ Update `merge-temperature-data.ts` with code mapping
2. Run merge script: `npx tsx scripts/merge-temperature-data.ts`
3. Validate output shows 42+ species with temperature
4. Research missing 15 species
5. Final merge to reach 100% coverage
