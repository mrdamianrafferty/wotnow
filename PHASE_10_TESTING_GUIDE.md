# 🧪 Phase 10 Frontend Testing Guide

**Date:** 12 October 2025  
**Status:** Frontend Integration Complete - Ready for Testing  
**Time to Test:** 15 minutes

---

## ✅ What's Been Completed

### Backend (Phase 10)
- ✅ Real CMEMS marine data connected
- ✅ 324/325 rectangles (99.7%) with fresh data
- ✅ `rectangle_environmental_conditions` VIEW working
- ✅ `get_environmental_predictions_basic()` function returning real data

### Frontend Components (Phase 10)
- ✅ `DataFreshnessBadge` - Shows data age with color coding
- ✅ `GuildBadge` - Shows ecological guild with environmental weighting
- ✅ `EnvironmentalInfo` - Displays temp/sal/depth/substrate with match quality
- ✅ Type definitions updated in `mapPrediction.ts`
- ✅ Data extraction logic added to `mapPrediction()` function

### UI Integration (Phase 10)
- ✅ `pages/findr/index.tsx` - Updated `PredictionCardContent`
  - Added guild badge after confidence
  - Added data freshness badge
  - Added environmental conditions section
- ✅ `components/findr/ActiveSpeciesCard.tsx` - Updated high-confidence cards
  - Added compact environmental info
  - Added data freshness indicator
- ✅ `components/findr/GoodSpeciesCard.tsx` - Updated medium-confidence cards
  - Added compact environmental info
  - Added data freshness indicator
- ✅ `components/findr/WaitingSpeciesCard.tsx` - Updated low-confidence cards
  - Added environmental conditions explanation
  - Added stale data warning

---

## 🧪 Testing Checklist

### Test 1: Main Findr Page (PredictionCardContent)

**URL:** http://localhost:3000/findr

**Steps:**
1. Open the main Findr page
2. Select a rectangle (e.g., "31F1 - Cornwall SE")
3. View the prediction cards

**Expected Results:**
- [ ] **Guild Badge** appears after confidence badge
  - Example: "🪨 Reef/Kelp" or "🌊 Pelagic"
  - Badge has tooltip on hover showing environmental weighting
  - Example tooltip: "Temp 38% • Sal 27% • Depth 20% • Substrate 15%"
  
- [ ] **Data Freshness Badge** appears after guild badge
  - 🟢 Green badge for fresh data (< 24 hours)
  - Shows time ago: "6h ago" or "1 day ago"
  - Has tooltip: "Fresh data from MET Norway"
  
- [ ] **Environmental Conditions Section** appears after summary text
  - Section has "🌊 Current Conditions" header
  - Shows temperature with match indicator: "🌡️ Temp: 16.5°C ✅ (Optimal)"
  - Shows salinity: "🧂 Salinity: 35.1 ppt ⚠️ (Tolerable)"
  - Shows depth: "📏 Depth: 15m ✅ (Preferred)"
  - Shows substrate: "🪨 Substrate: mixed ⚠️ (Acceptable)"
  - Footer shows: "Data from met • Updated 6h ago"

- [ ] **Responsive Design**
  - Badges wrap correctly on mobile
  - Environmental section is readable on all screen sizes
  - Tooltips work on touch devices

**Visual Example:**
```
┌─────────────────────────────────────────┐
│ 🐟 Sea Bass                             │
│ [96% biting] [🪨 Reef/Kelp] [🟢 6h ago] │
│                                         │
│ Perfect conditions in Cornwall SE...    │
│                                         │
│ ┌────────────────────────────────────┐ │
│ │ 🌊 Current Conditions               │ │
│ │ 🌡️ Temp: 16.5°C ✅ (Optimal)        │ │
│ │ 🧂 Salinity: 35.1 ppt ✅ (Optimal)  │ │
│ │ 📏 Depth: 15m ✅ (Preferred)        │ │
│ │ 🪨 Substrate: mixed ⚠️ (Acceptable) │ │
│ │ Data from met • Updated 6h ago      │ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Test 2: Favourites Page - ActiveSpeciesCard

**URL:** http://localhost:3000/findr/favourites

**Steps:**
1. Add some species to favourites (if not already present)
2. Open the favourites page
3. Look at high-confidence species (85%+ confidence)

**Expected Results:**
- [ ] **Compact Environmental Info** appears below fishing time
  - Single line format: "🌡️ 16.5°C ✅  🧂 35.1 ppt ✅  🪨 mixed ⚠️"
  - Color-coded match indicators
  - Text is small (text-xs class)
  
- [ ] **Data Freshness Badge** appears below environmental info
  - Small badge (xs size)
  - No label, just icon and time: "🟢 6h ago"
  - Minimal space usage

**Visual Example:**
```
┌────────────────────────────────────────┐
│ 🐟 Sea Bass                            │
│ [⚡ 96%] 🔥 PEAK CONDITIONS            │
│ [⏰ 14:00-18:00] Best feeding time     │
│ 🌡️ 16.5°C ✅  🧂 35.1 ppt ✅  🪨 mixed ⚠️│
│ 🟢 6h ago                               │
│                                        │
│ [Drop everything — they're biting NOW!]│
└────────────────────────────────────────┘
```

### Test 3: Favourites Page - GoodSpeciesCard

**URL:** http://localhost:3000/findr/favourites

**Steps:**
1. Look at medium-confidence species (70-84% confidence)

**Expected Results:**
- [ ] **Compact Environmental Info** appears below fishing time
  - Same format as ActiveSpeciesCard
  - Smaller text (text-xs)
  
- [ ] **Data Freshness Badge** appears
  - Extra small badge (xs size)
  - Minimal footprint

**Visual Example:**
```
┌────────────────────────────────────┐
│ 🐟 Mackerel                        │
│ [⚡ 78%] Good conditions           │
│ [⏰ 06:00-10:00] Dawn feeding      │
│ 🌡️ 15.2°C ⚠️  🧂 34.8 ppt ✅       │
│ 🟢 12h ago                         │
│                                    │
│ [Peak conditions tomorrow]         │
└────────────────────────────────────┘
```

### Test 4: Favourites Page - WaitingSpeciesCard

**URL:** http://localhost:3000/findr/favourites

**Steps:**
1. Look at low-confidence species (<60% confidence)

**Expected Results:**
- [ ] **Environmental Conditions Explanation** appears
  - Shows "Current conditions:" label
  - Compact environmental info below
  - If data is stale: "⚠️ Data may be outdated" warning appears

**Visual Example:**
```
┌──────────────────────────────────────┐
│ 🐟 Tuna                              │
│ [45%] Improving in 2 days            │
│ Mini forecast: ▁▂▃▅▆▇█              │
│                                      │
│ Current conditions:                  │
│ 🌡️ 14.2°C ❌  🧂 34.5 ppt ✅         │
│ ⚠️ Temperature too low for tuna      │
└──────────────────────────────────────┘
```

### Test 5: Data Quality Verification

**Steps:**
1. Open browser console (F12)
2. Go to Network tab
3. Reload Findr page
4. Look for API call to `/api/findr/predictions`

**Expected Results:**
- [ ] API response includes environmental data:
  ```json
  {
    "data_freshness": "fresh",
    "weight_profile": "reef_kelp",
    "factors": {
      "temperature": { "actual": 16.5, "match": "optimal", "score": 9.5 },
      "salinity": { "actual": 35.1, "match": "optimal", "score": 9.2 },
      "depth": { "actual": 15, "match": "preferred", "score": 8.8 },
      "substrate": { "actual": "mixed", "match": "acceptable", "score": 7.5 },
      "data_age_hours": 6.2,
      "data_source": "met"
    }
  }
  ```

- [ ] Console shows no errors
- [ ] No TypeScript compilation errors in terminal

### Test 6: Backwards Compatibility

**Test with rectangle that has NO environmental data:**

**Steps:**
1. Select a rectangle that might have stale/missing data
2. Or test with prediction that has null environmental factors

**Expected Results:**
- [ ] Page still loads without errors
- [ ] Cards render correctly without environmental data
- [ ] No guild badge appears (conditional rendering)
- [ ] No data freshness badge appears
- [ ] No environmental section appears
- [ ] All other card features work normally

### Test 7: Tooltips & Interactions

**Steps:**
1. Hover over guild badge
2. Hover over data freshness badge
3. Click to expand prediction details

**Expected Results:**
- [ ] **Guild Badge Tooltip** shows:
  - Guild name: "Reef/Kelp"
  - Icon: 🪨
  - Weighting: "Temp 25% • Sal 18% • Depth 22% • Substrate 35%"
  - Description: "Rocky habitats - substrate-driven (35% weight)"
  
- [ ] **Data Freshness Tooltip** shows:
  - Freshness category: "Fresh"
  - Description: "Data updated within the last 24 hours"
  - Source: "MET Norway"
  
- [ ] **Environmental Info** displays correctly in both:
  - Compact mode (one line)
  - Full mode (grid layout with labels)

### Test 8: Mobile Responsiveness

**Steps:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test on different screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)

**Expected Results:**
- [ ] **Mobile (< 640px)**
  - Badges stack vertically or wrap gracefully
  - Environmental info remains readable
  - Compact mode shows abbreviated info
  - Touch targets are ≥44px (accessibility)
  
- [ ] **Tablet (640-1024px)**
  - Badges wrap to 2 lines if needed
  - Environmental grid has 2 columns
  
- [ ] **Desktop (> 1024px)**
  - Badges display horizontally
  - Environmental grid has 4 columns
  - Full labels visible

### Test 9: Color Coding & Match Quality

**Steps:**
1. Find species with different match qualities
2. Check environmental info colors

**Expected Results:**
- [ ] **Green (✅) - Optimal/Preferred**
  - Text is green (text-success)
  - Icon is ✅
  
- [ ] **Yellow (⚠️) - Tolerable/Acceptable**
  - Text is yellow (text-warning)
  - Icon is ⚠️
  
- [ ] **Red (❌) - Poor**
  - Text is red (text-error)
  - Icon is ❌

### Test 10: Performance

**Steps:**
1. Open Chrome DevTools Performance tab
2. Record page load
3. Measure rendering time

**Expected Results:**
- [ ] Page loads in < 2 seconds
- [ ] No layout shifts (CLS < 0.1)
- [ ] No janky scrolling
- [ ] Images load progressively
- [ ] No memory leaks (check Memory tab)

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Salinity Currently Null
**Status:** Known limitation  
**Impact:** Salinity shows as "N/A" in most predictions  
**Fix:** Phase 10.2 will add salinity data ingestion

### Issue 2: Inferred Substrate
**Status:** Temporary solution  
**Impact:** Substrate is inferred from region, not real seabed mapping  
**Fix:** Phase 10.1 will connect EMODnet substrate data

### Issue 3: Missing Guild for Some Species
**Status:** Expected  
**Impact:** ~15 species don't have guild assignments yet  
**Effect:** Guild badge won't appear for these species (graceful degradation)

---

## 🔧 Troubleshooting

### Problem: Environmental section doesn't appear

**Possible Causes:**
1. Rectangle has no environmental data
   - **Solution:** Check Test 4 from deployment guide (data coverage)
2. Prediction function not returning environmental data
   - **Solution:** Check Supabase function `get_environmental_predictions_basic()`
3. Frontend extraction failing
   - **Solution:** Check browser console for errors in `mapPrediction.ts`

**Debug Steps:**
```bash
# Check data in Supabase
psql -c "SELECT * FROM rectangle_environmental_conditions WHERE rectangle_code = '31F1'"

# Check prediction data
psql -c "SELECT * FROM get_environmental_predictions_basic('31F1', CURRENT_DATE) LIMIT 1"

# Check browser console for errors
# Look for errors in mapPrediction function
```

### Problem: Badges not showing up

**Check:**
1. Component imports are correct
2. Data is being extracted in `mapPrediction()`
3. Conditional rendering is working: `{card.weight_profile && <GuildBadge />}`

### Problem: TypeScript errors

**Run:**
```bash
npm run build
```

**Check:**
- All imports are correct
- Interface definitions match
- No compilation errors in terminal

### Problem: Tooltips not working on mobile

**Note:** DaisyUI tooltips use hover by default  
**Solution:** Consider adding `data-tip` attribute and testing on actual device

---

## 📊 Test Results Template

**Date:** _______________  
**Tester:** _______________  
**Browser:** _______________  
**Device:** _______________

### Test Results:
- [ ] Test 1: Main Findr Page - PASS / FAIL
- [ ] Test 2: ActiveSpeciesCard - PASS / FAIL
- [ ] Test 3: GoodSpeciesCard - PASS / FAIL
- [ ] Test 4: WaitingSpeciesCard - PASS / FAIL
- [ ] Test 5: Data Quality - PASS / FAIL
- [ ] Test 6: Backwards Compatibility - PASS / FAIL
- [ ] Test 7: Tooltips - PASS / FAIL
- [ ] Test 8: Mobile Responsive - PASS / FAIL
- [ ] Test 9: Color Coding - PASS / FAIL
- [ ] Test 10: Performance - PASS / FAIL

### Issues Found:
```
Issue #1:
Description:
Steps to Reproduce:
Expected:
Actual:

Issue #2:
...
```

---

## ✅ Sign-Off

Once all tests pass:
- [ ] All 10 tests completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] Ready for production deployment

**Phase 10 Frontend Status:** ✅ COMPLETE

---

## 🚀 Next Steps

Once testing is complete and Phase 10 is verified working:

**Immediate:**
- Deploy to production
- Monitor user feedback
- Check analytics for engagement

**Future Enhancements:**
- Phase 10.1: EMODnet Substrate Data (2-3 hours)
- Phase 10.2: Salinity Data Ingestion (1-2 hours)
- Phase 10.3: Bio-bands Modifiers (2-3 hours)
- Phase 11: Tidal Effects (3-4 hours)

---

## 📝 Testing Notes

```
Date: 12 October 2025
Time: 
Tester: Damian Rafferty
Browser: 
Device: 

Test 1: Main Findr Page
- Guild badge visible: ___
- Data freshness badge visible: ___
- Environmental section visible: ___
- Tooltips working: ___
- Notes: 

Test 2-4: Favourites Cards
- Active card: ___
- Good card: ___
- Waiting card: ___
- Notes:

Test 5: Data Quality
- API response correct: ___
- No console errors: ___
- Notes:

Overall Assessment:
- Ready for production: YES / NO / NEEDS WORK
- Critical issues: 
- Nice-to-have improvements:
```

---

## 🎉 Success Criteria

Phase 10 is considered **COMPLETE** when:
1. ✅ All 10 tests pass
2. ✅ No critical bugs blocking user experience
3. ✅ Environmental data displays correctly for 99%+ of predictions
4. ✅ Mobile experience is smooth and usable
5. ✅ Performance meets standards (< 2s load time)
6. ✅ Backwards compatible with predictions that have no environmental data

**Expected Outcome:** Users see real-time environmental conditions driving every prediction, building trust and understanding of why certain fish are biting! 🎣🌊

