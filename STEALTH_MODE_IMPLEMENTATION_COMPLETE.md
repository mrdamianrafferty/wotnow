# Stealth Mode Indicator - Implementation Complete

**Date**: 20 October 2025  
**Status**: ✅ Complete and Tested

---

## Overview

The **Stealth Mode** indicator has been redesigned to be more reliable and use fun, intuitive labels that help anglers understand fishing detectability conditions at a glance.

---

## Changes Made

### 1. **Renamed from "Stealth" to "Stealth Mode"**
- More engaging and descriptive name
- Emphasizes that it's about fishing tactics, not just light levels

### 2. **New Three-Level System**

Instead of the standard five levels (Very Low, Low, Normal, High, Very High), Stealth Mode uses three intuitive categories:

| Light Level | Badge Label | Meaning | When to Use |
|-------------|-------------|---------|-------------|
| 0-35 (very_low/low) | 🎤 **Loud and Proud** | Visibility's poor, they'll never notice | Make noise, move freely, try bold presentations |
| 36-65 (normal) | 🎯 **Blend In** | Stay subtle, but not paranoid | Natural colors, smooth movement, moderate caution |
| 66-100 (high/very_high) | 🥷 **Ninja Mode** | Fish are spooky; keep quiet and invisible | Long leaders, muted colors, minimal movement |

### 3. **Improved Calculation Method**

**Old Approach** (Unreliable):
- Required UV Index from weather API
- Often unavailable, causing indicator to disappear
- Depended on external data quality

**New Approach** (Always Works):
- **Solar Position**: Astronomical calculation from lat/lon + time
- **Cloud Cover**: Optional enhancement (reduces light by up to 70%)
- **Water Clarity**: Optional enhancement (clear water increases penetration by 20%)
- **Result**: Always has a value, enhanced when more data available

---

## Technical Implementation

### Files Modified

1. **`utils/bioMarineLevels.ts`**
   - Added `calculateSolarElevation()` function (lines 158-202)
   - Rewrote `calculateStealthIndex()` to use sun position (lines 204-257)
   - Added `STEALTH_LEVEL_LABELS` export (lines 51-57)

2. **`components/findr/ConditionsDashboard.tsx`**
   - Updated stealth calculation call (lines 518-522)
   - Changed parameters from `(uvIndex, cloudCover)` to `(lat, lon, cloudCover, waterClarityIndex)`

3. **`components/findr/weather/MarineBioIndicatorsCard.tsx`**
   - Updated label to "Stealth Mode" (line 66)
   - Rewrote descriptions with new three-level system (lines 147-153)
   - Added conditional badge rendering for custom labels (line 195)
   - Imported `STEALTH_LEVEL_LABELS` (line 22)

4. **`CONDITIONS_PAGE_RECOVERY_GUIDE.md`**
   - Added Issue 5: Stealth Mode troubleshooting
   - Documented new calculation method
   - Added quick reference for the three levels

---

## Calculation Details

### Solar Elevation Formula

```typescript
function calculateSolarElevation(lat: number, lon: number, date: Date): number {
  // Julian day calculation
  // Mean longitude of sun
  // Mean anomaly
  // Ecliptic longitude
  // Declination
  // Hour angle
  // Returns: elevation angle in degrees (-90 to +90)
}
```

### Light Index Calculation

```typescript
// 1. Base light from sun position
if (solarElevation < -12°) → Night (0%)
if (solarElevation < 0°) → Twilight (0-20%)
if (solarElevation >= 0°) → Day (20-100%)

// 2. Apply cloud modifier
cloudModifier = 1.0 - (cloudCover% × 0.7)

// 3. Apply water clarity modifier  
clarityModifier = 0.9 + (waterClarity% × 0.3)

// 4. Final result
lightIndex = baseLightLevel × cloudModifier × clarityModifier × 100
```

---

## Test Results

```bash
npx tsx scripts/test-stealth-calculation.ts
```

| Scenario | Time | Clouds | Clarity | Result | Level |
|----------|------|--------|---------|--------|-------|
| Midday | 12:00 | 20% | 50% | 44 | Blend In |
| Night | 02:00 | 20% | 50% | 0 | Loud and Proud |
| Twilight | 06:30 | 20% | 50% | 29 | Loud and Proud |
| Cloudy day | 12:00 | 90% | 50% | 19 | Loud and Proud |
| Clear water | 12:00 | 10% | 90% | 53 | Blend In |
| Murky water | 12:00 | 10% | 10% | 42 | Blend In |
| Minimal data | 12:00 | null | null | 48 | Blend In |

✅ All scenarios produce reasonable values  
✅ Day/night variation working correctly  
✅ Cloud cover reduces light as expected  
✅ Water clarity adjusts penetration  
✅ Works with minimal data (lat/lon only)

---

## User Experience

### Before
- "Stealth" indicator often missing
- When present, showed technical UV Index levels
- Unclear what actions to take

### After
- **"Stealth Mode"** always present
- Three clear, actionable states:
  - 🎤 **Loud and Proud**: Be bold, experiment freely
  - 🎯 **Blend In**: Use standard tactics, moderate caution
  - 🥷 **Ninja Mode**: Maximum stealth required
- Each level has specific tactical guidance

### Example Display

```
┌─────────────────────────────────────┐
│ 😎 Stealth Mode          [Ninja Mode]│
│                                      │
│ Fish are spooky; keep quiet and      │
│ invisible. High light makes fish     │
│ wary. Use longer leaders (9-12ft),   │
│ muted colors, slow movements, and    │
│ careful positioning.                 │
│                                      │
│ 📊 67 (based on sun position + cloud)│
└─────────────────────────────────────┘
```

---

## Benefits

1. **Always Available**: Works with just lat/lon (which we always have)
2. **Accurate**: Uses real solar position, not proxy measurements
3. **Intuitive**: Three levels are easier to understand than five
4. **Actionable**: Each level tells you exactly how to adjust tactics
5. **Fun**: "Loud and Proud" vs "Ninja Mode" is more engaging than "Low" vs "High"
6. **Enhanced**: Optionally uses cloud cover and water clarity when available

---

## Related Documentation

- `CONDITIONS_PAGE_RECOVERY_GUIDE.md` - Issue 5: Stealth Mode Indicator
- `STEALTH_INDICATOR_IMPLEMENTATION.md` - Original implementation (now superseded)
- `scripts/test-stealth-calculation.ts` - Test suite for verification

---

## Future Enhancements

Potential improvements for future versions:

1. **Moon Phase**: Add moon illumination to night calculations
2. **Seasonal Adjustment**: Account for seasonal sun angles
3. **Species Preferences**: Some species prefer different light levels
4. **Time-of-Day Suggestions**: "Best in 2 hours at twilight"
5. **Historical Correlation**: Link stealth levels to catch data

---

**Status**: ✅ Ready for Production  
**Breaking Changes**: None (backward compatible)  
**Dependencies**: None (uses built-in Date and Math)
