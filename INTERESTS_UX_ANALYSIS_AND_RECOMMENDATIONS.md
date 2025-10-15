# Interests Page UX Analysis & Recommendations

**Date:** 15 October 2025
**Goal:** Improve the `/interests` page by incorporating the best UX elements from `/onboarding` to serve both new users (with pre-set activities) and existing users (adding/removing activities easily).

---

## Executive Summary

After analyzing both pages, the key insight is that **onboarding excels at progressive disclosure and visual engagement**, while **interests excels at quick navigation and simple management**. The recommended approach combines:

1. **Visual pill-based selection** (from onboarding) for immediate, tactile feedback
2. **Persistent "Selected Activities" bar** (from onboarding) for context awareness
3. **Simplified navigation** (from interests) to reduce cognitive load
4. **Smart defaults for new users** (from onboarding) with clear personalization prompts

---

## Current State Analysis

### /onboarding (pages/onboarding.tsx)

**Strengths:**
- ✅ **Progressive disclosure**: Clusters → Subcategories → Activities (reduces overwhelm)
- ✅ **Visual pill UI**: Large, colorful buttons with icons and checkmarks
- ✅ **Persistent selection bar**: Always-visible "Selected (N)" bar with quick removal
- ✅ **Smart chunking**: Groups activities into digestible sets (max 3 subcategories at a time)
- ✅ **Contextual guidance**: Clear explanations at each step ("Deselect anything not your vibe")
- ✅ **Progress indicators**: Steps component shows user's journey
- ✅ **Inline location search**: Autocomplete with map picker, recent locations, current location
- ✅ **Pre-selection strategy**: Starts with all clusters selected, user deselects (easier than building from zero)

**Weaknesses:**
- ⚠️ **Too many steps**: 5-7 steps can feel lengthy for returning users
- ⚠️ **Linear flow**: No quick way to jump between categories once started
- ⚠️ **Mobile-heavy design**: Optimized for first-time mobile users, less efficient for desktop power users
- ⚠️ **Location mixing**: Home + marine location in same flow can confuse

**Key UX Patterns:**
```tsx
// 1. ClusterPill - Large, icon-based selection with visual feedback
<ClusterPill icon="🏃" label="Active Sports" selected={true} />

// 2. InterestPill - Smaller activity pills with checkmarks
<InterestPill icon="🎾" label="Tennis" selected={true} />

// 3. SelectedBar - Compact, always-visible selection summary
<SelectedBar items={['tennis', 'golf']} onRemove={...} onClear={...} />

// 4. Progressive screens with contextual help
<CategoryHeader
  title="Activities"
  subtitle="Deselect anything that's not your vibe"
  onSkip={...}
/>
```

---

### /interests (pages/interests.tsx)

**Strengths:**
- ✅ **Simple 3-level navigation**: Main Category → Subcategory → Activities (clear mental model)
- ✅ **Breadcrumb navigation**: Always know where you are
- ✅ **Quick removal**: Selected activities shown at bottom with × buttons
- ✅ **Activity counts**: "12 activities" helps users decide which subcategory to explore
- ✅ **Clear done action**: "I'm Done" button with encouraging toast message
- ✅ **No forced flow**: Users can freely navigate back and forth
- ✅ **Lightweight**: Fast loading, minimal cognitive overhead

**Weaknesses:**
- ⚠️ **No visual hierarchy**: Plain button list feels utilitarian, not engaging
- ⚠️ **Hidden selection state**: Selected activities only visible at bottom (easy to lose context)
- ⚠️ **No icons**: Text-only buttons are less scannable than icon+text
- ⚠️ **No pre-selection for new users**: Starts empty (high activation energy)
- ⚠️ **Activity counts are misleading**: Includes duplicates across categories
- ⚠️ **No indication of selected count in categories**: Can't see "Active Sports (5 selected)"

**Current Flow:**
```
Main Categories (6 options)
  ↓
Subcategories (2-3 per main)
  ↓
Activities (5-30 per sub)
  ↓
Selected shown at bottom → Done
```

---

## User Scenarios & Pain Points

### Scenario 1: Brand New User (Currently uses /onboarding)
**Current Experience:**
- Lands on `/onboarding` via demo or direct link
- Sees all clusters pre-selected → deselects unwanted areas
- Goes through 1-7 activity screens (depending on clusters chosen)
- Sets home location (required)
- Sets marine location (optional, if marine activities chosen)
- Confirms and saves

**Pain Points:**
- 😓 Too many steps (7 for marine users, 5 for non-marine)
- 😓 Can't easily see total selected activities across all screens
- 😓 Marine location feels like an afterthought

### Scenario 2: New User Starting with Pre-set Activities (Target for improved /interests)
**Desired Experience:**
- User signs up → gets common activities pre-set (e.g., hiking, cycling, beach, cinema)
- Visits `/interests` to personalize
- Sees pre-selected activities highlighted
- Can quickly remove unwanted ones and add new ones
- No multi-step wizard, just natural exploration

**Current Gap:**
- 😓 `/interests` doesn't show pre-selected activities prominently
- 😓 No visual indication that "these are your defaults, customize them"
- 😓 Starting from scratch feels like work

### Scenario 3: Existing User Adding New Activities
**Current Experience:**
- Goes to `/interests`
- Navigates: Main → Sub → Activities
- Taps to select new ones
- Selected activities appear at bottom
- Clicks "Done"

**Pain Points:**
- 😓 No indication of how many activities already selected in each category
- 😓 Hard to remember what's already selected without scrolling to bottom
- 😓 No quick way to "explore all water sports" without drilling into multiple subcategories

### Scenario 4: Existing User Removing Activities
**Current Experience:**
- Sees selected activities at bottom
- Clicks × to remove

**This works well! ✅** But could be better with:
- Search/filter for selected activities
- Category grouping in selected list

---

## Recommended Solution: Hybrid Approach

### Core Principles
1. **Single-page design** with progressive disclosure (no wizard steps)
2. **Visual pill-based UI** for immediate feedback
3. **Persistent context** (always show selected count and activities)
4. **Smart defaults for new users** with clear "customize your defaults" messaging
5. **Fast navigation for power users** (expand/collapse categories, keyboard shortcuts)

### Proposed Layout

```
┌─────────────────────────────────────────────────────────────┐
│  AppHeader with Home/Coastal locations                      │
├─────────────────────────────────────────────────────────────┤
│  [Breadcrumb: Interests]                            [Search]│
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📌 Your Selected Activities (12)              [Clear]│  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ... [+3 more]  │  │
│  │ │Tennis│ │ Golf │ │Beach │ │Hiking│              │  │
│  │ │  ×   │ │  ×   │ │  ×   │ │  ×   │              │  │
│  │ └──────┘ └──────┘ └──────┘ └──────┘              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  💡 New user message (if applicable):                        │
│  "We've pre-selected some popular activities. Remove any    │
│   that don't interest you and add your favorites below."    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🏃 Active Sports (5 selected)                     [▼]   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  ┌────────────────────────────────────────────────────┐ ││
│  │  │ 🤾 Team Sports                         [Expand ▼]  │ ││
│  │  ├────────────────────────────────────────────────────┤ ││
│  │  │ ⚽ Football  ✓  │ 🏏 Cricket    │ 🏉 Rugby  ✓     │ ││
│  │  │ 🏀 Basketball  │ 🏐 Volleyball  │ ⚾ Baseball     │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  │  ┌────────────────────────────────────────────────────┐ ││
│  │  │ 🎾 Individual Sports                   [Expand ▼]  │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💪 Fitness & Wellness (2 selected)               [▼]   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [+ Show all categories]                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │        [✅ Save Changes]    [Cancel]                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### 1. **Sticky Selected Activities Bar** (Enhanced from onboarding)
```tsx
<SelectedActivitiesBar
  activities={[
    { id: 'tennis', name: 'Tennis', icon: '🎾', category: 'Active Sports' },
    { id: 'hiking', name: 'Hiking', icon: '🥾', category: 'Outdoor Activities' },
    // ...
  ]}
  onRemove={(id) => toggleActivity(id)}
  onClear={() => clearAllActivities()}
  compact={true}  // Collapses to "12 selected [▼]" when scrolled down
  groupBy="category"  // Optional grouping
/>
```

**Features:**
- Sticky to top when scrolling (always visible)
- Shows first ~6 activities with "+N more" overflow
- Click activity pill to remove (×)
- Click "[▼]" to expand full list in modal/dropdown
- Shows category badges on hover for context
- Quick search within selected activities

#### 2. **Expandable Category Cards** (New hybrid component)
```tsx
<CategoryCard
  category="Active Sports"
  icon="🏃"
  selectedCount={5}
  totalCount={45}
  expanded={false}
  onToggleExpand={() => setExpandedCategory('active_sports')}
>
  <SubcategorySection
    name="Team Sports"
    icon="🤾"
    activities={teamSportsActivities}
    selectedIds={selectedActivityIds}
    onToggle={toggleActivity}
    expandable={true}
  />
  {/* More subcategories */}
</CategoryCard>
```

**Features:**
- Collapsed by default (shows only header with count)
- Click header to expand/collapse
- Selected count always visible: "Active Sports (5 selected)"
- Subcategories can also expand/collapse individually
- Visual indicator (bold, color) for categories with selections

#### 3. **Activity Pill** (From onboarding, enhanced)
```tsx
<ActivityPill
  id="tennis"
  name="Tennis"
  icon="🎾"
  selected={true}
  category="Active Sports"
  subcategory="Individual Sports"
  onClick={() => toggleActivity('tennis')}
  size="md"  // sm, md, lg
  showCheckmark={true}
  showRemoveX={false}  // Use checkmark in main list, × in selected bar
/>
```

**Visual States:**
- **Unselected**: Outline button, gray
- **Selected**: Filled primary color, checkmark, subtle glow
- **Hover**: Scale slightly, show tooltip with category context
- **Focus**: Clear focus ring for keyboard navigation

#### 4. **New User Welcome Banner** (Only shown for users with pre-set activities)
```tsx
<NewUserBanner
  presetCount={8}
  onDismiss={() => dismissBanner()}
>
  <p>
    👋 Welcome! We've pre-selected {presetCount} popular activities to get you started.
    Feel free to remove any that don't interest you and explore more below.
  </p>
  <button className="btn btn-primary btn-sm">Got it!</button>
</NewUserBanner>
```

**Features:**
- Dismissible (saves to localStorage)
- Only shows once for new users
- Friendly, encouraging tone
- Explains the pre-selection strategy

---

## Detailed Feature Comparison

| Feature | Onboarding | Current Interests | Recommended Hybrid |
|---------|------------|-------------------|-------------------|
| **Visual Design** | Large pills with icons | Plain text buttons | Medium pills with icons |
| **Navigation** | Linear wizard (5-7 steps) | 3-level drill-down | Expandable accordion (1 page) |
| **Selection Visibility** | Sticky selected bar | Bottom-only list | Sticky bar + inline indicators |
| **Pre-selection for New Users** | All clusters selected | None (empty start) | Smart defaults with banner |
| **Category Context** | Lost between steps | Always in breadcrumb | Always visible (collapsed/expanded) |
| **Selected Count** | Global counter only | Bottom list count | Per-category + global |
| **Removal UX** | × in sticky bar | × in bottom list | × in bar, checkmark in list |
| **Progressive Disclosure** | Forced (step-by-step) | User-controlled | User-controlled (expand/collapse) |
| **Mobile Optimization** | Excellent | Good | Excellent |
| **Desktop Efficiency** | Poor (too many steps) | Good | Excellent (keyboard, expand all) |
| **Cognitive Load** | Low (1 screen at a time) | Medium (3 levels to track) | Low (clear hierarchy, visible state) |
| **Speed for Power Users** | Slow (must complete flow) | Fast (direct navigation) | Fastest (keyboard, bulk actions) |

---

## Implementation Recommendations

### Phase 1: Core Improvements (Immediate, 4-6 hours)

1. **Add Sticky Selected Bar** ✅ High Impact
   - Reuse `<SelectedBar>` component from onboarding
   - Position: `sticky top-16 z-10` (below AppHeader)
   - Show first 6 activities, "+N more" with expand modal
   - Quick removal with × buttons

2. **Add Icons to Activity Buttons** ✅ High Impact
   - Import `activityIcon` map from onboarding
   - Update button styling to match `<InterestPill>` design
   - Add checkmark (✓) visual when selected

3. **Show Selection Counts in Categories** ✅ Medium Impact
   - Update category buttons to show "(5 selected)" badge
   - Use different color for categories with selections
   - Update subcategory buttons similarly

4. **Add New User Banner** ✅ Medium Impact
   - Detect if user has default activities but no customization yet
   - Show friendly banner explaining pre-selection
   - Dismissible with localStorage persistence

### Phase 2: Navigation Enhancement (4-6 hours)

5. **Replace Navigation with Accordion** 🔄 High Impact
   - Convert 3-level navigation to single-page accordion
   - Main categories default to collapsed
   - Subcategories collapsible within expanded main category
   - URL hash updates for deep linking (e.g., `/interests#active-sports`)

6. **Add "Expand All" / "Collapse All"** 🔄 Medium Impact
   - Power user feature for quick scanning
   - Keyboard shortcut: `Cmd/Ctrl + A` (expand all)
   - Remember expanded state in localStorage

7. **Add Category Filtering** 🔄 Low Impact (Nice-to-Have)
   - Search box at top: "Filter activities..."
   - Live filter across all categories
   - Highlight matching activities
   - Show "No results" if no matches

### Phase 3: Advanced Features (Future, 6-8 hours)

8. **Bulk Actions** 🔄
   - "Select all in this category" checkbox
   - "Clear all in this category" button
   - Keyboard shortcuts for power users

9. **Activity Recommendations** 🔄
   - "People with your interests also chose..." suggestions
   - Based on common activity combinations
   - ML-based if data available

10. **Visual Analytics** 🔄
    - Show distribution chart: Indoor vs Outdoor, Active vs Relaxed
    - Help users balance their activity profile
    - Gamification: "Unlock new activity types"

---

## Specific Code Changes

### 1. Updated Interests Page Structure

```tsx
// pages/interests.tsx (REVISED)

const Interests: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewUserBanner, setShowNewUserBanner] = useState(false);

  const interests = preferences.interests || [];

  // Check if user is new with pre-set activities
  useEffect(() => {
    const hasCustomized = localStorage.getItem('interests_customized');
    const hasPresets = interests.length > 0;
    setShowNewUserBanner(hasPresets && !hasCustomized);
  }, []);

  const dismissBanner = () => {
    localStorage.setItem('interests_customized', 'true');
    setShowNewUserBanner(false);
  };

  // Calculate selected counts per category
  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    mainCategories.forEach(cat => {
      const catActivities = cat.subcategories.flatMap(sub => sub.acts);
      counts[cat.key] = catActivities.filter(id => interests.includes(id)).length;
    });
    return counts;
  }, [interests]);

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
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

        {/* New User Banner */}
        {showNewUserBanner && (
          <NewUserBanner
            presetCount={interests.length}
            onDismiss={dismissBanner}
          />
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search activities..."
            className="input input-bordered w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Accordion */}
        <div className="space-y-3">
          {mainCategories.map(category => {
            const isExpanded = expandedCategories.includes(category.key);
            const selectedCount = selectedCountByCategory[category.key] || 0;
            const hasSelections = selectedCount > 0;

            return (
              <CategoryCard
                key={category.key}
                category={category}
                selectedCount={selectedCount}
                expanded={isExpanded}
                onToggle={() => toggleCategory(category.key)}
                hasSelections={hasSelections}
              >
                {isExpanded && category.subcategories.map(sub => (
                  <SubcategorySection
                    key={sub.key}
                    subcategory={sub}
                    selectedIds={interests}
                    onToggle={toggleInterest}
                    searchQuery={searchQuery}
                  />
                ))}
              </CategoryCard>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handleSave} className="btn btn-primary btn-lg">
            ✅ Save Changes
          </button>
          <button onClick={() => router.push('/')} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 2. New Components to Create

#### `components/interests/SelectedActivitiesBar.tsx`
- Sticky bar at top showing selected activities
- Compact mode when scrolled (collapses to count badge)
- Quick removal with × buttons
- Expand modal to see all selected activities grouped by category

#### `components/interests/CategoryCard.tsx`
- Expandable card for each main category
- Shows icon, name, selected count, total count
- Header is clickable to expand/collapse
- Visual indicator when category has selections (bold, colored badge)

#### `components/interests/SubcategorySection.tsx`
- Nested inside CategoryCard
- Shows subcategory name and activity pills
- Can also be collapsible for categories with many subcategories
- Responds to search filter (hides if no matches)

#### `components/interests/ActivityPill.tsx`
- Visual button with icon, name, and checkmark when selected
- Hover shows category context tooltip
- Size variants (sm, md, lg)
- Keyboard accessible

#### `components/interests/NewUserBanner.tsx`
- Friendly welcome message for users with pre-set activities
- Dismissible
- Explains the customization process
- Links to help/docs if needed

---

## Pre-selection Strategy for New Users

### Default Activity Set (8-12 activities across categories)

**Rationale:** Choose popular, low-barrier activities that appeal to broad audiences. Avoid niche activities that might alienate users.

**Recommended Defaults:**
```typescript
const DEFAULT_ACTIVITIES_FOR_NEW_USERS = [
  // Active Sports (2)
  'football_soccer',      // Universal appeal
  'cycling',              // Broad interest

  // Fitness & Wellness (2)
  'running',              // Common activity
  'yoga',                 // Growing popularity

  // Outdoor Activities (3)
  'hiking',               // Very popular
  'photography',          // Broad appeal
  'beach',                // Relaxing, popular

  // Indoor Recreation (3)
  'cinema',               // Universal
  'reading',              // Common
  'cooking',              // Practical + enjoyable
];
```

**Fallback Strategy:**
1. Try GeoIP location → Customize for region (e.g., coastal areas get 'surfing', cold climates get 'skiing')
2. If GeoIP fails → Use above universal defaults
3. Store in `user_preferences.interests` with `is_default: true` flag
4. Show banner on first `/interests` visit explaining customization

---

## Mobile vs Desktop Considerations

### Mobile (Primary Experience)
- Sticky selected bar collapses to compact badge when scrolling
- Accordion categories expand one at a time (auto-collapse others)
- Activity pills in 2-column grid
- Bottom sheet for "View All Selected" (instead of modal)
- Swipe gestures to remove from selected bar

### Desktop (Power User Enhancements)
- Sticky selected bar always expanded (more horizontal space)
- Multiple categories can be expanded simultaneously
- Activity pills in 3-4 column grid
- Keyboard shortcuts:
  - `Cmd/Ctrl + F`: Focus search
  - `Cmd/Ctrl + A`: Expand all categories
  - `Cmd/Ctrl + S`: Save changes
  - `Space`: Toggle selected activity when focused
- Hover tooltips with additional context

---

## Success Metrics

**For New Users:**
- % who customize at least 1 activity from defaults
- % who add at least 1 new activity
- Time to first customization (target: < 30 seconds)
- Drop-off rate on interests page (target: < 10%)

**For Existing Users:**
- Time to add/remove activity (target: < 15 seconds)
- % using search filter (indicates efficiency)
- % expanding multiple categories (indicates exploration)
- Return visits to interests page (indicates ongoing engagement)

**Overall:**
- Average activities selected per user (target: 8-15)
- Distribution across categories (target: balanced, not siloed)
- Correlation between interest diversity and app retention

---

## Next Steps

1. **Review with stakeholders** - Validate approach and priorities
2. **Design mockups** - Create high-fidelity designs for new components
3. **Implement Phase 1** - Core improvements (sticky bar, icons, counts, banner)
4. **User testing** - Test with 5-10 new users and 5-10 existing users
5. **Iterate based on feedback** - Refine before Phase 2
6. **Implement Phase 2** - Accordion navigation, expand/collapse
7. **Soft launch** - Deploy to subset of users, monitor metrics
8. **Full rollout** - Ship to all users once validated

---

## Appendix: Alternative Approaches Considered

### Option A: Keep Wizard, Improve Visuals
- Maintain step-by-step onboarding flow
- Update `/interests` to use same visual components
- **Rejected:** Still too slow for power users, doesn't solve core navigation issue

### Option B: Merge /onboarding into /interests
- Single page for both new and existing users
- Show wizard for first visit, accordion for subsequent visits
- **Rejected:** Too complex to maintain two UX modes in one page

### Option C: Hybrid with Tabs (Chosen Approach)
- Single page with collapsible categories (accordion)
- Persistent selected activities bar
- Smart defaults for new users with dismissible banner
- **Selected:** Best of both worlds, scalable, fast for all user types
