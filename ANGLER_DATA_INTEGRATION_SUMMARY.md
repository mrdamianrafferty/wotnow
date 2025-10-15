# Angler Data Integration Summary

## Overview
Enhanced the manual temperature lookup table with angler-validated behavioral data for 10+ species, adding real-world feeding behavior context to scientific temperature ranges.

## Species Updated with Angler Data

### 1. **Black Seabream** (Spondyliosoma cantharus)
- **Updated Range**: 15-26°C optimal (was 13-17°C)
- **Angler Notes**: "Won't feed well below ~15°C; activity and feeding rate increase significantly in warmer water"
- **Impact**: Raised minimum feeding threshold by 2°C based on real-world observations

### 2. **Spotted Bass** (Dicentrarchus punctatus)
- **Range**: 15-22°C optimal
- **Angler Notes**: "Warmer-water cousin of European bass; feeding and inshore migration highly temp-linked"
- **Impact**: Already had angler data - confirmed warmer preference than common Sea Bass

### 3. **Grey Mullet** (Chelon labrosus)
- **Range**: 14-24°C optimal
- **Angler Notes**: "Shuts down in cold; comes alive with summer heating and mild estuarine temps"
- **Impact**: Already had angler data - confirmed temperature-sensitive feeding behavior

### 4. **Little Tunny** (Euthynnus alletteratus)
- **Updated Range**: 20-28°C optimal (was 22-27°C)
- **Angler Notes**: "Tracks temperature fronts and thermal boundaries; highly migratory following warm currents"
- **Impact**: Added migration behavior context - critical for predicting presence

### 5. **Saithe** (Pollachius virens)
- **Updated Range**: 6-14°C optimal (was 5-9°C)
- **Angler Notes**: "Follows thermoclines; deep-water comfort zone shifts with temperature stratification"
- **Impact**: Expanded upper range by 5°C, added depth-temperature interaction context

### 6. **Common Smoothhound** (Mustelus mustelus)
- **Updated Range**: 12-20°C optimal (was 13-17°C)
- **Angler Notes**: "'Summer sharks' - appear as water warms; feeding activity peaks in warmest months"
- **Impact**: Seasonal appearance pattern critical for recreational targeting

### 7. **Starry Smoothhound** (Mustelus asterias)
- **Updated Range**: 12-20°C optimal (was 12-15°C)
- **Angler Notes**: "'Summer sharks' - appear as water warms; similar behavior to Common Smoothhound"
- **Impact**: Expanded upper range by 5°C, confirmed seasonal pattern

### 8. **Common Squid** (Loligo vulgaris)
- **Updated Range**: 10-18°C optimal (was 12-15°C)
- **Angler Notes**: "Spawning temperature-linked; seasonal movements track thermal boundaries"
- **Impact**: Expanded range, added spawning-temperature link for life cycle predictions

### 9. **Sand Eel** (Ammodytes tobianus)
- **Updated Range**: 8-16°C optimal (was 8-13°C)
- **Angler Notes**: "Buries in sand when water becomes too cold (<8°C) or too hot (>16°C); most active in mid-range"
- **Impact**: Expanded upper range, added burrowing behavior context (affects availability as bait/prey)

### 10. **Thornback Ray** (Raja clavata)
- **Updated Range**: 10-18°C optimal (was 9-13°C)
- **Angler Notes**: "Sluggish and less active in cold water; feeding rate increases with warming"
- **Impact**: Expanded both ends of range, added activity level context

### 11. **Undulate Ray** (Raja undulata)
- **Updated Range**: 12-20°C optimal (was 12-15°C)
- **Angler Notes**: "Feeding rate drops in cold water; prefers warmer conditions than Thornback Ray"
- **Impact**: Expanded upper range by 5°C, added comparative context vs Thornback

### 12. **Cuckoo Wrasse** (Labrus mixtus)
- **Updated Range**: 10-15°C optimal (was 11-15°C)
- **Angler Notes**: "Activity rises sharply with water warming >10-12°C; winter lethargy common"
- **Impact**: Lowered threshold, confirmed wrasse behavioral pattern

### 13. **Ballan Wrasse** (Labrus bergylta)
- **Range**: 10-16°C optimal (NEW ENTRY)
- **Angler Notes**: "Activity rises sharply >10-12°C; winter lethargy common; largest European wrasse species"
- **Impact**: Added complete entry using FishBase scrape + angler behavior pattern

### 14. **Wrasse (various)** (Labridae spp.)
- **Updated Range**: 10-16°C optimal (was 12-16°C)
- **Angler Notes**: "Activity rises sharply >10-12°C; winter lethargy common; not migratory but temperature-modulated feeding"
- **Impact**: Established consistent wrasse behavioral pattern across species

## Key Behavioral Patterns Identified

### Temperature-Triggered Feeding
- **Sea Bream**: Won't feed well below 15°C
- **Mullet**: "Shuts down" in cold water
- **Wrasse (all species)**: Sharp activity increase above 10-12°C

### Seasonal Appearance/Migration
- **Smoothhounds**: "Summer sharks" - appear as water warms
- **Little Tunny**: Tracks temperature fronts
- **Saithe**: Follows thermoclines (depth-temperature interaction)

### Winter Dormancy/Lethargy
- **Wrasse species**: Consistent winter lethargy pattern
- **Sand Eel**: Buries when too cold (<8°C) or too hot (>16°C)
- **Rays**: Sluggish and reduced feeding in cold water

### Life Cycle Links
- **Common Squid**: Spawning temperature-linked
- **Little Tunny**: Migration follows warm currents
- **Smoothhounds**: Feeding peaks in warmest months

## Impact on Prediction System

### 1. **Sigmoid Curve Adjustments**
- **Feeding thresholds**: Some species have hard cutoffs (e.g., Sea Bream <15°C)
- **Activity curves**: Sharper transitions for wrasse >10-12°C vs gradual for other species
- **Upper limits**: Many species more tolerant of warmth than literature suggests

### 2. **Seasonal Scoring Modifiers**
- **Summer bonus**: Smoothhounds, Sea Bream, Mullet get higher scores in warm months
- **Winter penalty**: Wrasse species get significant penalty <10°C
- **Spring transition**: Sharp increases for wrasse/bream as water crosses 12-15°C thresholds

### 3. **Regional Adaptations**
- **North Sea**: Focus on cold-tolerant species (Saithe, Cod, rays)
- **Channel/Celtic Sea**: Transitional species (Mackerel, Pollack, Sea Bass)
- **Mediterranean influence**: Warm-preferring species (Bream, Mullet, Gilthead Seabream)

### 4. **Depth-Temperature Interactions**
- **Saithe**: Follows thermoclines - need to consider depth + temperature together
- **Sand Eel**: Burrowing behavior affects catchability even if temperature suitable
- **Rays**: Warmer water = shallower feeding (more accessible to anglers)

## Data Quality Assessment

### High Confidence (Angler + ICES Agreement)
- Mackerel: Angler patterns match ICES migration data (11-14°C optimal)
- Cod: Cold-water preference confirmed (0-15°C)
- Sea Bass: Warm coastal preference validated (8-24°C FishBase, >15°C for feeding)

### Enhanced Understanding (Angler Fills Gaps)
- Wrasse behavior: Scientific literature lacks feeding activity details
- Smoothhound seasonality: "Summer sharks" not in ICES reports
- Sand Eel burrowing: Behavioral context missing from temperature studies

### Refinements Needed
- Little Tunny: Limited European data - angler observations critical for rare species
- Spotted Bass: Minimal UK records - Mediterranean angler data extrapolated

## Next Steps

1. **Species Code Fixes**: Resolve 20 mismatches (CSH→smo, sqc→sqd, etc.)
2. **Execute Merge**: Run full merge to create ENVIRONMENTAL_DATA_COMPLETE.json
3. **Validate Coverage**: Aim for 95%+ temperature coverage (currently 68% in preview)
4. **Database Migration**: Add environmental_preferences JSONB column to species table
5. **Build RPC**: Implement sigmoid curves with angler behavioral modifiers
6. **Field Testing**: Validate predictions against known seasonal patterns

## Sources Attribution

### Angler Data Contributors
- Temperature ranges: Real-world observations from UK/European recreational anglers
- Feeding behavior: Multi-year patterns observed across different regions
- Seasonal timing: Consistent year-over-year appearance/disappearance patterns

### Scientific Sources Enhanced
- ICES Stock Assessments (2020-2024): Commercial species baseline
- Marine Biology Textbooks: Physiological temperature ranges
- FishBase Web Scrape: Direct database temperature fields
- Aquaculture Studies: Optimal growth temperatures (proxy for feeding)

## Coverage Statistics

### Before Angler Integration
- FishBase Scrape: 10/62 species (16%)
- Manual ICES Research: 52/62 species (84%)
- Combined: 42/62 species (68%) - due to code mismatches

### After Angler Integration
- Enhanced Species: 14 species with behavioral context
- Temperature Ranges: Expanded for 11 species (average +3°C upper range)
- Behavioral Notes: Added feeding triggers, seasonal patterns, migration context
- Prediction Confidence: High for 12 species, Medium for 30 species, Lower for 20 species

### Expected Post-Merge (After Code Fixes)
- Temperature Coverage: 59-60/62 species (95-97%)
- High Quality Data: 15+ species with ICES + Angler validation
- Behavioral Context: 40+ species with feeding/migration notes
- Prediction Ready: All species have at least tolerance ranges
