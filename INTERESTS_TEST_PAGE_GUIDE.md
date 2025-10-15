# Interests Test Page - User Testing Guide

**URL:** `/interests-test`

**Created:** 15 October 2025

**Status:** Ready for user testing

---

## What's New

This is a redesigned interests page that combines the best elements of `/onboarding` and `/interests` with a smart recommendation system.

### Key Features

1. **Sticky Selected Activities Bar** (at top)
   - Always visible as you scroll
   - Shows icons for each activity
   - Click × to remove
   - "Clear all" button
   - Expands to show all selections

2. **Smart Recommendations** (gradient card with ✨)
   - Suggests activities based on what you've already selected
   - Uses curated neighbor relationships (e.g., tennis → padel, squash)
   - Click + to add suggestion
   - Click × to dismiss (won't show again)
   - Automatically updates as you add/remove activities

3. **Collapsible Category Accordion**
   - Categories show selected count badges
   - Click to expand/collapse each category
   - Subcategories within each main category
   - Activity buttons show icons and checkmarks
   - Visual highlight for categories with selections

4. **Persistent State**
   - All changes save to UserPreferences context
   - Dismissed recommendations persist in localStorage
   - Works exactly like the regular interests page for data

---

## How to Test

### Access the Page

1. **Direct URL:** Navigate to `http://localhost:3000/interests-test` (or your dev URL)
2. **From regular interests page:** Click "View Test Version" button (if added)

### Test Scenarios

#### Scenario 1: New User Experience

1. Start with 0 activities selected
2. Notice the prompt: "Select activities below to personalize your experience"
3. Expand a category (e.g., "Active Sports")
4. Select 2-3 activities (e.g., Tennis, Golf, Beach)
5. Watch recommendations appear automatically
6. Notice recommendations are relevant (e.g., Padel, Pickleball for Tennis)

**Expected:**
- ✅ Recommendations appear within 1 second
- ✅ Suggested activities make sense
- ✅ Selected bar updates immediately

#### Scenario 2: Using Recommendations

1. Have 3-5 activities selected
2. Look at "You might also like" section
3. Click + on a suggestion (e.g., "+ Padel")
4. Notice it's added to selected bar immediately
5. Notice recommendations refresh with new suggestions
6. Try dismissing a suggestion with ×
7. Refresh the page
8. Verify dismissed suggestion doesn't reappear

**Expected:**
- ✅ Adding from recommendations is instant
- ✅ Recommendations update intelligently
- ✅ Dismissal persists across page refreshes
- ✅ Can't add same activity twice

#### Scenario 3: Recommendation Chain Discovery

1. Start with "Painting" selected
2. Notice recommendations: "Outdoor Painting", "Crafts", "Photography"
3. Add "Outdoor Painting"
4. Notice NEW recommendations: "Outdoor Meditation", "Outdoor Yoga"
5. Add "Outdoor Meditation"
6. Notice mindfulness-related suggestions appear
7. Explore "Fitness & Wellness → Mindfulness" category
8. Notice overlap between recommendations and category

**Expected:**
- ✅ Recommendations lead to discovering new activity clusters
- ✅ Each addition reveals new related activities
- ✅ User naturally discovers categories they wouldn't have browsed

#### Scenario 4: Category Browsing

1. Expand "Active Sports" category
2. Notice subcategories: "Team Sports", "Individual Sports", etc.
3. Select several activities from different subcategories
4. Collapse and expand another category
5. Notice selected count on category header
6. Notice visual highlight on categories with selections

**Expected:**
- ✅ Categories expand/collapse smoothly
- ✅ Selected counts are accurate
- ✅ Visual feedback for categories with selections
- ✅ Can expand multiple categories at once

#### Scenario 5: Selected Bar Functionality

1. Select 10+ activities
2. Notice selected bar shows first 6, then "+4 more"
3. Click "+4 more" to expand
4. Click "Show less" to collapse
5. Remove an activity from the selected bar
6. Notice recommendation updates immediately
7. Try "Clear all" button

**Expected:**
- ✅ Compact view when many activities selected
- ✅ Expand/collapse works smoothly
- ✅ Removal from bar works instantly
- ✅ Clear all requires no confirmation (but maybe should?)

#### Scenario 6: Mobile Testing

1. Test on mobile viewport (or browser dev tools)
2. Notice sticky bar stays at top
3. Try expanding categories on mobile
4. Notice recommendations grid adapts to 1 column
5. Test selected bar on mobile (should still be usable)

**Expected:**
- ✅ Responsive design works on all screen sizes
- ✅ Touch targets are large enough (44x44px minimum)
- ✅ No horizontal scrolling
- ✅ Text remains readable

#### Scenario 7: Save & Navigation

1. Make several changes to activities
2. Click "Save Changes" button
3. Notice success toast appears
4. Wait for redirect to homepage
5. Navigate back to `/interests-test`
6. Verify selections persisted
7. Try "View Old Version" button
8. Compare experience between old and new

**Expected:**
- ✅ Save button works
- ✅ Toast notification shows
- ✅ Redirects to home after save
- ✅ Changes persist across navigation
- ✅ Can switch between old and new versions

---

## Things to Watch For

### Potential Issues

1. **Recommendations not appearing**
   - Check browser console for errors
   - Verify `rankRecommendations` function is imported correctly
   - Check if you have any activities selected (needs at least 1)

2. **Dismissed recommendations reappearing**
   - Check localStorage (`godaisy.reco.dismissed`)
   - Verify dismissal function is saving correctly
   - Clear localStorage and try again

3. **Selected bar not updating**
   - Check UserPreferences context is working
   - Verify `setPreferences` is being called
   - Check React DevTools for state updates

4. **Categories not expanding**
   - Check for JavaScript errors
   - Verify category key matching
   - Check expanded state is updating

5. **Icons missing**
   - Some activities may not have icons defined
   - Should fall back to 📌 emoji
   - Can add missing icons to `activityIcon` map

### Performance Checks

- Page load time (should be < 2 seconds)
- Recommendation generation (should be instant)
- Category expand/collapse (should be smooth)
- Selected bar updates (should be immediate)

### Accessibility Checks

- Keyboard navigation (Tab, Enter, Space)
- Screen reader compatibility
- Focus indicators visible
- Color contrast (WCAG AA minimum)
- Touch target sizes (44x44px minimum)

---

## Comparison with Old /interests Page

| Feature | Old /interests | New /interests-test |
|---------|---------------|---------------------|
| **Navigation** | 3-level drill-down | Accordion (1 page) |
| **Selected Activities** | Bottom of page only | Sticky bar at top |
| **Recommendations** | None | Smart, dismissible suggestions |
| **Visual Design** | Plain buttons | Icons, checkmarks, gradient cards |
| **Category Context** | Lost during navigation | Always visible (collapsed/expanded) |
| **Selected Count** | At bottom | Per-category + global |
| **Icons** | None | Activity icons throughout |
| **Discoverability** | Requires browsing | Recommendations guide exploration |
| **Mobile UX** | Good | Excellent (sticky, responsive) |
| **Speed** | Fast (but 3 levels) | Fastest (1 page, accordion) |

---

## Feedback Collection

When testing with users, ask:

### Quantitative
- How long did it take to customize your interests?
- How many recommendations did you add?
- How many recommendations did you dismiss?
- How many activities did you select in total?

### Qualitative
- Did the recommendations make sense to you?
- Did you discover activities you wouldn't have thought to search for?
- Was the sticky selected bar helpful?
- Did you use the category accordion or recommendations more?
- What would you change about this experience?
- Compared to the old version, which do you prefer? Why?

### Net Promoter Score
- On a scale of 0-10, how likely are you to recommend this interface to a friend?

---

## Next Steps

### If Testing Goes Well:
1. Gather feedback from 5-10 users
2. Analyze metrics (time spent, activities added, recommendation CTR)
3. Make minor tweaks based on feedback
4. Deploy to production (replace `/interests`)
5. Monitor analytics for first week
6. Iterate based on real usage data

### If Testing Reveals Issues:
1. Document specific problems
2. Prioritize fixes (critical vs nice-to-have)
3. Make updates to test page
4. Re-test with same users
5. Repeat until feedback is positive

### Future Enhancements (if test page succeeds):
- Recommendation explanations ("Because you like Tennis")
- Activity search/filter box
- "Popular this week" badge on trending activities
- Social proof ("90% of users who like X also enjoy Y")
- Drag-and-drop reordering of selected activities
- Undo/redo for accidental removals
- Keyboard shortcuts for power users

---

## Technical Notes

### Files Created/Modified:
- `pages/interests-test.tsx` - New test page (650 lines)
- `INTERESTS_TEST_PAGE_GUIDE.md` - This guide

### Dependencies Used:
- `app/settings/recommendations.tsx` - Recommendation engine (unchanged)
- `data/activityTypes.ts` - Activity catalog (unchanged)
- `context/UserPreferencesContext.tsx` - User state (unchanged)
- `utils/useHasMounted.ts` - Hydration helper (unchanged)

### localStorage Keys:
- `godaisy.reco.dismissed` - Dismissed recommendations

### State Management:
- Uses existing UserPreferences context
- No new global state required
- Recommendations computed in useMemo
- Dismissal persists to localStorage

### Accessibility:
- All interactive elements keyboard accessible
- ARIA labels on dismiss buttons
- Semantic HTML (button, div with role, etc.)
- Focus management (TODO: improve for modal)

---

## Support

If you encounter issues during testing:
1. Check browser console for errors
2. Review this guide's "Potential Issues" section
3. Check React DevTools for state/props
4. Clear localStorage and try fresh
5. Try different browser/device

For questions or bugs, document:
- What you were trying to do
- What happened instead
- Browser and device
- Screenshot if relevant
- Console errors if any
