# Stealth Indicator Implementation

## Overview
The Stealth Indicator has been successfully restored and integrated into the Marine Bio Indicators card. This indicator calculates how wary fish will be based on light penetration into the water, which is derived from UV Index and cloud cover.

## Implementation Details

### 1. Core Calculation (`utils/bioMarineLevels.ts`)

Added `calculateStealthIndex()` function that:
- Takes UV Index (0-11+) and cloud cover percentage (0-100)
- Optional water clarity adjustment ('clear' | 'normal' | 'murky')
- Returns light penetration index (0-100)
  - **Lower values** = Less light = Fish less wary = Better stealth conditions
  - **Higher values** = More light = Fish more wary = Need more stealth

**Formula:**
```typescript
const normalisedUVI = clamp(uvi, 0, 11) / 11;
const cloudFrac = clamp(cloudCover, 0, 100) / 100;
const clarityNudge = waterClarity === 'clear' ? +0.08 : waterClarity === 'murky' ? -0.08 : 0;
const lightIndex = clamp(((1 - cloudFrac) * normalisedUVI + clarityNudge) * 100, 0, 100);
```

### 2. Classification Thresholds

| Level | Range | Interpretation |
|-------|-------|----------------|
| **Very Low** | 0-20 | Excellent low-light conditions. Fish feel secure and actively feeding. |
| **Low** | 20-35 | Low light favors the angler. Fish less spooky. |
| **Normal** | 35-55 | Moderate light. Fish somewhat cautious but feeding. |
| **High** | 55-75 | High light makes fish cautious. Use longer leaders (9-12ft). |
| **Very High** | 75-100 | Extreme light penetration. Fish extremely wary. Use very long leaders (12-15ft+). |

### 3. Integration Points

#### A. Type System (`utils/bioMarineLevels.ts`)
- Added `'stealth'` to `MarineBioIndicatorType` union
- Added `stealth?: number | null` to `MarineBioIndicatorInputs` interface
- Updated `MARINE_BIO_INDICATOR_ORDER` to include stealth (positioned between phosphate and salinity)
- Added stealth thresholds, units, and hints to configuration objects

#### B. Dashboard Component (`components/findr/ConditionsDashboard.tsx`)
- Imported `calculateStealthIndex` function
- Added stealth calculation to `marineBioIndicators` useMemo:
  ```typescript
  stealth: calculateStealthIndex(
    environmentalSignals.uvIndex,
    environmentalSignals.cloudCover ?? 50 // Fallback to 50% if unavailable
  )
  ```
- Uses real-time cloud cover from weather API via `environmentalSignals.cloudCover`

#### C. UI Component (`components/findr/weather/MarineBioIndicatorsCard.tsx`)
- Already configured with stealth indicator definitions:
  - Icon: `HatGlasses` (sunglasses icon)
  - Label: "Stealth"
  - Color: `text-amber-600`
  - Unit: `% light`
  - Hint: "Light penetration affects fish wariness."

### 4. Fishing Insights by Level

The component provides tactical advice based on stealth level:

- **Very Low (0-20%)**: Darker lures work well. Fish actively feeding.
- **Low (20-35%)**: Good for topwater and aggressive presentations.
- **Normal (35-55%)**: Standard stealth tactics and natural colors.
- **High (55-75%)**: Longer leaders (9-12ft), subdued colors, careful approach.
- **Very High (75-100%)**: Very long leaders (12-15ft+), natural baits, minimal movement.

## Data Flow

```
OpenWeather API (current.clouds, current.uvi)
         ↓
/api/weather-with-pollen (at user location, 4dp precision)
         ↓
useFindrEnvironmentalSignals hook
         ↓
environmentalSignals.cloudCover & environmentalSignals.uvIndex
         ↓
calculateStealthIndex(uvi, cloudCover)
         ↓
Light penetration index (0-100)
         ↓
classifyValue() → Level (very_low to very_high)
         ↓
MarineBioIndicatorState
         ↓
MarineBioIndicatorsCard → Display with icon, badge, description
```

### Weather Data Source
- **UVI & Cloud Cover**: From OpenWeather API via `/api/weather-with-pollen`
- **Location**: User location at 4 decimal places precision (NOT rectangle center)
- **Update Frequency**: Real-time via `useFindrEnvironmentalSignals` hook
- **Marine Bio Indicators**: From Supabase at ICES rectangle level
- **Tides**: From Supabase at ICES rectangle level

## Current Limitations & TODOs

1. **Water Clarity**: Currently defaults to 'normal'. Could be enhanced by:
   - Using chlorophyll levels as proxy (high chlorophyll = murkier water)
   - Integrating with water transparency/Secchi depth data if available
   - Adding user preference for known local conditions

2. **Time of Day**: Could factor in sun angle (elevation) for more accurate light penetration:
   - Morning/evening = lower angle = less penetration
   - Midday = higher angle = more penetration

3. **Future Enhancements**:
   - Historical stealth patterns for specific locations
   - Moon phase integration (affects night fishing stealth)
   - Water surface conditions (calm vs choppy affects light penetration)

## Testing

To test the stealth indicator:

1. Start dev server: `npm run dev -- -p 3001`
2. Navigate to: http://localhost:3001/findr/conditions
3. Select any fishing area
4. Scroll to "Bio indicators" card
5. Look for the Stealth card (amber color with sunglasses icon)
6. Tap to see fishing insights based on light conditions

## Files Modified

1. `/utils/bioMarineLevels.ts` - Added stealth type, thresholds, and calculation function
2. `/components/findr/ConditionsDashboard.tsx` - Integrated stealth into marineBioIndicators
3. `/components/findr/weather/MarineBioIndicatorsCard.tsx` - Already had stealth UI config
4. `/hooks/useFindrEnvironmentalSignals.ts` - Added cloudCover to interface and state management
5. `/pages/api/weather-with-pollen.ts` - Already returns cloud cover from OpenWeather API

## Migration Notes

The stealth indicator was previously lost during a merge. This implementation:
- Uses the same calculation logic from `LightStealthAdvisor` component
- Integrates seamlessly with existing Marine Bio Indicators system
- Maintains the same user-facing advice and tactical recommendations
- Provides consistent UX with other bio indicators (tap to expand for details)

## References

- Original stealth advisor component logic
- EMODnet marine data integration patterns
- Bio indicator classification system
