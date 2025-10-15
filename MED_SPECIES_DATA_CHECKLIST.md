# Missing Data Checklist: Mediterranean Species

## Current Status

### ✅ COMPLETED - Bite Score Parameters
All 17 new Med species have:
- ✅ `diurnal_sensitivity`
- ✅ `tidal_sensitivity`
- ✅ `preferred_tide_stage`
- ✅ `flow_preference`
- ✅ `spring_neap_boost`
- ✅ `temp_opt_c` (array)
- ✅ `slack_threshold_ms`
- ✅ `context_bias` (JSONB)
- ✅ `tide_weight`, `light_weight`, `wind_weight`, `pressure_weight`, `temp_weight`, `lunar_weight`

### ❌ MISSING - Core Species Data

These 17 species **do NOT exist** in the species table yet. They need INSERT statements with:

## Required Fields (NOT NULL)

### 1. **species_code** ⚠️ REQUIRED
**Format:** lowercase-with-hyphens, max 10 chars

**Suggestions:**
```sql
'white-bream'        -- Diplodus sargus
'two-band-bream'     -- Diplodus vulgaris
'pandora'            -- Pagellus erythrinus
'red-porgy'          -- Pagrus pagrus
'saddled-bream'      -- Oblada melanura
'bogue'              -- Boops boops
'chub-mackerel'      -- Scomber colias
'med-scad'           -- Trachurus mediterraneus
'bonito'             -- Sarda sarda
'leerfish'           -- Lichia amia
'bluefish'           -- Pomatomus saltatrix
'yellow-cuda'        -- Sphyraena viridensis
'euro-cuda'          -- Sphyraena sphyraena
'dusky-grouper'      -- Epinephelus marginatus
'white-grouper'      -- Epinephelus aeneus
'red-scorpion'       -- Scorpaena scrofa
'meagre'             -- Argyrosomus regius
```

### 2. **scientific_name** ⚠️ REQUIRED
Already defined in your data ✅

### 3. **name_en** ⚠️ REQUIRED (English common name)
**Suggestions:**
```sql
'White Seabream'           -- Diplodus sargus
'Two-banded Seabream'      -- Diplodus vulgaris
'Common Pandora'           -- Pagellus erythrinus
'Red Porgy'                -- Pagrus pagrus
'Saddled Seabream'         -- Oblada melanura
'Bogue'                    -- Boops boops
'Atlantic Chub Mackerel'   -- Scomber colias
'Mediterranean Scad'       -- Trachurus mediterraneus
'Atlantic Bonito'          -- Sarda sarda
'Leerfish'                 -- Lichia amia
'Bluefish'                 -- Pomatomus saltatrix
'Yellowmouth Barracuda'    -- Sphyraena viridensis
'European Barracuda'       -- Sphyraena sphyraena
'Dusky Grouper'            -- Epinephelus marginatus
'White Grouper'            -- Epinephelus aeneus
'Red Scorpionfish'         -- Scorpaena scrofa
'Meagre'                   -- Argyrosomus regius
```

## Optional But Important Fields

### 4. **Localized Names** 📝 OPTIONAL
```sql
name_es  -- Spanish (important for Med!)
name_fr  -- French
name_it  -- Italian (important for Med!)
name_de  -- German
name_pt  -- Portuguese
```

**Examples:**
```sql
-- Meagre
name_es: 'Corvina'
name_fr: 'Maigre Commun'
name_it: 'Ombrina'
name_pt: 'Corvina'

-- White Seabream
name_es: 'Sargo'
name_fr: 'Sar Commun'
name_it: 'Sarago Maggiore'
name_pt: 'Sargo'

-- Dusky Grouper
name_es: 'Mero'
name_fr: 'Mérou Brun'
name_it: 'Cernia Bruna'
name_pt: 'Mero'
```

### 5. **typical_gear** 🎣 ARRAY
**Default:** `'{}'::text[]`
**Examples:**
```sql
-- Seabreams (shore species)
typical_gear: ARRAY['float fishing', 'bottom fishing', 'light tackle']

-- Meagre (big predator)
typical_gear: ARRAY['spinning', 'bottom fishing', 'trolling']

-- Bonito/Bluefish (fast pelagic)
typical_gear: ARRAY['trolling', 'spinning', 'jigging']

-- Groupers (reef dwellers)
typical_gear: ARRAY['bottom fishing', 'jigging', 'heavy tackle']

-- Barracudas (visual hunters)
typical_gear: ARRAY['spinning', 'fly fishing', 'trolling']
```

### 6. **max_boat_size** 🚤 INTEGER
**Default:** `8` (meters)
**Examples:**
```sql
-- Shore-accessible (seabreams, scorpionfish)
max_boat_size: 4

-- Coastal species (meagre, groupers)
max_boat_size: 8

-- Offshore pelagics (bonito, bluefish)
max_boat_size: 12
```

### 7. **is_night_species** 🌙 BOOLEAN
**Default:** `false`
**Examples:**
```sql
-- Night feeders
is_night_species: true  -- Octopus, Barracudas (harbour lights)

-- Day feeders
is_night_species: false -- Most seabreams, groupers
```

### 8. **is_seasonal** 📅 BOOLEAN
**Default:** `false`
**Examples:**
```sql
-- Highly seasonal
is_seasonal: true  -- Bonito (summer), Bluefish (summer), Leerfish (summer)

-- Year-round
is_seasonal: false -- Groupers, Scorpionfish, Seabreams
```

### 9. **eating_quality** ⭐ INTEGER (1-5)
**Default:** `3`
**Recommendations:**
```sql
eating_quality: 5 -- Red Porgy, Meagre, Groupers, Brill
eating_quality: 4 -- Seabreams, Bonito, Bluefish
eating_quality: 3 -- Bogue, Scad, Barracudas
eating_quality: 2 -- Scorpionfish (spiny but tasty!)
```

### 10. **min_depth / max_depth** 🌊 INTEGER (meters)
**Defaults:** `min: 0`, `max: 50`
**Examples:**
```sql
-- Shore-accessible species
min_depth: 0, max_depth: 20  -- Seabreams, Barracudas

-- Coastal/boat species
min_depth: 5, max_depth: 50  -- Meagre, Bonito, Bluefish

-- Deeper species
min_depth: 15, max_depth: 100  -- Groupers, Red Scorpionfish, Red Porgy
```

### 11. **preferred_habitat** 🏞️ ARRAY
**Default:** `'{}'::text[]`
**Examples:**
```sql
-- Rocky/reef species
preferred_habitat: ARRAY['rocky reefs', 'kelp beds', 'caves']  -- Groupers, Wrasse

-- Sand/mud species
preferred_habitat: ARRAY['sandy bottoms', 'seagrass beds']  -- Some seabreams

-- Pelagic species
preferred_habitat: ARRAY['open water', 'current lines', 'bait balls']  -- Bonito, Bluefish

-- Estuarine species
preferred_habitat: ARRAY['estuaries', 'river mouths', 'channels']  -- Meagre

-- Structure-oriented
preferred_habitat: ARRAY['wrecks', 'artificial reefs', 'harbour walls']  -- Barracudas
```

### 12. **Environmental Sensitivities** 🌡️ NUMERIC (0-1)
**Defaults:** All `0.5`
**Note:** These are OLD system - you have NEW bite score params that override these

```sql
wind_sensitivity: 0.3      -- Not very wind-sensitive
temperature_sensitivity: 0.7  -- Warm-water species
pressure_sensitivity: 0.3  -- Less pressure-sensitive than Atlantic species
tide_sensitivity: 0.5      -- Moderate (now overridden by tidal_sensitivity in bite score)
```

### 13. **advice** 📖 JSONB
**Format:**
```jsonb
{
  "shore": {
    "regions": "Western Mediterranean, Eastern Atlantic",
    "best_time": "Dawn and dusk, flooding tide",
    "tide_sensitivity": "Moderate; more active on tide push",
    "baits_diet": "Ragworm, crab, squid; prawn; small fish",
    "temperature_effect": "15-22°C optimal; summer peak",
    "weather_effect": "Calm to light chop; clear water preferred",
    "distance_depth": "Rocky headlands, harbour walls, 2-15m",
    "restrictions": "Check local MLS (minimum landing size)",
    "authority": "Local Mediterranean fisheries authority"
  },
  "boat": {
    "regions": "Western Mediterranean, Eastern Atlantic",
    "best_time": "Dawn and dusk, mid-tide",
    "tide_sensitivity": "Moderate",
    "baits_diet": "Live baitfish, squid, lures",
    "temperature_effect": "15-22°C optimal",
    "weather_effect": "Calm to moderate seas",
    "distance_depth": "Reefs, wrecks, drop-offs 20-80m",
    "restrictions": "Check local quotas and size limits",
    "authority": "National/regional fisheries"
  }
}
```

### 14. **playful_bio_en** 💬 TEXT
**Tinder-style species profile**

**Examples:**
```sql
-- Meagre
playful_bio_en: 'Looking for someone who gets me at dawn in estuaries. I''m the Mediterranean''s answer to bass—big, powerful, and tide-obsessed. Bonus points if you''ve got live baitfish.'

-- Bluefish
playful_bio_en: 'Catch me whenever baitfish panic. I''m all about fast action and strong currents—no patience for slack water. Aggressive, explosive, unforgettable.'

-- Dusky Grouper
playful_bio_en: 'Always around caves and deep reefs. Not into chasing—I''m an ambush specialist. Looking for someone who appreciates temperature over tides.'

-- Barracuda
playful_bio_en: 'Night owl with a thing for harbour lights. Strong diurnal vibes—dawn and dusk are my time. Looking for fast lures and clear water.'

-- Red Porgy
playful_bio_en: 'Daytime reef dweller. Excellent eating quality, if I say so myself. Looking for someone who can find drop-offs and appreciates a mid-flood tide.'

-- Bonito
playful_bio_en: 'Summer fling only. Looking for fast trolling and bait balls. Dawn/dusk action, spring tides preferred. I don''t do cold water.'
```

### 15. **conservation_status** 🔴 TEXT
**Examples:**
```sql
conservation_status: 'Least Concern (IUCN)'  -- Most species
conservation_status: 'Vulnerable (Mediterranean populations)' -- Dusky Grouper
conservation_status: 'Near Threatened' -- Some grouper populations
conservation_status: 'Data Deficient' -- Some lesser-known species
```

### 16. **fun_fact** 🎯 TEXT
**Examples:**
```sql
-- Meagre
fun_fact: 'Meagre can grow over 2 meters and 100kg! Their swim bladder amplifies their grunting sounds—fishermen can hear them from boats.'

-- Dusky Grouper
fun_fact: 'Dusky groupers can live 60+ years and change sex from female to male as they age. They''re fiercely territorial cave dwellers.'

-- Barracuda
fun_fact: 'Barracudas have two sets of teeth—razor-sharp outer teeth for slicing, and inner teeth for gripping. They can swim up to 35 mph!'

-- Bluefish
fun_fact: 'Bluefish feeding frenzies are legendary—they''ll attack anything that moves, including each other! They''ve been known to beach themselves chasing prey.'

-- Bonito
fun_fact: 'Atlantic bonito are mini tunas—fast, powerful, and delicious. They''re a favorite target for light-tackle enthusiasts.'
```

## Complete INSERT Template

```sql
INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_it,
    name_pt,
    typical_gear,
    max_boat_size,
    is_night_species,
    is_seasonal,
    eating_quality,
    min_depth,
    max_depth,
    preferred_habitat,
    wind_sensitivity,
    temperature_sensitivity,
    pressure_sensitivity,
    advice,
    playful_bio_en,
    conservation_status,
    fun_fact
) VALUES (
    'meagre',                                    -- species_code
    'Argyrosomus regius',                       -- scientific_name
    'Meagre',                                   -- name_en
    'Corvina',                                  -- name_es
    'Maigre Commun',                           -- name_fr
    'Ombrina',                                 -- name_it
    'Corvina',                                 -- name_pt
    ARRAY['spinning', 'bottom fishing', 'trolling'],  -- typical_gear
    8,                                         -- max_boat_size
    false,                                     -- is_night_species
    false,                                     -- is_seasonal
    5,                                         -- eating_quality
    0,                                         -- min_depth
    50,                                        -- max_depth
    ARRAY['estuaries', 'river mouths', 'channels', 'sandy bottoms'],  -- preferred_habitat
    0.3,                                       -- wind_sensitivity
    0.6,                                       -- temperature_sensitivity
    0.4,                                       -- pressure_sensitivity
    '{"shore": {"regions": "Mediterranean, Atlantic Portugal/Spain, growing in UK", "best_time": "Dawn and dusk, flooding tide", "tide_sensitivity": "High—follows tide like bass", "baits_diet": "Live baitfish, squid, large worms, crab", "temperature_effect": "16-22°C optimal; summer-autumn peak", "weather_effect": "Calm to light chop; active in estuaries", "distance_depth": "Estuaries, channels, river mouths 0-20m", "restrictions": "Check local MLS—often 42-45cm", "authority": "National fisheries (Spain, Portugal, France)"}, "boat": {"regions": "Mediterranean, Atlantic Portugal/Spain", "best_time": "Dawn/dusk, mid-tide", "tide_sensitivity": "High", "baits_diet": "Live mackerel, squid, trolled lures", "temperature_effect": "16-22°C optimal", "weather_effect": "Calm seas preferred", "distance_depth": "Channels, sandbanks, 10-50m", "restrictions": "Check quotas and MLS", "authority": "National/regional fisheries"}}'::jsonb,  -- advice
    'Looking for someone who gets me at dawn in estuaries. I''m the Mediterranean''s answer to bass—big, powerful, and tide-obsessed. Bonus points if you''ve got live baitfish.',  -- playful_bio_en
    'Least Concern (IUCN)',                    -- conservation_status
    'Meagre can grow over 2 meters and 100kg! Their swim bladder amplifies their grunting sounds—fishermen can hear them from boats.'  -- fun_fact
);
```

## Priority Order for Data Entry

### Tier 1: High-Priority UK/Atlantic Species
1. **Meagre** - Growing in UK waters, massive sport fish
2. **Bluefish** - Summer visitor, explosive fighter
3. **Atlantic Bonito** - Summer visitor to south coast
4. **Leerfish** - Rare but possible in SW England

### Tier 2: Popular Mediterranean Species
5. **Dusky Grouper** - Iconic, high eating quality
6. **White Seabream** - Common shore catch
7. **Red Porgy** - Excellent eating, boat fishing
8. **Yellowmouth Barracuda** - Visual hunters, exciting

### Tier 3: Supporting Cast
9-17. Other seabreams, scorpionfish, smaller pelagics

## Bait Recommendations by Species

### Seabreams (Diplodus spp., Pagellus, Pagrus)
- **Shore:** Ragworm, sandworm, crab, shellfish, prawn
- **Boat:** Squid strips, cuttlefish, small crabs, worms
- **Lures:** Small jigs, sabiki rigs

### Predators (Bonito, Bluefish, Leerfish, Meagre)
- **Shore:** Live baitfish, large worms, crab
- **Boat:** Live mackerel, horse mackerel, squid, trolled lures
- **Lures:** Poppers, stick baits, metal jigs, soft plastics

### Barracudas
- **Shore:** Strip baits, small live fish
- **Boat:** Needle fish imitations, surface lures
- **Lures:** Long thin lures, silver/flashy, fast retrieve

### Groupers
- **Shore:** Large crab, live fish, squid
- **Boat:** Live baitfish, whole squid, octopus
- **Lures:** Large soft plastics, vertical jigs

### Scorpionfish
- **Shore:** Ragworm, shrimp, small crabs
- **Boat:** Worms, small fish strips
- **Note:** Ambush predator—stationary bait near structure

## Next Steps

1. ✅ Bite score parameters - DONE (in migration file)
2. ⏳ Create INSERT statements for all 17 species
3. ⏳ Research and add localized names (especially Spanish/Italian)
4. ⏳ Write playful bios (Tinder-style profiles)
5. ⏳ Research and write fishing advice (shore/boat contexts)
6. ⏳ Add conservation status and fun facts
7. ⏳ Link to ICES rectangles (Mediterranean regions)
8. ⏳ Add species images (or use GradientFish fallback)

## Tools/Resources Needed

- **FishBase:** Scientific data, depths, habitats
- **IUCN Red List:** Conservation status
- **Med fishing forums:** Local knowledge, baits, tactics
- **Spanish/Italian fishing sites:** Localized names, regional knowledge
- **UK sea angling sites:** Info on rare visitors (Meagre, Bonito, Bluefish)
