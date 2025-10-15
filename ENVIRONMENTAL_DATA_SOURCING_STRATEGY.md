# Environmental Data Sourcing Strategy

## Objective
Gather `environmental_preferences` data for all 62 species in our database:
- Temperature (optimal_min/max, tolerance_min/max in °C)
- Salinity (optimal_min/max, tolerance_min/max in PSU)
- Depth (optimal_min/max, typical_min/max in meters)
- Substrate preferences (array: sand, rock, mud, weed, mixed)

## Three-Phase Approach

### Phase 1: Automated FishBase API (4-6 hours)
**Target**: Get baseline data for all 62 species

**Script Flow**:
```typescript
// scripts/fetch-fishbase-environmental-data.ts

1. Query FishBase API for each species by scientific_name
2. Extract from API response:
   - species/{id} endpoint: distribution, importance
   - ecology/{id} endpoint: 
     * DepthRangeShallow, DepthRangeDeep (depth_typical_min/max)
     * CommonDepthMin, CommonDepthMax (depth_optimal_min/max)  
     * PrimaryHabitat (substrate inference)
     * TempMin, TempMax (temperature tolerance)
   - stocks/{id} endpoint: regional variations
3. Save raw JSON for review
4. Map to our environmental_preferences schema
5. Flag gaps for manual research

Expected coverage: 55-60 species (88-97%)
Expected gaps: Rare/regional species, some rays
```

**Example API calls**:
```bash
# 1. Search by scientific name
curl "https://fishbase.ropensci.org/species?Genus=Gadus&Species=morhua" 

# Response includes SpecCode (e.g., 69)

# 2. Get ecology data
curl "https://fishbase.ropensci.org/ecology?SpecCode=69"

# Response includes:
# {
#   "DepthRangeShallow": 0,
#   "DepthRangeDeep": 600,
#   "CommonDepthMin": 150,
#   "CommonDepthMax": 200,
#   "PrimaryHabitat": "demersal",
#   "Substrate": "rocks"
# }

# 3. Get species data
curl "https://fishbase.ropensci.org/species/69"

# Response includes:
# {
#   "Temperature": "2-10",
#   "Distribution": "North Atlantic"
# }
```

**FishBase to Our Schema Mapping**:
```typescript
const mapFishbaseToOurSchema = (fishbaseData) => ({
  temperature: {
    optimal_min: parseTemp(fishbaseData.Temperature).min || null,
    optimal_max: parseTemp(fishbaseData.Temperature).max || null,
    tolerance_min: fishbaseData.TempMin || null,
    tolerance_max: fishbaseData.TempMax || null,
    unit: 'celsius'
  },
  salinity: {
    // FishBase has "Saltwater", "Brackish", "Freshwater" flags
    // Map to PSU ranges based on habitat type
    optimal_min: inferSalinityFromHabitat(fishbaseData),
    optimal_max: inferSalinityFromHabitat(fishbaseData),
    tolerance_min: fishbaseData.SalinityMin || null,
    tolerance_max: fishbaseData.SalinityMax || null,
    unit: 'psu'
  },
  depth: {
    typical_min: fishbaseData.DepthRangeShallow,
    typical_max: fishbaseData.DepthRangeDeep,
    optimal_min: fishbaseData.CommonDepthMin,
    optimal_max: fishbaseData.CommonDepthMax,
    unit: 'meters'
  },
  substrate: inferSubstrateFromHabitat(fishbaseData.Substrate, fishbaseData.PrimaryHabitat)
  // "demersal" + "rocks" → ["rock", "mixed"]
  // "reef-associated" → ["rock", "reef"]
  // "benthopelagic" → ["sand", "mud", "mixed"]
});
```

### Phase 2: ICES Stock Assessment Manual Review (4-6 hours)
**Target**: Tier 1 species (Cod, Sea Bass, Mackerel, Plaice, Pollack, Haddock) + validate FishBase data

**Process**:
1. Download latest ICES stock assessment PDFs for each species
2. Extract regional environmental parameters:
   - North Sea vs Baltic vs Celtic Sea variations
   - Seasonal temperature preferences
   - Depth distribution by region
3. Compare with FishBase baseline
4. Update with more accurate regional data
5. Add seasonal_restrictions if found

**Key ICES Resources**:
- https://www.ices.dk/data/assessment-tools/Pages/stock-assessment-graphs.aspx
- Stock advice by species: https://www.ices.dk/advice/ESD/Pages/all-stocks.aspx
- Example: "Cod in divisions 7.e-k" (Celtic Sea cod)

**What to look for in PDFs**:
```
Habitat preferences section:
- "Cod prefer temperatures between 2-10°C, optimal 4-7°C"
- "Found at depths 50-400m, most abundant 100-200m"
- "Spawn in waters >11 PSU salinity"
- "Associate with rocky/mixed substrate for juvenile habitat"

Regional variations:
- Baltic cod tolerate 7-15 PSU (vs 30-35 PSU for North Sea)
- Celtic Sea spawning grounds: 100-150m depth
```

### Phase 3: Gap Filling & Validation (2-3 hours)
**Target**: Species with incomplete FishBase data + validation of all

**Sources**:
1. **FAO Species Fact Sheets**:
   - URL: https://www.fao.org/fishery/species/{ASFIS_CODE}/en
   - Example: https://www.fao.org/fishery/species/148/en (Cod)
   - Extract habitat sections

2. **SeaLifeBase** (for rays/sharks):
   - Same API as FishBase
   - URL: https://www.sealifebase.ca/

3. **OBIS Observations** (validation):
   - Query actual occurrence data with environmental measurements
   - Use to validate/refine ranges
   ```bash
   curl "https://api.obis.org/occurrence?scientificname=Gadus%20morhua&fields=temperature,depth,salinity&size=1000"
   ```
   - Calculate percentiles: P10 (tolerance_min), P25-P75 (optimal range), P90 (tolerance_max)

4. **Scientific Literature** (if still gaps):
   - Google Scholar: "{species scientific_name} temperature preference depth"
   - Focus on recent European studies

## Implementation Script

```typescript
// scripts/fetch-all-environmental-data.ts

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as fs from 'fs';

const FISHBASE_API = 'https://fishbase.ropensci.org';
const OBIS_API = 'https://api.obis.org';

async function fetchEnvironmentalData() {
  // 1. Get all 62 species from database
  const { data: species } = await supabase
    .from('species')
    .select('id, species_code, scientific_name, name_en');
  
  const results = [];
  
  for (const sp of species) {
    console.log(`Processing ${sp.name_en} (${sp.scientific_name})...`);
    
    // Phase 1: Try FishBase
    const fishbaseData = await fetchFishBase(sp.scientific_name);
    
    // Phase 2: Try OBIS validation
    const obisData = await fetchOBIS(sp.scientific_name);
    
    // Merge and validate
    const environmentalPreferences = mergeAndValidate(fishbaseData, obisData);
    
    results.push({
      species_code: sp.species_code,
      scientific_name: sp.scientific_name,
      name_en: sp.name_en,
      environmental_preferences: environmentalPreferences,
      data_quality: calculateQuality(environmentalPreferences),
      sources: {
        fishbase: !!fishbaseData,
        obis: !!obisData,
        manual_review_needed: environmentalPreferences.gaps.length > 0
      }
    });
    
    // Rate limiting
    await sleep(500);
  }
  
  // Save results
  fs.writeFileSync('ENVIRONMENTAL_DATA_AUTOMATED.json', JSON.stringify(results, null, 2));
  
  // Generate report
  console.log('\n=== AUTOMATED EXTRACTION REPORT ===');
  console.log(`Total species: ${results.length}`);
  console.log(`Complete profiles: ${results.filter(r => r.data_quality === 'complete').length}`);
  console.log(`Partial profiles: ${results.filter(r => r.data_quality === 'partial').length}`);
  console.log(`Need manual review: ${results.filter(r => r.sources.manual_review_needed).length}`);
  
  return results;
}

async function fetchFishBase(scientificName: string) {
  const [genus, species] = scientificName.split(' ');
  
  try {
    // 1. Get species ID
    const speciesResp = await axios.get(`${FISHBASE_API}/species`, {
      params: { Genus: genus, Species: species }
    });
    
    if (!speciesResp.data || speciesResp.data.length === 0) {
      return null;
    }
    
    const specCode = speciesResp.data[0].SpecCode;
    
    // 2. Get ecology data
    const ecologyResp = await axios.get(`${FISHBASE_API}/ecology`, {
      params: { SpecCode: specCode }
    });
    
    // 3. Get species details
    const detailResp = await axios.get(`${FISHBASE_API}/species/${specCode}`);
    
    return {
      ecology: ecologyResp.data[0] || {},
      species: detailResp.data || {},
      source: 'fishbase'
    };
  } catch (error) {
    console.warn(`  ⚠️  FishBase lookup failed: ${error.message}`);
    return null;
  }
}

async function fetchOBIS(scientificName: string) {
  try {
    const resp = await axios.get(`${OBIS_API}/occurrence`, {
      params: {
        scientificname: scientificName,
        fields: 'temperature,depth,salinity',
        size: 1000
      }
    });
    
    if (!resp.data.results || resp.data.results.length === 0) {
      return null;
    }
    
    // Calculate percentiles for validation
    const temps = resp.data.results.map(r => r.temperature).filter(t => t != null);
    const depths = resp.data.results.map(r => r.depth).filter(d => d != null);
    const salinities = resp.data.results.map(r => r.salinity).filter(s => s != null);
    
    return {
      temperature: calculatePercentiles(temps),
      depth: calculatePercentiles(depths),
      salinity: calculatePercentiles(salinities),
      sample_size: resp.data.results.length,
      source: 'obis'
    };
  } catch (error) {
    console.warn(`  ⚠️  OBIS lookup failed: ${error.message}`);
    return null;
  }
}

function mergeAndValidate(fishbaseData, obisData) {
  // Prefer FishBase for structure, use OBIS to validate/refine ranges
  // Flag gaps for manual review
  
  const preferences = {
    temperature: {},
    salinity: {},
    depth: {},
    substrate: [],
    gaps: []
  };
  
  // Temperature
  if (fishbaseData?.ecology?.TempMin && fishbaseData?.ecology?.TempMax) {
    preferences.temperature = {
      tolerance_min: fishbaseData.ecology.TempMin,
      tolerance_max: fishbaseData.ecology.TempMax,
      optimal_min: obisData?.temperature?.p25 || null,
      optimal_max: obisData?.temperature?.p75 || null,
      unit: 'celsius'
    };
  } else if (obisData?.temperature) {
    preferences.temperature = {
      tolerance_min: obisData.temperature.p10,
      tolerance_max: obisData.temperature.p90,
      optimal_min: obisData.temperature.p25,
      optimal_max: obisData.temperature.p75,
      unit: 'celsius'
    };
  } else {
    preferences.gaps.push('temperature');
  }
  
  // Depth
  if (fishbaseData?.ecology?.DepthRangeShallow != null) {
    preferences.depth = {
      typical_min: fishbaseData.ecology.DepthRangeShallow,
      typical_max: fishbaseData.ecology.DepthRangeDeep,
      optimal_min: fishbaseData.ecology.CommonDepthMin || obisData?.depth?.p25 || null,
      optimal_max: fishbaseData.ecology.CommonDepthMax || obisData?.depth?.p75 || null,
      unit: 'meters'
    };
  } else if (obisData?.depth) {
    preferences.depth = {
      typical_min: obisData.depth.p10,
      typical_max: obisData.depth.p90,
      optimal_min: obisData.depth.p25,
      optimal_max: obisData.depth.p75,
      unit: 'meters'
    };
  } else {
    preferences.gaps.push('depth');
  }
  
  // Salinity (harder - often need to infer)
  if (fishbaseData?.species?.Saltwater || fishbaseData?.species?.Brackish) {
    preferences.salinity = inferSalinityFromHabitat(
      fishbaseData.species,
      obisData?.salinity
    );
  } else if (obisData?.salinity) {
    preferences.salinity = {
      tolerance_min: obisData.salinity.p10,
      tolerance_max: obisData.salinity.p90,
      optimal_min: obisData.salinity.p25,
      optimal_max: obisData.salinity.p75,
      unit: 'psu'
    };
  } else {
    preferences.gaps.push('salinity');
  }
  
  // Substrate
  if (fishbaseData?.ecology?.Substrate) {
    preferences.substrate = parseSubstrate(fishbaseData.ecology.Substrate);
  } else {
    preferences.gaps.push('substrate');
  }
  
  return preferences;
}

function inferSalinityFromHabitat(fishbaseSpecies, obisData = null) {
  // Marine only: 30-38 PSU
  if (fishbaseSpecies.Saltwater === 1 && !fishbaseSpecies.Brackish) {
    return {
      optimal_min: obisData?.p25 || 32,
      optimal_max: obisData?.p75 || 35,
      tolerance_min: obisData?.p10 || 30,
      tolerance_max: obisData?.p90 || 38,
      unit: 'psu',
      inferred: true
    };
  }
  
  // Brackish tolerant: wider range
  if (fishbaseSpecies.Brackish === 1) {
    return {
      optimal_min: obisData?.p25 || 25,
      optimal_max: obisData?.p75 || 35,
      tolerance_min: obisData?.p10 || 5,
      tolerance_max: obisData?.p90 || 38,
      unit: 'psu',
      inferred: true
    };
  }
  
  return null;
}

function parseSubstrate(substrateString: string): string[] {
  const substrates = [];
  const lower = substrateString.toLowerCase();
  
  if (lower.includes('rock') || lower.includes('reef')) substrates.push('rock');
  if (lower.includes('sand')) substrates.push('sand');
  if (lower.includes('mud') || lower.includes('silt')) substrates.push('mud');
  if (lower.includes('weed') || lower.includes('vegetation')) substrates.push('weed');
  if (lower.includes('gravel') || lower.includes('mixed')) substrates.push('mixed');
  
  return substrates.length > 0 ? substrates : ['mixed'];
}

function calculatePercentiles(values: number[]) {
  if (values.length === 0) return null;
  
  const sorted = values.sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  
  return { p10, p25, p50, p75, p90 };
}

function calculateQuality(preferences: any): string {
  const hasTemp = !preferences.gaps.includes('temperature');
  const hasSalinity = !preferences.gaps.includes('salinity');
  const hasDepth = !preferences.gaps.includes('depth');
  const hasSubstrate = !preferences.gaps.includes('substrate');
  
  const complete = hasTemp && hasSalinity && hasDepth && hasSubstrate;
  const partial = (hasTemp && hasDepth) || (hasSalinity && hasDepth);
  
  if (complete) return 'complete';
  if (partial) return 'partial';
  return 'poor';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Expected Timeline

### Automated Phase (Day 1: 4-6 hours)
1. Build and test FishBase/OBIS integration script (2 hours)
2. Run automated extraction for all 62 species (1 hour)
3. Review automated results, identify gaps (1 hour)
4. Flag species needing manual review (30 min)

**Expected output**: 55-60 species with 80-100% complete data

### Manual Review Phase (Day 2-3: 6-8 hours)
1. Tier 1 species ICES deep-dive (4 hours)
   - Cod, Sea Bass, Mackerel, Plaice, Pollack, Haddock
   - Regional variations, seasonal patterns
2. Gap filling from FAO/literature (2-3 hours)
   - 5-7 species with poor FishBase coverage
3. Final validation pass (1 hour)
   - Cross-reference automated data with expert knowledge
   - Apply Phase 1 regional gates as constraints

### Integration Phase (Day 3: 2-3 hours)
1. Merge automated + manual data (30 min)
2. Generate final ENVIRONMENTAL_DATA_COMPLETE.json (30 min)
3. Create database migration (1 hour)
4. Validate against test scenarios (30 min)

**Total: 12-17 hours** (as estimated in todo list)

## Data Quality Tiers

### Tier 1: Complete (Target: 55+ species)
- All 4 parameters present (temp, salinity, depth, substrate)
- Both optimal and tolerance ranges
- Validated by multiple sources
- Regional variations documented

### Tier 2: Functional (Target: 5-7 species)
- 3/4 parameters present
- Missing optimal ranges but have tolerance
- Single source, needs validation

### Tier 3: Basic (Target: 0-2 species)
- 2/4 parameters present
- Broad ranges only
- Needs manual research

**Goal**: Zero Tier 3 species by end of Phase 3

## Risk Mitigation

### If FishBase API fails:
- Fallback to web scraping FishBase HTML pages
- Use cached FishBase data exports (they provide CSV downloads)

### If species not in FishBase:
- Check SeaLifeBase (rays, sharks)
- Use OBIS occurrence data exclusively
- Manual literature review

### If no digital sources:
- Contact ICES/CEFAS experts
- Use congeneric species as template (e.g., if Red Gurnard missing, use Grey Gurnard)

## Output Format

Final JSON structure for database migration:

```json
{
  "species_code": "cod",
  "scientific_name": "Gadus morhua",
  "environmental_preferences": {
    "temperature": {
      "optimal_min": 2,
      "optimal_max": 10,
      "tolerance_min": 0,
      "tolerance_max": 18,
      "unit": "celsius",
      "seasonal_variation": {
        "spawning": {"min": 4, "max": 7},
        "feeding": {"min": 2, "max": 12}
      }
    },
    "salinity": {
      "optimal_min": 30,
      "optimal_max": 35,
      "tolerance_min": 11,
      "tolerance_max": 38,
      "unit": "psu",
      "regional_variation": {
        "north_sea": {"min": 30, "max": 35},
        "baltic": {"min": 11, "max": 20}
      }
    },
    "depth": {
      "typical_min": 5,
      "typical_max": 600,
      "optimal_min": 50,
      "optimal_max": 200,
      "unit": "meters"
    },
    "substrate": ["rock", "sand", "mixed"],
    "data_quality": "complete",
    "sources": ["fishbase", "ices_2024", "obis"],
    "last_updated": "2025-10-11"
  }
}
```

## Next Steps

1. ✅ Clarified: Use both bio_bands (chemistry) + environmental_preferences (physics)
2. ⏳ Build automated FishBase/OBIS extraction script (scripts/fetch-all-environmental-data.ts)
3. ⏳ Run extraction, generate ENVIRONMENTAL_DATA_AUTOMATED.json
4. ⏳ Manual review Tier 1 species with ICES data
5. ⏳ Gap filling for remaining species
6. ⏳ Create migration and deploy

**Estimated completion: 12-17 hours total**
