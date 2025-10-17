# Recommendations System Overview

## Current State: Active & Processing

Your system has **multiple recommendation engines** actively processing suggestions across different areas:

---

## 1. 🎯 Activity Recommendations (Interests Page)

### Location
- **Engine**: `/app/settings/recommendations.tsx`
- **Consumer**: `/pages/interests.tsx`
- **Live in Production**: ✅ Yes

### How It Works

#### A. The Recommendation Engine (`recommendations.tsx`)

**Curated Neighbor Map:**
```typescript
export const activityRecommendations: ActivityRecommendationsMap = {
  tennis: ['tennis_indoor', 'padel', 'squash'],
  surfing: ['kitesurfing', 'windsurfing', 'stand_up_paddleboarding'],
  hiking: ['trail_running', 'birdwatching', 'foraging'],
  // ... 141 activities total with hand-picked relationships
};
```

**Ranking Algorithm:**
```typescript
export function rankRecommendations(
  selected: ActivityId[],
  opts?: {
    limit?: number;           // How many to return (default: 8)
    exclude?: ActivityId[];   // Activities to exclude
    labelMap?: LabelMap;      // For display names
    allowedIds?: Set<string>; // Filter by allowed catalog
  }
): ActivityId[]
```

**Scoring Process:**
1. For each selected activity, look up its neighbors
2. Count how many times each neighbor appears (frequency score)
3. Exclude already-selected activities
4. Sort by: **score DESC** → **alphabetical by label** → **alphabetical by ID**
5. Return top N recommendations

#### B. Implementation in Interests Page

**Data Flow:**
```
User Selections → rankRecommendations() → Filter Dismissed → Display Top 6
```

**Key Features:**
1. **Smart Fallbacks**: If no interests selected, shows 50+ popular activities
2. **Dismissal System**: Users can hide suggestions temporarily (with timestamps)
3. **Resurrection**: Dismissed suggestions return later, sorted by oldest dismissal first
4. **Dual-Mode Display**:
   - Curated recommendations: "You might also like" (based on selections)
   - Popular fallbacks: "Popular activities you might enjoy" (generic suggestions)

**Processing Code (lines 600-660):**
```typescript
const { suggestions, hasFallbacks } = useMemo(() => {
  const selectedSet = new Set(interests);
  const TARGET_SUGGESTIONS = 6;

  // Sort by dismissal timestamp (not dismissed first, then oldest dismissals)
  const sortByDismissal = (items: string[]) => {
    return [...items].sort((a, b) => {
      const aTime = dismissedRecos[a] || 0;
      const bTime = dismissedRecos[b] || 0;
      return aTime - bTime; // Non-dismissed (0) first, then oldest dismissals
    });
  };

  // No interests? Show popular fallbacks
  if (interests.length === 0) {
    const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.filter(
      id => !selectedSet.has(id)
    );
    const sorted = sortByDismissal(fallbackPool);
    return {
      suggestions: sorted.slice(0, TARGET_SUGGESTIONS),
      hasFallbacks: true,
    };
  }

  // Try curated recommendations first
  const curatedPool = rankRecommendations(interests, {
    limit: 50,
    labelMap: ACTIVITY_NAME_MAP,
  });

  const curatedFiltered = curatedPool.filter(id => !selectedSet.has(id));
  const curatedSorted = sortByDismissal(curatedFiltered);

  // Enough curated suggestions? Use them
  if (curatedSorted.length >= TARGET_SUGGESTIONS) {
    return {
      suggestions: curatedSorted.slice(0, TARGET_SUGGESTIONS),
      hasFallbacks: false,
    };
  }

  // Not enough - add popular fallbacks
  const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.filter(
    id => !selectedSet.has(id) && !curatedFiltered.includes(id)
  );
  const fallbackSorted = sortByDismissal(fallbackPool);
  const combined = [...curatedSorted, ...fallbackSorted];

  return {
    suggestions: combined.slice(0, TARGET_SUGGESTIONS),
    hasFallbacks: fallbackSorted.length > 0,
  };
}, [interests, dismissedRecos]);
```

**Persistence:**
- User selections → Supabase `profiles.activities` + localStorage
- Dismissed suggestions → localStorage `godaisy.reco.dismissed` (with timestamps)

---

## 2. 🐟 Species Suggestions (Findr Feature)

### Location
- **API**: `/pages/api/findr/species/suggestions.ts`
- **Consumer**: Findr favorites management UI
- **Live in Production**: ✅ Yes

### How It Works

**Endpoint:**
```
GET /api/findr/species/suggestions?userId=USER_ID&icesSquare=31F2
```

**Four Suggestion Categories:**

#### A. You've Caught
- Query: User's catch history from `findr_catch_entries`
- Filter: Exclude already-favorited species
- Logic: Show species you've successfully caught before
- Reason: "You have successfully caught this species before"
- Limit: Top 10

#### B. Hot Right Now
- Status: ⚠️ **TODO** - needs live conditions scoring engine
- Intended: Species with high confidence scores in current conditions

#### C. Local Favorites
- Query: Recent catches (30 days) in user's ICES rectangle
- Aggregation: Count catches per species
- Sort: By regional popularity (catch count DESC)
- Filter: Exclude already-favorited
- Reason: "Popular in your area (N recent catches)"
- Limit: Top 10

#### D. All Regional
- Query: All species found in user's ICES rectangle
- Filter: Not already favorited
- Reason: "Found in {icesSquare}"
- Sort: By regional popularity

**Processing Code (lines 95-160):**
```typescript
// Species user has caught
const { data: userCatches } = await supabase
  .from('findr_catch_entries')
  .select('species_id, species_common_name, scientific_name')
  .eq('user_id', userId);

const userSpeciesIds = new Set(userCatches?.map(c => c.species_id) || []);

// User's existing favourites
const { data: existingFavourites } = await supabase
  .from('user_favourites')
  .select('species_id')
  .eq('user_id', userId);

const favouriteIds = new Set(existingFavourites?.map(f => f.species_id) || []);

// Local favorites (popular in region - last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: regionalCatches } = await supabase
  .from('findr_catch_entries')
  .select('species_id, species_common_name, scientific_name')
  .eq('rectangle_code', icesSquare)
  .gte('caught_at', thirtyDaysAgo.toISOString());

// Aggregate by species
const regionalPopularity = new Map<string, { species: SpeciesData; count: number }>();
regionalCatches?.forEach(catch_ => {
  const existing = regionalPopularity.get(catch_.species_id);
  if (existing) {
    existing.count++;
  } else {
    regionalPopularity.set(catch_.species_id, {
      species: {
        id: catch_.species_id,
        commonName: catch_.species_common_name,
        scientificName: catch_.scientific_name,
      },
      count: 1,
    });
  }
});

// Build suggestion categories
suggestions.youveCaught = userCatches
  ?.filter(catch_ => !favouriteIds.has(catch_.species_id))
  .map(catch_ => ({
    species: { id: catch_.species_id, commonName: catch_.species_common_name, ... },
    category: 'youve-caught',
    reason: 'You have successfully caught this species before',
    userHasCaught: true,
    userCatchCount: userCatches.filter(c => c.species_id === catch_.species_id).length,
  }))
  .slice(0, 10) || [];

suggestions.localFavorites = Array.from(regionalPopularity.values())
  .filter(item => !favouriteIds.has(item.species.id))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .map(item => ({
    species: item.species,
    category: 'local-favorites',
    reason: `Popular in your area (${item.count} recent catches)`,
    userHasCaught: userSpeciesIds.has(item.species.id),
    regionalPopularity: item.count,
  }));

suggestions.allRegional = Array.from(regionalPopularity.values())
  .filter(item => !favouriteIds.has(item.species.id))
  .sort((a, b) => b.count - a.count)
  .map(item => ({
    species: item.species,
    category: 'all-regional',
    reason: `Found in ${icesSquare}`,
    userHasCaught: userSpeciesIds.has(item.species.id),
    regionalPopularity: item.count,
  }));
```

**Response Format:**
```json
{
  "success": true,
  "userId": "uuid",
  "icesSquare": "31F2",
  "suggestions": {
    "youveCaught": [...],
    "hotRightNow": [],
    "localFavorites": [...],
    "seasonalPeak": [],
    "allRegional": [...]
  },
  "notes": [
    "hotRightNow requires live conditions scoring engine",
    "seasonalPeak requires species seasonal preference data"
  ]
}
```

---

## 3. 🎣 Regional Species Discovery

### Location
- **API**: `/pages/api/findr/regional.ts`
- **Purpose**: Public species discovery for ICES rectangles
- **Live in Production**: ✅ Yes

### How It Works

**Endpoint:**
```
GET /api/findr/regional?rectangleCode=31F2&limit=20
```

**Data Source:**
- Table: `species_frequency`
- Joins: `species` table for full details

**Query:**
```typescript
const { data: frequencyData } = await supabase
  .from('species_frequency')
  .select(`
    species_id,
    frequency_score,
    species:species_id (
      id,
      species_code,
      scientific_name,
      name_en,
      eating_quality,
      conservation_status,
      typical_gear
    )
  `)
  .eq('rectangle_code', rectangleCode.toUpperCase())
  .order('frequency_score', { ascending: false })
  .limit(limit);
```

**Processing:**
- No authentication required (public endpoint)
- Returns species sorted by frequency_score DESC
- Includes species details for display

**Use Case:**
- Help anglers discover what species are common in their area
- Used for "explore species" features
- No personalization - purely regional data

---

## 4. 🎯 Smart Bait Recommendations (Utility)

### Location
- **Utility**: `/utils/aiRecommendations.ts`
- **Function**: `getSmartBaitRecommendation()`
- **Status**: ✅ Active (used in prediction processing)

### How It Works

**Algorithm:**
```typescript
export function getSmartBaitRecommendation(
  speciesId: string,
  userProfile: UserProfile,
  fallbackBait = 'Live bait'
): BaitRecommendation {
  const speciesHistory = userProfile.catchesBySpecies.get(speciesId);
  
  // No history? Use expert fallback
  if (!speciesHistory || speciesHistory.successfulBaits.size === 0) {
    return {
      bait: fallbackBait,
      reason: 'Recommended by experts',
    };
  }
  
  // Sort baits by success count
  const sortedBaits = Array.from(speciesHistory.successfulBaits.entries())
    .sort((a, b) => b[1] - a[1]);
  
  if (sortedBaits.length === 0) {
    return { bait: fallbackBait, reason: 'Recommended by experts' };
  }
  
  const [bestBait, successCount] = sortedBaits[0];
  const successRate = successCount / speciesHistory.totalCatches;
  
  // Generate personalized reason based on success rate
  if (successRate >= 0.7) {
    return {
      bait: bestBait,
      reason: `Your most successful bait (${successCount}/${speciesHistory.totalCatches} catches)`,
    };
  } else if (successCount > 1) {
    return {
      bait: bestBait,
      reason: `Worked ${successCount} times for you`,
    };
  } else {
    return {
      bait: bestBait,
      reason: 'Worth trying based on your history',
    };
  }
}
```

**Used For:**
- Personalizing fishing predictions with user's historical success
- Building user profiles from catch log data
- Providing actionable advice in prediction cards

---

## 5. 🌨️ Weather-Based Activity Recommendations (Utility)

### Location
- **Utility**: `/utils/snowRecommendations.ts`
- **Functions**: `getSnowActivityRecommendation()`, `filterActivitiesBySnow()`
- **Status**: ✅ Active

### How It Works

**Checks 45+ activities against snow conditions:**
```typescript
const ACTIVITIES_IMPACTED_BY_SNOW = new Set([
  'football_soccer',
  'golf',
  'tennis',
  'hiking',
  'road_cycling',
  'mountain_biking',
  // ... 45 activities
]);

export function getSnowActivityRecommendation(
  activityKey: string,
  snowDepthCm: number,
  snowfallRateMmH = 0
): SnowRecommendation {
  // Returns: { level: 'safe' | 'caution' | 'unsafe' | ..., reason: string }
}

export function filterActivitiesBySnow(
  activityKeys: string[],
  snowDepthCm: number,
  acceptableLevels = ['safe', 'beneficial', 'optimal', 'excellent', 'irrelevant']
): string[] {
  // Filter activities by snow safety levels
}
```

**Use Case:**
- Filter user's interests based on current snow conditions
- Show warnings for unsafe activities in snowy weather
- Recommend snow-beneficial activities (skiing, snowboarding)

---

## Summary Table

| System | Location | Status | Processing Type | Data Source |
|--------|----------|--------|-----------------|-------------|
| **Activity Recommendations** | `interests.tsx` | ✅ Live | Client-side, real-time | Curated neighbor map |
| **Species Suggestions** | `api/findr/species/suggestions.ts` | ✅ Live | Server API | User catches + regional data |
| **Regional Species** | `api/findr/regional.ts` | ✅ Live | Server API | `species_frequency` table |
| **Bait Recommendations** | `utils/aiRecommendations.ts` | ✅ Live | Utility function | User catch history |
| **Snow Activity Filter** | `utils/snowRecommendations.ts` | ✅ Live | Utility function | Weather conditions |

---

## Key Insights

### Activity Recommendations (Most Sophisticated)
- **Pure client-side**: No API calls, instant processing
- **141 activities** with hand-curated relationships
- **Smart fallbacks**: Never shows empty state
- **Dismissal resurrection**: Brings back old suggestions over time
- **Dual-mode display**: Changes messaging based on data source

### Species Suggestions (Most Data-Driven)
- **4 categories**: Personal, live, regional, seasonal
- **Personalized**: Uses user's catch history and favorites
- **Location-aware**: Filters by ICES rectangle
- **TODO items**: Hot right now + seasonal peak need more data

### Regional Species (Simplest)
- **Public endpoint**: No auth required
- **Single data source**: Frequency scores from database
- **Fast lookup**: Direct query with join

### Utility Recommendations
- **Context-specific**: Bait and weather recommendations
- **User profile-based**: Learns from historical success
- **Safety-focused**: Snow filter prevents unsafe activity suggestions

---

## Next Actions / Improvements

1. **Species Suggestions**: Implement "Hot Right Now" category using live conditions from predictions API
2. **Species Suggestions**: Add "Seasonal Peak" category using species_bio_bands or seasonal preference data
3. **Activity Recommendations**: Consider adding weather-awareness (integrate snow filter)
4. **Cross-System**: Connect activity recommendations to weather forecasts (show warnings)
5. **Analytics**: Track recommendation acceptance rates to improve algorithms
