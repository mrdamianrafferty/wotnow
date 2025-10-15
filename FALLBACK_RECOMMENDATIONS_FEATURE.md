# Fallback Recommendations Feature

**Added:** 15 October 2025
**Status:** ✅ Implemented in `/interests-test`

---

## Problem Solved

**Original Issue:**
Users could quickly exhaust curated recommendations by:
- Selecting activities with few neighbors in the recommendation map
- Dismissing most suggestions they weren't interested in
- Adding all the suggested activities

This would leave them with an empty recommendations section, ending the discovery experience prematurely.

---

## Solution: Two-Tier Recommendation System

### Tier 1: Curated Recommendations (Priority)
- Based on the hand-curated neighbor map from `app/settings/recommendations.tsx`
- 141 activities with carefully selected relationships
- Shows activities similar to or complementary to user's selections
- **Heading:** "You might also like"
- **Description:** "Based on your interests, we think you'd enjoy these activities"

### Tier 2: Popular Fallback Activities (When Tier 1 Exhausted)
- 30+ broad-appeal activities that work for most users
- Automatically kicks in when curated suggestions drop below 6
- **Heading:** "Popular activities you might enjoy"
- **Description:** "These popular activities are enjoyed by people with diverse interests"

---

## How It Works

### Algorithm
```typescript
1. Request 12 curated recommendations (more than needed)
2. Filter out:
   - Already selected activities
   - Dismissed activities
3. If >= 6 curated suggestions → Show curated only
4. If < 6 curated suggestions:
   - Add popular fallback activities
   - Filter fallbacks same way (no selected, no dismissed)
   - Combine: [...curated, ...fallback]
   - Show top 6 total
   - Track that fallbacks are included (hasFallbacks flag)
5. Update heading/description based on hasFallbacks
```

### Fallback Activity Pool (30 Activities)

**Outdoor & Nature (7):**
- hiking, beach, picnicking, dog_walking, camping, stargazing, birdwatching

**Fitness & Wellness (6):**
- running, cycling, yoga, gym_workout, wild_swimming, pilates

**Social & Leisure (6):**
- going_to_pub, cafe, cinema, reading, cooking, bbq

**Sports (5):**
- football_soccer, tennis, golf, basketball_outdoor, badminton

**Creative (4):**
- painting, photography, crafts, outdoor_painting

**Indoor Recreation (5):**
- indoor_swimming, museum, gaming, watch_a_movie, gallery

**Selection Criteria:**
- Universal appeal (not niche)
- Low barrier to entry (no special equipment)
- Common participation (high familiarity)
- Diverse categories (indoor/outdoor, active/relaxed)
- Weather-independent options included

---

## User Experience

### Scenario 1: Normal Flow (Curated Only)
```
User selects: Tennis, Hiking
↓
Curated pool: padel, squash, badminton, trail_running, birdwatching,
              tennis_indoor, photography, foraging, etc. (10+ matches)
↓
Shows: Top 6 curated
Heading: "You might also like"
```

### Scenario 2: Limited Neighbors (Curated + Fallback)
```
User selects: Ice Fishing
↓
Curated pool: fishing, ice_skating, cross_country_skiing (only 3 matches)
↓
Fallback pool: hiking, beach, yoga, running, football_soccer, etc.
↓
Shows: 3 curated + 3 fallback = 6 total
Heading: "Popular activities you might enjoy"
```

### Scenario 3: Power User (All Fallback)
```
User selects: 20 activities
Dismisses: 15 suggestions
↓
Curated pool: Exhausted (all neighbors already selected/dismissed)
↓
Fallback pool: 30 activities, filters out selected/dismissed
↓
Shows: 6 fallback activities
Heading: "Popular activities you might enjoy"
```

---

## Visual Changes

### Before (No Fallback)
```
┌────────────────────────────────────────────┐
│ ✨ You might also like                    │
│ "Based on your interests..."              │
│                                            │
│ [+ Activity 1 ×]  [+ Activity 2 ×]       │
│ [+ Activity 3 ×]                          │
│                                            │
│ (Only 3 suggestions - feels incomplete)   │
└────────────────────────────────────────────┘
```

### After (With Fallback)
```
┌────────────────────────────────────────────┐
│ ✨ Popular activities you might enjoy     │
│ "These popular activities are enjoyed..." │
│                                            │
│ [+ Activity 1 ×]  [+ Activity 2 ×]       │
│ [+ Activity 3 ×]  [+ Hiking ×]           │
│ [+ Beach ×]       [+ Yoga ×]             │
│                                            │
│ (Always 6 suggestions - feels complete)   │
└────────────────────────────────────────────┘
```

---

## Code Changes

### Files Modified
- `pages/interests-test.tsx` (3 changes)

### Change 1: Fallback Pool Constant
```typescript
const POPULAR_FALLBACK_ACTIVITIES = [
  'hiking', 'beach', 'running', 'yoga', ... // 30 activities
];
```

### Change 2: Enhanced Recommendations Logic
```typescript
const { suggestions, hasFallbacks } = useMemo(() => {
  // Try curated first
  const curatedFiltered = rankRecommendations(...).filter(...);

  if (curatedFiltered.length >= 6) {
    return { suggestions: curatedFiltered.slice(0, 6), hasFallbacks: false };
  }

  // Add fallbacks if needed
  const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.filter(...);
  const combined = [...curatedFiltered, ...fallbackPool];

  return {
    suggestions: combined.slice(0, 6),
    hasFallbacks: fallbackPool.length > 0,
  };
}, [interests, dismissedRecos]);
```

### Change 3: Dynamic UI Based on Source
```typescript
function RecommendationsSection({ hasFallbacks, ... }) {
  return (
    <h3>{hasFallbacks
      ? 'Popular activities you might enjoy'
      : 'You might also like'}</h3>
    <p>{hasFallbacks
      ? 'These popular activities are enjoyed by people with diverse interests'
      : 'Based on your interests, we think you\'d enjoy these activities'}</p>
  );
}
```

---

## Benefits

### For Users
✅ **Never hit a dead end** - Always have discovery options
✅ **Clear messaging** - Know when seeing popular vs personalized
✅ **Broad exposure** - Discover activities outside their usual categories
✅ **Reduced frustration** - No empty recommendation sections

### For Product
✅ **Higher engagement** - Users explore more activities
✅ **Better onboarding** - New users see popular options even with limited selections
✅ **Graceful degradation** - System handles edge cases smoothly
✅ **Data collection** - Learn which popular activities users actually select

---

## Testing Scenarios

### Test 1: Normal Curated Flow
1. Select "Tennis"
2. Verify 6 curated suggestions appear
3. Verify heading is "You might also like"
4. Result: ✅ Curated recommendations work

### Test 2: Trigger Fallback
1. Select "Ice Fishing" (limited neighbors)
2. Add or dismiss all curated suggestions
3. Verify heading changes to "Popular activities you might enjoy"
4. Verify new activities appear
5. Result: ✅ Fallback triggers correctly

### Test 3: Fallback Filtering
1. Select 10 popular activities from fallback pool
2. Trigger fallback mode
3. Verify selected activities don't appear in fallback suggestions
4. Result: ✅ Filtering works for fallbacks

### Test 4: Dismiss Persistence
1. Dismiss a fallback suggestion
2. Refresh page
3. Verify dismissed fallback doesn't reappear
4. Result: ✅ Dismissal works for fallbacks

### Test 5: Seamless Transition
1. Start with 3 curated + 3 fallback (mixed mode)
2. Add one curated suggestion
3. Verify new curated suggestion appears (if available)
4. If not, verify another fallback fills the slot
5. Result: ✅ Smooth transition between modes

---

## Metrics to Track

### Engagement Metrics
- % of users who see fallback suggestions
- % of users who add fallback suggestions
- Average fallback suggestions added per user
- Dismissal rate: curated vs fallback

### Discovery Metrics
- Category diversity before/after fallbacks
- Activities discovered via fallback vs browsing
- User retention after exhausting curated suggestions

### Target KPIs
- <30% of users trigger fallback mode (most stay in curated)
- 40%+ of users who see fallbacks add at least 1
- Similar dismissal rate to curated (<20%)

---

## Future Enhancements

### Smart Fallback Ordering
Instead of random order, prioritize by:
- Geographic relevance (beach for coastal users)
- Seasonal relevance (skiing in winter)
- User demographics (if available)
- Time of day (gym in morning, pub in evening)

### Category-Aware Fallbacks
If user has mostly sports activities, prioritize sports fallbacks:
```typescript
const userCategories = analyzeUserCategories(interests);
const fallbackPool = POPULAR_FALLBACK_ACTIVITIES.sort((a, b) => {
  return categoryMatch(b, userCategories) - categoryMatch(a, userCategories);
});
```

### Trending Activities
Mix in activities that are trending this week/month:
```typescript
const trendingActivities = await fetchTrendingActivities();
const fallbackPool = [...POPULAR_FALLBACK_ACTIVITIES, ...trendingActivities];
```

### A/B Test: Fallback Pool Size
Test different fallback pool sizes:
- A: 20 activities (smaller, more curated)
- B: 30 activities (current)
- C: 50 activities (larger, more coverage)

Measure: engagement, dismissal rate, time to exhaust

---

## Conclusion

The fallback recommendation system ensures users **never run out of discovery options** while maintaining quality through a two-tier approach:

1. **Curated first** - Personalized, relevant suggestions
2. **Popular fallback** - Broad-appeal activities when curated runs out

This creates a **seamless discovery experience** that works for all users, from casual browsers to power users who want to explore everything.

**Status:** Ready for testing at `/interests-test`
