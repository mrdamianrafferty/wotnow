# ICES Rectangle Data Integration for Findr

## Overview

This document outlines how to use ICES rectangle data as a fallback baseline that can be augmented by user data in the Findr system. This approach ensures the app always has meaningful, location-aware data while getting better over time as users interact with it.

## Current State Analysis

### Existing Mock Data System

Currently, the favourites system in `/pages/findr/favourites.tsx` uses:

```typescript
// Static fallback arrays
const SWIPED_DATE_OPTIONS = ['today', 'yesterday', '3 days ago', ...];
const LAST_CONDITIONS_OPTIONS = ['earlier today', 'yesterday morning', ...];
const RECENT_ACTIVITY_OPTIONS = ['Hooked up yesterday!', 'Still ghosting', ...];
const BAIT_FALLBACKS = ['Bring the flash: silver spinners', ...];

// Random selection function
function generateMockDetail(id: string): MockDetail {
  return {
    swipedDate: pickFrom(SWIPED_DATE_OPTIONS, id, 'swiped'),
    catches: catchesOptions[hashString(`${id}:catches`) % catchesOptions.length],
    // ... more mock data
  };
}
```

### Problems with Current Approach

1. **No Location Context**: Mock data is the same regardless of fishing area
2. **No Species-Area Compatibility**: Doesn't consider which fish are actually found in specific ICES rectangles
3. **Generic Bait Recommendations**: Same bait suggestions everywhere
4. **No Environmental Context**: Ignores distance to shore, depth, regional characteristics

## ICES Rectangle Enhancement Solution

### Data Sources Priority

1. **User Data** (highest priority) - Real catch logs, personal statistics
2. **ICES Rectangle Baseline** (medium priority) - Location-aware species data
3. **Mock Fallback** (lowest priority) - Generic placeholder data

### ICES Rectangle Data Available

```typescript
interface FallbackRectangleOption {
  code: string;           // e.g., "31E8"
  label: string;          // e.g., "English Channel"
  region: string;         // e.g., "English Channel"
  centerLat: number;      // e.g., 50.25
  centerLon: number;      // e.g., -0.5
  distanceToShoreKm?: number; // e.g., 2.0
}
```

We have 50+ ICES rectangles covering:
- Portuguese Coast
- Galician Coast  
- Bay of Biscay
- Irish Waters (West, Southwest, East, North)
- English Channel
- Welsh Coast
- Scottish Waters (East, Northwest, Highlands)
- Outer/Inner Hebrides
- Mediterranean
- Dutch Coast

### Enhanced Data Structure

Instead of random mock data, generate location-aware baseline data:

```typescript
interface ICESEnhancedData {
  // Location context
  rectangleCode: string;     // "31E8"
  rectangleRegion: string;   // "English Channel"
  distanceToShoreKm: number; // 2.0
  
  // Species-location compatibility
  locationConfidence: number; // 0-100 based on species-area match
  seasonalConfidence: number; // 0-100 based on current season
  
  // Location-aware recommendations
  bestBait: string;          // "Live prawns around pier structure"
  recentActivity: string;    // "Hunting in tidal channels"
  
  // Data quality indicator
  dataQuality: 'user' | 'ices' | 'mock';
}
```

## Implementation Strategy

### Phase 1: ICES Baseline Integration

1. **Create ICES Species Database**
   ```typescript
   const ICES_SPECIES_DATA = {
     'sea-bass': {
       preferredRegions: ['English Channel', 'Irish Waters', 'Bay of Biscay'],
       seasonalPeaks: [5, 6, 7, 8, 9], // May-September
       coastalPreference: 'inshore', // < 3km from shore
       baits: {
         coastal: 'Live prawns, soft plastics',
         offshore: 'Live mackerel, large lures'
       }
     },
     'atlantic-mackerel': {
       preferredRegions: ['Irish Waters', 'Bay of Biscay', 'Scottish Waters'],
       seasonalPeaks: [6, 7, 8], // June-August
       coastalPreference: 'midshore', // 1-5km from shore
       baits: {
         coastal: 'Feather rigs, small spinners',
         offshore: 'Hooked mackerel, large feathers'
       }
     }
     // ... more species
   };
   ```

2. **Location-Aware Confidence Scoring**
   ```typescript
   function calculateLocationConfidence(speciesId: string, rectangleCode: string): number {
     const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
     const speciesData = ICES_SPECIES_DATA[speciesId];
     
     let confidence = 50; // Base confidence
     
     // Region bonus
     if (speciesData.preferredRegions.includes(rectangle.region)) {
       confidence += 30;
     }
     
     // Distance to shore compatibility
     const distance = rectangle.distanceToShoreKm;
     if (speciesData.coastalPreference === 'inshore' && distance < 2) {
       confidence += 20;
     } else if (speciesData.coastalPreference === 'offshore' && distance > 5) {
       confidence += 20;
     }
     
     return Math.min(100, confidence);
   }
   ```

3. **Dynamic Bait Recommendations**
   ```typescript
   function getICESBaitRecommendation(speciesId: string, rectangleCode: string): string {
     const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
     const speciesData = ICES_SPECIES_DATA[speciesId];
     const isOffshore = rectangle.distanceToShoreKm > 3;
     
     let baseBait = isOffshore ? speciesData.baits.offshore : speciesData.baits.coastal;
     
     // Regional adjustments
     if (rectangle.region.includes('Mediterranean')) {
       baseBait = baseBait.replace('lugworm', 'anchovies');
     } else if (rectangle.region.includes('Irish')) {
       baseBait += ' (excellent local stocks)';
     }
     
     return baseBait;
   }
   ```

### Phase 2: Smart Fallback System

Replace the current `generateMockDetail()` function:

```typescript
function generateSmartDetail(speciesId: string, rectangleCode: string | null): EnhancedDetail {
  if (!rectangleCode) {
    return generateMockDetail(speciesId); // Fallback to current system
  }
  
  // Generate ICES-informed baseline
  return {
    bestBait: getICESBaitRecommendation(speciesId, rectangleCode),
    recentActivity: getICESActivity(speciesId, rectangleCode),
    locationConfidence: calculateLocationConfidence(speciesId, rectangleCode),
    seasonalConfidence: calculateSeasonalConfidence(speciesId),
    dataQuality: 'ices',
    lastPerfectConditions: getICESConditions(rectangleCode),
    // ... other ICES-enhanced fields
  };
}
```

### Phase 3: User Data Integration

When user data becomes available, merge with ICES baseline:

```typescript
function mergeUserWithICES(userData: UserInsight, icesBaseline: ICESDetail): EnhancedDetail {
  return {
    // User data takes priority
    catches: userData.catches,
    swipedDate: userData.swipedDate,
    
    // ICES provides context where user data is missing
    bestBait: userData.preferredBait || icesBaseline.bestBait,
    locationConfidence: calculateCombinedConfidence(userData, icesBaseline),
    
    // Enhanced context from ICES
    rectangleRegion: icesBaseline.rectangleRegion,
    distanceToShoreKm: icesBaseline.distanceToShoreKm,
    
    dataQuality: 'user', // Highest quality
  };
}
```

## Benefits of ICES Integration

### 1. **Meaningful Placeholder Data**
- Location-specific species recommendations
- Realistic bait suggestions based on area characteristics
- Activity descriptions that make sense for the region

### 2. **Progressive Enhancement**
- Start with ICES baseline (immediately useful)
- Enhance with user data over time
- Always maintains location context

### 3. **Educational Value**
- Users learn about species-area relationships
- Bait recommendations based on regional knowledge
- Understanding of coastal vs offshore fishing

### 4. **Seamless Upgrade Path**
- Existing mock system remains as final fallback
- ICES integration can be rolled out gradually
- User data integration requires no breaking changes

## Implementation Files

1. **Core Enhancement Hook**: `/hooks/useEnhancedFavouriteInsights.ts`
2. **ICES Enhancement Utilities**: `/lib/findr/icesEnhancement.ts`  
3. **Species-Location Database**: `/lib/findr/icesSpeciesData.ts` (to be created)
4. **Integration Examples**: `/components/findr/examples/` (for testing)

## Next Steps

1. **Create Species-ICES Database**: Map common species to their preferred ICES areas
2. **Enhance Existing generateMockDetail**: Add ICES rectangle parameter
3. **Update useFavouriteInsights**: Include rectangle context in API calls
4. **Test Integration**: Verify backward compatibility with existing system
5. **User Testing**: Validate that ICES-enhanced data feels more realistic

This approach transforms the current random placeholder system into an intelligent, location-aware baseline that provides immediate value while supporting future enhancement with real user data.