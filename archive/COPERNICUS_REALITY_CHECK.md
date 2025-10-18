# Copernicus Dataset Challenge - The Real Issue

**Date:** 14 October 2025

## The Problem

Copernicus Marine Service has **split their datasets** into separate products for each variable. This is why we keep getting "Dataset not found" errors.

### What We Thought
We could use one "physics" dataset that contains:
- Temperature (`thetao`)
- Salinity (`so`)  
- Currents (`uo`, `vo`)
- Mixed layer depth (`mlotst`)
- Sea surface height (`zos`)

### What Actually Exists
Separate datasets for EACH variable:
- `cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m` (temperature only)
- `cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m` (salinity only)
- `cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m` (currents only)
- etc.

## The Real Challenge

This is **much more complex** than initially thought because:

1. **Each region has different split patterns**
   - Global: Everything split (thetao, so, cur separate)
   - Mediterranean: Split (tem, sal, cur separate)
   - Baltic: Combined? Needs investigation
   - IBI: Needs investigation
   - NWS: Needs investigation

2. **Need to fetch multiple datasets per rectangle**
   - 1 dataset for temperature
   - 1 dataset for salinity
   - 1 dataset for currents
   - 1 dataset for BGC
   - 1 dataset for waves
   - = **5 API calls per rectangle!**

3. **Different variable availability**
   - Not all datasets have all variables
   - Need to handle partial data
   - Some variables may not exist in some regions

## Recommended Approach

### Option 1: Start Simple - Use What Works
Focus on the variables that are definitely available:
1. **Temperature** - Universal, most important
2. **Basic BGC** - Chlorophyll (usually available)
3. **Skip complex variables initially** - Currents, mixed layer depth, etc.

This gets you 80% of the value with 20% of the complexity.

### Option 2: Use Global Ocean Model Only
Forget regional models for now, just use Global Ocean everywhere:
- Simpler (one set of dataset IDs to maintain)
- Works everywhere (no coverage gaps)
- Lower resolution but good enough for fishing predictions
- Can add regional models later as optimization

### Option 3: Hire a Copernicus Expert 😅
This is genuinely complex and changing. Consider:
- The dataset IDs change periodically
- The split patterns vary by region
- Need to track which variables are in which datasets
- Need to handle missing data gracefully

## Immediate Next Step

I recommend **Option 2** - use Global Ocean model only to prove the pipeline works:

```bash
# Update regionRouter to use Global for everything
# Test with Global datasets
# Get SOME data flowing
# Optimize with regional models later
```

This gets you:
- ✅ Working data ingestion
- ✅ Proof of concept
- ✅ Something to test bite scores with
- ⏳ Can optimize later with regional models

## Why This is Hard

As you said: "it is a bit harder than we thought as we have to choose the right datasets and the right CMEMS regions"

You were absolutely right! The challenges are:
1. Dataset IDs are a moving target (they reorganize)
2. Datasets are split by variable (not documented clearly)
3. Regional vs global tradeoffs
4. Coverage varies by location
5. Need to handle 5+ API calls per rectangle
6. Time multiplier: 325 rectangles × 5 calls = 1,625 API calls!

## Decision Time

What would you like to do?

**A) Simple Global-only approach** (get it working fast)
**B) Continue hunting dataset IDs** (more accurate but time-consuming)
**C) Use mock data for now** (focus on bite score logic)
**D) Something else?

Let me know and I'll help implement whichever approach you prefer! 🌊
