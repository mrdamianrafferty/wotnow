# Optimization Status by Page

**Date**: October 18, 2025
**Status**: Current optimization inventory

---

## ✅ Fully Optimized Pages

### `/findr` (Findr Homepage)
**Bundle**: 606KB → 238KB (-368KB / -61%)

**Optimizations Applied**:
- ✅ Modal code-splitting (FindrModal, FishSpeciesModal)
- ✅ Priority image loading for first card
- ✅ Next.js Image with AVIF support
- ✅ Aggressive edge caching (30min)

**File**: `pages/findr/index.tsx`

---

## 🔶 Partially Optimized Pages

### `/weather` (Weather Dashboard)
**Bundle**: 43.3KB page-specific (211KB total) - **LARGEST PAGE**

**Existing Optimizations**:
- ✅ AppHeader dynamically loaded
- ✅ CoastalLocationDialog dynamically loaded
- ✅ PrecipNext24hCard dynamically loaded

**Optimization Opportunities**:
- 🔶 **15+ weather cards loaded statically** (candidates for lazy loading):
  - HourlyMarineCard
  - HourlyCard
  - SimplePressureCardDial
  - SunriseSunsetCard
  - HumidityCard
  - TidesCard
  - WindCard
  - WaveCard
  - NextFewDaysCard
  - UVCard
  - AirQualityCard
  - PollenCard
  - MoonCard (already typed but not dynamically loaded)

**Recommendation**:
Code-split cards into dynamic imports. Most cards are "below the fold" and could lazy-load as user scrolls. Estimated savings: **20-30KB**.

**File**: `pages/weather.tsx`

---

### `/findr/log` (Catch Logging)
**Bundle**: 31.2KB page-specific (211KB total)

**Current Status**: No dynamic imports found yet

**Optimization Opportunities**:
- 🔶 Form components likely heavy
- 🔶 Image upload components
- 🔶 Possible maps or location selectors
- 🔶 Success/error modals

**Recommendation**:
Analyze imports and code-split form sections, modals, and image upload. Estimated savings: **15-20KB**.

**File**: `pages/findr/log.tsx`

---

### `/findr/conditions` (Environmental Conditions)
**Bundle**: 26.5KB page-specific (195KB total)

**Current Status**: Not analyzed yet

**Optimization Opportunities**:
- 🔶 Data visualization components (charts?)
- 🔶 Marine data display cards
- 🔶 Possible modals or expandable sections

**Recommendation**:
Code-split visualization components. Estimated savings: **10-15KB**.

**File**: `pages/findr/conditions.tsx`

---

### `/findr/favourites` (Favorites Management)
**Bundle**: 20.6KB page-specific (201KB total)

**Current Status**: Not analyzed yet

**Optimization Opportunities**:
- 🔶 Species cards/modals
- 🔶 Authentication prompts
- 🔶 Empty state illustrations

**Recommendation**:
Code-split modals and auth components. Estimated savings: **10KB**.

**File**: `pages/findr/favourites.tsx`

---

## ⚪ Not Yet Analyzed

### `/` (Homepage)
**Bundle**: 19.2KB page-specific (228KB total)

**Status**: Relatively small, may not need optimization

---

### `/activities` (Activity Recommendations)
**Bundle**: 9.48KB page-specific (213KB total)

**Status**: Small bundle, likely well-optimized

---

## 🌍 Global Optimizations (All Pages)

These optimizations benefit **every page** in the app:

### ✅ Completed
1. **React Query Devtools Lazy Loading**: -15-20KB from ALL production pages
2. **Edge Caching**: 70-80% cache hit rate for API calls
3. **Database Indexes**: Faster queries, reduced load
4. **AVIF Image Support**: Automatic 30% smaller images
5. **Long Cache TTLs**: 1 year for static assets

### 🔶 Shared Bundle (207KB baseline)
All pages share this baseline:
- `framework-*.js`: 140KB (React + Next.js)
- `main-*.js`: 124KB (App entry point)
- `_app-*.js`: 70KB (Contexts: Location, Preferences, Language)
- CSS: 54KB (Tailwind + DaisyUI)

**Optimization Opportunities**:
- 🔶 **Lazy load contexts**: UnifiedLocationContext, LanguageContext only when needed
- 🔶 **CSS purging**: May have unused Tailwind classes
- 🔶 **Tree-shake DaisyUI**: Only include used components

**Estimated Savings**: 20-30KB if aggressive

---

## 📊 Priority Ranking for Next Optimizations

### High Priority (Biggest Impact)
1. **`/weather`** (43KB) - Most savings potential, highest traffic page
   - Target: 15+ static weather card imports
   - Estimated savings: 20-30KB

### Medium Priority
2. **`/findr/log`** (31KB) - Second largest bundle
   - Target: Form components, modals
   - Estimated savings: 15-20KB

3. **`/findr/conditions`** (27KB) - Data viz heavy
   - Target: Charts, marine data cards
   - Estimated savings: 10-15KB

### Low Priority
4. **`/findr/favourites`** (21KB) - Smaller bundle
   - Estimated savings: 10KB

5. **Shared bundle optimization** (207KB) - Affects all pages but risky
   - Requires careful context refactoring
   - Estimated savings: 20-30KB

---

## 🎯 Recommended Next Steps

### Option A: Quick Wins (1-2 hours)
1. Optimize `/weather` page weather cards
2. Optimize `/findr/log` modals
**Total Estimated Savings**: 35-50KB

### Option B: Deep Optimization (3-4 hours)
1. All of Option A
2. Optimize `/findr/conditions` visualizations
3. Lazy-load shared contexts (Location, Language)
**Total Estimated Savings**: 55-80KB

### Option C: Complete Optimization (5-6 hours)
1. All of Option B
2. Optimize all Findr sub-pages
3. CSS purging and tree-shaking
4. Investigate shared bundle reduction
**Total Estimated Savings**: 75-110KB

---

## 📝 Notes

### What's Already Working Well
- Findr homepage is now extremely optimized (238KB total)
- Global edge caching reduces server load dramatically
- Image optimization fully configured and working
- API routes have aggressive caching

### Why Other Pages Not Optimized Yet
- Focus was on Findr homepage (main LCP concern)
- Bundle analyzer focused on Findr-specific analysis
- Weather page already has partial dynamic loading
- Other pages have smaller bundles (less urgency)

### Trade-offs to Consider
- More dynamic imports = more code complexity
- Lazy loading can cause "flash" if not handled well
- Context lazy-loading may break app initialization
- Over-optimization can hurt developer experience

---

**Conclusion**: We've heavily optimized the Findr homepage and global performance. The `/weather` page (43KB) is the next biggest opportunity, followed by other Findr pages. Quick wins available with 1-2 hours of work.
