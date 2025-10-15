# DATRAS Data Audit Results

**Date:** 11 October 2025  
**Finding:** DATRAS data cannot be used for regional predictions

---

## 🔍 Key Finding

**All 72 DATRAS rectangles have the IDENTICAL 14-species list.**

This means the DATRAS import was NOT regionally distributed. Instead, it appears that:
1. 14 species were identified in DATRAS surveys
2. These 14 species were assigned to ALL 72 rectangles
3. No biogeographic filtering was applied
4. Result: Every location gets the same species list!

---

## 📊 The Numbers

```
Total DATRAS rectangles: 72
Unique species lists: 1 (all rectangles identical!)
Species per rectangle: 14 (exactly)

The 14 species (in every rectangle):
- anchovy
- bream
- cod
- haddock
- hake
- herring
- mackerel
- plaice
- pollack
- sardine
- sea-bass
- sole
- turbot
- whiting
```

---

## 🧪 Test Results

All tested rectangles showed **14-21% regional accuracy** because they all have the same species:

### Rectangle 21D8 (Portuguese Atlantic)
- Expected: hake, sardine, anchovy (warm water Atlantic)
- Got: All 14 species
- Match: 21% (3 out of 14 match)
- **Problem**: Also includes cod, haddock (cold water North Sea species)

### Rectangle 20C5 (Spanish Atlantic)  
- Expected: hake, sardine (warm water)
- Got: All 14 species
- Match: 14% (2 out of 14 match)
- **Problem**: Also includes haddock, whiting (cold water species)

### Rectangle 32E5 (Celtic Sea)
- Expected: haddock, sole (temperate)
- Got: All 14 species
- Match: 14% (2 out of 14 match)
- **Problem**: Also includes sardine, anchovy (warm water species)

### Rectangles 38F5, 39G5 (North Sea)
- Result: **NO DATA** (despite North Sea being DATRAS heartland!)

---

## 🚨 Why This Happened

The DATRAS import script (`uploadMonthlyAbundance.ts`) likely:

1. **Aggregated all catches across all regions** into a single species list
2. **Applied this universal list to every rectangle** without filtering
3. **Did not account for biogeographic boundaries**

Think of it like this:
```
DATRAS surveys: "We caught these 14 species somewhere in European waters"
Import script: "Ok, let's say all 14 are in EVERY rectangle!"
Result: Spanish fish in Baltic, Arctic fish in Mediterranean
```

---

## ✅ What This Means for Our Strategy

**Original plan:** Use DATRAS where good, environmental elsewhere  
**Updated plan:** **Use environmental matching everywhere** (DATRAS not usable)

The DATRAS data is:
- ❌ Not regionally accurate (14-21% match)
- ❌ Not even present in key areas (No North Sea data!)
- ❌ Same species list in all 72 rectangles
- ✅ Useful only as a species taxonomy (identifies 14 common species)

---

## 🎯 Revised Implementation Strategy

### Abandon DATRAS for predictions
The species_monthly_abundance table (1,666 records) and species_frequency table (364,208 records) should NOT be used for predictions because:
1. No regional accuracy
2. Same 14 species everywhere
3. Missing key fishing areas

### Go all-in on environmental matching
Build prediction system based on:
- Species environmental preferences (temp, salinity, depth, habitat)
- Rectangle environmental conditions (from CMEMS, EMODnet)
- Biogeographic zone validation
- Seasonal patterns

This will give us:
- ✅ 100% coverage (all rectangles work)
- ✅ Regional accuracy (Baltic gets Baltic species, Med gets Med species)
- ✅ Explainable predictions (users see why fish are predicted)
- ✅ No dependency on flawed survey data

---

## 📋 Updated Priority Tasks

1. **Add environmental_preferences to species table** (temperature, salinity, depth, habitat)
2. **Research preferences for 64 species** (start with the 14 DATRAS species + Baltic/Med natives)
3. **Link rectangle environmental data** (use existing CMEMS integration)
4. **Build matching algorithm** (score species fit for each rectangle)
5. **Replace RPC function** (calculate environmental matches instead of querying species_frequency)
6. **Update UI** (show habitat-based predictions with confidence scores)

---

## 💡 Silver Lining

The DATRAS audit revealed a critical flaw BEFORE we built the hybrid system! Now we can:
- Build ONE prediction system (environmental) instead of TWO (hybrid)
- Focus all effort on getting environmental data right
- Have explainable, transparent predictions
- Not worry about "which data source to use when"

**Simpler is better.** Let's build the environmental matching system properly. 🎣

---

## Next Steps

1. Create migration for `environmental_preferences` column
2. Research and populate data for 14 DATRAS species (they're common, should be well-documented)
3. Add 10 regional specialists (Baltic: flounder, turbot; Med: amberjack, dentex)
4. Build matching algorithm
5. Test on real rectangles

See **HYBRID_PREDICTION_STRATEGY.md** for full environmental matching implementation plan.
