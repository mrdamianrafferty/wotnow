# Species Data Architecture Map

**Created:** November 4, 2025
**Status:** Comprehensive analysis of species content data sources and flow

---

## Problem Statement

User reports that species content (fun facts, edibility ratings, baits, techniques) appears incorrect for European species. This document maps the complete architecture of how species content flows through the system to identify potential sources of data quality issues.

---

## Executive Summary

The system has **two parallel content sources** for species data:

1. **Database tables** (`species`, `species_meta`) - Environmental matching data and metadata
2. **JSON file** (`speciesAdviceData.json`) - Fishing advice and context-specific recommendations

These sources were created at different times by different processes, creating a **dual source of truth** that can lead to inconsistencies, especially for European species where data may have been copied from North American species templates.

---

## Data Sources

### 1. Database Tables (Supabase PostgreSQL)

**Primary table: `species`**
- Created via migrations starting October 11, 2025
- Contains: species codes, scientific names, environmental preferences
- Fields relevant to content quality:
  - `playful_bio_en` - Short personality description (e.g., "Curious, colourful, and a bit vain")
  - `eating_quality` - Numeric rating 0-10
  - `advice` - JSONB field with shore/boat fishing advice
  - `name_en`, `name_fr`, `name_es`, `name_de`, `name_it`, `name_pt` - Localized names

**Secondary table: `species_meta`**
- Contains additional metadata
- Fields:
  - `fun_fact` - Longer narrative fact
  - `conservation_status` - IUCN status code (LC, VU, EN, etc.)
  - `scientific_name` - Linked to species table

### 2. JSON Data File

**File: `/data/speciesAdviceData.json`**
- Static JSON file loaded at runtime
- Contains ~45+ species entries
- Structure per species:
  ```json
  {
    "name": "Ballan Wrasse",
    "normalized": "ballan-wrasse",
    "contexts": {
      "shore": {
        "regions": "Atlantic, North Sea (west), Mediterranean fringe",
        "bestTime": "Daylight, especially on a flooding tide.",
        "favouriteBaits": "Crab, prawn, shellfish",
        "edibility": 5,
        ...
      },
      "boat": { ... }
    },
    "conservation": "IUCN: LC (global). Local protections...",
    "funFact": "Modern day 'cleaner fish' that picks parasites..."
  }
  ```
- Accessed via `speciesAdvice.ts` service layer with normalization and aliasing

### 3. Migration Files

**Location: `/supabase/migrations/`**

**21 species-related migrations identified**, totaling 6,565 lines of SQL:

Key migrations timeline:
- **Oct 11, 2025**: Initial population (`20251011002_populate_species_table.sql`)
- **Oct 16, 2025**: Playful bios upsert (`20251016004_upsert_species_playful_bio_en.sql`)
- **Oct 16, 2025**: Fun facts migration (`20251016003_upsert_species_meta_funfacts_conservation.sql`)
- **Oct 18, 2025**: Regional filtering (`20251018002_populate_all_species_regions.sql`)
- **Oct 18, 2025**: Mediterranean fixes (`20251018010_fix_mediterranean_species_regions.sql`)
- **Oct 30, 2025**: Aliases and slugs (`20251030000002_add_species_aliases_and_slug.sql`)

---

## Content Fields Breakdown

### Field: `playful_bio_en` (Database)

**Purpose:** Short personality-driven species description
**Location:** `species.playful_bio_en` column
**Source:** Migration `20251016004_upsert_species_playful_bio_en.sql`
**Example:** "Curious, colourful, and a bit vain. I hang around rocky shallows showing off..."

**Usage:**
- Displayed in species cards (`FishSpeciesModal.tsx`)
- Shown in prediction results
- Translated to other languages via DeepL

**Problem indicators:**
- ✅ Recent migration (Oct 16, 2025) updated all 90 species
- ✅ Generic but personality-focused
- ⚠️ Only 8-10 unique bio templates reused across 90 species
- ⚠️ May not reflect European vs North American habitat differences

### Field: `eating_quality` (Both sources)

**Purpose:** Edibility rating 0-10
**Location:**
- Database: `species.eating_quality` column
- JSON: `contexts.shore.edibility` or `contexts.boat.edibility`

**Usage:**
- Displayed with fork/knife icons in species modal
- Used to show "dinner material" rating
- Component: `FishSpeciesModal.tsx` line ~64-67

**Problem indicators:**
- ⚠️ **Dual source of truth**: Database and JSON may disagree
- ⚠️ JSON has context-specific ratings (shore vs boat)
- ⚠️ Database has single global rating
- ❌ **Critical**: Edibility varies by region (Mediterranean vs Atlantic fish quality differs)
- ❌ Ratings may reflect North American preferences, not European markets

### Field: `advice` (Database) vs `contexts` (JSON)

**Purpose:** Fishing advice (baits, times, conditions)
**Location:**
- Database: `species.advice` JSONB column
- JSON: `contexts.shore` and `contexts.boat` objects

**Structure comparison:**

**Database schema:**
```typescript
advice: {
  shore?: {
    regions?: string;
    best_time?: string;
    tide_sensitivity?: string;
    baits_diet?: string;
    temperature_effect?: string;
    ...
  }
}
```

**JSON schema:**
```typescript
contexts: {
  shore?: {
    regions: string;
    bestTime: string;
    favouriteBaits: string;
    naturalDiet: string;
    temperature: string;
    ...
  }
}
```

**Problem indicators:**
- ❌ **Different field names**: `baits_diet` vs `favouriteBaits` + `naturalDiet`
- ❌ **Different data structures**: Database combines fields, JSON separates them
- ⚠️ Unclear which source takes precedence
- ❌ Updates to one source may not reflect in the other

### Field: `fun_fact` (Both sources)

**Purpose:** Interesting trivia about the species
**Location:**
- Database: `species_meta.fun_fact`
- JSON: `funFact` property

**Usage:**
- Displayed in species modal with sparkle icon
- Component: `FishSpeciesModal.tsx`

**Problem indicators:**
- ⚠️ **Dual source**: Database has one fact, JSON may have another
- ✅ Database facts updated Oct 16, 2025
- ❌ **European relevance**: Facts like "Britain's record shore fish" not relevant to Mediterranean users
- ❌ Many facts reference UK/Norse/Victorian culture (not European-wide)

### Fields: Baits & Techniques (Database only)

**Purpose:** Recommended fishing methods
**Location:**
- `species_baits` - Join table linking species to bait types
- `species_techniques` - Join table linking species to fishing techniques

**Usage:**
- Fetched via `/api/findr/species-details` endpoint
- Displayed in species modal with effectiveness ratings
- Include beginner tips and notes

**Problem indicators:**
- ✅ Properly normalized database design
- ⚠️ Unknown if bait/technique data is region-specific
- ❌ Techniques may assume North American fishing methods (e.g., "surf casting" less common in Mediterranean)

---

## Data Flow

### Frontend Request → Backend Processing → Response

```
User views species card
         ↓
[FishSpeciesModal.tsx]
         ↓
useSpeciesDetails() hook
         ↓
/api/findr/species-details?species_id=X
         ↓
┌─────────────────────────────────────┐
│  Predictions API                     │
│  (/api/findr/predictions)           │
│                                      │
│  1. Check cache (3-hour TTL)        │
│  2. If miss, query Supabase RPC:    │
│     findr_match_species_conditions   │
│  3. Parallel queries:                │
│     - Species data                   │
│     - Localization                   │
│     - Environmental conditions       │
│  4. Map predictions (mapPrediction.ts)│
│  5. Cache results                    │
└─────────────────────────────────────┘
         ↓
[Database Queries]
┌──────────────────────────┐
│ FROM species             │
│ JOIN species_meta        │
│ JOIN species_baits       │
│ JOIN species_techniques  │
│ JOIN species_substrates  │
│ WHERE species_id = ?     │
└──────────────────────────┘
         ↓
[Mapping Layer] (mapPrediction.ts)
         ↓
┌─────────────────────────────────────┐
│ getSpeciesAdvice(commonName, code)  │
│                                      │
│ Reads: speciesAdviceData.json       │
│ Returns: Shore/boat contexts        │
│        + funFact                     │
│        + conservation                │
└─────────────────────────────────────┘
         ↓
[Merge & Return]
CardData object with:
- Database fields (playful_bio_en, eating_quality)
- JSON fields (advice contexts, funFact)
- Localized names
- Techniques & baits
```

### Key Observations:

1. **Two-phase data assembly**: Database queries first, then JSON enrichment
2. **Caching**: Results cached for 3 hours in `findr_prediction_sessions`
3. **No validation**: No checks for consistency between database and JSON sources
4. **Normalization**: Species names normalized for JSON lookup (lowercase, hyphenated)
5. **Alias handling**: Complex alias system (`NAME_ALIASES` and `SPECIES_CODE_ALIASES`) to map variations

---

## Update History

### Phase 1: Initial Population (Oct 11, 2025)
- `20251011002_populate_species_table.sql` - 45 species added
- Source: Hardcoded in migration with shore/boat advice
- Focus: North Atlantic and North Sea species

### Phase 2: Playful Bios (Oct 11-16, 2025)
- `20251011001_add_playful_bio_to_species.sql` - Added column
- `20251016004_upsert_species_playful_bio_en.sql` - Populated 90 species
- Generic personality descriptions (8-10 templates reused)

### Phase 3: Metadata & Fun Facts (Oct 16, 2025)
- `20251016003_upsert_species_meta_funfacts_conservation.sql`
- Added conservation status and fun facts
- Many UK/North Sea-centric facts

### Phase 4: Regional Filtering (Oct 18, 2025)
- `20251018002_populate_all_species_regions.sql`
- `20251018010_fix_mediterranean_species_regions.sql`
- Added `biogeographic_regions` field
- Mediterranean species fixes applied

### Phase 5: Aliases & Slugs (Oct 30, 2025)
- `20251030000002_add_species_aliases_and_slug.sql`
- Added alternative common names
- URL-friendly slugs

### Phase 6: Bite Score Parameters (Oct 13-29, 2025)
- Multiple migrations adding species-specific scoring
- Environmental preference weights
- Tidal/lunar/temperature sensitivity

---

## Problem Areas

### 1. Dual Source of Truth ❌

**Issue:** Species content exists in two places:
- Database tables (species, species_meta)
- JSON file (speciesAdviceData.json)

**Impact:**
- Updates may only be applied to one source
- Database and JSON may have conflicting information
- No canonical source for edibility, fun facts, or advice

**Example conflicts:**
- `eating_quality` in database vs `edibility` in JSON contexts
- `fun_fact` in species_meta vs `funFact` in JSON
- Different field structures for advice

### 2. North Atlantic Bias ❌

**Issue:** Initial data population focused on North Sea and North Atlantic species.

**Evidence:**
- Fun facts reference: "Britain's record shore fish", "Victorian cooks", "Norse tales"
- Regions often list: "North Sea, Atlantic, Norwegian waters"
- Migration filenames reference UK IFCA/MMO authorities

**Impact for European users:**
- Mediterranean species may have inappropriate advice
- Edibility ratings may not match European markets (e.g., horse mackerel prized in Portugal, less so in UK)
- Regional regulations reference UK/Norway, not Spain/Italy/Greece

### 3. Generic Playful Bios ⚠️

**Issue:** Only 8-10 unique bio templates used across 90 species.

**Examples of reused templates:**
- "Fast, flashy, and never still..." (Mackerel, Little Tunny, Horse Mackerel)
- "Just a local legend looking for steady flow..." (Sea Bass, Conger Eel, Multiple others)
- "Curious, colourful, and a bit vain..." (Wrasses)

**Impact:**
- Lacks species-specific personality
- Doesn't convey unique behaviors
- May not resonate with experienced anglers

### 4. Context-Insensitive Edibility ❌

**Issue:** Single edibility rating doesn't account for:
- Regional preferences (Mediterranean vs Atlantic)
- Preparation methods (grilled whole vs filleted)
- Market value differences
- Seasonal quality variations

**Example:**
- Grey Mullet: 7/10 globally, but roe ("bottarga") is delicacy in Mediterranean
- Horse Mackerel: Lower rated in UK, highly prized as "carapau" in Portugal

### 5. Migration Overwriting Risk ⚠️

**Issue:** 21 species migrations over 3 weeks suggest rapid iteration with potential overwrites.

**Evidence:**
- Oct 16: Playful bios populated
- Oct 18: Mediterranean species fixes (implies earlier data was wrong)
- Multiple "fix_" prefixed migrations

**Impact:**
- Earlier accurate data may have been overwritten
- No audit trail of what changed
- Difficult to revert problematic updates

### 6. Hardcoded Fishing Advice ❌

**Issue:** Advice stored as static strings, not structured data.

**Example from JSON:**
```json
{
  "favouriteBaits": "Crab, prawn, shellfish",
  "naturalDiet": "raids crevices and kelp fronds"
}
```

**Problems:**
- Can't filter by specific bait types
- Can't score bait effectiveness programmatically
- Translation challenges (compound phrases)
- No regional variations (e.g., "prawn" vs "shrimp" terminology)

---

## Recommended Improvements

### Short-term (Quick Fixes)

1. **Audit European Species Content**
   - Review all Mediterranean species (30+ species)
   - Check: edibility ratings, fun facts, regional advice
   - Compare against local knowledge (Spanish, Italian, Greek sources)
   - Fix obvious UK/North Sea-centric content

2. **Add Data Source Attribution**
   - Tag each species with content origin: "UK", "Mediterranean", "Atlantic", "Generic"
   - Display disclaimer: "Advice reflects [Region] fishing practices"
   - Allow users to flag incorrect regional content

3. **Clarify Edibility Context**
   - Add text: "Edibility rating reflects general European market value"
   - Consider splitting: `eating_quality_atlantic` vs `eating_quality_med`
   - Add notes about regional preparation styles

4. **Cache Invalidation**
   - Clear 3-hour prediction cache when migrations run
   - Add versioning to cached data
   - Force refresh for species updated in last 24 hours

### Medium-term (Architectural)

5. **Consolidate Data Sources**
   - **Option A:** Deprecate JSON file, migrate all to database
   - **Option B:** Make JSON canonical, remove duplicates from database
   - **Recommended:** Database as single source of truth, JSON for fallback

6. **Structured Advice Schema**
   ```sql
   CREATE TABLE species_advice (
     species_id UUID REFERENCES species(species_id),
     context VARCHAR(10) CHECK (context IN ('shore', 'boat', 'both')),
     region_code VARCHAR(10), -- 'UK', 'MED', 'ATL', etc.
     best_time TEXT[],
     favourite_baits TEXT[],
     edibility_rating INTEGER CHECK (edibility_rating BETWEEN 0 AND 10),
     advice_text TEXT,
     source VARCHAR(50), -- 'UK_IFCA', 'MED_local', 'generic'
     last_updated TIMESTAMP
   );
   ```

7. **Region-Aware Content Delivery**
   - Detect user region (from rectangle code, GPS, or preference)
   - Serve region-specific advice and edibility ratings
   - Fall back to "Atlantic" default if no regional data

8. **Content Validation Pipeline**
   - Pre-commit hook to validate species data changes
   - Check for duplicate bio templates
   - Verify edibility ratings are reasonable (no 10/10 for everything)
   - Flag UK-specific terminology ("stones" weight, "harbour" spelling)

### Long-term (Data Quality)

9. **Crowdsource Regional Expertise**
   - Allow verified users to suggest species content edits
   - Moderation queue for regional advice
   - Badge system: "Verified by Mediterranean anglers"

10. **Machine Translation Review**
    - Current bios/advice may not translate well
    - Review DeepL translations for context
    - Consider: "Prawn" → "Gamba" (Spanish), "Crevette" (French)

11. **Seasonal and Temporal Data**
    - Add: `best_months` array (e.g., [5,6,7,8] for summer species)
    - Add: `spawning_seasons` to show when to avoid
    - Dynamic advice: "Now is peak season" vs "Off-season"

12. **Bibliography & Sources**
    - Add `sources` field with references
    - Link to: FishBase, ICES, national fisheries sites
    - Transparency: "Based on UK Environment Agency data (2023)"

---

## Technical Debt

### Priority 1: Data Inconsistency
- **Debt:** Dual sources (database + JSON) with no sync mechanism
- **Risk:** High - Users see conflicting information
- **Effort:** Medium - Requires migration to consolidate

### Priority 2: Regional Bias
- **Debt:** Content skewed toward UK/North Sea practices
- **Risk:** High - Mediterranean users get poor advice
- **Effort:** High - Requires subject matter expert review

### Priority 3: Generic Bios
- **Debt:** Template reuse across species
- **Risk:** Low - Aesthetic issue, not functional
- **Effort:** Medium - Can be improved incrementally

### Priority 4: Hardcoded Strings
- **Debt:** Advice stored as free text, not structured
- **Risk:** Medium - Limits filtering, scoring, personalization
- **Effort:** High - Requires schema redesign

---

## Validation Checklist

To verify species content is correct for European species:

### For Each Mediterranean Species:

- [ ] **Edibility rating** matches local market value (e.g., Spain, Italy, Greece)
- [ ] **Fun fact** is culturally relevant (not UK/Norse specific)
- [ ] **Fishing advice** mentions Mediterranean contexts (e.g., "warm Med summers")
- [ ] **Bait suggestions** use local terminology (e.g., "gamba" not just "prawn")
- [ ] **Regions field** includes: "Mediterranean" or specific seas (Adriatic, Aegean)
- [ ] **Authority field** references: Spain MAPA, Italy MIPAAF, Greece HCMR (not just UK IFCA)
- [ ] **Restrictions** mention: EU MLS (Minimum Landing Size), not just UK regulations

### For Each Atlantic Species:

- [ ] Verify advice applies to **Eastern Atlantic** (Iberia, France), not just North Sea
- [ ] Check if species has **different behaviors** in southern vs northern ranges
- [ ] Confirm **edibility** reflects: Portuguese, Spanish, French preferences (not just UK)
- [ ] Ensure **fun facts** include: Roman history, Mediterranean use cases

### Cross-Reference Checks:

- [ ] Compare database `eating_quality` with JSON `contexts.shore.edibility`
- [ ] Compare database `species_meta.fun_fact` with JSON `funFact`
- [ ] Verify `playful_bio_en` is species-specific (not reused template)
- [ ] Check advice `regions` field matches species' actual biogeographic range

---

## Files Reference

### Key Source Files:
- `/data/speciesAdviceData.json` - JSON content source (1,509 lines)
- `/data/speciesAdvice.ts` - Service layer with normalization
- `/lib/findr/mapPrediction.ts` - Merges database + JSON data
- `/pages/api/findr/predictions.ts` - Main API endpoint
- `/pages/api/findr/species-details.ts` - Detailed species info endpoint
- `/components/findr/FishSpeciesModal.tsx` - UI component displaying content

### Key Database Tables:
- `species` - Main species table (environmental data, names, bios)
- `species_meta` - Metadata (fun facts, conservation status)
- `species_baits` - Bait recommendations (join table)
- `species_techniques` - Fishing techniques (join table)
- `species_substrates` - Habitat preferences (join table)
- `findr_prediction_sessions` - Cached prediction results (3-hour TTL)

### Migration Files (21 total):
See output of: `ls -1 /Users/damianrafferty/Projects/WotNow/supabase/migrations/*species*.sql`

Total: **6,565 lines** of species-related migration SQL

---

## Conclusion

The species content system has a **dual source of truth problem** with database tables and a JSON file containing overlapping but potentially inconsistent data. Initial content was populated with a **North Atlantic/UK bias** which may not accurately reflect fishing practices, edibility preferences, or cultural context for Mediterranean and southern European users.

**Immediate action needed:**
1. Audit Mediterranean species content for accuracy
2. Add region-specific disclaimers
3. Plan migration to consolidate data sources

**Key risk:** European users may distrust predictions if advice feels inaccurate or culturally inappropriate (e.g., UK regulations, Norse folklore references for Spanish anglers).

---

## Document Path
`/Users/damianrafferty/Projects/WotNow/docs/SPECIES_DATA_ARCHITECTURE_MAP.md`
