# Copernicus Marine Data - What We're Getting vs What's Available

**Date:** 13 October 2025  
**Context:** Water clarity integration complete - reviewing full data coverage

---

## 🎯 Currently Implemented (Mock Data)

Based on `lib/copernicus/__fixtures__/asturias-mock.json` and types:

### ✅ Physics Dataset (`GLOBAL_ANALYSISFORECAST_PHY_001_024`)
| Variable | Code | Unit | What It Measures | Status |
|----------|------|------|------------------|--------|
| **Sea Temperature** | `thetao` | °C | Sea water potential temperature | ✅ **USING** |
| **Salinity** | `so` | PSU | Sea water salinity | ✅ **USING** |

### ✅ Biogeochemical Dataset (`GLOBAL_ANALYSISFORECAST_BGC_001_028`)
| Variable | Code | Unit | What It Measures | Status |
|----------|------|------|------------------|--------|
| **Chlorophyll** | `chl` | mg/m³ | Chlorophyll-a concentration (plankton) | ✅ **USING** |
| **Dissolved Oxygen** | `o2` | mmol/m³ | Dissolved oxygen concentration | ✅ **USING** |
| **Nitrate** | `no3` | mmol/m³ | Nitrate concentration (nutrient) | ✅ **USING** |
| **Phosphate** | `po4` | mmol/m³ | Phosphate concentration (nutrient) | ✅ **USING** |
| **Water Clarity** | `kd490` | 1/m | Diffuse attenuation coefficient at 490nm | ✅ **NEW** |

### ✅ Waves Dataset (Optional)
| Variable | Code | Unit | What It Measures | Status |
|----------|------|------|------------------|--------|
| **Wave Height** | `vhm0` or `swh` | m | Significant wave height | ✅ **USING** |

---

## 📊 What We're Currently Storing in Database

### `findr_conditions_snapshots` Table Columns:
```sql
✅ sea_temp_c              -- From thetao
✅ chlorophyll_mg_m3       -- From chl (converted from mmol to mg)
✅ kd490                   -- From kd490 (NEW - just added)
✅ dissolved_oxygen_mg_l   -- From o2 (converted from mmol to mg)
✅ salinity_psu            -- From so
✅ nitrate_umol_l          -- From no3 (converted from mmol to umol)
✅ phosphate_umol_l        -- From po4 (converted from mmol to umol)
✅ wave_height_m           -- From vhm0/swh
```

**Coverage:** 8/8 variables stored ✅

---

## 🌊 What Copernicus Offers That We're NOT Using Yet

### Available in Physics Dataset:
| Variable | Code | Unit | What It Measures | Why It's Useful |
|----------|------|------|------------------|----------------|
| **Ocean Currents (U)** | `uo` | m/s | Eastward sea water velocity | 🎣 **Fish movement, drift fishing, scent trails** |
| **Ocean Currents (V)** | `vo` | m/s | Northward sea water velocity | 🎣 **Fish movement, drift fishing, scent trails** |
| **Mixed Layer Depth** | `mlotst` | m | Ocean mixed layer thickness | 🐟 Fish depth distribution |
| **Sea Surface Height** | `zos` | m | Sea surface height above geoid | 🌊 Upwelling/downwelling detection |
| **Bottom Temperature** | `bottomT` | °C | Sea water potential temperature at bottom | 🦀 Demersal species (flatfish, rays) |

### Available in Biogeochemical Dataset:
| Variable | Code | Unit | What It Measures | Why It's Useful |
|----------|------|------|------------------|----------------|
| **Net Primary Production** | `nppv` | mg C/m³/day | Phytoplankton growth rate | 🐠 Food chain health indicator |
| **pH** | `ph` | pH units | Seawater acidity | 🦪 Shellfish/crustacean health |
| **Iron** | `fe` | mmol/m³ | Dissolved iron | 🌿 Phytoplankton growth limiter |
| **Silicate** | `si` | mmol/m³ | Silicate concentration | 🦐 Diatom growth (base of food chain) |
| **Phytoplankton Carbon** | `phyc` | mmol/m³ | Total phytoplankton biomass | 🐟 Food availability |
| **Zooplankton Carbon** | `zooc` | mmol/m³ | Zooplankton biomass | 🐟 **Direct food for small fish** |

### Available in Waves Dataset:
| Variable | Code | Unit | What It Measures | Why It's Useful |
|----------|------|------|------------------|----------------|
| **Wave Direction** | `vmdr` | degrees | Mean wave direction | 🌊 Beach fishing positioning |
| **Wave Period** | `vtm10` | seconds | Mean wave period | 🎣 Wave timing for surf fishing |
| **Wind Sea Height** | `vhm0_ww` | m | Wind-generated wave height | 🌬️ Local vs swell separation |
| **Swell Height** | `vhm0_sw1` | m | Primary swell height | 🌊 Deep ocean swell impact |

---

## 🎯 HIGH VALUE Variables We Should Add

### Priority 1: Ocean Currents (HUGE for bite scores!)
**Impact:** Fish follow currents for feeding, spawning, migration

```typescript
// Add to CopernicusRecordVariables
export interface CopernicusRecordVariables {
  // ... existing fields ...
  uo?: number;  // eastward current (m/s)
  vo?: number;  // northward current (m/s)
}
```

**Why it matters:**
- **Drift fishing accuracy**: Know exactly where bait/lure will drift
- **Scent trails**: Currents carry scent to predators (bass, tope, rays)
- **Fish positioning**: Predators face into current, waiting for food
- **Tidal current interaction**: Combine with tide data for feeding windows

**Species that benefit:**
- 🦈 **Sharks/Rays**: Follow scent trails in currents
- 🐟 **Bass**: Hunt at current breaks and eddies
- 🐠 **Mackerel**: Follow baitfish pushed by currents
- 🦐 **All predators**: Currents concentrate prey

**Example calculation:**
```typescript
// Current speed affects feeding activity
function currentScore(currentSpeed: number): number {
  // 0.2-0.5 m/s = ideal (food moving but not too fast)
  if (currentSpeed < 0.1) return 0.5;  // too still
  if (currentSpeed >= 0.1 && currentSpeed <= 0.5) return 1.0;  // perfect
  if (currentSpeed > 0.5 && currentSpeed <= 1.0) return 0.7;  // strong
  return 0.4;  // too strong (1.0+ m/s)
}
```

### Priority 2: Mixed Layer Depth
**Impact:** Shows where thermocline is = where fish congregate

```typescript
mlotst?: number;  // mixed layer thickness (meters)
```

**Why it matters:**
- **Fish depth targeting**: Thermocline = fish highway
- **Bait concentration**: Plankton/baitfish at thermocline
- **Species separation**: Some fish above, some below thermocline

**Species that benefit:**
- 🐟 **Tuna/Bonito**: Hunt at thermocline edges
- 🐠 **Mackerel**: School at thermocline depth
- 🦈 **Sharks**: Patrol thermocline for prey

### Priority 3: Zooplankton Carbon
**Impact:** Direct food source indicator

```typescript
zooc?: number;  // zooplankton carbon (mmol/m³)
```

**Why it matters:**
- **Baitfish presence**: Zooplankton = small fish = big fish
- **Food chain health**: High zooplankton = active ecosystem
- **Seasonal patterns**: Spring bloom = feeding frenzy

---

## 🚀 Implementation Recommendations

### Phase 1: Ocean Currents (ASAP - Massive Impact)
1. Add `uo` and `vo` to types
2. Fetch from Physics dataset (already using this dataset!)
3. Calculate current speed: `sqrt(uo² + vo²)`
4. Add `ocean_current_speed_ms` weight to species table
5. Add `currentScore()` to bite score calculation

**Effort:** Low (same dataset we already fetch)  
**Impact:** Very High (affects all species)  
**Priority:** 🔥 **CRITICAL**

### Phase 2: Mixed Layer Depth (High Value)
1. Add `mlotst` to types
2. Fetch from Physics dataset
3. Use for depth recommendations
4. Add thermocline proximity scoring

**Effort:** Low  
**Impact:** High  
**Priority:** ⭐ **HIGH**

### Phase 3: Wave Details (Nice to Have)
1. Add wave direction/period to types
2. Already have wave dataset connection
3. Enhance surf fishing predictions

**Effort:** Low  
**Impact:** Medium  
**Priority:** ✅ **MEDIUM**

### Phase 4: Food Chain Indicators (Future)
1. Add zooplankton/phytoplankton
2. Seasonal bite score adjustments
3. Long-term pattern analysis

**Effort:** Medium  
**Impact:** Medium (long-term)  
**Priority:** 📊 **LOW**

---

## 📋 Quick Action Items

### Immediate (This Week):
- [x] Add kd490 to database ✅
- [x] Add water clarity calculation ✅
- [ ] **Add ocean currents (uo, vo) to types**
- [ ] **Fetch current data from Physics dataset**
- [ ] **Add current_speed_weight to species table**

### Next Sprint:
- [ ] Add mixed layer depth (mlotst)
- [ ] Add wave direction/period
- [ ] Create current speed scoring function
- [ ] Test with sight feeders (Plaice, Bass, Mackerel)

### Future Enhancements:
- [ ] Zooplankton carbon (food chain)
- [ ] Bottom temperature (demersal species)
- [ ] Sea surface height (upwelling detection)

---

## 💡 Key Insight

**We're using ~40% of Copernicus's valuable fishing data!**

Most impactful missing piece: **Ocean currents** 🌊
- Same dataset we already fetch (Physics)
- Zero additional API calls needed
- Affects ALL species (not just sight feeders)
- Critical for scent-based hunting (sharks, rays, bass)

**Next Step:** Add `uo` and `vo` to the Physics dataset fetch to get current data for free!

---

## 📚 Copernicus Dataset References

### Currently Using:
- Physics: `GLOBAL_ANALYSISFORECAST_PHY_001_024`
- Biogeochemical: `GLOBAL_ANALYSISFORECAST_BGC_001_028`
- Waves: `GLOBAL_ANALYSISFORECAST_WAV_001_027`

### Full Variable Lists:
- Physics variables: https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024
- Biogeochemical variables: https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_BGC_001_028
- Wave variables: https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_WAV_001_027
