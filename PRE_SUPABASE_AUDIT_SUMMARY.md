# Species Data Audit - Pre-Supabase Upload Review

**Generated:** 2025-10-11  
**Status:** 🟡 READY FOR REVIEW - 30 species missing temperature data

---

## 📊 Overall Coverage Summary

| Field | Coverage | Status |
|-------|----------|--------|
| **Temperature** | 32/62 (52%) | 🔴 CRITICAL - Need to merge manual lookup |
| **Salinity** | 56/62 (90%) | 🟢 GOOD |
| **Depth** | 62/62 (100%) | ✅ COMPLETE |
| **Substrate** | 50/62 (81%) | 🟢 GOOD |
| **Bio Bands** | 0/62 (0%) | ⚠️ NOT YET INTEGRATED |

### Data Completeness Distribution
- **100% Complete:** 24 species (39%) - Ready for Supabase ✅
- **75% Complete:** 30 species (48%) - Missing only temperature ⚠️
- **50% Complete:** 6 species (10%) - Missing temp + one other field
- **25% Complete:** 2 species (3%) - Critical gaps
- **0% Complete:** 0 species (0%)

---

## 🔴 CRITICAL: Missing Temperature Data

**30 species** still need temperature data. These are in the manual lookup but not merged yet:

### Species Code Mismatches (20 species)
These have temperature data in `TEMPERATURE_MANUAL_LOOKUP.json` but different codes:

1. **Ballan Wrasse** - Code: `wrb` (lookup has it)
2. **Cod (Coastal)** - Code: `cod` (lookup may have different code)
3. **Common Smoothhound** - Code: `CSH` (lookup: `smo`)
4. **Cuckoo Wrasse** - Code: `wrc` (lookup: `WRU`)
5. **Grey Mullet** - Code: `mug` (lookup: `mul`)
6. **Common Squid** - Code: `sqc` (lookup: `sqd`)
7. **Thornback Ray** - Code: `rjc` (lookup: `RJC` - case mismatch)
8. **Undulate Ray** - Code: `RUN` (lookup: `RJU`)
9. **Starry Smoothhound** - Code: `SSH` (lookup: `SHO`)
10. **Little Tunny** - Code: `lta` (lookup: `fry`)

### Species Truly Missing (10 species)
Need manual research or FishBase deep-dive:

1. Dover Sole (`sol`)
2. Flathead Grey Mullet (`fgm`)
3. Flounder (`fle`)
4. Megrim (`ldb`)
5. Painted Comber (`CMP`)
6. Picarel (`PIC`)
7. Plaice (`ple`)
8. Red Gurnard (`GUR`)
9. Rock Cook (`WRO`)
10. Saithe/Pollock (`sai`)

---

## 🟡 MODERATE: Missing Salinity Data (6 species)

Generally less critical as most are pelagic/mobile species:

1. **Common Cuttlefish** (`cut`) - Pelagic, likely 30-38 ppt
2. **Common Octopus** (`oct`) - Rocky coastal, likely 32-38 ppt
3. **Gilthead Seabream** (`sbg`) - Mediterranean, likely 32-40 ppt
4. **Saithe/Pollock** (`sai`) - North Sea, likely 30-35 ppt
5. **Common Squid** (`sqc`) - Pelagic, likely 30-38 ppt
6. **Wrasse (various)** (`wra`) - Coastal rocky, likely 32-36 ppt

**Recommendation:** Use genus-level defaults or regional averages

---

## 🟢 MINOR: Missing Substrate Data (12 species)

Mostly pelagic species where substrate is less relevant:

1. Garfish - Pelagic (substrate: `pelagic` or `surface`)
2. Mackerel - Pelagic (substrate: `pelagic`)
3. Sardine - Pelagic (substrate: `pelagic`)
4. Sprat - Pelagic (substrate: `pelagic`)
5. Herring - Pelagic (substrate: `pelagic`)
6. Little Tunny - Pelagic (substrate: `pelagic`)
7. Common Cuttlefish - Benthic/pelagic (substrate: `mixed, sand`)
8. Common Octopus - Benthic (substrate: `rock, cave`)
9. Common Squid - Pelagic (substrate: `pelagic`)
10. Gilthead Seabream - Coastal (substrate: `sand, rock`)
11. Saithe/Pollock - Demersal (substrate: `rock, mixed`)
12. Wrasse (various) - Coastal (substrate: `rock, weed`)

**Recommendation:** Add "pelagic" for mid-water species, research benthic preferences

---

## ✅ TOP 10 MOST COMPLETE SPECIES

These are **READY FOR SUPABASE** with 100% environmental data:

1. **Black Seabream** - Temp: 10-26°C (opt 15-26°C), Sal: 30-38 ppt, Depth: 5-300m, Sub: rock/sand/weed
2. **Brill** - Temp: 6-17°C (opt 10-14°C), Sal: 30-38 ppt, Depth: 5-50m, Sub: mixed
3. **Bull Huss** - Temp: 8-18°C (opt 11-15°C), Sal: 30-38 ppt, Depth: 1-400m, Sub: rock/weed
4. **Comber** - Temp: 12-22°C (opt 15-19°C), Sal: 30-38 ppt, Depth: 5-500m, Sub: rock/sand/mud/weed
5. **Common Ling** - Temp: 4-12°C (opt 6-9°C), Sal: 30-38 ppt, Depth: 100-1000m, Sub: mixed
6. **Conger Eel** - Temp: 10-22°C (opt 13-18°C), Sal: 30-38 ppt, Depth: 0-50m, Sub: rock
7. **Corkwing Wrasse** - Temp: 8-18°C (opt 11-15°C), Sal: 30-38 ppt, Depth: 4-15m, Sub: rock/weed
8. **Dab** - Temp: 2-15°C (opt 5-12°C), Sal: 30-38 ppt, Depth: 20-150m, Sub: mixed
9. **Dentex** - Temp: 14-24°C (opt 17-21°C), Sal: 30-38 ppt, Depth: 0-50m, Sub: rock/sand/weed
10. **Goldsinny Wrasse** - Temp: 7-18°C (opt 10-14°C), Sal: 30-38 ppt, Depth: 1-50m, Sub: rock/weed

*(Plus 14 more species at 100% completeness)*

---

## 🎯 Action Plan - Path to Supabase

### PHASE 1: Fix Species Code Mismatches (Priority 1) ⚡
**Est. Time:** 30 minutes  
**Impact:** +20 species temperature coverage (52% → 84%)

1. Create species code mapping table
2. Update merge script to handle code variations
3. Re-run merge with code fixes
4. Validate coverage increases to ~52 species

### PHASE 2: Merge Temperature Data (Priority 1) ⚡
**Est. Time:** 10 minutes  
**Impact:** Apply all manual temperature research

1. Run `npx tsx scripts/merge-temperature-data.ts`
2. Generate `ENVIRONMENTAL_DATA_COMPLETE.json`
3. Validate 52+ species have temperature data
4. Check for any range inconsistencies

### PHASE 3: Fill Remaining Temperature Gaps (Priority 2) 📚
**Est. Time:** 1-2 hours  
**Impact:** +10 species (84% → 100%)

Research for 10 missing species:
- Dover Sole, Flounder, Plaice - Similar flatfish, use genus averages
- Megrim - North Atlantic flatfish
- Mullet species - Coastal temperate
- Gurnards - Benthic temperate
- Rock Cook - Wrasse family
- Saithe/Pollock - Merge duplicates

### PHASE 4: Fill Salinity Gaps (Priority 3) 💧
**Est. Time:** 30 minutes  
**Impact:** Complete last 6 species (90% → 100%)

Use regional/habitat defaults:
- Pelagic species: 30-38 ppt (open ocean)
- Coastal rocky: 32-36 ppt (UK/Atlantic)
- Mediterranean: 35-40 ppt (high salinity)
- Cephalopods: 30-38 ppt (standard marine)

### PHASE 5: Add Substrate for Pelagic Species (Priority 4) 🌊
**Est. Time:** 15 minutes  
**Impact:** Improve prediction accuracy

Add "pelagic" or "mid-water" for open-ocean species:
- Mackerel, Sardine, Sprat, Herring, Garfish, Little Tunny
- Improves habitat filtering in prediction algorithm

### PHASE 6: Validate & Generate Final JSON (Priority 1) ✅
**Est. Time:** 30 minutes  
**Impact:** Production-ready dataset

1. Run validation script for data consistency
2. Check for logical errors (min > max, optimal outside tolerance)
3. Generate final `SPECIES_ENVIRONMENTAL_PROFILES_COMPLETE.json`
4. Export to CSV for final human review

### PHASE 7: Supabase Migration (Priority 1) 🚀
**Est. Time:** 1 hour  
**Impact:** Database ready for predictions

1. Create migration SQL:
   ```sql
   ALTER TABLE species 
   ADD COLUMN environmental_preferences JSONB;
   
   CREATE INDEX idx_species_env_preferences 
   ON species USING GIN (environmental_preferences);
   ```

2. Update all 62 species with environmental data
3. Validate data loaded correctly
4. Test queries against environmental_preferences

---

## 📁 Files Generated

1. **SPECIES_DATA_AUDIT.csv** - Full spreadsheet with all species data
   - Open in Excel/Numbers for easy scanning
   - Sorted by completeness (100% first)
   - Includes all environmental fields + notes

2. **ANGLER_DATA_INTEGRATION_SUMMARY.md** - Documentation of angler enhancements
   - 14 species updated with behavioral notes
   - Temperature feeding thresholds
   - Seasonal patterns (wrasse lethargy, "summer sharks")

3. **TEMPERATURE_MANUAL_LOOKUP.json** - Manual research for 52 species
   - ICES stock assessments
   - Marine biology literature
   - Angler-validated behavioral data

4. **TEMPERATURE_DATA_SOURCES.md** - Methodology documentation
   - Coverage statistics
   - Regional patterns
   - Prediction algorithm implications

---

## 🔍 Data Quality Validation

### Automated Checks Passed ✅
- No min > max inconsistencies
- No optimal ranges outside tolerance
- All species have at least depth data
- 39% have complete environmental profiles

### Manual Review Recommended
- [ ] Scan CSV for obvious errors (e.g., tropical temps for Arctic species)
- [ ] Verify wrasse temperature ranges consistent (10-18°C typical)
- [ ] Check cold-water species (Cod, Haddock, Saithe) < 15°C max
- [ ] Validate warm-water species (Bream, Mediterranean) > 15°C optimal
- [ ] Confirm substrate makes ecological sense (flatfish = sand/mud/mixed, wrasse = rock/weed)

### Known Issues
1. **Common Squid** (25% complete) - Need salinity + substrate
2. **Wrasse (various)** (25% complete) - Generic entry, need salinity
3. **Species code mismatches** - 20 species need code mapping before merge

---

## 🎣 Next Steps

**IMMEDIATE (Today):**
1. ✅ Review `SPECIES_DATA_AUDIT.csv` in Excel/Numbers
2. Fix species code mismatches (create mapping table)
3. Run temperature merge script
4. Validate coverage increases to 84%+

**SHORT TERM (This Week):**
1. Research 10 remaining temperature gaps
2. Fill 6 salinity gaps with regional defaults
3. Add substrate for pelagic species
4. Final validation & generate complete JSON

**MEDIUM TERM (Next Week):**
1. Supabase migration
2. Build prediction RPC with environmental scoring
3. Test predictions against known scenarios
4. Deploy to production

---

## 📈 Success Metrics

**Before This Work:**
- Temperature: 0/62 (0%) - **BLOCKER**
- Salinity: 56/62 (90%)
- Depth: 62/62 (100%)
- Substrate: 48/62 (77%)

**Current Status:**
- Temperature: 32/62 (52%) - **MAJOR PROGRESS**
- Salinity: 56/62 (90%)
- Depth: 62/62 (100%)
- Substrate: 50/62 (81%)

**After Code Fixes (Projected):**
- Temperature: 52/62 (84%) - **PREDICTION READY**
- Salinity: 56/62 (90%)
- Depth: 62/62 (100%)
- Substrate: 50/62 (81%)

**After Complete Cleanup (Target):**
- Temperature: 62/62 (100%) ✅
- Salinity: 62/62 (100%) ✅
- Depth: 62/62 (100%) ✅
- Substrate: 62/62 (100%) ✅

---

**Status:** Ready for CSV review and species code mismatch fixes 🚀
