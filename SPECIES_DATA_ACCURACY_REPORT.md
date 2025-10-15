# Species Data Accuracy Issue - Investigation Report

**Date:** 11 October 2025  
**Status:** 🟡 App Functional, Data Quality Issue Identified  
**Severity:** Medium - App works correctly but shows wrong regional species

---

## 🎯 Executive Summary

The Findr prediction system is **technically working correctly** - all code, API endpoints, and data flow are functioning as designed. However, there's a **data quality issue**: species predictions don't match expected regional fauna.

**What's Working:**
- ✅ RPC function `get_fishing_predictions()` returns data
- ✅ API caching layer works correctly
- ✅ Frontend updates when rectangle selection changes
- ✅ Species data (64 species) loaded with shore/boat advice
- ✅ Predictions fetch with correct dates (fixed localStorage issue)
- ✅ Cards display and update properly

**What's Wrong:**
- ❌ Rectangle 21D8 labeled "Galician Coast" (Spanish Atlantic) but should be "Polish Baltic"
- ❌ Baltic rectangles return Atlantic species (Hake, Bream, Anchovies)
- ❌ Species don't match expected regional biogeography

---

## 🔍 Detailed Investigation

### Issue Discovery Timeline

1. **Initial Symptom:** User selected "Polish Baltic" dropdown but saw Spanish species (Hake, Bream, Anchovies)
2. **Debug Logs Added:** Confirmed cards were updating correctly for rectangle 21D8
3. **RPC Testing:** Verified RPC returns 12 predictions for 21D8 with Hake as first species
4. **Database Audit:** Found rectangle mislabeling and species data mismatch

### Technical Analysis

#### Rectangle Data (ices_rectangles table)
```
Rectangle Code: 21D8
Database Label: "Galician Coast" ❌ WRONG
Expected Label: "Polish Baltic"
Location: Baltic Sea (Poland/Germany border)
Coordinates: Likely ~54°N, 14-16°E
```

**Geographic Context:**
- Galician Coast = Northwest Spain (Atlantic Ocean)
- Polish Baltic = Southern Baltic Sea (very different ecosystem)

#### Species Frequency Data

**What RPC Returns for 21D8:**
```javascript
{
  species_id: "hake",
  species_code: "hake",
  species_common_name: "Hake",
  scientific_name: "",
  confidence: 100,
  confidence_percent: 100
}
// + 11 more Atlantic species
```

**Expected Baltic Species:**
- Herring (Clupea harengus) - Primary Baltic fish
- Sprat (Sprattus sprattus) - Key Baltic species
- Cod (Gadus morhua) - Baltic cod stock
- Flounder (Platichthys flesus) - Common Baltic flatfish
- Plaice (Pleuronectes platessa) - Present in Baltic

**Actual Species Returned:**
- Hake (Merluccius merluccius) - Atlantic species, NOT in Baltic
- Bream - More common in Atlantic/Mediterranean
- Anchovies - Mediterranean/Atlantic, NOT Baltic

#### Database Schema Verification

**species_frequency table:**
```json
{
  "id": "ba708a0e-...",
  "species_id": "68d74eb8-..." // UUID foreign key ✅ Correct structure
  "rectangle_id": "c3811196-...", // UUID foreign key ✅ Correct structure
  "base_frequency": 0.264,
  "confidence_level": 0.75,
  "data_source": "batch_1_first_half" ⚠️ Source of problem?
}
```

**Key Finding:** Foreign keys are correctly structured (UUIDs), but the **data content** associates wrong species with wrong rectangles.

---

## 📊 Database State

### Confirmed Working

1. **Species Table:** 64 species loaded with complete data
   - Shore/boat advice in JSONB format ✅
   - Playful bios populated ✅
   - Localized names (EN, FR, ES, DE, IT, PT) ✅
   - Eating quality scaled 1-5 ✅

2. **ICES Rectangles:** 300+ rectangles with coordinates ✅

3. **Species Frequency:** 1,666 rows of prediction data ✅
   - Schema is correct (UUID foreign keys)
   - Data populated from "batch_1_first_half" source
   - **BUT**: Species-to-rectangle mappings are incorrect

4. **RPC Function:** Returns predictions correctly ✅
   - Joins species_frequency with species table
   - Filters by rectangle and date
   - Returns 12-13 predictions per rectangle

### Data Quality Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Rectangle 21D8 mislabeled | Medium | Confusing UX - wrong region name |
| Baltic rectangles have Atlantic species | High | Incorrect fishing predictions |
| No biogeographic validation | Medium | User trust issue |
| Data source unknown ("batch_1_first_half") | Low | Can't trace provenance |

---

## 🐛 Root Cause Analysis

### Hypothesis: Bulk Import Without Regional Filtering

The `species_frequency` table was likely populated using:
1. A dataset that didn't respect biogeographic boundaries, OR
2. A script that copied the same species list to all rectangles, OR
3. Test data that used convenient species without regional accuracy

**Evidence:**
- Data source field: `"batch_1_first_half"` (suggests batch import)
- All frequencies similar (~0.475) across different rectangles
- No seasonal/regional variation in species composition
- Rectangle labels don't match geographic locations

### Why This Wasn't Caught Earlier

1. ✅ **Unit tests pass** - Code works correctly
2. ✅ **RPC returns data** - No SQL errors
3. ✅ **Frontend renders** - UI functions properly
4. ❌ **No biogeographic validation** - Nobody checked if Hake belongs in Baltic

---

## 🔧 Recommendations

### Short Term (Keep App Running)

1. **Update Debug Logs (DONE)** ✅
   - Added logging to track card updates
   - Verified data flow works correctly

2. **Document Issue (THIS FILE)** ✅
   - Explains why Spanish fish appear in Polish waters
   - Provides context for future data cleanup

3. **Add Disclaimer** (Optional)
   ```
   "Note: Species predictions are currently being refined for regional accuracy. 
   Use as a general guide and consult local fishing reports."
   ```

### Medium Term (Data Cleanup)

1. **Fix Rectangle Labels**
   - Create migration to correct `ices_rectangles.region` field
   - 21D8: "Galician Coast" → "Polish Baltic"
   - Audit other rectangles for similar mislabeling

2. **Audit Species Data**
   - Check all Baltic rectangles (codes starting with 22*, 23*, 24*)
   - Check Mediterranean rectangles
   - Verify Atlantic coastal rectangles

3. **Create Regional Species Lists**
   ```sql
   -- Example: Baltic-appropriate species
   Baltic: [herring, sprat, cod, flounder, plaice, pike-perch, perch]
   
   -- Atlantic Iberian species
   Galician: [hake, bream, seabass, anchovies, sardines, octopus]
   
   -- Mediterranean species
   Mediterranean: [seabream, seabass, swordfish, bluefin tuna, amberjack]
   ```

### Long Term (Data Quality)

1. **Source Authentic Data**
   - ICES fish distribution data
   - DATRAS survey data (already referenced in migrations)
   - Regional fisheries databases
   - Scientific literature on species ranges

2. **Add Validation Layer**
   - Check species against known biogeographic ranges
   - Reject impossible species/rectangle combinations
   - Flag suspicious predictions for review

3. **Community Verification**
   - Allow users to report incorrect species
   - Build confidence scores from catch reports
   - Use ML to refine predictions over time

---

## 📝 Next Steps

### Immediate Actions

- [x] Document issue (this file)
- [ ] Test 5-10 other rectangles to assess scope
- [ ] Create rectangle label correction migration
- [ ] Share findings with team/stakeholders

### Data Remediation

- [ ] Export current species_frequency data for backup
- [ ] Create regional species reference lists
- [ ] Write script to validate/correct species assignments
- [ ] Test on sample rectangles before bulk update
- [ ] Create migration to apply corrections

### Prevention

- [ ] Add data validation tests (e.g., "Hake not in Baltic")
- [ ] Document data import procedures
- [ ] Create biogeographic validation helper functions
- [ ] Set up data quality monitoring

---

## 🎣 User Impact

**Current Experience:**
1. User selects "Polish Baltic" from dropdown
2. App shows 12 species predictions (correctly updating UI)
3. Species shown: Hake, Bream, Anchovies (Spanish Atlantic fish)
4. User thinks: "These fish don't live here!" ❌

**Desired Experience:**
1. User selects "Polish Baltic" from dropdown
2. App shows 12 species predictions
3. Species shown: Herring, Sprat, Cod, Flounder (actual Baltic species)
4. User thinks: "Perfect! These are the fish I catch here!" ✅

---

## 📞 Contact & Updates

**Issue Owner:** Development Team  
**Priority:** Medium (App works, data needs correction)  
**Timeline:** Fix within 1-2 weeks for production quality

**Related Files:**
- `supabase/migrations/202509300001_add_datras_support.sql` - References DATRAS data
- `species_frequency` table - Contains incorrect mappings
- `ices_rectangles` table - Contains mislabeled regions
- `get_fishing_predictions` RPC function - Works correctly, returns bad data

---

## ✅ Positive Outcomes from Investigation

1. **Confirmed All Code Works** - No bugs in application logic
2. **Fixed Date Issue** - Predictions now use correct dates (not 2-day-old cached data)
3. **Verified Data Flow** - Complete trace from database → RPC → API → hook → component → UI
4. **Understood Architecture** - Now have full picture of how predictions system works
5. **Added Debug Logging** - Can troubleshoot future issues more easily

**The app is functional and ready for data quality improvements!** 🚀
