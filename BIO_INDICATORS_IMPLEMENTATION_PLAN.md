# Bio Indicators Implementation Plan

**Date**: 20 October 2025  
**Strategy**: Tiered Structure with "Show More" Toggle  
**Target**: Phase 1 (Essential 3) + Simple Progressive Disclosure

---

## 🎯 Implementation Strategy

### Tiered Structure (APPROVED ✅)

**Essentials View (Default - Always Visible)**:
- 5 core indicators including 2 new game-changers
- Ultra-clean, focused interface
- Minimal cognitive load - only actionable metrics

**Advanced View (Behind "Show More" Toggle)**:
- +6 additional indicators (including 1 new)
- Progressive disclosure for power users
- One-click expansion for deeper insights

---

## 📋 Phase 1: Essential 3 Indicators

### 1. "How Deep are the Fish?" 📏
**Priority**: ⭐⭐⭐⭐⭐ HIGHEST - Game Changer

**Data Source**: `mixed_layer_depth_m` + `dissolved_oxygen_mg_l` + `sea_temp_c`

**Badge Logic**:
```typescript
// Calculate thermocline strength
const tempGradient = calculateTempGradient(surfaceTemp, depthTemp);
const oxygenAdequate = dissolvedOxygen > 6.0; // mg/L threshold

if (tempGradient > 2.0 && oxygenAdequate) {
  return { level: 'defined', label: 'Defined', color: 'success' };
} else if (tempGradient > 0.5) {
  return { level: 'weak', label: 'Weak', color: 'warning' };
} else {
  return { level: 'mixed', label: 'Mixed', color: 'error' };
}
```

**Display**:
- Icon: 📏
- Value: `"18m"`
- Badge: `"Defined"` (green) | `"Weak"` (yellow) | `"Mixed"` (red)
- Label: `"How Deep are the Fish?"`

**Descriptions**:
```typescript
defined: {
  short: "Clear thermocline — fish concentrated at this depth",
  detail: "Strong temperature/density change creates a defined layer where fish hold. Target this depth for best results.",
  tactics: "Use depth finders to stay in the zone. Fish will be tightly grouped."
},
weak: {
  short: "Mild stratification — fish somewhat scattered",
  detail: "Weak thermocline means fish are more dispersed vertically. Cover more depth range.",
  tactics: "Try multiple depths. Fish may be spread across 10-15m range."
},
mixed: {
  short: "No clear depth structure — fish dispersed",
  detail: "Well-mixed water column means fish can be at any depth. Look for structure or baitfish.",
  tactics: "Focus on bottom structure, reefs, or follow baitfish schools."
}
```

**Tooltip**: `"Combines thermocline depth, oxygen levels, and temperature gradient to predict where fish will hold"`

---

### 2. "Feeding Potential" 🍽️
**Priority**: ⭐⭐⭐⭐⭐ HIGHEST - Unique Feature

**Data Sources**: 
- `chlorophyll_mg_m3` (40% weight)
- `phytoplankton_mmol_m3` (20% weight)
- `zooplankton_mmol_m3` (20% weight)
- `primary_production_mg_c_m3_day` (20% weight)

**Calculation**:
```typescript
// Normalize each to 0-100 scale
const chlScore = normalizeChlorophyll(chlorophyll); // 0-100
const phytoScore = normalizePhytoplankton(phytoplankton); // 0-100
const zooScore = normalizeZooplankton(zooplankton); // 0-100
const ppScore = normalizePrimaryProduction(primaryProduction); // 0-100

// Weighted composite
const feedingPotential = 
  (chlScore * 0.4) + 
  (phytoScore * 0.2) + 
  (zooScore * 0.2) + 
  (ppScore * 0.2);

// Classification
if (feedingPotential >= 67) return 'rich';
else if (feedingPotential >= 34) return 'moderate';
else return 'sparse';
```

**Display**:
- Icon: 🍽️
- Value: `"82/100"`
- Badge: `"Rich"` (green) | `"Moderate"` (yellow) | `"Sparse"` (red)
- Label: `"Feeding Potential"`
- Alternative Label: `"How Hard Are They Biting"` (consider A/B testing)

**Descriptions**:
```typescript
rich: {
  short: "Rich food chain — expect active feeding",
  detail: "High levels across all food chain indicators. Fish are well-fed and actively competing for food.",
  tactics: "Use a variety of lures. Fish will be aggressive and less selective."
},
moderate: {
  short: "Moderate food availability — selective feeding",
  detail: "Adequate food chain but not abundant. Fish may be more cautious.",
  tactics: "Match the hatch. Use realistic presentations and be patient."
},
sparse: {
  short: "Limited food — fish scattered and selective",
  detail: "Low productivity. Fish are spread out searching for food and may be lethargic.",
  tactics: "Slow presentations. Target known structure. Consider different locations."
}
```

**Tooltip**: `"Combines chlorophyll, phytoplankton, zooplankton, and primary production into overall ecosystem health score"`

---

### 3. "Baitfish Activity" 🦐
**Priority**: ⭐⭐⭐⭐ HIGH - Completes the Story

**Data Source**: `zooplankton_mmol_m3`

**Classification**:
```typescript
// Based on typical oceanic ranges
if (zooplankton > 3.0) return { level: 'high', label: 'High', color: 'success' };
else if (zooplankton > 1.0) return { level: 'normal', label: 'Normal', color: 'info' };
else return { level: 'low', label: 'Low', color: 'warning' };
```

**Display**:
- Icon: 🦐
- Value: `"2.5 mmol/m³"` (show units for educational value)
- Badge: `"High"` (green) | `"Normal"` (blue) | `"Low"` (yellow)
- Label: `"Baitfish Activity"`

**Descriptions**:
```typescript
high: {
  short: "Plenty of food for baitfish — more predators nearby",
  detail: "High zooplankton levels mean active baitfish, which attracts predators. Look for bird activity and surface feeding.",
  tactics: "Focus on areas with visible baitfish. Use imitation lures matching local baitfish."
},
normal: {
  short: "Normal baitfish activity — standard conditions",
  detail: "Typical zooplankton levels. Baitfish present but not concentrated.",
  tactics: "Standard tactics work. Cover water to find fish."
},
low: {
  short: "Limited baitfish food — predators may be deeper or elsewhere",
  detail: "Low zooplankton means scattered baitfish. Predators may move to different areas or depths.",
  tactics: "Search deeper water or different locations. Try bottom presentations."
}
```

**Tooltip**: `"Zooplankton is the food that baitfish eat — high levels mean active baitfish which attracts predators"`

---

## 🎨 UI Implementation

### Default View (Essentials - 5 Indicators)

**Order** (optimize for value and flow):
1. 🕶️ Stealth Mode _(existing, enhanced)_
2. 🌊 Water Temperature _(existing)_
3. 📏 **How Deep are the Fish?** ← NEW
4. 💨 Dissolved Oxygen _(existing)_
5. 🍽️ **Feeding Potential** ← NEW

**Layout**: 2-column grid on desktop, 1-column on mobile

**Rationale**: Keep only the most actionable indicators visible by default - conditions (stealth, temp, oxygen) and the two game-changers (depth, feeding).

---

### "Show More" Toggle

**Position**: After the 8th indicator, centered

**Button Design**:
```tsx
<button className="btn btn-ghost btn-sm w-full mt-4">
  {showAdvanced ? (
    <>
      <ChevronUp className="w-4 h-4 mr-2" />
      Show Less
    </>
  ) : (
    <>
      <ChevronDown className="w-4 h-4 mr-2" />
      Show More Indicators ({advancedCount})
    </>
  )}
</button>
```

**Animation**: Smooth expand/collapse (150ms ease-in-out)

---

### Advanced View (+6 Indicators)

**Additional Indicators** (revealed on toggle):
6. ⬡ Salinity _(existing, moved to advanced)_
7. 🌿 Chlorophyll _(existing, moved to advanced)_
8. ✨ Phytoplankton _(existing, moved to advanced)_
9. 🦐 **Baitfish Activity** ← NEW
10. 🧪 Nitrate _(existing)_
11. 💧 Phosphate _(existing)_

**Future additions** (Phase 2B):
12. 🌱 Primary Production
13. 🌊 Ocean Dynamics (Sea Surface Height)

**Note**: Start with 11 total (5 essential + 6 advanced), add #12-13 in Phase 2B

**Rationale**: Salinity, Chlorophyll, and Phytoplankton are educational but less immediately actionable. Users who want deeper understanding will click "Show More".

---

## 🔧 Technical Implementation

### File Updates Required

#### 1. `utils/bioMarineLevels.ts`
**Add new indicator types**:
```typescript
export type BioIndicatorType = 
  | 'stealth'
  | 'temperature'
  | 'oxygen'
  | 'target_depth'      // NEW
  | 'feeding_potential' // NEW
  | 'baitfish_activity' // NEW
  | 'salinity'
  | 'chlorophyll'
  | 'phytoplankton'
  | 'nitrate'
  | 'phosphate';
```

**Add calculation functions**:
```typescript
export function calculateTargetDepth(
  mixedLayerDepth: number,
  dissolvedOxygen: number,
  tempGradient: number
): BioIndicatorResult {
  // Implementation here
}

export function calculateFeedingPotential(
  chlorophyll: number,
  phytoplankton: number,
  zooplankton: number,
  primaryProduction: number
): BioIndicatorResult {
  // Implementation here
}

export function calculateBaitfishActivity(
  zooplankton: number
): BioIndicatorResult {
  // Implementation here
}
```

#### 2. `components/findr/weather/MarineBioIndicatorsCard.tsx`

**Add state for toggle**:
```typescript
const [showAdvanced, setShowAdvanced] = useState(false);
```

**Add indicator configs**:
```typescript
const indicatorConfigs = {
  target_depth: {
    icon: '📏',
    label: 'How Deep are the Fish?',
    unit: 'm',
    tooltip: 'Combines thermocline depth, oxygen levels, and temperature gradient...',
    tier: 'essential'
  },
  feeding_potential: {
    icon: '🍽️',
    label: 'Feeding Potential',
    unit: '/100',
    tooltip: 'Combines all food chain indicators into ecosystem health score...',
    tier: 'essential'
  },
  baitfish_activity: {
    icon: '🦐',
    label: 'Baitfish Activity',
    unit: 'mmol/m³',
    tooltip: 'Zooplankton levels indicate baitfish food availability...',
    tier: 'advanced'
  }
  salinity: {
    icon: '⬡',
    label: 'Salinity',
    unit: 'PSU',
    tooltip: 'Salt content of water — affects species distribution and behavior',
    tier: 'advanced'
  },
  chlorophyll: {
    icon: '🌿',
    label: 'Chlorophyll',
    unit: 'mg/m³',
    tooltip: 'Indicates phytoplankton abundance — base of food chain',
    tier: 'advanced'
  },
  phytoplankton: {
    icon: '✨',
    label: 'Phytoplankton',
    unit: 'mmol/m³',
    tooltip: 'Microscopic plants — primary producers in marine ecosystem',
    tier: 'advanced'
  }
  // ... other existing configs (nitrate, phosphate, etc.) with tier: 'advanced'
};
```

**Filter indicators by tier**:
```typescript
const essentialIndicators = indicators.filter(
  ind => indicatorConfigs[ind.type]?.tier === 'essential'
);

const advancedIndicators = indicators.filter(
  ind => indicatorConfigs[ind.type]?.tier === 'advanced'
);
```

#### 3. `pages/api/findr/conditions.ts`

**No changes needed** - data already being fetched! ✅

Just need to pass the additional fields through the response.

---

## 📊 Data Normalization Functions

### Chlorophyll (0-10+ mg/m³ → 0-100 score)
```typescript
function normalizeChlorophyll(value: number): number {
  // Oligotrophic: 0-0.5, Mesotrophic: 0.5-3, Eutrophic: 3-10+
  if (value <= 0.5) return value * 20; // 0-10
  if (value <= 3) return 10 + ((value - 0.5) / 2.5) * 50; // 10-60
  return Math.min(100, 60 + ((value - 3) / 7) * 40); // 60-100
}
```

### Phytoplankton (0-5+ mmol/m³ → 0-100 score)
```typescript
function normalizePhytoplankton(value: number): number {
  return Math.min(100, (value / 5) * 100);
}
```

### Zooplankton (0-5+ mmol/m³ → 0-100 score)
```typescript
function normalizeZooplankton(value: number): number {
  return Math.min(100, (value / 5) * 100);
}
```

### Primary Production (0-2000+ mg C/m³/day → 0-100 score)
```typescript
function normalizePrimaryProduction(value: number): number {
  // Low: <200, Medium: 200-800, High: 800-2000+
  return Math.min(100, (value / 2000) * 100);
}
```

---

## ✅ Testing Checklist

### Unit Tests
- [ ] `calculateTargetDepth()` with various MLD/O₂/temp combinations
- [ ] `calculateFeedingPotential()` with edge cases (all high, all low, mixed)
- [ ] `calculateBaitfishActivity()` boundary conditions
- [ ] Normalization functions for each data type
- [ ] Badge color logic for each indicator

### Integration Tests
- [ ] API returns all required fields
- [ ] Indicators display in correct order
- [ ] "Show More" toggle works smoothly
- [ ] Mobile layout (1-column) displays correctly
- [ ] Desktop layout (2-column) displays correctly
- [ ] Tooltips render with correct content
- [ ] Expandable details show appropriate tactics

### Visual Tests
- [ ] Badge colors match logic (green=good, red=challenging)
- [ ] Icons display correctly
- [ ] Typography hierarchy clear
- [ ] Spacing consistent between tiers
- [ ] Animation smooth (no jank)

---

## 🚀 Deployment Steps

### Step 1: Add Calculations (30 min)
1. Update `utils/bioMarineLevels.ts` with new types
2. Add three new calculation functions
3. Add normalization helper functions
4. Export new constants and labels

### Step 2: Update Component (45 min)
1. Update `MarineBioIndicatorsCard.tsx`:
   - Add indicator configs for new types
   - Add tier classification
   - Add toggle state
   - Implement filtered rendering
   - Add "Show More" button
2. Style the toggle button
3. Add expand/collapse animation

### Step 3: Wire Up Data (15 min)
1. Update `ConditionsDashboard.tsx`:
   - Calculate new indicators
   - Pass to MarineBioIndicatorsCard
2. Ensure API response includes all fields

### Step 4: Test & Refine (30 min)
1. Run unit tests
2. Test in browser (dev mode)
3. Test mobile responsive
4. Verify all tooltips/descriptions
5. Check animation smoothness

### Step 5: Deploy (15 min)
1. Create deployment summary doc
2. Clear Next.js cache
3. Restart dev server
4. Verify in production build
5. Monitor for errors

**Total Estimated Time**: ~2.5 hours

---

## 🎯 Success Metrics

### User Engagement
- Click-through rate on "Show More" toggle
- Time spent viewing bio indicators card
- Repeat views of new indicators

### User Feedback
- Support requests mentioning depth/feeding
- Feature requests for related indicators
- User testimonials about usefulness

### Technical
- Zero errors in console
- <100ms render time for expansion
- No layout shift (CLS) issues

---

## 📝 Future Phases

### Phase 2A: Fishing Outlook Card (Next Week)
- Meta-indicator summary card
- Auto-generated tactical advice
- Position at top of conditions page

### Phase 2B: Additional Composites (Next Sprint)
- Water Clarity Index
- Ocean Dynamics (SSH)
- Primary Production to advanced tier

### Phase 3: Educational Content (Ongoing)
- Detailed tooltips
- Learning articles
- Video explainers
- Species-specific guidance

---

## 💡 Key Decisions Made

1. ✅ **Tiered Structure** - Balances simplicity with depth
2. ✅ **Simple Toggle** - "Show More" instead of separate tabs
3. ✅ **5 Essential + 6 Advanced** - Ultra-focused default view
4. ✅ **Angler-Friendly Names** - "How Deep are the Fish?" not "Mixed Layer Depth"
5. ✅ **Feeding Potential First** - Consider A/B testing vs "How Hard Are They Biting"
6. ✅ **Move Chemistry to Advanced** - Salinity, Chlorophyll, Phytoplankton less immediately actionable
7. ✅ **Baitfish Activity in Advanced** - Educational, completes food chain story
8. ✅ **Zero API Cost** - All data already being collected

---

**Next Action**: Implement Phase 1 (Essential 3 + Toggle) - Estimated 2.5 hours

**Expected Impact**: 
- 🎯 Unique competitive advantage (target depth)
- 📈 Increased user engagement
- 🏆 "Game changer" feature per user research
- 💰 Zero additional infrastructure cost
