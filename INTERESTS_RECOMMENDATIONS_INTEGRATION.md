# Activity Recommendations Integration for /interests Page

**Date:** 15 October 2025
**Discovery:** The `app/settings/` directory contains a sophisticated activity recommendation system that we should integrate into the improved `/interests` page.

---

## Executive Summary

The settings page (`app/settings/settings-form.tsx`) already implements an **excellent activity recommendation system** that uses a curated neighbor map to suggest activities based on what users have selected. This is exactly what we need for the `/interests` page!

**Key Features to Adopt:**
1. ✅ **Smart neighbor-based recommendations** - Activities are suggested based on similarity/co-occurrence
2. ✅ **Dismissible suggestions** - Users can hide suggestions they're not interested in
3. ✅ **Visual distinction** - Recommended activities use accent color and "+" icon
4. ✅ **Automatic filtering** - Already-selected and dismissed activities are excluded
5. ✅ **Persistent dismissal** - Uses localStorage to remember dismissed suggestions

---

## Current Implementation Analysis

### Recommendations Engine (`app/settings/recommendations.tsx`)

**How It Works:**
```typescript
// 1. Curated neighbor map (141 activities with hand-picked relationships)
export const activityRecommendations: ActivityRecommendationsMap = {
  tennis: ['tennis_indoor', 'padel', 'squash'],
  hiking: ['trail_running', 'birdwatching', 'foraging'],
  surfing: ['kitesurfing', 'windsurfing', 'stand_up_paddleboarding'],
  // ... 138 more activities
};

// 2. Ranking function
function rankRecommendations(
  selected: ActivityId[],
  opts?: {
    limit?: number;           // How many to return (default: 8)
    exclude?: ActivityId[];   // Additional activities to exclude
    labelMap?: LabelMap;      // For display names
    allowedIds?: Set<string>; // Filter by allowed catalog
  }
): ActivityId[]

// 3. Scoring algorithm
// - For each selected activity, increment score for each neighbor
// - Sort by score (desc), then alphabetically
// - Return top N
```

**Example:**
```typescript
// User has selected: ['tennis', 'hiking']
const suggestions = rankRecommendations(['tennis', 'hiking'], { limit: 3 });
// Returns: ['trail_running', 'birdwatching', 'tennis_indoor']
// Because:
//   - trail_running: 1 point (from hiking)
//   - birdwatching: 1 point (from hiking)
//   - tennis_indoor: 1 point (from tennis)
//   - All tied at 1, sorted alphabetically
```

**Strengths:**
- ✅ **Curated by humans** - Not algorithmic, so recommendations make intuitive sense
- ✅ **Context-aware** - Indoor/outdoor variants linked (tennis ↔ tennis_indoor)
- ✅ **Activity clusters** - Related activities grouped logically (water sports, team sports)
- ✅ **Pure functions** - No side effects, easy to test
- ✅ **Flexible** - Can limit, exclude, filter by catalog

**Coverage:**
- 141 activities in the map
- Each activity has 2-3 neighbors
- Covers all major activity types (sports, creative, indoor, outdoor, etc.)

### Settings Form Implementation (`app/settings/settings-form.tsx`)

**UI Pattern (Lines 811-840):**
```tsx
{/* Recommended based on your interests */}
{suggestions.length > 0 && (
  <div className="mt-1">
    <div className="text-sm opacity-70 mb-2">You might also like</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {suggestions.map((id) => (
        <div key={id} className="flex items-center gap-2">
          {/* Add button with accent styling */}
          <button
            type="button"
            onClick={() => addActivity(id)}
            className="btn btn-outline justify-start h-10 normal-case rounded-xl
                       flex items-center gap-2 border-accent text-accent
                       hover:bg-accent/10"
            title="Add to your interests"
          >
            <span className="text-accent">+</span>
            <span className="truncate">{idToLabel(id)}</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            aria-label="Dismiss suggestion"
            className="btn btn-ghost btn-xs"
            onClick={() => dismissSuggestion(id)}
            title="Not interested"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

**Dismissal Logic (Lines 195-206, 599-604):**
```typescript
const RECO_DISMISSED_LS = 'godaisy.reco.dismissed';

function dismissSuggestion(id: string) {
  setDismissedRecos(prev => {
    const next = new Set(prev);
    next.add(id);
    persistDismissed(next); // Save to localStorage
    return next;
  });
}

function addActivity(id: string) {
  // ... add activity logic ...

  // Mark as consumed so it doesn't reappear
  setDismissedRecos(prev => {
    if (prev.has(id)) return prev;
    const nextSet = new Set(prev);
    nextSet.add(id);
    persistDismissed(nextSet);
    return nextSet;
  });
}
```

**Suggestion Generation (Lines 229-235):**
```typescript
const suggestions = useMemo(() => {
  // Request extra to account for dismissed ones
  const pool = rankRecommendations(activities, {
    limit: 3 + Math.max(3, dismissedRecos.size)
  });

  const selectedSet = new Set(activities);
  const filtered = pool
    .filter(id => !selectedSet.has(id) && !dismissedRecos.has(id));

  return filtered.slice(0, 3); // Show top 3
}, [activities, dismissedRecos]);
```

---

## Recommended Integration into /interests Page

### 1. Add Recommendations Section

Insert recommendations below the selected activities bar and above the category accordion:

```tsx
// pages/interests.tsx (ENHANCED)

import { rankRecommendations, idToLabel } from '../app/settings/recommendations';

const Interests: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const interests = preferences.interests || [];

  // Dismissal state
  const [dismissedRecos, setDismissedRecos] = useState<Set<string>>(new Set());

  // Load dismissed from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('godaisy.reco.dismissed');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setDismissedRecos(new Set(arr.filter(x => typeof x === 'string')));
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Generate suggestions
  const suggestions = useMemo(() => {
    const pool = rankRecommendations(interests, {
      limit: 6 + Math.max(3, dismissedRecos.size),
      labelMap: ACTIVITY_NAME_MAP,
    });
    const selectedSet = new Set(interests);
    const filtered = pool.filter(
      id => !selectedSet.has(id) && !dismissedRecos.has(id)
    );
    return filtered.slice(0, 6); // Show 6 on interests page
  }, [interests, dismissedRecos]);

  const dismissSuggestion = (id: string) => {
    setDismissedRecos(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('godaisy.reco.dismissed',
          JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const addActivity = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: [...prev.interests, id],
    }));
    // Also dismiss so it doesn't show again
    dismissSuggestion(id);
  };

  return (
    <div className="min-h-screen bg-base-100">
      <AppHeader {...headerProps} />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Sticky Selected Bar */}
        <div className="sticky top-16 z-10 bg-base-100/95 backdrop-blur pb-3">
          <SelectedActivitiesBar
            activities={interests.map(id => ({
              id,
              name: getActivityName(id),
              icon: activityIcon[id] || '📌',
            }))}
            onRemove={toggleInterest}
            onClear={() => setPreferences(prev => ({ ...prev, interests: [] }))}
          />
        </div>

        {/* NEW: Recommendations Section */}
        {suggestions.length > 0 && (
          <RecommendationsSection
            suggestions={suggestions}
            onAdd={addActivity}
            onDismiss={dismissSuggestion}
          />
        )}

        {/* Category Accordion */}
        <div className="space-y-3 mt-4">
          {/* ... existing category cards ... */}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handleSave} className="btn btn-primary btn-lg">
            ✅ Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 2. Create Recommendations Component

```tsx
// components/interests/RecommendationsSection.tsx

interface RecommendationsSectionProps {
  suggestions: string[];
  onAdd: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function RecommendationsSection({
  suggestions,
  onAdd,
  onDismiss,
}: RecommendationsSectionProps) {
  return (
    <div className="card bg-gradient-to-br from-accent/5 to-accent/10
                    border border-accent/20 mt-4">
      <div className="card-body py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-semibold text-lg">You might also like</h3>
            <p className="text-sm opacity-70">
              Based on your interests, we think you'd enjoy these activities
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {suggestions.map((id) => (
            <div key={id} className="flex items-center gap-2">
              {/* Add button */}
              <button
                type="button"
                onClick={() => onAdd(id)}
                className="btn btn-outline justify-start h-10 normal-case
                           rounded-xl flex items-center gap-2
                           border-accent text-accent hover:bg-accent/10
                           flex-1"
                title="Add to your interests"
              >
                <span className="text-accent font-bold">+</span>
                <span className="truncate">{getActivityName(id)}</span>
              </button>

              {/* Dismiss button */}
              <button
                type="button"
                aria-label="Dismiss suggestion"
                className="btn btn-ghost btn-xs"
                onClick={() => onDismiss(id)}
                title="Not interested"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="text-xs opacity-60 mt-2">
          💡 Tip: Dismiss suggestions you're not interested in - we won't show them again
        </div>
      </div>
    </div>
  );
}
```

### 3. Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  AppHeader                                                   │
├─────────────────────────────────────────────────────────────┤
│  [Breadcrumb: Interests]                                     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📌 Your Selected Activities (12)              [Clear]│  │
│  │ [Tennis ×] [Golf ×] [Beach ×] ... [+9 more]         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✨ You might also like                     [Gradient] │  │
│  │ "Based on your interests..."                          │  │
│  │                                                        │  │
│  │ [+ Padel     ×]  [+ Squash      ×]  [+ Badminton  ×] │  │
│  │ [+ Pickleball×]  [+ Table Tennis×]  [+ Archery    ×] │  │
│  │                                                        │  │
│  │ 💡 Tip: Dismiss suggestions...                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🏃 Active Sports (5 selected)                  [▼]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 💪 Fitness & Wellness (2 selected)             [▼]   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Enhanced User Scenarios

### Scenario 1: New User with Pre-set Activities

**User:** Sarah, just signed up, has 8 default activities pre-selected

**Experience:**
1. Lands on `/interests` page
2. Sees welcome banner: "We've pre-selected 8 popular activities..."
3. **Sees sticky selected bar** at top with her 8 activities
4. **Sees recommendations section** with 6 suggested activities based on defaults
   - Pre-sets included: `hiking`, `beach`, `cinema`
   - Recommendations: `trail_running`, `sea_swimming`, `theatre`, `photography`, `birdwatching`, `outdoor_reading`
5. Sarah clicks **[+ Trail Running]** - it's added to her interests immediately
6. Recommendations refresh, now showing new suggestions based on 9 activities
7. She dismisses **[× Photography]** - won't see it again
8. Scrolls down, explores categories, adds 3 more activities
9. Clicks **Save Changes** - done!

**Outcome:** Sarah customized her profile in ~2 minutes with minimal cognitive load

### Scenario 2: Existing User Discovering New Activities

**User:** Marcus, has 15 activities selected, mainly sports

**Experience:**
1. Opens `/interests` to add new activities
2. Sees his 15 selected activities in sticky bar
3. **Recommendations section shows:**
   - `ice_skating` (he has `hockey`)
   - `curling` (he has `bowling`)
   - `volleyball_indoor` (he has `beach_volleyball`)
   - `american_football` (he has `football_soccer`)
   - `netball` (he has `basketball_outdoor`)
   - `archery` (he has `golf`)
4. Marcus thinks "Oh cool, I've been meaning to try ice skating!"
5. Clicks **[+ Ice Skating]** - added immediately
6. Recommendations update with new ice-related suggestions
7. Dismisses curling (not interested)
8. Clicks **Save Changes**

**Outcome:** Marcus discovered a new activity he wouldn't have thought to search for

### Scenario 3: User Exploring via Recommendations Chain

**User:** Emma, creative type, has `painting` and `photography`

**Experience:**
1. Initial recommendations based on `painting` + `photography`:
   - `outdoor_painting` ✨ (from painting)
   - `outdoor_reading` (from photography neighbor)
   - `crafts` (from painting)
   - `knitting` (from crafts neighbor)
   - `birdwatching` (from photography)
   - `urban_exploring` (from photography)
2. Emma adds **[+ Outdoor Painting]**
3. Recommendations refresh, now include:
   - `outdoor_meditation` ✨ (from outdoor_painting)
   - `outdoor_yoga` (from outdoor_meditation neighbor)
   - `tai_chi` (from outdoor_meditation neighbor)
4. Emma adds **[+ Outdoor Meditation]**
5. Recommendations update with mindfulness activities:
   - `yoga`
   - `meditation`
   - `pilates`
6. Emma realizes "I love this whole mindfulness vibe!"
7. Expands **💪 Fitness & Wellness → Mindfulness** category
8. Selects several more related activities

**Outcome:** Emma discovered an entire category of activities through the recommendation chain, leading her from creative → outdoor → mindfulness

---

## Implementation Strategy

### Phase 1: Core Integration (2-3 hours)

1. **Copy recommendation engine** ✅
   - Import `recommendations.tsx` into `/pages` or `/lib`
   - No changes needed - it's pure, standalone

2. **Add dismissal state** ✅
   - useState for dismissed recommendations
   - Load from localStorage on mount
   - Persist on dismiss

3. **Generate suggestions** ✅
   - useMemo to calculate recommendations
   - Filter by selected + dismissed
   - Limit to 6 suggestions

4. **Create UI component** ✅
   - New `RecommendationsSection` component
   - Gradient card with accent colors
   - Grid of add/dismiss buttons
   - Helpful tip at bottom

### Phase 2: Visual Polish (1-2 hours)

5. **Add animations** 🔄
   - Fade in when new suggestions appear
   - Smooth removal when added/dismissed
   - Confetti effect when user adds suggestion (optional)

6. **Smart positioning** 🔄
   - Sticky on mobile when scrolled past selected bar
   - Collapsible on small screens
   - Empty state when no suggestions available

7. **Recommendation quality indicators** 🔄
   - Show "Top Pick" badge for highest-scoring suggestion
   - Show neighbor count: "5 people who like tennis also enjoy padel"
   - Add activity icons from onboarding

### Phase 3: Advanced Features (Future)

8. **Recommendation explanations** 🔄
   - Tooltip: "Because you like Tennis"
   - Multiple reasons: "Because you like Tennis and Hiking"
   - Visual connection lines (advanced)

9. **Recommendation diversity** 🔄
   - Ensure suggestions span multiple categories
   - Avoid showing 6 similar activities
   - Boost under-represented categories

10. **Social proof** 🔄
    - "Popular with similar users"
    - "Trending this week"
    - "92% of users who like X also enjoy Y"

---

## A/B Testing Opportunities

### Test 1: Recommendation Placement
- **A:** Above categories (proposed)
- **B:** Below categories (less prominent)
- **Metric:** Click-through rate on suggestions

### Test 2: Number of Suggestions
- **A:** 3 suggestions (conservative)
- **B:** 6 suggestions (proposed)
- **C:** 9 suggestions (aggressive)
- **Metric:** Number of activities added from recommendations

### Test 3: Visual Style
- **A:** Gradient card with accent colors (proposed)
- **B:** Plain card matching categories
- **C:** Carousel/horizontal scroll
- **Metric:** Engagement rate + user preference survey

### Test 4: Explanation Copy
- **A:** "You might also like" (proposed)
- **B:** "Try these next"
- **C:** "Popular with people like you"
- **Metric:** Click-through rate + perceived personalization

---

## Maintenance & Growth

### Expanding the Neighbor Map

**Current Coverage:** 141 activities with 2-3 neighbors each

**How to Add New Activities:**
1. Identify activity to add (e.g., `rock_hopping`)
2. Find 2-3 similar/complementary activities:
   - Direct variants: `hiking`, `rock_climbing`
   - Context-similar: `beach` (often done at coast)
3. Add to map:
   ```typescript
   rock_hopping: ['hiking', 'rock_climbing', 'beach'],
   ```
4. Add reverse links (if not already present):
   ```typescript
   hiking: [..., 'rock_hopping'],
   rock_climbing: [..., 'rock_hopping'],
   beach: [..., 'rock_hopping'],
   ```

**Quality Guidelines:**
- Each activity should have 2-3 neighbors (not more, not less)
- Neighbors should be **actionable** (user likely to try next)
- Avoid circular loops (A → B → C → A)
- Include both similar and complementary activities:
  - Similar: `tennis` → `tennis_indoor` (same sport, different context)
  - Complementary: `hiking` → `photography` (often done together)

### Data-Driven Improvements (Future)

Once we have user data:
1. **Co-occurrence analysis** - Find activities frequently selected together
2. **Sequence patterns** - Discover common progression paths (e.g., `running` → `trail_running` → `hiking`)
3. **Geographic patterns** - Different recommendations for coastal vs inland users
4. **Seasonal patterns** - Boost winter sports in winter, water sports in summer
5. **Demographic patterns** - Age/gender-specific recommendations (with user consent)

---

## Code Integration Checklist

- [ ] Copy `app/settings/recommendations.tsx` to `lib/recommendations.ts` (or import directly)
- [ ] Add dismissed state to `/interests` page
- [ ] Create `<RecommendationsSection>` component
- [ ] Add dismissal persistence (localStorage)
- [ ] Import activity name map for display
- [ ] Add to interests page layout (above categories)
- [ ] Style with gradient background and accent colors
- [ ] Add animations (fade in/out)
- [ ] Test with various activity selections
- [ ] Test dismissal persistence across sessions
- [ ] Add empty state when no suggestions
- [ ] Update CLAUDE.md with recommendation system details
- [ ] Deploy to staging for user testing

---

## Success Metrics

**Engagement:**
- % of users who click at least 1 recommendation
- Average recommendations added per session
- Time spent on interests page (should decrease with recommendations)

**Discovery:**
- % of activities added via recommendations vs manual search
- Diversity of activities selected (categories spanned)
- Recommendation click-through rate by position (1st vs 6th)

**Quality:**
- Dismissal rate (lower is better - suggests good recommendations)
- Re-engagement rate (users returning to add more activities)
- Correlation between recommended activities and subsequent app usage

**Target KPIs:**
- 40%+ of users click at least 1 recommendation
- 2+ recommendations added per session (on average)
- <15% dismissal rate (85%+ acceptance)
- 10%+ increase in average activities selected per user

---

## Conclusion

The existing recommendation system in `app/settings/` is **production-ready** and can be integrated into `/interests` with minimal changes. The curated neighbor map is high-quality, the dismissal logic is solid, and the UI pattern is proven.

**Recommended Next Steps:**
1. **Phase 1 implementation** (2-3 hours) - Get recommendations showing on `/interests`
2. **User testing** (1 week) - Deploy to 10% of users, gather feedback
3. **Iterate** - Refine based on metrics and qualitative feedback
4. **Full rollout** - Ship to all users once validated

This will significantly improve the new user onboarding experience and help existing users discover activities they never knew they'd enjoy. The combination of:
- Pre-set defaults (reduce activation energy)
- Recommendations (discovery without search)
- Category accordion (browsing and exploration)
- Search (power users)

...creates a comprehensive, user-friendly activity selection experience that works for everyone.
