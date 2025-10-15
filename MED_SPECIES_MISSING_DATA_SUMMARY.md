# Mediterranean Species: Missing Data Summary

## Current Status

### ✅ DONE: Bite Score Parameters (All 17 species)
Your migration file `add_species_bite_score_params.sql` has complete UPDATE statements for:
- Diurnal sensitivity, tidal sensitivity, preferred tide stages
- All 8 factor weights (tide, light, wind, pressure, temp, lunar, turbidity, clarity)
- Flow preference, spring/neap boost, slack threshold
- Context bias (habitat-specific bonuses)
- Temperature optimal range

**Problem:** These UPDATE statements will run BUT won't update anything because **the species don't exist yet!**

### ❌ TODO: Core Species Records (0/17 species exist)

These 17 species need INSERT statements to create them in the database:

1. Diplodus sargus (White Seabream)
2. Diplodus vulgaris (Two-banded Seabream)
3. Pagellus erythrinus (Common Pandora)
4. Pagrus pagrus (Red Porgy)
5. Oblada melanura (Saddled Seabream)
6. Boops boops (Bogue)
7. Scomber colias (Atlantic Chub Mackerel)
8. Trachurus mediterraneus (Mediterranean Scad)
9. Sarda sarda (Atlantic Bonito)
10. Lichia amia (Leerfish)
11. Pomatomus saltatrix (Bluefish)
12. Sphyraena viridensis (Yellowmouth Barracuda)
13. Sphyraena sphyraena (European Barracuda)
14. Epinephelus marginatus (Dusky Grouper)
15. Epinephelus aeneus (White Grouper)
16. Scorpaena scrofa (Red Scorpionfish)
17. Argyrosomus regius (Meagre)

## What Each Species Needs

### Required Fields (3)
1. **species_code** - Unique identifier (e.g., 'meagre', 'bluefish', 'white-bream')
2. **scientific_name** - Already in your data ✅
3. **name_en** - English common name (e.g., 'Meagre', 'Bluefish')

### Important Optional Fields (14)
4. **name_es/fr/it/de/pt** - Localized names (especially Spanish/Italian for Med!)
5. **typical_gear** - Array of fishing methods
6. **max_boat_size** - Max boat size in meters
7. **is_night_species** - Boolean (true for barracudas at harbour lights)
8. **is_seasonal** - Boolean (true for summer visitors like bonito)
9. **eating_quality** - Integer 1-5 (5 = excellent)
10. **min_depth/max_depth** - Depth range in meters
11. **preferred_habitat** - Array of habitat types
12. **wind/temp/pressure/tide_sensitivity** - Old system (0-1), now overridden by bite scores
13. **advice** - JSONB with shore/boat fishing advice
14. **playful_bio_en** - Tinder-style species profile
15. **conservation_status** - IUCN status
16. **fun_fact** - Interesting trivia
17. **typical_gear** - Array of recommended tackle

## Quick Reference: Key Data Points

### High Priority Species (UK Market)

**Meagre (Argyrosomus regius)**
- Code: `meagre`
- Eating: 5/5 ⭐⭐⭐⭐⭐
- Gear: Spinning, bottom fishing, trolling
- Habitat: Estuaries, river mouths, channels
- Season: Summer-autumn peak
- Fun fact: Can grow over 100kg! Grunt loudly underwater

**Bluefish (Pomatomus saltatrix)**
- Code: `bluefish`
- Eating: 4/5 ⭐⭐⭐⭐
- Gear: Trolling, spinning, jigging
- Habitat: Bait balls, river mouths, open water
- Season: Summer visitor to UK
- Fun fact: Legendary feeding frenzies, attack everything!

**Atlantic Bonito (Sarda sarda)**
- Code: `bonito`
- Eating: 4/5 ⭐⭐⭐⭐
- Gear: Trolling, spinning, jigging
- Habitat: Tidal rips, headlands, bait balls
- Season: Summer only
- Fun fact: Mini tuna—fast, powerful, delicious

### Mediterranean Favorites

**Dusky Grouper (Epinephelus marginatus)**
- Code: `dusky-grouper`
- Eating: 5/5 ⭐⭐⭐⭐⭐
- Gear: Bottom fishing, jigging, heavy tackle
- Habitat: Caves, deep reefs
- Conservation: Vulnerable in Med
- Fun fact: Live 60+ years, change sex, fiercely territorial

**White Seabream (Diplodus sargus)**
- Code: `white-bream`
- Eating: 4/5 ⭐⭐⭐⭐
- Gear: Float fishing, light tackle, bottom rigs
- Habitat: Rocky coves, seagrass beds
- Common shore catch
- Fun fact: Omnivore—eats everything from worms to mussels

**Yellowmouth Barracuda (Sphyraena viridensis)**
- Code: `yellow-cuda`
- Eating: 3/5 ⭐⭐⭐
- Gear: Spinning, fly fishing, trolling
- Habitat: Harbour lights, reef edges
- Night feeder: True
- Fun fact: Can swim 35 mph! Two sets of teeth

## Suggested Workflow

### Phase 1: Create Basic Records (High Priority)
1. **Meagre** - Growing UK population, high sport value
2. **Bluefish** - Summer visitor, exciting catch
3. **Bonito** - Summer visitor, excellent eating
4. **Leerfish** - Rare UK visitor, surf specialist

**What to include:**
- species_code, scientific_name, name_en
- eating_quality, typical_gear
- min_depth, max_depth, preferred_habitat
- is_seasonal, is_night_species
- Basic advice (shore/boat)

### Phase 2: Add Mediterranean Core Species
5. **Dusky Grouper** - Iconic Med species
6. **White Seabream** - Common shore catch
7. **Red Porgy** - Excellent eating
8. **Barracudas (both species)** - Visual hunters

**What to include:**
- All Phase 1 fields
- Localized names (Spanish, Italian, French)
- Playful bios
- Conservation status

### Phase 3: Complete the Set
9-17. All remaining seabreams, scorpionfish, scad

**What to include:**
- Complete data for all fields
- Fun facts
- Detailed fishing advice
- Images/illustrations

## Localized Names (Priority Examples)

### Meagre
- **Spanish:** Corvina
- **French:** Maigre Commun
- **Italian:** Ombrina
- **Portuguese:** Corvina

### Dusky Grouper
- **Spanish:** Mero
- **French:** Mérou Brun
- **Italian:** Cernia Bruna
- **Portuguese:** Mero

### White Seabream
- **Spanish:** Sargo
- **French:** Sar Commun
- **Italian:** Sarago Maggiore
- **Portuguese:** Sargo

### Bluefish
- **Spanish:** Anjova
- **French:** Tassergal
- **Italian:** Serra
- **Portuguese:** Anchova

## Typical Gear Recommendations

### Light Shore Tackle (Seabreams, small species)
```sql
ARRAY['float fishing', 'bottom fishing', 'light tackle', 'sabiki rigs']
```

### Medium Predator Gear (Meagre, Barracuda)
```sql
ARRAY['spinning', 'bottom fishing', 'trolling', 'fly fishing']
```

### Heavy Pelagic Gear (Bonito, Bluefish)
```sql
ARRAY['trolling', 'spinning', 'jigging', 'poppers']
```

### Reef/Structure Gear (Groupers, Scorpionfish)
```sql
ARRAY['bottom fishing', 'jigging', 'heavy tackle', 'live bait']
```

## Conservation Status Quick Guide

**Least Concern:** Most species
- Seabreams (most), Barracudas, Bonito, Bluefish, Meagre, Scorpionfish

**Near Threatened:** Some populations
- Dusky Grouper (Mediterranean populations declining)

**Vulnerable:** Protected areas
- Dusky Grouper (some Med regions)

**Data Deficient:** Lesser-known species
- Some seabream species, White Grouper

## Common Baits by Species Group

### Seabreams
**Shore:** Ragworm, sandworm, crab, mussels, prawn
**Boat:** Squid strips, cuttlefish, small crabs, clams

### Big Predators (Meagre, Leerfish, Bluefish)
**Shore:** Live small fish, large worms, crab, squid
**Boat:** Live mackerel, horse mackerel, squid, trolled lures

### Barracudas
**Best:** Long thin lures, needle fish imitations, strip baits
**Technique:** Fast retrieve, surface lures, silver/flashy

### Groupers
**Shore:** Large crab, live fish, whole squid
**Boat:** Live baitfish, octopus, large soft plastics

### Bonito
**Best:** Small lures, feathers, sabiki rigs, trolled lures
**Technique:** Fast trolling, cast and retrieve

## Next Actions

### Immediate (1-2 hours)
1. Create INSERT statements for top 4 species (Meagre, Bluefish, Bonito, Leerfish)
2. Add basic data: names, codes, gear, depth, eating quality
3. Test migration with these 4 species

### Short-term (1-2 days)
4. Add remaining 13 species INSERT statements
5. Research and add localized names (Spanish/Italian priority)
6. Write playful bios for all 17 species

### Medium-term (1 week)
7. Research and write detailed fishing advice (shore/boat)
8. Add conservation status and fun facts
9. Link species to Mediterranean ICES rectangles
10. Add species images or confirm GradientFish fallbacks

## Files Affected

1. **migrations/add_species_bite_score_params.sql**
   - Already has UPDATE statements ✅
   - Need to add INSERT statements BEFORE the UPDATEs

2. **New file: migrations/insert_mediterranean_species.sql**
   - Alternative: Keep INSERTs separate for clarity
   - Can run independently

## Testing Strategy

After adding INSERT statements:

```sql
-- Verify species created
SELECT species_code, name_en, scientific_name 
FROM species 
WHERE scientific_name IN ('Argyrosomus regius', 'Pomatomus saltatrix', 'Sarda sarda')
ORDER BY name_en;

-- Verify bite score params applied
SELECT 
  name_en,
  tidal_sensitivity,
  diurnal_sensitivity,
  temp_opt_c,
  context_bias
FROM species
WHERE scientific_name = 'Argyrosomus regius';

-- Expected: Meagre with full bite score data
```

---

**Bottom line:** Your bite score parameters are perfect, but the species records don't exist yet. Need INSERT statements before the UPDATEs will work! 🎣
