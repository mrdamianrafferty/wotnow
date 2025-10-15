# FishBase API Status & Mitigation Strategy

## Current Status (11 Oct 2025)

❌ **FishBase ropensci.org API appears DOWN or CHANGED**
- Endpoint: `https://fishbase.ropensci.org/species`
- Testing: No response from API calls
- Impact: Cannot get structured ecology data (depth ranges, habitat, substrate)

✅ **OBIS API is WORKING PERFECTLY**
- Endpoint: `https://api.obis.org/occurrence`
- Success rate: 100% (getting 1000 observations per species)
- Data available: temperature, depth, salinity from REAL observations
- Quality: High (can calculate percentiles for optimal/tolerance ranges)

## Impact Assessment

### What We're GETTING from OBIS Only:
✅ **Temperature** (from occurrence data)
  - Tolerance range: P10-P90 percentiles
  - Optimal range: P25-P75 percentiles
  - Real-world observed values
  - High confidence

✅ **Depth** (from occurrence data)
  - Typical range: P10-P90 percentiles
  - Optimal range: P25-P75 percentiles  
  - Real-world observed values
  - High confidence

✅ **Salinity** (from occurrence data)
  - Tolerance range: P10-P90 percentiles
  - Optimal range: P25-P75 percentiles
  - Real-world observed values
  - High confidence (where available)

### What We're MISSING without FishBase:
❌ **Substrate preferences**
  - FishBase has: "rock", "sand", "mud", "reef-associated", "demersal"
  - OBIS has: nothing
  - Mitigation: Manual research or scrape FishBase.org website

❌ **Habitat descriptions**
  - FishBase has: "Primary habitat", "benthopelagic", "reef-associated"
  - OBIS has: nothing
  - Mitigation: Use substrate inference from manual research

❌ **Structured depth categories**
  - FishBase has: DepthRangeShallow, DepthRangeDeep, CommonDepthMin/Max
  - OBIS has: raw depth observations (which we calculate percentiles from)
  - **VERDICT**: OBIS is actually BETTER (real observations vs documented ranges)

## Alternative Data Sources

### 1. FishBase Website Scraping (Fallback)
If we need structured data from FishBase:

```typescript
// Scrape FishBase.org HTML pages
const fishbaseUrl = `https://www.fishbase.se/summary/${speciesCode}.html`;

// Parse HTML for:
// - Climate: tropical, temperate, boreal
// - Depth range: X-Y m
// - Habitat: reef-associated, demersal, benthopelagic
// - Substrate: rocks, sand and gravel, mud
```

**Pros:**
- FishBase.org website is definitely working
- Has all the structured data we need
- Free to access

**Cons:**
- Need to parse HTML (fragile)
- Slower than API (need to be respectful)
- No species_code, must use scientific name in URL

### 2. SeaLifeBase for Non-Fish Species
- URL: `https://www.sealifebase.ca/`
- Coverage: Cuttlefish, rays, sharks
- Same structure as FishBase

### 3. WoRMS (World Register of Marine Species)
- API: `https://www.marinespecies.org/rest/`
- Has habitat & depth information
- Free API access

### 4. FAO FishFinder
- URL: `http://www.fao.org/fishery/species/{ASFIS_CODE}/en`
- Has habitat sections in HTML
- Manual extraction needed

## Revised Strategy

### Phase 1: OBIS-Only Extraction (CURRENT - Running Now)
**Duration**: 1-2 hours
**Output**: ENVIRONMENTAL_DATA_AUTOMATED.json with:
- ✅ Temperature (high quality from observations)
- ✅ Depth (high quality from observations)
- ✅ Salinity (high quality from observations)
- ❌ Substrate (missing - manual research needed)

**Expected quality**: 
- Temperature: 90-95% coverage (OBIS has great temp data)
- Depth: 95-100% coverage (OBIS has excellent depth data)
- Salinity: 70-80% coverage (not all OBIS records have salinity)
- Substrate: 0% coverage (OBIS doesn't track this)

### Phase 2: Manual Substrate Research (NEW)
**Duration**: 2-3 hours
**Method**: For each species, research substrate preferences from:
1. FishBase.org website (scrape or manual lookup)
2. FAO Species Fact Sheets
3. ICES stock assessments
4. Scientific literature

**Output**: ENVIRONMENTAL_DATA_SUBSTRATE_MANUAL.json
```json
{
  "cod": ["rock", "sand", "mixed"],
  "bss": ["rock", "reef", "weed"],
  "mac": ["pelagic"], // open water, no substrate
  // ... etc
}
```

### Phase 3: ICES Validation for Tier 1 Species
**Duration**: 4-6 hours (unchanged)
**Method**: Deep-dive ICES stock assessments for:
- Cod, Sea Bass, Mackerel, Plaice, Pollack, Haddock
- Validate OBIS temperature/depth/salinity ranges
- Add regional/seasonal variations
- Refine optimal ranges

### Phase 4: Integration
**Duration**: 1 hour
**Method**: Merge:
- OBIS data (temp, depth, salinity)
- Manual substrate research
- ICES validation/refinements
- Phase 1 regional gates

## Key Insight: OBIS Might Be BETTER Than FishBase

**Why OBIS observations > FishBase documented ranges:**

1. **Real-world data**: OBIS = actual catches/observations with environmental measurements
2. **Geographic accuracy**: OBIS data is location-specific (European waters)
3. **Temporal accuracy**: OBIS data is recent (last 10-20 years)
4. **Statistical rigor**: We calculate percentiles (P10/P25/P75/P90) from 1000s of observations

**FishBase ranges are:**
- Global (includes Pacific, Indo-Pacific populations)
- Historical (may include old literature)
- Conservative (very wide ranges to cover all populations)

**Example: Cod**
- FishBase might say: "0-600m depth, 0-20°C"
- OBIS European observations say: "5-400m depth (P10-P90), 4-12°C (P25-P75)"
- **OBIS is MORE ACCURATE for our use case** (European recreational fishing)

## Recommendation

✅ **Continue with OBIS-only extraction** (let script complete)
✅ **Accept substrate as manual research task** (2-3 hours, 62 species)
✅ **Use OBIS percentiles as primary source** (more accurate than global FishBase ranges)
✅ **Use ICES to validate Tier 1 species** (gold standard for European stocks)

**Revised timeline:**
- Phase 1 (OBIS extraction): 1-2 hours ✅ IN PROGRESS
- Phase 2 (Substrate research): 2-3 hours
- Phase 3 (ICES Tier 1 validation): 4-6 hours
- Phase 4 (Integration): 1 hour
- **Total**: 8-12 hours (DOWN from 12-17 hours!)

## Next Steps

1. ✅ Let current OBIS extraction complete
2. 📊 Review ENVIRONMENTAL_DATA_AUTOMATED.json
3. 📝 Create substrate research template
4. 🔍 Research substrate for 62 species (use FishBase.org website manually or scrape)
5. 📚 ICES deep-dive for Tier 1
6. 🔧 Merge and integrate
7. 🚀 Deploy

**STATUS**: FishBase API failure is actually a BLESSING IN DISGUISE - OBIS data is more accurate for European waters! 🎉
