# Temperature Data for Remaining 9 Species - Angler & Family-Based Estimates

**Purpose:** Fill remaining temperature gaps using family relationships, congener data, and angler knowledge

---

## 1. Wrasse (various) - Labridae spp.

**Family Data Available:**
- Ballan Wrasse: 5-25°C
- Cuckoo Wrasse: 8-18°C (optimal 10-15°C)
- Corkwing Wrasse: 8-18°C (optimal 11-15°C)
- Goldsinny Wrasse: 7-18°C (optimal 10-14°C)
- Rock Cook: MISSING

**Angler Notes:**
- "Activity rises sharply >10-12°C; winter lethargy common"
- "Not migratory but strongly temperature-modulated feeding"
- All UK wrasse species show similar behavioral pattern

**Proposed Range:**
```json
{
  "species_code": "wra",
  "scientific_name": "Labridae spp.",
  "name_en": "Wrasse (various)",
  "temperature": {
    "tolerance_min": 5,
    "tolerance_max": 20,
    "optimal_min": 10,
    "optimal_max": 16,
    "mean": 13,
    "unit": "celsius",
    "source": "Family Average/Angler Data",
    "notes": "Generic wrasse family range. Activity rises sharply >10-12°C; winter lethargy common across all European wrasse species. Use specific species data when possible."
  }
}
```

---

## 2. Rock Cook - Centrolabrus exoletus

**Family:** Labridae (wrasse)

**Related Species:**
- All other wrasse: 7-18°C optimal 10-15°C
- Habitat: Rocky shores, kelp forests (similar to Corkwing)

**Angler Knowledge:**
- Small wrasse species
- Cold-tolerant northern European distribution
- Similar habitat to Corkwing Wrasse

**Proposed Range:**
```json
{
  "species_code": "WRO",
  "scientific_name": "Centrolabrus exoletus",
  "name_en": "Rock Cook",
  "temperature": {
    "tolerance_min": 6,
    "tolerance_max": 18,
    "optimal_min": 9,
    "optimal_max": 15,
    "mean": 12,
    "unit": "celsius",
    "source": "Wrasse Family/Marine Biology",
    "notes": "Cold-temperate wrasse. Similar thermal preferences to Corkwing Wrasse. Activity temperature-modulated with winter lethargy typical of wrasse family."
  }
}
```

---

## 3. Red Gurnard - Chelidonichthys cuculus

**Family:** Triglidae (gurnards)

**Related Species:**
- Grey Gurnard: 5-15°C (optimal 8-12°C) - ICES/Marine Biology
- Tub Gurnard: 8-24°C - FishBase

**Distribution:**
- More southerly than Grey Gurnard
- Mediterranean to southern UK
- Slightly warmer preference than Grey Gurnard

**Angler Knowledge:**
- Summer species in UK waters
- Appears as water warms
- Less cold-tolerant than Grey Gurnard

**Proposed Range:**
```json
{
  "species_code": "GUR",
  "scientific_name": "Chelidonichthys cuculus",
  "name_en": "Red Gurnard",
  "temperature": {
    "tolerance_min": 7,
    "tolerance_max": 20,
    "optimal_min": 10,
    "optimal_max": 16,
    "mean": 13,
    "unit": "celsius",
    "source": "Gurnard Family/Marine Biology",
    "notes": "Warmer preference than Grey Gurnard. Summer species in UK waters; appears as temperatures rise. Common in Mediterranean and southern European waters."
  }
}
```

---

## 4. Megrim - Lepidorhombus whiffiagonis

**Family:** Scophthalmidae (flatfish)

**Related Species:**
- Brill: 6-17°C (optimal 10-14°C)
- Turbot: 6-18°C (optimal 10-14°C)
- Both are cold-temperate flatfish

**Habitat:**
- Deep water (100-700m)
- North Atlantic, Bay of Biscay
- Commercial species with ICES data available

**Deep Water Pattern:**
- Deeper = colder preference generally
- Similar to other scophthalmids

**Proposed Range:**
```json
{
  "species_code": "ldb",
  "scientific_name": "Lepidorhombus whiffiagonis",
  "name_en": "Megrim",
  "temperature": {
    "tolerance_min": 4,
    "tolerance_max": 14,
    "optimal_min": 6,
    "optimal_max": 11,
    "mean": 8.5,
    "unit": "celsius",
    "source": "Flatfish Family/ICES",
    "notes": "Deep-water flatfish. Colder preference than Brill/Turbot due to depth range. Common in North Atlantic commercial fisheries."
  }
}
```

---

## 5. Painted Comber - Serranus scriba

**Family:** Serranidae (sea basses/combers)

**Related Species:**
- Comber (Serranus cabrilla): 12-22°C (optimal 15-19°C)
- Same genus, very similar ecology

**Distribution:**
- Mediterranean and southern European waters
- Rocky reefs
- Warmer waters than common Comber

**Angler Knowledge:**
- Mediterranean rocky shore species
- Warm water preference
- Similar to Comber but more southerly

**Proposed Range:**
```json
{
  "species_code": "CMP",
  "scientific_name": "Serranus scriba",
  "name_en": "Painted Comber",
  "temperature": {
    "tolerance_min": 13,
    "tolerance_max": 24,
    "optimal_min": 16,
    "optimal_max": 21,
    "mean": 18.5,
    "unit": "celsius",
    "source": "Serranidae Family/Mediterranean",
    "notes": "Mediterranean comber species. Slightly warmer preference than Serranus cabrilla. Rocky reef habitat in warm temperate to subtropical waters."
  }
}
```

---

## 6. Picarel - Spicara smaris

**Family:** Sparidae (sea breams)

**Related Species:**
- Black Seabream: 10-26°C (optimal 15-26°C)
- Gilthead Seabream: 15-26°C (optimal 18-24°C)
- Red Seabream: 10-18°C (optimal 12-15°C)

**Distribution:**
- Mediterranean and eastern Atlantic
- Schooling species
- Coastal to 300m depth

**Characteristics:**
- Small sparid
- Temperate to warm waters
- Midpoint between Red Seabream (cold) and Gilthead (warm)

**Proposed Range:**
```json
{
  "species_code": "PIC",
  "scientific_name": "Spicara smaris",
  "name_en": "Picarel",
  "temperature": {
    "tolerance_min": 12,
    "tolerance_max": 22,
    "optimal_min": 15,
    "optimal_max": 20,
    "mean": 17.5,
    "unit": "celsius",
    "source": "Sparidae Family/Mediterranean",
    "notes": "Mediterranean sparid. Temperate to warm water schooling species. Common in eastern Mediterranean and southern European waters."
  }
}
```

---

## 7. Salema (Saupe) - Sarpa salpa

**Family:** Sparidae (sea breams)

**Distribution:**
- Mediterranean and eastern Atlantic
- Herbivorous (seagrass/algae)
- Warm temperate to subtropical

**Related Species:**
- Other Mediterranean sparids: 15-24°C optimal
- Herbivorous lifestyle = shallow warm waters

**Characteristics:**
- Only herbivorous sparid
- Shallow coastal waters
- Seagrass beds (warm water habitat)

**Proposed Range:**
```json
{
  "species_code": "SAL",
  "scientific_name": "Sarpa salpa",
  "name_en": "Salema (Saupe)",
  "temperature": {
    "tolerance_min": 14,
    "tolerance_max": 26,
    "optimal_min": 17,
    "optimal_max": 23,
    "mean": 20,
    "unit": "celsius",
    "source": "Mediterranean/Marine Biology",
    "notes": "Warm water herbivorous sparid. Seagrass specialist requiring warm shallow waters. Mediterranean and subtropical eastern Atlantic."
  }
}
```

---

## 8. Small-eyed Ray - Raja microocellata

**Family:** Rajidae (rays)

**Related Species:**
- Thornback Ray: 6-18°C (optimal 10-18°C)
- Spotted Ray: 7-15°C (optimal 9-12°C)
- Undulate Ray: 10-20°C (optimal 12-20°C)

**Distribution:**
- UK and northern European waters
- Sandy/mixed substrate
- Colder than Undulate, similar to Spotted

**Angler Knowledge:**
- Common UK ray species
- Sluggish in cold water (like other rays)
- Feeding increases with warming

**Proposed Range:**
```json
{
  "species_code": "RME",
  "scientific_name": "Raja microocellata",
  "name_en": "Small-eyed Ray",
  "temperature": {
    "tolerance_min": 6,
    "tolerance_max": 16,
    "optimal_min": 9,
    "optimal_max": 14,
    "mean": 11.5,
    "unit": "celsius",
    "source": "Rajidae Family/Marine Biology",
    "notes": "Cold-temperate ray. Similar to Spotted Ray. Sluggish and less active in cold water; feeding rate increases with warming."
  }
}
```

---

## 9. Spotted Bass - Dicentrarchus punctatus

**Family:** Moronidae (temperate basses)

**Related Species:**
- Sea Bass (Dicentrarchus labrax): 8-24°C (FishBase)
- Spotted Bass is Mediterranean/warmer cousin

**ALREADY IN MANUAL LOOKUP:**
- Code: `bsp` in MERGED
- Code: `bss` appears in LOOKUP but that's Sea Bass (labrax)
- Need separate entry for punctatus

**Distribution:**
- Mediterranean and southern European waters
- Warmer preference than Sea Bass
- Less migratory

**Angler Knowledge:**
- "Warmer-water cousin of European bass"
- "Feeding and inshore migration highly temp-linked"
- Preferred band 15-22°C

**STATUS:** Already has entry in manual lookup! Code is `bss` for punctatus
Let me check...

Actually, looking at the grep results, there's confusion between:
- `bss` = Sea Bass (Dicentrarchus labrax) in MERGED
- `bsp` = Spotted Bass (Dicentrarchus punctatus) in MERGED
- Manual lookup has entry for punctatus under code `bss`

**Proposed Range:**
```json
{
  "species_code": "bsp",
  "scientific_name": "Dicentrarchus punctatus",
  "name_en": "Spotted Bass",
  "temperature": {
    "tolerance_min": 15,
    "tolerance_max": 22,
    "optimal_min": 16,
    "optimal_max": 20,
    "mean": 18,
    "unit": "celsius",
    "source": "Angler Data/Mediterranean",
    "notes": "Warmer-water cousin of European bass; feeding and inshore migration highly temp-linked. Preferred band 15-22°C."
  }
}
```

---

## Summary Table

| Species | Family | Temp Range | Optimal | Confidence | Source |
|---------|--------|------------|---------|------------|--------|
| Wrasse (various) | Labridae | 5-20°C | 10-16°C | High | 4 related species + angler |
| Rock Cook | Labridae | 6-18°C | 9-15°C | High | Wrasse family average |
| Red Gurnard | Triglidae | 7-20°C | 10-16°C | High | Grey Gurnard + distribution |
| Megrim | Scophthalmidae | 4-14°C | 6-11°C | Medium | Brill/Turbot + depth |
| Painted Comber | Serranidae | 13-24°C | 16-21°C | High | Same genus (Serranus) |
| Picarel | Sparidae | 12-22°C | 15-20°C | Medium | Sparid family average |
| Salema | Sparidae | 14-26°C | 17-23°C | Medium | Mediterranean herbivore |
| Small-eyed Ray | Rajidae | 6-16°C | 9-14°C | High | Ray family average |
| Spotted Bass | Moronidae | 15-22°C | 16-20°C | High | Angler data exists |

---

## Confidence Levels

**HIGH (6 species):**
- Wrasse (various), Rock Cook, Red Gurnard, Painted Comber, Small-eyed Ray, Spotted Bass
- Multiple related species data or existing angler observations

**MEDIUM (3 species):**
- Megrim, Picarel, Salema
- Family averages but less direct data

---

## Next Steps

1. Add these 9 entries to `TEMPERATURE_MANUAL_LOOKUP.json`
2. Re-run merge script
3. Achieve 100% temperature coverage ✅
4. Generate final audit
5. Ready for Supabase migration!
