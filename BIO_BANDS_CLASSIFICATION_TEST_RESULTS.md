# Bio-Bands Classification Test Results

**Date:** 12 October 2025  
**Status:** ✅ ALL TESTS PASSED (7/7 edge cases)

---

## 🧪 Test Summary

The `classify_parameter()` function logic has been validated with real-world scenarios from UK and European waters. The threshold boundaries are working correctly and ready for database deployment.

---

## 🌍 Real-World Scenario Results

### ☀️ Summer Cornwall (Optimal Bass/Wrasse)
**Location:** Falmouth Bay, July  
**Conditions:**

| Parameter | Value | Classification | Interpretation |
|-----------|-------|----------------|----------------|
| Temperature | 16.5°C | 🟡 **normal** | Comfortable for most temperate fish |
| Salinity | 34.2 ppt | 🟡 **normal** | Typical coastal seawater |
| Oxygen | 7.5 mg/L | 🟠 **high** | Good, healthy conditions |
| Chlorophyll | 2.1 mg/m³ | 🟡 **normal** | Mesotrophic, balanced food web |

**🎣 Fishing Prediction:** Excellent conditions for Bass, Ballan Wrasse, Pollock. Temperature in optimal range, good oxygen levels, balanced plankton.

---

### ❄️ Winter Irish Sea (Optimal Cod/Whiting)
**Location:** Morecambe Bay, February  
**Conditions:**

| Parameter | Value | Classification | Interpretation |
|-----------|-------|----------------|----------------|
| Temperature | 6.5°C | 🔵 **very_low** | Freezing, marine activity minimal |
| Salinity | 35.0 ppt | 🟡 **normal** | Typical coastal seawater |
| Oxygen | 9.2 mg/L | 🟠 **high** | Good, healthy conditions |
| Chlorophyll | 0.8 mg/m³ | 🟢 **low** | Oligotrophic |

**🎣 Fishing Prediction:** Prime conditions for Cod, Whiting, Haddock. Too cold for warm-water species. Bass and Wrasse lethargic or hibernating.

---

### 🌊 Baltic Brackish (Flounder-friendly)
**Location:** Bornholm Basin  
**Conditions:**

| Parameter | Value | Classification | Interpretation |
|-----------|-------|----------------|----------------|
| Temperature | 8.5°C | 🟢 **low** | Cold, only hardy species feed |
| Salinity | 12.0 ppt | ⚫ **NULL** | Below minimum threshold (freshwater influence) |
| Oxygen | 5.5 mg/L | 🟡 **normal** | Adequate for survival |
| Chlorophyll | 3.2 mg/m³ | 🟠 **high** | Eutrophic, high plankton |

**🎣 Fishing Prediction:** Only euryhaline species like Flounder and Herring. **Wrasse, Bass excluded** (require full-strength seawater ≥20 ppt). Note: Salinity below 20 ppt returns NULL, indicating unsuitable for most marine species.

---

### 🌞 Mediterranean Summer (Warm & Clear)
**Location:** Costa Brava, August  
**Conditions:**

| Parameter | Value | Classification | Interpretation |
|-----------|-------|----------------|----------------|
| Temperature | 25.5°C | 🟠 **high** | Warm, high fish activity |
| Salinity | 38.2 ppt | 🟠 **high** | Full oceanic salinity |
| Oxygen | 6.2 mg/L | 🟡 **normal** | Adequate for survival |
| Chlorophyll | 0.4 mg/m³ | 🔵 **very_low** | Clear, low productivity |

**🎣 Fishing Prediction:** Ideal for Gilthead Bream, Dentex, Amberjack. Too warm for northern species (Cod, Whiting, Pollock avoid). Clear water = low plankton = reef structure fishing.

---

### ☠️ Dead Zone (Hypoxic Event)
**Location:** Shallow estuary, August low tide  
**Conditions:**

| Parameter | Value | Classification | Interpretation |
|-----------|-------|----------------|----------------|
| Temperature | 22.5°C | 🟠 **high** | Warm, high fish activity |
| Salinity | 28.5 ppt | 🟢 **low** | Reduced salinity, near estuaries |
| Oxygen | 1.5 mg/L | 🔵 **very_low** | ⚠️ Anoxic, fish kills likely |
| Chlorophyll | 4.8 mg/m³ | 🟠 **high** | Eutrophic, high plankton |

**🎣 Fishing Prediction:** ❌ **AVOID ALL SPECIES** - Critical hypoxia. Oxygen below 2 mg/L causes fish stress and mortality. High plankton decomposition consuming oxygen = dead zone. Fish will flee or die.

---

## 🔬 Edge Case Validation

All edge cases passed ✅:

| Test Case | Value | Result | Expected | Status |
|-----------|-------|--------|----------|--------|
| Exact threshold (14°C) | 14.0°C | 🟡 normal | 🟡 normal | ✅ |
| Just below (13.99°C) | 13.99°C | 🟢 low | 🟢 low | ✅ |
| Freshwater (0 ppt) | 0 ppt | ⚫ NULL | ⚫ NULL | ✅ |
| Brackish (19.9 ppt) | 19.9 ppt | ⚫ NULL | ⚫ NULL | ✅ |
| Barely brackish (20 ppt) | 20.0 ppt | 🔵 very_low | 🔵 very_low | ✅ |
| Anoxic (0 mg/L O₂) | 0 mg/L | 🔵 very_low | 🔵 very_low | ✅ |
| Critical (1.9 mg/L O₂) | 1.9 mg/L | 🔵 very_low | 🔵 very_low | ✅ |

---

## 📏 Threshold Boundary Behavior

### Temperature Boundaries
```
7.9°C  → 🔵 very_low  (below 8°C threshold)
8.0°C  → 🟢 low       (crosses threshold)
13.9°C → 🟢 low
14.0°C → 🟡 normal    (crosses threshold)
```

**Key Insight:** Thresholds are **inclusive** (≥). Value **exactly at threshold** gets that band's classification.

### Salinity Boundaries (Critical for Species Filtering)
```
19.9 ppt → ⚫ NULL        (freshwater, exclude marine species)
20.0 ppt → 🔵 very_low    (barely brackish, only euryhaline)
31.9 ppt → 🟢 low         (estuarine)
32.0 ppt → 🟡 normal      (typical coastal)
```

**Key Insight:** Salinity below 20 ppt returns **NULL**, which should **exclude most marine species** from predictions (Wrasse, Bass, etc. require ≥20 ppt).

### Oxygen Boundaries (Safety Critical)
```
1.9 mg/L → 🔵 very_low    (hypoxic - fish stress)
2.0 mg/L → 🟢 low         (marginal)
3.9 mg/L → 🟢 low
4.0 mg/L → 🟡 normal      (adequate for survival)
7.0 mg/L → 🟠 high        (healthy)
```

**Key Insight:** Below 2 mg/L = fish kills likely. Below 4 mg/L = sublethal stress. Use as **hard filters** in prediction algorithm.

---

## 🎨 Complete Threshold Reference

### 🌡️ Surface Temperature (°C)
| Bio-Level | Threshold | Interpretation | Example Species |
|-----------|-----------|----------------|-----------------|
| 🔵 very_low | ≥ 0°C | Freezing, minimal activity | Cod, Haddock (optimal) |
| 🟢 low | ≥ 8°C | Cold, hardy species | Whiting, Plaice |
| 🟡 normal | ≥ 14°C | Temperate, most active | Bass, Wrasse, Pollock |
| 🟠 high | ≥ 20°C | Warm, high activity | Mullet, Bream |
| 🔴 very_high | ≥ 26°C | Hot, stress possible | Mediterranean species only |

### 💧 Salinity (ppt)
| Bio-Level | Threshold | Interpretation | Example Species |
|-----------|-----------|----------------|-----------------|
| ⚫ NULL | < 20 ppt | **Freshwater** | Exclude marine species |
| 🔵 very_low | ≥ 20 ppt | Brackish | Flounder, Mullet |
| 🟢 low | ≥ 28 ppt | Estuarine | Sea Trout, Flounders |
| 🟡 normal | ≥ 32 ppt | Typical coastal | Most species |
| 🟠 high | ≥ 36 ppt | Full oceanic | All marine species |
| 🔴 very_high | ≥ 40 ppt | Hypersaline | Mediterranean evaporation zones |

### 🫁 Dissolved Oxygen (mg/L)
| Bio-Level | Threshold | Interpretation | Action |
|-----------|-----------|----------------|--------|
| 🔵 very_low | ≥ 0 mg/L | **Anoxic** | ❌ Exclude all species |
| 🟢 low | ≥ 2 mg/L | Hypoxic | ⚠️ Stress, avoid |
| 🟡 normal | ≥ 4 mg/L | Adequate | Basic survival |
| 🟠 high | ≥ 7 mg/L | Healthy | Good conditions |
| 🔴 very_high | ≥ 10 mg/L | Excellent | Peak activity |

### 🌿 Chlorophyll (mg/m³)
| Bio-Level | Threshold | Interpretation | Fishing Implication |
|-----------|-----------|----------------|---------------------|
| 🔵 very_low | ≥ 0 mg/m³ | Clear, low productivity | Structure fishing (reefs, wrecks) |
| 🟢 low | ≥ 0.5 mg/m³ | Oligotrophic | Target specific features |
| 🟡 normal | ≥ 1.5 mg/m³ | Balanced food web | Best all-around |
| 🟠 high | ≥ 3 mg/m³ | Plankton rich | Pelagic species active |
| 🔴 very_high | ≥ 5 mg/m³ | Bloom conditions | Can stress fish, reduced clarity |

### 🧪 Nitrate (μmol/L)
| Bio-Level | Threshold | Interpretation |
|-----------|-----------|----------------|
| 🔵 very_low | ≥ 0 μmol/L | Nutrient-depleted |
| 🟢 low | ≥ 1 μmol/L | Oligotrophic |
| 🟡 normal | ≥ 3 μmol/L | Typical coastal |
| 🟠 high | ≥ 6 μmol/L | Enriched (runoff) |
| 🔴 very_high | ≥ 10 μmol/L | Eutrophic (pollution) |

### 🧪 Phosphate (μmol/L)
| Bio-Level | Threshold | Interpretation |
|-----------|-----------|----------------|
| 🔵 very_low | ≥ 0 μmol/L | Nutrient-depleted |
| 🟢 low | ≥ 0.1 μmol/L | Oligotrophic |
| 🟡 normal | ≥ 0.3 μmol/L | Mesotrophic |
| 🟠 high | ≥ 0.6 μmol/L | Enriched |
| 🔴 very_high | ≥ 1 μmol/L | Eutrophic (algal bloom risk) |

### 🦠 Phytoplankton (cells/L)
| Bio-Level | Threshold | Interpretation |
|-----------|-----------|----------------|
| 🔵 very_low | ≥ 0 cells/L | Sparse, low productivity |
| 🟢 low | ≥ 1,000 cells/L | Winter levels |
| 🟡 normal | ≥ 5,000 cells/L | Healthy coastal |
| 🟠 high | ≥ 20,000 cells/L | Spring/summer bloom |
| 🔴 very_high | ≥ 50,000 cells/L | Dense bloom, reduced clarity |

---

## 🎯 Integration with Species Predictions

### How Bio-Bands Modify Environmental Scores

```javascript
// Example: Bass in Summer Cornwall
const raw_data = {
  temperature: 16.5,  // 🟡 normal
  salinity: 34.2,     // 🟡 normal
  oxygen: 7.5,        // 🟠 high
  chlorophyll: 2.1    // 🟡 normal
};

// Step 1: Classify
const classified = {
  temperature: 'normal',
  salinity: 'normal',
  oxygen: 'high',        // ← Bonus!
  chlorophyll: 'normal'
};

// Step 2: Check species bio-bands preferences
const bass_bio_bands = {
  surfaceTemperature: { happy: ['low', 'normal'], unhappy: ['very_high'] },
  salinity: { happy: ['normal', 'high'], unhappy: ['very_low'] },
  oxygen: { happy: ['high', 'very_high'], unhappy: ['very_low', 'low'] }
};

// Step 3: Calculate environmental score (from precise ranges)
const temp_score = calculateTemperatureScore(16.5, bass_temp_ranges);
// 16.5 in optimal range 15-20°C → 0.98

const sal_score = calculateSalinityScore(34.2, bass_sal_ranges);
// 34.2 in optimal range 32-36 ppt → 1.0

const env_score = (temp_score * 0.35) + (sal_score * 0.25) + ...;
// = 0.85 (good base score)

// Step 4: Apply bio-band modifiers
const oxygen_bonus = classified.oxygen === 'high' ? 1.1 : 1.0;  // ← 10% bonus!
const final_score = env_score * oxygen_bonus;
// = 0.85 × 1.1 = 0.935 (excellent!)
```

### Critical Filters (Hard Exclusions)

**Salinity NULL (< 20 ppt):**
```sql
-- Exclude all stenohaline (marine-only) species
WHERE classify_parameter('salinity', cmems_salinity) IS NOT NULL
```

**Hypoxic Oxygen (< 2 mg/L):**
```sql
-- Exclude all species in dead zones
WHERE classify_parameter('oxygen', cmems_oxygen) NOT IN ('very_low')
```

**Temperature Extremes:**
```sql
-- Exclude cold-water species from Med summer
-- Exclude warm-water species from North Sea winter
WHERE species.environmental_preferences->'temperature'->>'tolerance_min' <= cmems_temp
AND species.environmental_preferences->'temperature'->>'tolerance_max' >= cmems_temp
```

---

## ✅ Validation Checklist

- [x] Manual classification logic tested (7/7 edge cases passed)
- [x] Real-world scenarios validated (5 geographic zones)
- [x] Threshold boundaries verified (exact values, just below, just above)
- [x] NULL handling correct (freshwater exclusion)
- [x] Critical thresholds identified (oxygen, salinity)
- [x] Species implications documented
- [x] Integration strategy defined
- [ ] **Next:** Run database migration `create_bio_bands_thresholds.sql`
- [ ] **Next:** Test SQL version with `test-bio-bands-classification.ts`

---

## 🚀 Ready for Deployment

**Status:** ✅ Threshold logic validated  
**Migration File:** `migrations/create_bio_bands_thresholds.sql`  
**Test Script:** `scripts/test-bio-bands-classification.ts` (for post-migration validation)  
**Manual Test:** `scripts/test-bio-bands-manual.ts` (completed successfully)

**Next Steps:**
1. Execute `create_bio_bands_thresholds.sql` in Supabase SQL Editor
2. Run `npx tsx scripts/test-bio-bands-classification.ts` to validate database function
3. Build prediction RPC that uses `classify_parameter()` + `environmental_preferences`
4. Deploy to production 🎣

---

**Test Date:** 12 October 2025  
**Test Result:** ✅ PASS (100% success rate)  
**Ready for Migration:** YES
