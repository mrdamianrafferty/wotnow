# Quick Start: Interests Test Page

**Ready to test!** ✅

## Access the Test Page

### Option 1: Direct URL
```
http://localhost:3000/interests-test
```

### Option 2: From Regular Interests Page
1. Go to `http://localhost:3000/interests`
2. Scroll to bottom
3. Click "✨ Try the new interests experience with smart recommendations"

---

## What to Look For

### 1. Smart Recommendations ✨
- Select 2-3 activities (e.g., Tennis, Golf, Hiking)
- Watch the gradient "You might also like" card appear
- Notice suggestions are relevant (e.g., Padel, Squash for Tennis)
- Click **+** to add a suggestion
- Notice recommendations update with new suggestions
- Click **×** to dismiss a suggestion
- Refresh page - dismissed suggestion shouldn't reappear
- **New:** Keep adding/dismissing - when curated suggestions run out, popular fallback activities appear with updated messaging

### 2. Sticky Selected Bar 📌
- As you select activities, they appear at the top
- Bar stays visible as you scroll
- Click × on any activity pill to remove it
- If you select 7+ activities, see "+N more" button
- Click "Clear all" to reset

### 3. Category Accordion 🎯
- Click any category to expand (e.g., "Active Sports")
- Notice subcategories appear (Team Sports, Individual Sports, etc.)
- Notice selected count badge on categories with selections
- Can expand multiple categories at once
- Activities show icons and checkmarks when selected

---

## Quick Test Scenarios

### Scenario 1: Recommendation Chain (2 min)
1. Start fresh (clear all if needed)
2. Select "Painting"
3. Notice recommendations: "Outdoor Painting", "Crafts", "Photography"
4. Add "Outdoor Painting"
5. Notice NEW suggestions: "Outdoor Meditation", "Outdoor Yoga"
6. Add "Outdoor Meditation"
7. Notice mindfulness suggestions appear
8. Result: Discovered a whole category from one starting point!

### Scenario 2: Category Browsing (1 min)
1. Expand "Active Sports"
2. Select 3-4 activities from different subcategories
3. Notice selected count updates on category header
4. Collapse and expand another category
5. Notice visual highlight on "Active Sports" (has selections)
6. Result: Easy to see which categories you've explored!

### Scenario 3: Fallback Recommendations (3 min)
1. Select an activity with limited neighbors (e.g., "Ice Fishing")
2. Notice you get some curated suggestions
3. Add or dismiss all the curated suggestions
4. Notice the heading changes to "Popular activities you might enjoy"
5. Notice new suggestions appear (popular fallback activities)
6. These are broad-appeal activities (hiking, beach, yoga, etc.)
7. Add a few fallback suggestions
8. Notice you can continue discovering activities indefinitely
9. Result: Never run out of suggestions!

### Scenario 4: Mobile Experience (2 min)
1. Open browser dev tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile viewport (iPhone, etc.)
4. Test sticky bar (should stay at top)
5. Test recommendations (should stack vertically)
6. Test category expansion (should work smoothly)
7. Result: Fully responsive!

---

## Expected Behavior

### ✅ Should Work:
- Recommendations appear within 1 second of selecting activities
- Adding/removing activities updates recommendations immediately
- Dismissed suggestions persist across page refresh
- Selected bar expands/collapses smoothly
- Categories expand/collapse without lag
- Save button redirects to home
- Changes persist in UserPreferences

### ❌ Should NOT Happen:
- Same activity suggested twice
- Dismissed suggestion reappearing (unless you clear localStorage)
- Selected bar showing wrong count
- Recommendations showing already-selected activities
- Category selected count incorrect
- Blank recommendations section (when activities selected)

---

## Comparison Test

Want to compare old vs new?

1. Open two browser tabs
2. Tab 1: `/interests` (old version)
3. Tab 2: `/interests-test` (new version)
4. Try selecting the same activities in both
5. Notice differences in UX, speed, discoverability

**Key differences:**
- Old: 3-level navigation, no recommendations, selected activities at bottom
- New: 1-page accordion, smart recommendations, sticky selected bar

---

## Troubleshooting

### Recommendations not showing?
- Need at least 1 activity selected
- Check browser console for errors
- Verify `rankRecommendations` function exists

### Dismissed suggestions reappearing?
- Check localStorage: `localStorage.getItem('godaisy.reco.dismissed')`
- Clear and try again: `localStorage.removeItem('godaisy.reco.dismissed')`

### Selected bar not updating?
- Check UserPreferences context
- Open React DevTools and inspect state
- Try in incognito mode (rules out localStorage issues)

### Categories won't expand?
- Check browser console for JavaScript errors
- Try clearing browser cache
- Test in different browser

---

## Share Feedback

After testing, note:
- What you liked
- What confused you
- What suggestions you'd add
- How long it took to customize your interests
- Compared to old version, which do you prefer?

---

## Files to Review

Want to see the code?
- `pages/interests-test.tsx` - Main test page (820 lines)
- `app/settings/recommendations.tsx` - Recommendation engine
- `INTERESTS_TEST_PAGE_GUIDE.md` - Detailed testing guide
- `INTERESTS_TEST_PAGE_SUMMARY.md` - Technical summary

---

## Next Steps

1. ✅ Test yourself (follow scenarios above)
2. Share with team for feedback
3. Deploy to staging for wider testing
4. Collect metrics and feedback
5. Decide: Replace old `/interests` or iterate further

**Current Status:** Ready for testing!
**Estimated Time:** 5-10 minutes for thorough test
**Risk Level:** Low (doesn't affect production, separate page)

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Open test page
open http://localhost:3000/interests-test

# Clear localStorage (if needed)
# In browser console:
localStorage.clear()

# Check for errors
npm run lint
npm run typecheck
```

Happy testing! 🎉
