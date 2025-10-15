# Mediterranean Species Analysis

## Already in Database ✅

Based on migration files, we **already have**:

1. **Octopus vulgaris** ✅ (species_code: 'common-octopus')
2. **Seriola dumerili** ✅ (species_code: 'greater-amberjack')
3. **Euthynnus alletteratus** ✅ (species_code: 'little-tunny')
4. **Zeus faber** ✅ (species_code: 'john-dory') - Also in your Atlantic list

## Need to Add 🆕

These Mediterranean species are **NOT** currently in the database:

### Seabreams (Sparidae family)
1. **Diplodus sargus** - White Seabream
2. **Diplodus vulgaris** - Common Two-banded Seabream
3. **Pagellus erythrinus** - Common Pandora
4. **Pagrus pagrus** - Red Porgy
5. **Oblada melanura** - Saddled Seabream
6. **Boops boops** - Bogue

Note: We have **Pagellus bogaraveo** (Blackspot/Red Seabream) but NOT Pagellus erythrinus (Common Pandora)

### Mackerels & Tunas
7. **Scomber colias** - Atlantic Chub Mackerel (we have Scomber scombrus)
8. **Trachurus mediterraneus** - Mediterranean Horse Mackerel (we have Trachurus trachurus)
9. **Sarda sarda** - Atlantic Bonito

### Jacks & Predators
10. **Lichia amia** - Leerfish / Garrick
11. **Pomatomus saltatrix** - Bluefish

### Barracudas
12. **Sphyraena viridensis** - Yellowmouth Barracuda
13. **Sphyraena sphyraena** - European Barracuda

### Groupers
14. **Epinephelus marginatus** - Dusky Grouper
15. **Epinephelus aeneus** - White Grouper

### Scorpionfish
16. **Scorpaena scrofa** - Red Scorpionfish / Large-scaled Scorpionfish

### Drums/Croakers
17. **Argyrosomus regius** - Meagre / Shi Drum

## Summary

- **Already in DB:** 4 species (Octopus, Amberjack, Little Tunny, John Dory)
- **Need to add:** 17 new Mediterranean species
- **Total Med species:** 21 species

## Common Names Mapping (for UK/European market)

| Scientific Name | UK Common Name | Mediterranean Name |
|----------------|----------------|-------------------|
| Diplodus sargus | White Seabream | Sar Commun |
| Diplodus vulgaris | Two-banded Seabream | Sar à Tête Noire |
| Pagellus erythrinus | Common Pandora | Pageot |
| Pagrus pagrus | Red Porgy | Pagre |
| Oblada melanura | Saddled Bream | Oblade |
| Boops boops | Bogue | Bogue |
| Scomber colias | Chub Mackerel | Maquereau Espagnol |
| Trachurus mediterraneus | Mediterranean Scad | Chinchard Méditerranéen |
| Sarda sarda | Atlantic Bonito | Bonite à Dos Rayé |
| Lichia amia | Leerfish | Liche |
| Pomatomus saltatrix | Bluefish | Tassergal |
| Sphyraena viridensis | Yellowmouth Barracuda | Bécune |
| Sphyraena sphyraena | European Barracuda | Barracuda Européen |
| Epinephelus marginatus | Dusky Grouper | Mérou Brun |
| Epinephelus aeneus | White Grouper | Mérou Blanc |
| Scorpaena scrofa | Red Scorpionfish | Chapon |
| Argyrosomus regius | Meagre | Maigre Commun |

## Regional Context

These species are primarily found in:
- **Western Mediterranean** (Balearics, Côte d'Azur, Italian coast)
- **Eastern Atlantic** (Portugal, Spain, Gibraltar)
- **Some range into UK waters** during warm summer months (Meagre, Bonito, Bluefish)

## Database Integration Notes

### Temperature Ranges
All Med species show **warmer preference** than Atlantic species:
- Min temps: 12-20°C (vs 6-12°C for Atlantic)
- Max temps: 18-26°C (vs 12-20°C for Atlantic)

### Habitat Preferences
Strong **reef/rock associations**:
- Groupers: Caves, reef crevices (+0.3 context bias)
- Seabreams: Rocky coves, seagrass beds
- Barracudas: Harbour lights (+0.3 for hunting)
- Meagre: Estuaries, channels (similar to bass)

### Tidal Sensitivity
Generally **lower tidal sensitivity** than Atlantic species:
- Seabreams: 0.45-0.55 (vs Bass: 0.75)
- Groupers: 0.40-0.45 (ambush predators, less tide-dependent)
- Barracudas: 0.45 (visual hunters, light-dependent)

Exception: **Meagre (0.70)** - similar to bass, estuarine predator

### Light Sensitivity
Many show **strong diurnal patterns**:
- Barracudas: Strong (light_weight: 0.40)
- Bonito/Tunny: Strong (dawn/dusk feeders)
- Meagre: Strong (like bass)

## Priority for Implementation

### High Priority (UK market appeal + already have data)
1. **Meagre** (Argyrosomus regius) - Growing in UK waters, massive sport fish
2. **Bluefish** (Pomatomus saltatrix) - Occasional UK visitor, explosive fighter
3. **Atlantic Bonito** (Sarda sarda) - Summer visitor to UK south coast
4. **Leerfish** (Lichia amia) - Rare but possible in SW England

### Medium Priority (Med tourism market)
5. **Dusky Grouper** (Epinephelus marginatus) - Iconic Med species
6. **White Seabream** (Diplodus sargus) - Common shore catch
7. **Red Porgy** (Pagrus pagrus) - Excellent eating, boat species

### Lower Priority (less sport fishing interest)
8-17. Other seabreams, scorpionfish, smaller species

## Next Steps

1. ✅ Add all 17 species to migration file with bite score parameters
2. ✅ Use your provided parameter data (already researched)
3. ⏳ Add species to main species table (INSERT statements)
4. ⏳ Add common names, playful bios, fishing advice
5. ⏳ Link to appropriate ICES rectangles (Med regions)
