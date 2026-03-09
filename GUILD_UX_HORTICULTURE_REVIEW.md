# Guild System — UX & Horticulture Review

**Date:** 2026-03-09
**Status:** Review & Recommendations

---

## What Works Well

**Horticulture quality is strong.** The 13 permaculture roles (nitrogen fixer, dynamic accumulator, groundcover, pollinator, etc.) are well-chosen and accurately described. The guild blueprint database (84 guilds, 2,431 companion relationships) is a genuinely useful dataset. Climate zone filtering is a sensible starting point. The role-based grouping with ranked companions gives real horticultural structure.

**Smart defaults are good UX.** Auto-selecting top 2 companions per role means a user can click through quickly without understanding every option. Deduplication prevents duplicate plants. The "select all / deselect all" per role is handy for power users.

---

## UX Issues & Improvements

### 1. Guild plants land in limbo — no bed assignment

**Problem:** When a user adds a guild, the plants go into their general plant list with `location: 'Guild Planting'` but are NOT assigned to any bed. The user then has to manually drag or assign each plant to a bed one-by-one. This defeats the purpose of the "guild" concept — a guild is a *group* that goes *together* in a specific place.

**Recommendation:** After confirming the companion selection, add a step: **"Which bed is this guild for?"** Show the user's existing beds as selectable cards (or offer to create a new one). Then bulk-assign all guild plants to that bed. This would also trigger the bed intelligence companion-checking immediately, giving the user instant feedback.

### 2. No visual of what the guild looks like together

**Problem:** The modal shows a list of plants grouped by role, but there's no visual sense of how these plants work *together* spatially. Permaculture guilds are inherently spatial — the focal tree in the centre, nitrogen fixers at the root zone, groundcovers underneath, pollinators around the edges.

**Recommendation:** A simple concentric-circle or layered diagram showing where each role sits relative to the focal plant. Even a static illustration with role labels would help beginners understand *why* they're adding a comfrey next to their apple tree.

### 3. The focal plant isn't added to the garden

**Problem:** When you select an "Apple Tree Guild" and confirm companions, the companions are added but the focal plant (apple tree) itself is NOT included. The user ends up with comfrey, clover, and nasturtiums but no apple tree.

**Recommendation:** Include the focal species as the first item in the selection (pre-checked, clearly marked as "Focal Species") so it's added alongside its companions. Add a note like "Already in your garden" if it's a duplicate.

### 4. "Make a Guild" button text is vague

**Problem:** "Make a Guild" assumes the user knows what a guild is in the permaculture sense. Many beginner gardeners won't.

**Recommendation:** Rename to something like **"Companion Planting"** or **"Plant Together"** with a subtitle "Find plants that help each other grow." The word "guild" can appear inside the modal for those who want the technical term.

### 5. Search placeholder says "Search fruit trees..." but guilds include vegetables

**Problem:** The search placeholder `Search fruit trees...` is misleading since the 84 guilds span fruit trees, vegetables, herbs, and more.

**Recommendation:** Change to `Search plants...` or `Search focal plants...`

### 6. Climate zone shown as raw code

**Problem:** The alert shows `Showing guilds for usda_5b climate zone` — the raw normalised code. Most users won't know their USDA zone code, let alone understand the underscore format.

**Recommendation:** Show a human-readable label like "Cool Continental (USDA 5b)" or at minimum format it as "USDA 5b" not "usda_5b".

### 7. No explanation of what roles mean before you're deep in the modal

**Problem:** A user clicks a guild and sees "🟢 Nitrogen Fixer" and "⚗️ Dynamic Accumulator" — terms that could be intimidating for beginners. The role descriptions are there but easy to miss.

**Recommendation:** Add a collapsible "How guilds work" intro card at the top of the details view, with a one-liner: "A guild groups plants by the jobs they do — fixing soil, attracting pollinators, deterring pests. Pick as many or as few as you like."

### 8. No visual distinction between essential and optional companions

**Problem:** The star icon on top-2 ranked companions is subtle. There's no guidance on which roles are essential vs. nice-to-have for the guild to actually function.

**Recommendation:** Mark certain roles as "Core" (nitrogen fixer, groundcover, pollinator) and others as "Optional" (vine layer, hedgerow). This helps beginners make confident choices without selecting everything.

### 9. After adding, no next-step guidance

**Problem:** After adding guild plants, the user sees a toast "Added 8 plants to your garden!" and gets switched to the Plants tab. But there's no prompt to assign them to a bed, no spacing advice, no planting timeline.

**Recommendation:** Show a brief post-addition card: "Your [Apple Tree] guild is ready! Assign these plants to a bed to start tracking them. Tip: plant nitrogen fixers within 1m of your focal tree."

---

## Horticulture Improvements

### 10. No spacing or layout guidance

**Problem:** Permaculture guilds are spatial designs. A user adding comfrey as a dynamic accumulator needs to know it goes at the drip line of the tree, not 10 metres away. The app adds plants as a flat list with no spatial context.

**Recommendation:** Add a `spacing_notes` field to `guild_blueprint_member` (or use existing `notes`) with practical placement tips. Display these in the companion card: "Plant at the drip line of the focal tree" or "Scatter seed underneath the canopy."

### 11. No seasonal awareness

**Problem:** A user might add a guild in March, but some companions (like nasturtiums in northern Spain) shouldn't go in the ground until after the last frost in May. The guild system doesn't account for planting timing.

**Recommendation:** Cross-reference companion plants against the user's climate zone to flag which can be planted now vs. later. Even a simple badge: "🟢 Plant now" / "🟡 Wait until May" / "🔴 Autumn planting" would be valuable.

### 12. Guild descriptions are generic

**Problem:** Some guild descriptions are vague or missing (`null`). The description should sell the *why* — why does this combination of plants actually work?

**Recommendation:** Ensure every guild has a compelling 1-2 sentence description explaining the synergy. E.g., "The classic apple tree guild uses nitrogen-fixing clover and comfrey's deep roots to feed the tree, while nasturtiums lure aphids away from the fruit."

### 13. No guild for containers or small spaces

**Problem:** The 84 guilds seem to focus on traditional in-ground permaculture (fruit trees with understory plantings). Users with containers, raised beds, or balconies won't find relevant guilds.

**Recommendation:** Add container-scale guilds: "Tomato + Basil + Marigold", "Pepper + Oregano + Nasturtium", "Strawberry + Chives + Lettuce". These are the companion combos beginners actually need.

### 14. No indication of guild suitability for the user's space

**Problem:** A user with a single raised bed might select an "Oak Tree Guild" that requires 10m² of ground. There's no space/scale filtering.

**Recommendation:** Add a `scale` field to blueprints: `orchard`, `garden_bed`, `raised_bed`, `container`. Filter or sort based on the user's bed types.

---

## Priority Ranking

| # | Improvement | Impact | Effort |
|---|---|---|---|
| 1 | Assign guild to a bed on creation | High | Medium |
| 3 | Include focal plant in the selection | High | Low |
| 4 | Rename "Make a Guild" → "Companion Planting" | Medium | Trivial |
| 5 | Fix search placeholder | Low | Trivial |
| 6 | Format climate zone display | Low | Low |
| 13 | Add container/small-space guilds | High | Medium |
| 11 | Seasonal planting awareness | High | Medium |
| 9 | Post-addition next-step guidance | Medium | Low |
| 7 | "How guilds work" intro card | Medium | Low |
| 8 | Core vs optional role labelling | Medium | Low |
| 2 | Spatial layout diagram | Medium | High |
| 10 | Spacing/placement notes | Medium | Medium |
| 12 | Improve guild descriptions | Medium | Medium |
| 14 | Scale/space filtering | Medium | Medium |

---

## Quick Wins (can do now)

1. **Rename button** → "Companion Planting" with subtitle
2. **Fix search placeholder** → "Search plants..."
3. **Format climate zone** → "USDA 5b" not "usda_5b"
4. **Include focal plant** in the companion selection list
5. **Add "How guilds work" intro** — 2 sentences in a collapsible card
