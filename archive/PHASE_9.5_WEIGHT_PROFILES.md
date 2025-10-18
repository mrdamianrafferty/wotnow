# Phase 9.5: Guild-Specific Environmental Weighting

## Overview

Different fish guilds have different ecological drivers. A pelagic species like Mackerel is driven primarily by temperature and cares little about substrate, while a reef specialist like Wrasse absolutely requires specific bottom structure.

This enhancement adds species-specific weight profiles to make predictions more ecologically accurate.

---

## Weight Profile Definitions

### 1. DEFAULT_COASTAL (Balanced generalist)
```json
{
  "temperature": 0.30,
  "salinity": 0.20,
  "depth": 0.25,
  "substrate": 0.25
}
```

**Use for:** Coastal generalists without strong habitat specialization
**Ecological rationale:** Balanced across all factors, no single driver dominates
**Examples:** Species that adapt to various conditions

---

### 2. PELAGIC (Temperature-driven, substrate-independent)
```json
{
  "temperature": 0.38,
  "salinity": 0.27,
  "depth": 0.20,
  "substrate": 0.15
}
```

**Use for:** Open water shoaling species
**Ecological rationale:** 
- Temperature dominates (38%) - drives seasonal migrations
- Salinity important (27%) - affects distribution
- Substrate minimal (15%) - only matters for structure proximity
- Depth moderate (20%) - prefer certain water columns but flexible

**Species:**
- Mackerel (mac)
- Horse Mackerel (hom)
- Garfish (gar)
- Sardine (pil)
- Anchovy (anc)
- Sprat (spr)
- Herring (her)
- Blue Shark (bsh)
- Tope (tope)
- Little Tunny (ltun) - if present

---

### 3. SURF_ESTUARY (Generalist, salinity-sensitive)
```json
{
  "temperature": 0.33,
  "salinity": 0.22,
  "depth": 0.23,
  "substrate": 0.22
}
```

**Use for:** Coastal generalists that move between estuaries and open coast
**Ecological rationale:**
- Temperature high (33%) - drives seasonal presence
- Salinity elevated (22%) - critical for estuarine tolerance
- Depth important (23%) - tide-linked, use different depths
- Substrate moderate (22%) - adaptable but prefer certain types

**Species:**
- Sea Bass (bss)
- Grey Mullet (mul)
- Flounder (fle)
- Sea Bream / Dorada (sbr)
- Common Sole (sol) - actually more benthic, but euryhaline

---

### 4. REEF_KELP (Substrate-dominant, structure-bound)
```json
{
  "temperature": 0.25,
  "salinity": 0.18,
  "depth": 0.22,
  "substrate": 0.35
}
```

**Use for:** Reef/rock/kelp specialists that won't leave structure
**Ecological rationale:**
- Substrate dominates (35%) - absolute requirement for habitat
- Temperature reduced (25%) - will stay on reef even if suboptimal temp
- Salinity low (18%) - less critical in full marine environments
- Depth moderate (22%) - reef depth matters but secondary to structure

**Species:**
- Ballan Wrasse (wrb)
- Cuckoo Wrasse (cwrb)
- Goldsinny Wrasse (gwrb)
- Pollock (pol)
- Black Seabream (bsb)
- John Dory (jdo)
- Saithe (sai) - debatable, but reef-associated
- Bib/Pouting (bib)
- Poor Cod (pok)
- Red Gurnard (gur)
- Conger Eel (con)
- Ballan Wrasse family

---

### 5. BENTHIC (Substrate-critical, bottom-dwelling)
```json
{
  "temperature": 0.28,
  "salinity": 0.20,
  "depth": 0.22,
  "substrate": 0.30
}
```

**Use for:** Bottom-dwelling species that require specific sediment types
**Ecological rationale:**
- Substrate high (30%) - flatfish need sand/mud, rays need clean bottom
- Temperature moderate (28%) - important but substrate more critical
- Depth moderate (22%) - depth-stratified but flexible
- Salinity standard (20%) - marine species

**Species:**
- Plaice (ple)
- Dab (dab)
- Lemon Sole (lso)
- Dover Sole (sol) - if not surf_estuary
- Megrim (meg)
- Turbot (tur)
- Brill (bri)
- Thornback Ray (ray)
- Blonde Ray (bra)
- Small-eyed Ray (ser)
- Spotted Ray (spr)
- Starry Smoothhound (ssh)
- Common Smoothhound (csh)
- Anglerfish (mon)

---

### 6. CEPHALOPOD (Temperature & clarity-driven)
```json
{
  "temperature": 0.32,
  "salinity": 0.23,
  "depth": 0.22,
  "substrate": 0.23
}
```

**Use for:** Squid, cuttlefish, octopus
**Ecological rationale:**
- Temperature high (32%) - very temperature-sensitive, migratory
- Salinity elevated (23%) - affects egg survival
- Substrate moderate (23%) - need clean bottom for egg-laying
- Depth moderate (22%) - use different depths for different life stages

**Species:**
- Common Squid (squid)
- Common Cuttlefish (cuttlefish)
- Common Octopus (octopus) - if present

---

## Species Classifications (All 62 Species)

### PELAGIC (11 species)
- mac - Mackerel
- hom - Horse Mackerel  
- gar - Garfish
- pil - Sardine (Pilchard)
- spr - Sprat
- her - Herring
- anc - Anchovy
- bsh - Blue Shark
- tope - Tope Shark
- ltun - Little Tunny (if present)
- alb - Albacore (if present)

### SURF_ESTUARY (5 species)
- bss - Sea Bass
- mul - Grey Mullet
- fle - Flounder
- sbr - Sea Bream / Gilthead Bream
- sbr2 - Red Sea Bream (if separate)

### REEF_KELP (14 species)
- wrb - Ballan Wrasse
- cwrb - Cuckoo Wrasse
- gwrb - Goldsinny Wrasse
- pol - Pollock
- bsb - Black Seabream
- jdo - John Dory
- sai - Saithe
- bib - Bib (Pouting)
- pok - Poor Cod
- gur - Red Gurnard
- tgur - Tub Gurnard
- ggur - Grey Gurnard
- con - Conger Eel
- ling - Ling

### BENTHIC (22 species)
- ple - Plaice
- dab - Dab
- sol - Dover Sole (or surf_estuary)
- lso - Lemon Sole
- meg - Megrim
- tur - Turbot
- bri - Brill
- flo - Flounder (or surf_estuary)
- wit - Witch Flounder
- ray - Thornback Ray
- bra - Blonde Ray
- ser - Small-eyed Ray
- spr - Spotted Ray
- ssr - Sandy Ray
- usr - Undulate Ray
- ssh - Starry Smoothhound
- csh - Common Smoothhound
- tsh - Tope Shark (or pelagic)
- mon - Anglerfish (Monkfish)
- had - Haddock
- whg - Whiting
- cod - Cod (somewhat pelagic but bottom-oriented)

### CEPHALOPOD (3 species)
- squid - Common Squid
- cuttle - Common Cuttlefish
- octo - Common Octopus (if present)

### DEFAULT_COASTAL (7 species)
- Use for any unclassified or truly generalist species
- Species that don't fit cleanly into other guilds

---

## Implementation Notes

### Database Changes
```sql
ALTER TABLE species 
ADD COLUMN weight_profile TEXT DEFAULT 'default_coastal';

-- Add constraint to ensure valid profiles
ALTER TABLE species 
ADD CONSTRAINT valid_weight_profile 
CHECK (weight_profile IN (
  'default_coastal',
  'pelagic',
  'surf_estuary', 
  'reef_kelp',
  'benthic',
  'cephalopod'
));
```

### Function Changes
The `get_environmental_predictions_basic()` function will:
1. Load the species' `weight_profile`
2. Apply guild-specific weights to factor scores
3. Calculate final environmental score

### Expected Impact

**Pelagic species (e.g., Mackerel):**
- Before: Penalized for wrong substrate even though irrelevant
- After: Temperature dominates (38%), substrate barely matters (15%)
- Example: Mackerel at 18°C rock vs sand → nearly identical scores

**Reef species (e.g., Wrasse):**
- Before: Could score well on sand if temp perfect (wrong!)
- After: Substrate dominates (35%), won't score high without rock
- Example: Wrasse on sand → much lower score even with perfect temp

**Benthic species (e.g., Plaice):**
- Before: Scored same as reef species for substrate
- After: Substrate critical (30%), but temperature still important (28%)
- Example: Plaice needs sand + moderate temp for high score

---

## Testing Strategy

### Test 1: Pelagic on Different Substrates
Query Mackerel predictions with rock vs sand:
- Should show minimal difference (15% weight)
- Temperature should dominate

### Test 2: Reef Fish on Wrong Substrate
Query Wrasse on sand:
- Should score much lower than current system
- Substrate mismatch should be ~35% of score

### Test 3: Benthic Fish on Wrong Substrate  
Query Plaice on rock:
- Should score lower but not as dramatically as reef fish
- 30% substrate weight is significant but not dominant

### Test 4: Compare Guild Rankings
Same conditions (16.5°C, rock, 15m):
- Reef fish should rank highest
- Surf/estuary next
- Benthic lower
- Pelagic should be insensitive to substrate

---

## Rollout Plan

1. ✅ Create this reference document
2. ⏳ Review and finalize species classifications
3. ⏳ Create migration to add weight_profile column
4. ⏳ Update prediction function with guild logic
5. ⏳ Create script to populate all 62 species
6. ⏳ Test predictions before/after
7. ⏳ Deploy to production
8. ⏳ Document changes for API users

---

## Future Enhancements (Phase 10+)

1. **Dynamic weights by season**
   - Bass more substrate-focused in summer (reefs)
   - Bass more temperature-focused in winter (estuaries)

2. **Life stage weights**
   - Juvenile vs adult different preferences
   - Spawning aggregations have different drivers

3. **Time-of-day weights**
   - Nocturnal feeders (rays) use depth differently
   - Diurnal predators more structure-bound

4. **Custom weights per species**
   - Move beyond guilds to individual tuning
   - Machine learning to optimize weights from catch data

---

## Ecological References

- Pelagic migrations driven by temperature isotherms (Neat & Righton, 2007)
- Reef fish substrate fidelity (Froese & Pauly, FishBase)
- Flatfish substrate selectivity (Gibson, 1994)
- Cephalopod temperature sensitivity (Boyle & Boletzky, 1996)

---

**Phase 9.5 Status:** Ready for implementation
**Expected improvement:** 15-25% better predictions for specialist species
**Breaking changes:** None - backwards compatible with default_coastal
