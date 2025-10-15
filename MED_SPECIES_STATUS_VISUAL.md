# Mediterranean Species: Data Completion Status

## Visual Status Overview

```
Species: Argyrosomus regius (Meagre)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BITE SCORE PARAMETERS (Ready ✅)
├─ ✅ diurnal_sensitivity: 'strong'
├─ ✅ tidal_sensitivity: 0.70
├─ ✅ preferred_tide_stage: ['early_flood','mid_flood','early_ebb']
├─ ✅ flow_preference: 'moderate'
├─ ✅ spring_neap_boost: 0.20
├─ ✅ temp_opt_c: [16, 22]
├─ ✅ slack_threshold_ms: 0.30
├─ ✅ context_bias: [["estuaries","+0.3"],["channels","+0.2"]]
├─ ✅ tide_weight: 0.35
├─ ✅ light_weight: 0.30
├─ ✅ wind_weight: 0.10
├─ ✅ pressure_weight: 0.10
├─ ✅ temp_weight: 0.10
└─ ✅ lunar_weight: 0.05

CORE SPECIES DATA (Missing ❌)
├─ ❌ species_code: 'meagre' (NOT IN DATABASE)
├─ ❌ scientific_name: 'Argyrosomus regius' (NOT IN DATABASE)
├─ ❌ name_en: 'Meagre' (NOT IN DATABASE)
├─ ❌ name_es: 'Corvina'
├─ ❌ name_fr: 'Maigre Commun'
├─ ❌ name_it: 'Ombrina'
├─ ❌ name_pt: 'Corvina'
├─ ❌ typical_gear: ['spinning', 'bottom fishing', 'trolling']
├─ ❌ eating_quality: 5
├─ ❌ min_depth: 0
├─ ❌ max_depth: 50
├─ ❌ preferred_habitat: ['estuaries', 'river mouths', 'channels']
├─ ❌ is_night_species: false
├─ ❌ is_seasonal: false
├─ ❌ advice: { shore: {...}, boat: {...} }
├─ ❌ playful_bio_en: 'Looking for someone who gets me...'
├─ ❌ conservation_status: 'Least Concern'
└─ ❌ fun_fact: 'Meagre can grow over 2 meters and 100kg...'

RESULT: UPDATE statements will run but do nothing! ⚠️
        Species doesn't exist yet—need INSERT first.
```

## All 17 Mediterranean Species Status

### ✅ Bite Score Params (17/17) - 100% Complete
All species have complete UPDATE statements ready

### ❌ Core Records (0/17) - 0% Complete
None of these species exist in the database yet

| # | Scientific Name | Common Name | Has INSERT? | Has UPDATE? |
|---|----------------|-------------|-------------|-------------|
| 1 | Diplodus sargus | White Seabream | ❌ NO | ✅ YES |
| 2 | Diplodus vulgaris | Two-banded Seabream | ❌ NO | ✅ YES |
| 3 | Pagellus erythrinus | Common Pandora | ❌ NO | ✅ YES |
| 4 | Pagrus pagrus | Red Porgy | ❌ NO | ✅ YES |
| 5 | Oblada melanura | Saddled Seabream | ❌ NO | ✅ YES |
| 6 | Boops boops | Bogue | ❌ NO | ✅ YES |
| 7 | Scomber colias | Atlantic Chub Mackerel | ❌ NO | ✅ YES |
| 8 | Trachurus mediterraneus | Mediterranean Scad | ❌ NO | ✅ YES |
| 9 | Sarda sarda | Atlantic Bonito | ❌ NO | ✅ YES |
| 10 | Lichia amia | Leerfish | ❌ NO | ✅ YES |
| 11 | Pomatomus saltatrix | Bluefish | ❌ NO | ✅ YES |
| 12 | Sphyraena viridensis | Yellowmouth Barracuda | ❌ NO | ✅ YES |
| 13 | Sphyraena sphyraena | European Barracuda | ❌ NO | ✅ YES |
| 14 | Epinephelus marginatus | Dusky Grouper | ❌ NO | ✅ YES |
| 15 | Epinephelus aeneus | White Grouper | ❌ NO | ✅ YES |
| 16 | Scorpaena scrofa | Red Scorpionfish | ❌ NO | ✅ YES |
| 17 | Argyrosomus regius | Meagre | ❌ NO | ✅ YES |

## Field Completion Breakdown

### Per-Field Status Across All 17 Species

| Field Name | Status | Count | Notes |
|-----------|--------|-------|-------|
| **REQUIRED FIELDS** |
| species_code | ❌ Missing | 0/17 | Must be unique, lowercase-with-hyphens |
| scientific_name | ❌ Missing | 0/17 | Have the names, but no INSERT |
| name_en | ❌ Missing | 0/17 | Have suggestions, need INSERT |
| **LOCALIZED NAMES** |
| name_es | ❌ Missing | 0/17 | Spanish - HIGH PRIORITY for Med |
| name_fr | ❌ Missing | 0/17 | French - HIGH PRIORITY for Med |
| name_it | ❌ Missing | 0/17 | Italian - HIGH PRIORITY for Med |
| name_de | ❌ Missing | 0/17 | German - MEDIUM priority |
| name_pt | ❌ Missing | 0/17 | Portuguese - MEDIUM priority |
| **FISHING INFO** |
| typical_gear | ❌ Missing | 0/17 | Have recommendations |
| eating_quality | ❌ Missing | 0/17 | Have ratings (3-5) |
| min_depth | ❌ Missing | 0/17 | Have estimates |
| max_depth | ❌ Missing | 0/17 | Have estimates |
| preferred_habitat | ❌ Missing | 0/17 | Have from context_bias |
| **BEHAVIOR FLAGS** |
| is_night_species | ❌ Missing | 0/17 | Know which are night feeders |
| is_seasonal | ❌ Missing | 0/17 | Know summer visitors |
| max_boat_size | ❌ Missing | 0/17 | Have estimates (4-12m) |
| **ENVIRONMENTAL (OLD)** |
| wind_sensitivity | ❌ Missing | 0/17 | Less important (new system) |
| temperature_sensitivity | ❌ Missing | 0/17 | Less important (new system) |
| pressure_sensitivity | ❌ Missing | 0/17 | Less important (new system) |
| tide_sensitivity | ❌ Missing | 0/17 | Overridden by tidal_sensitivity |
| **CONTENT** |
| advice (JSONB) | ❌ Missing | 0/17 | Need shore/boat fishing advice |
| playful_bio_en | ❌ Missing | 0/17 | Need Tinder-style profiles |
| conservation_status | ❌ Missing | 0/17 | Mostly "Least Concern" |
| fun_fact | ❌ Missing | 0/17 | Need interesting trivia |
| **BITE SCORE PARAMS** |
| diurnal_sensitivity | ✅ Ready | 17/17 | In UPDATE statements |
| tidal_sensitivity | ✅ Ready | 17/17 | In UPDATE statements |
| preferred_tide_stage | ✅ Ready | 17/17 | In UPDATE statements |
| flow_preference | ✅ Ready | 17/17 | In UPDATE statements |
| spring_neap_boost | ✅ Ready | 17/17 | In UPDATE statements |
| temp_opt_c | ✅ Ready | 17/17 | In UPDATE statements |
| slack_threshold_ms | ✅ Ready | 17/17 | In UPDATE statements |
| context_bias | ✅ Ready | 17/17 | In UPDATE statements |
| tide_weight | ✅ Ready | 17/17 | In UPDATE statements |
| light_weight | ✅ Ready | 17/17 | In UPDATE statements |
| wind_weight | ✅ Ready | 17/17 | In UPDATE statements |
| pressure_weight | ✅ Ready | 17/17 | In UPDATE statements |
| temp_weight | ✅ Ready | 17/17 | In UPDATE statements |
| lunar_weight | ✅ Ready | 17/17 | In UPDATE statements |
| turbidity_weight | ✅ Ready | 17/17 | In UPDATE statements |
| water_clarity_weight | ✅ Ready | 17/17 | In UPDATE statements |

## Completion Percentage

```
Core Species Data:    0% ████░░░░░░░░░░░░░░░░ (0/21 fields per species)
Bite Score Params: 100% ████████████████████ (16/16 fields per species)
Overall Completion:  43% █████████░░░░░░░░░░░ (16/37 total fields)
```

**Note:** The 43% only accounts for fields we have UPDATE statements for. To actually USE those updates, we need the species records first!

## What Happens If You Run Migration Now?

```sql
-- Current migration file:
ALTER TABLE species ADD COLUMN tide_weight...
-- ✅ Runs fine (columns created)

UPDATE species 
SET tide_weight = 0.35, ...
WHERE scientific_name = 'Argyrosomus regius';
-- ❌ Updates 0 rows (species doesn't exist)

-- Result: No errors, but no data either!
```

## What We Need to Add

### Before the UPDATE statements, add:

```sql
-- ============================================================================
-- INSERT NEW MEDITERRANEAN SPECIES
-- ============================================================================

INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_it,
    eating_quality,
    typical_gear,
    min_depth,
    max_depth,
    preferred_habitat
) VALUES
    ('meagre', 'Argyrosomus regius', 'Meagre', 'Corvina', 'Maigre Commun', 'Ombrina', 
     5, ARRAY['spinning', 'bottom fishing'], 0, 50, ARRAY['estuaries', 'channels']),
    
    ('bluefish', 'Pomatomus saltatrix', 'Bluefish', 'Anjova', 'Tassergal', 'Serra',
     4, ARRAY['trolling', 'spinning'], 0, 40, ARRAY['open water', 'bait balls']),
    
    -- ... 15 more species
;
```

## Minimum Viable Insert

**Absolute minimum fields to create a working species:**

```sql
INSERT INTO species (species_code, scientific_name, name_en)
VALUES ('meagre', 'Argyrosomus regius', 'Meagre');
```

Then UPDATE statements will work! But species will be missing:
- Eating quality, gear, depth, habitat
- Localized names
- Fishing advice
- Playful bio
- Fun facts

## Recommended Phased Approach

### Phase 1: Minimal Inserts (30 mins)
Add just 3 required fields for all 17 species
- species_code, scientific_name, name_en
- **Result:** UPDATE statements will work, basic species appear in app

### Phase 2: Core Data (2 hours)
Add essential fishing info for priority species (Meagre, Bluefish, Bonito, Leerfish)
- eating_quality, typical_gear, depth, habitat
- is_seasonal, is_night_species
- **Result:** Species are usable in predictions

### Phase 3: Localization (3 hours)
Add Spanish, French, Italian names for all 17 species
- **Result:** App works for Mediterranean users

### Phase 4: Content (5 hours)
Add advice, playful bios, fun facts for all 17 species
- **Result:** Rich user experience, complete profiles

### Phase 5: Images & Polish (2 hours)
Add or confirm image fallbacks, test in app
- **Result:** Production-ready Mediterranean species

## Priority Species: Quick-Start Data

### 1. Meagre (Argyrosomus regius)
```sql
species_code: 'meagre'
name_en: 'Meagre'
name_es: 'Corvina', name_fr: 'Maigre', name_it: 'Ombrina'
eating_quality: 5
typical_gear: ARRAY['spinning', 'bottom fishing', 'trolling']
min_depth: 0, max_depth: 50
preferred_habitat: ARRAY['estuaries', 'river mouths', 'channels']
is_seasonal: false, is_night_species: false
```

### 2. Bluefish (Pomatomus saltatrix)
```sql
species_code: 'bluefish'
name_en: 'Bluefish'
name_es: 'Anjova', name_fr: 'Tassergal', name_it: 'Serra'
eating_quality: 4
typical_gear: ARRAY['trolling', 'spinning', 'jigging']
min_depth: 0, max_depth: 40
preferred_habitat: ARRAY['open water', 'bait balls', 'river mouths']
is_seasonal: true, is_night_species: false
```

### 3. Atlantic Bonito (Sarda sarda)
```sql
species_code: 'bonito'
name_en: 'Atlantic Bonito'
name_es: 'Bonito', name_fr: 'Bonite', name_it: 'Palamita'
eating_quality: 4
typical_gear: ARRAY['trolling', 'spinning', 'jigging']
min_depth: 0, max_depth: 50
preferred_habitat: ARRAY['tidal rips', 'headlands', 'bait balls']
is_seasonal: true, is_night_species: false
```

### 4. Dusky Grouper (Epinephelus marginatus)
```sql
species_code: 'dusky-grouper'
name_en: 'Dusky Grouper'
name_es: 'Mero', name_fr: 'Mérou Brun', name_it: 'Cernia Bruna'
eating_quality: 5
typical_gear: ARRAY['bottom fishing', 'jigging', 'live bait']
min_depth: 15, max_depth: 100
preferred_habitat: ARRAY['caves', 'reefs', 'rocky structures']
is_seasonal: false, is_night_species: false
conservation_status: 'Vulnerable (Mediterranean populations)'
```

---

**TL;DR:** You have perfect bite score parameters, but the 17 species don't exist yet. Need INSERT statements for species_code, scientific_name, and name_en at minimum. Then your UPDATE statements will work! 🎣
