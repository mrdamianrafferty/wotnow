# Species Data Consolidation - Phase 1

**Date:** November 4, 2025
**Status:** Ready to implement
**Migration:** `20251104000001_consolidate_species_fishing_data.sql`

---

## 📋 Overview

Phase 1 consolidates species fishing content from multiple sources into a single database table with structured, validated fields.

### Problems Solved
1. ✅ **Dual source of truth** - No more conflicts between database and JSON files
2. ✅ **Unstructured advice** - Replace free text with structured arrays
3. ✅ **QuickLog mismatch** - Baits/habitats match UI options exactly
4. ✅ **No validation** - Database constraints ensure data integrity

---

## 🗄️ New Database Schema

### Fields Added to `species` Table

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `recommended_baits` | `TEXT[]` | Structured bait list | `{Worms, Crab, Squid}` |
| `preferred_habitats` | `TEXT[]` | Habitat preferences | `{rocky_shore, pier_harbor}` |
| `effective_techniques` | `TEXT[]` | Fishing techniques | `{bottom_fishing, spinning}` |
| `best_times` | `TEXT[]` | When to fish | `{dawn, flooding_tide}` |
| `fun_fact_en` | `TEXT` | Migrated from species_meta | `"Colour-shifting flirt..."` |
| `conservation_status` | `TEXT` | IUCN status (LC/VU/EN/etc) | `"LC"` (Least Concern) |
| `content_last_reviewed` | `TIMESTAMPTZ` | Data quality tracking | `2025-11-04 10:30:00+00` |
| `content_reviewed_by` | `TEXT` | Who verified | `"damian@findr"` |

### Valid Values (Constrained)

**recommended_baits:** Must match `COMMON_BAITS` from `/components/findr/baitHabitatOptions.ts`
```
Worms, Crab, Squid, Fish baits, Shellfish, Prawns, Bread,
Feather rigs, Spinners, Soft plastics, Egis, Surface lures, Artificial baits
```

**preferred_habitats:** Must match `HABITAT_OPTIONS` from `/components/findr/baitHabitatOptions.ts`
```
rocky_shore, sandy_beach, pier_harbor, estuary,
shallow_water, deep_water, wreck_reef, open_sea
```

**effective_techniques:**
```
bottom_fishing, float_fishing, spinning, trolling, jigging, drifting,
fly_fishing, surfcasting, feathering, drop_shot, popping, walking_the_dog
```

**best_times:**
```
dawn, dusk, day, night, flooding_tide, ebbing_tide,
slack_water, spring_tides, neap_tides
```

**conservation_status:** IUCN Red List codes with CHECK constraint
```
LC (Least Concern), NT (Near Threatened), VU (Vulnerable),
EN (Endangered), CR (Critically Endangered),
EW (Extinct in Wild), EX (Extinct), DD (Data Deficient), NE (Not Evaluated)
```

---

## 🚀 Implementation Steps

### Step 1: Apply Migration ✅
```bash
supabase db push
```

This will:
- Add new columns to `species` table
- Migrate `fun_fact` and `conservation_status` from `species_meta`
- Create indexes for filtering/searching
- Add validation constraints

### Step 2: Populate Data from JSON

Create `/scripts/migrate-species-fishing-data.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import speciesAdviceData from '../data/speciesAdviceData.json';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key
);

// Mapping from JSON structure to database arrays
const baitMapping: Record<string, string> = {
  'Lugworm': 'Worms',
  'Ragworm': 'Worms',
  'Crab': 'Crab',
  'Peeler crab': 'Crab',
  'Squid': 'Squid',
  'Fish strips': 'Fish baits',
  'Mackerel': 'Fish baits',
  'Sandeel': 'Fish baits',
  'Shellfish': 'Shellfish',
  'Mussel': 'Shellfish',
  'Razor clam': 'Shellfish',
  'Prawn': 'Prawns',
  'Shrimp': 'Prawns',
  // ... add more mappings
};

async function migrateSpeciesData() {
  console.log('🔄 Migrating species fishing data from JSON to database...\n');

  for (const species of speciesAdviceData) {
    const shoreAdvice = species.contexts?.shore;
    const boatAdvice = species.contexts?.boat;

    // Extract baits from advice (parse natural language)
    const rawBaits = [
      ...(shoreAdvice?.favouriteBaits?.split(',') || []),
      ...(boatAdvice?.favouriteBaits?.split(',') || [])
    ];

    // Map to standard bait names
    const baits = [...new Set(
      rawBaits
        .map(b => b.trim())
        .map(b => baitMapping[b] || b)
        .filter(b => b)
    )];

    // Extract habitats from description
    const habitats: string[] = [];
    const description = shoreAdvice?.distance || '';
    if (description.match(/rock|kelp|reef/i)) habitats.push('rocky_shore');
    if (description.match(/sand|beach/i)) habitats.push('sandy_beach');
    if (description.match(/pier|harbor|harbour/i)) habitats.push('pier_harbor');
    if (description.match(/estuary/i)) habitats.push('estuary');
    if (description.match(/shallow/i)) habitats.push('shallow_water');
    if (description.match(/deep/i)) habitats.push('deep_water');
    if (description.match(/wreck|reef/i)) habitats.push('wreck_reef');
    if (description.match(/open sea/i)) habitats.push('open_sea');

    // Extract techniques from description
    const techniques: string[] = [];
    if (description.match(/bottom/i)) techniques.push('bottom_fishing');
    if (description.match(/float/i)) techniques.push('float_fishing');
    if (description.match(/spin|lure/i)) techniques.push('spinning');
    if (description.match(/troll/i)) techniques.push('trolling');
    if (description.match(/jig/i)) techniques.push('jigging');
    if (description.match(/drift/i)) techniques.push('drifting');
    if (description.match(/surf/i)) techniques.push('surfcasting');
    if (description.match(/feather/i)) techniques.push('feathering');

    // Extract best times
    const times: string[] = [];
    const timeText = shoreAdvice?.bestTime || '';
    if (timeText.match(/dawn/i)) times.push('dawn');
    if (timeText.match(/dusk/i)) times.push('dusk');
    if (timeText.match(/night/i)) times.push('night');
    if (timeText.match(/day|daylight/i) && !timeText.match(/dusk|dawn/i)) times.push('day');
    if (timeText.match(/flood/i)) times.push('flooding_tide');
    if (timeText.match(/ebb/i)) times.push('ebbing_tide');

    // Update database
    const { error } = await supabase
      .from('species')
      .update({
        recommended_baits: baits.length > 0 ? baits : null,
        preferred_habitats: habitats.length > 0 ? habitats : null,
        effective_techniques: techniques.length > 0 ? techniques : null,
        best_times: times.length > 0 ? times : null,
        content_last_reviewed: new Date().toISOString(),
        content_reviewed_by: 'migration-script'
      })
      .eq('name_en', species.name);

    if (error) {
      console.error(`❌ Failed to update ${species.name}:`, error);
    } else {
      console.log(`✅ Updated ${species.name}`);
    }
  }

  console.log('\n✨ Migration complete!');
}

migrateSpeciesData().catch(console.error);
```

Add to `package.json`:
```json
{
  "scripts": {
    "migrate:species-data": "tsx scripts/migrate-species-fishing-data.ts"
  }
}
```

Run it:
```bash
npm run env:sync  # Sync .env.local to .env.cli
npm run migrate:species-data
```

### Step 3: Update TypeScript Types

Update `/lib/findr/mapPrediction.ts` to include new fields:

```typescript
export interface CardData {
  // ... existing fields ...

  // NEW: Structured fishing content
  recommendedBaits?: string[];
  preferredHabitats?: string[];
  effectiveTechniques?: string[];
  bestTimes?: string[];
  funFact?: string;
  conservationStatus?: string;
  contentLastReviewed?: string;
}
```

### Step 4: Update API to Use New Fields

Modify `/api/findr/predictions` to fetch new fields:

```typescript
// OLD: Merge with JSON file
const predictions = await db.query('...');
const enriched = mergePredictionsWithAdviceJSON(predictions);

// NEW: All data in database
const predictions = await db.query(`
  SELECT
    id, species_code, name_en, scientific_name,
    playful_bio_en, eating_quality,
    recommended_baits,
    preferred_habitats,
    effective_techniques,
    best_times,
    fun_fact_en,
    conservation_status
  FROM species
  ...
`);
// No merging needed - done!
```

---

## ✅ Testing Checklist

### 1. Migration Applied Successfully
```bash
supabase db push
# Check for errors
```

### 2. Data Migrated from species_meta
```sql
-- Verify fun_fact and conservation_status copied
SELECT
  name_en,
  fun_fact_en,
  conservation_status
FROM species
WHERE fun_fact_en IS NOT NULL
LIMIT 5;
```

### 3. Baits/Habitats/Techniques Populated
```sql
-- Check structured fields populated
SELECT
  name_en,
  recommended_baits,
  preferred_habitats,
  effective_techniques,
  best_times
FROM species
WHERE recommended_baits IS NOT NULL
LIMIT 5;
```

### 4. Validation Works
```sql
-- This should FAIL (invalid conservation status)
UPDATE species
SET conservation_status = 'INVALID'
WHERE name_en = 'Sea Bass';
-- ERROR: new row violates check constraint "check_conservation_status"

-- This should SUCCEED
UPDATE species
SET conservation_status = 'VU'
WHERE name_en = 'Sea Bass';
-- SUCCESS
```

### 5. Frontend Displays New Data
- Visit species detail page
- Check that baits/habitats/techniques display
- Verify they match QuickLogModal options
- Test filtering by bait/habitat

---

## 📊 Data Quality Improvements

### Before Phase 1
```
Sources: 3 (species table, species_meta table, JSON file)
Baits: Free text, inconsistent naming
Habitats: Free text, no validation
Techniques: Free text paragraph
Validation: None
Indexing: Limited
```

### After Phase 1
```
Sources: 1 (species table only)
Baits: Structured array, matches UI exactly
Habitats: Structured array, validated values
Techniques: Structured array, standardized names
Validation: Database CHECK constraints
Indexing: GIN indexes for fast filtering
```

---

## 🗑️ Cleanup (Phase 2 - Later)

**Do NOT do this yet!** Keep old data as backup until Phase 1 tested in production.

### Once Phase 1 Verified:

1. **Drop `species_meta` table:**
```sql
DROP TABLE species_meta CASCADE;
```

2. **Remove JSON file:**
```bash
rm data/speciesAdviceData.json
```

3. **Remove JSON import from code:**
```typescript
// DELETE THIS LINE from any files:
import speciesAdviceData from '@/data/speciesAdviceData.json';
```

4. **Remove merge logic from API:**
```typescript
// DELETE mergePredictionsWithAdviceJSON() function
```

---

## 🎯 Success Criteria

Phase 1 is complete when:

✅ Migration applied without errors
✅ All species have `fun_fact_en` and `conservation_status` populated
✅ At least 80% of species have recommended_baits populated
✅ At least 80% of species have preferred_habitats populated
✅ Species detail pages display new structured data
✅ QuickLogModal bait/habitat options match database exactly
✅ No errors in production logs for 48 hours
✅ User feedback confirms improved content accuracy

---

## 📞 Next Steps

1. **Review migration SQL** - Check logic is correct
2. **Apply to database** - `supabase db push`
3. **Run data migration script** - Populate from JSON
4. **Test locally** - Verify data looks correct
5. **Deploy to production** - Monitor for errors
6. **Gather feedback** - Ask users if content improved
7. **Plan Phase 2** - Schedule cleanup once stable

---

**Questions?** See `/docs/SPECIES_DATA_ARCHITECTURE_MAP.md` for full context.
