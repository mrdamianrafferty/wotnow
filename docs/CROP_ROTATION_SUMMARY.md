# Crop Rotation for Grow Daisy: Complete Documentation Summary

**Status:** Ready for implementation
**Date:** March 9, 2026
**Geography Focus:** Atlantic/Mediterranean climate (Spain, UK, France, etc.)
**Garden Size:** 2-4 bed home gardens

---

## Documentation Package Overview

Three comprehensive documents have been created to guide crop rotation implementation in Grow Daisy's Veg Patch:

### 1. **CROP_ROTATION_EXPERT_GUIDE.md** (32 KB)
**Audience:** Product managers, educators, and anyone wanting horticultural deep-dive

**Covers:**
- Plant families and rotation logic (7 major families with common & botanical names)
- Why rotation matters (pest cycles, nutrient depletion, soil health)
- Specific "never follow" rules with Atlantic climate context
- Nitrogen fixation mechanism (why legumes precede heavy feeders)
- 3-year, 4-year, and simplified 2-bed rotation schemes
- Atlantic climate adjustments (blight pressure, heavy clay soils, extended growing season)
- Cover crop recommendations specific to Atlantic Spain
- Mixed bed guidance (rotation for non-rotating gardens)
- Educational messaging tiers (beginner → advanced)
- FAQs and common questions

**Key Insights:**
- Solanaceae (tomato/potato) requires 5-year gap in Atlantic climate (4-year minimum standard)
- Brassicaceae (cabbage family) needs 3-year gap, more if clubroot present
- Legume nitrogen fixation is biologically real (100-150 kg N/ha annually)
- 3-bed rotation is practical sweet spot for home gardeners
- Cover crops (hairy vetch, buckwheat) are essential for small gardens with high rainfall

---

### 2. **CROP_ROTATION_IMPLEMENTATION_PLAN.md** (28 KB)
**Audience:** Developers implementing the feature

**Covers:**
- Database schema extensions (minimal changes to existing tables)
- New tables: `grow_plant_species`, `grow_rotation_plans`
- Extended fields: `plant_family`, `pest_disease_log`, `is_cover_crop`, etc.
- Complete API endpoint implementation with pseudocode:
  - `GET /api/grow/beds/[bedId]/rotation-suggestions`
  - `GET /api/grow/beds/[bedId]/planting-history`
- Frontend components (React):
  - `BedRotationHistory.tsx` (visual timeline of plantings)
  - `RotationSuggestion.tsx` (smart recommendations widget)
- Rotation rules engine logic (forbidding families based on history)
- Cover crop selection algorithm (seasonal + gap-aware)
- Test plan (unit, API, integration tests)
- Migration script to seed plant species with families
- Phase roadmap (Phase 1: MVP recommendations; Phase 2-4: advanced features)
- Rollback plan (if issues arise)

**Key Technical Decisions:**
- Plant family denormalized into `grow_bed_plantings` for query speed
- Species data is read-only public table (no RLS restrictions on reads)
- Rules engine is in-memory logic (not database-driven, for now)
- Atlantic climate hardcoded; regional optimization is Phase 4

---

### 3. **CROP_ROTATION_QUICK_REFERENCE.md** (9 KB)
**Audience:** Developers, educators, and users wanting quick lookup

**Covers:**
- The 3 essential rules (formatted as quick table)
- Plant families quick ID (heavy feeders vs. nitrogen fixers vs. light feeders)
- 3-year rotation patterns for 2/3/4 bed gardens (copy-paste ready)
- "Never follows" cheat sheet
- "Best follows" synergies
- Atlantic climate tweaks (rule adjustments)
- Cover crop selection by season
- Disease persistence in soil (with Atlantic climate severity)
- How to explain rotation to different user sophistication levels
- Algorithm pseudocode for recommendations engine
- Common gardener mistakes and app warnings
- Decision tree for rotation scheme selection
- Testing checklist

**Perfect for:** Quick lookups, in-app tooltips, educator scripts

---

## Core Principles

### For Horticultureists & Educators

1. **Rotation is biological, not just nutritional**
   - Breaks pest/disease cycles (primary benefit)
   - Balances nutrient depletion (secondary benefit)
   - Improves soil structure over time (tertiary benefit)

2. **Atlantic climate is high-risk for blight**
   - Solanaceae (tomato/potato) is the critical bottleneck
   - 5-year minimum gap is not negotiable in wet seasons
   - Brassicaceae is secondary concern (clubroot in acid clay)

3. **Legume nitrogen fixation is real and measurable**
   - 100-150 kg N/ha added annually in legume beds
   - Benefit is slower in cool Atlantic soil (lasts through winter)
   - Pairing legume → heavy feeder is the rotation sweet spot

4. **3-bed rotation is practical perfect**
   - Strict enough to prevent pest buildup
   - Simple enough for home gardeners to remember
   - No empty beds (unlike 2-bed)

---

### For Developers

1. **Minimal schema changes required**
   - Add 4-5 fields to existing `grow_bed_plantings`
   - Create lightweight `grow_plant_species` reference table
   - Optional `grow_rotation_plans` for future multi-year visualization

2. **Rules engine is in-memory logic**
   - No complex database queries needed
   - Rules can be configured per region (Phase 4)
   - Easy to test and iterate

3. **Denormalization for speed**
   - Plant family copied into `grow_bed_plantings` at planting time
   - Avoids expensive joins on species lookup
   - Updates planting history is fast (no cascading updates)

4. **User education is built-in**
   - Suggestions include "why" explanations
   - Warnings escalate from yellow (caution) → red (critical)
   - Beginner vs. advanced UI modes

---

## Implementation Roadmap

### Phase 1 (MVP - Current)
**Timeline:** 2-3 weeks
**Scope:** Core rotation suggestions

- Add `plant_family` tracking to `grow_bed_plantings`
- Create `/api/grow/beds/[bedId]/rotation-suggestions` endpoint
- Build `BedRotationHistory` and `RotationSuggestion` components
- Test rotation rules engine
- Seed plant species with families

**Delivers:** Users see "what not to plant" and "what to plant next"

---

### Phase 2 (Rotation Planning)
**Timeline:** 3-4 weeks
**Scope:** Multi-year rotation visualizations

- Create `grow_rotation_plans` table
- Allow users to select rotation scheme (3-year, 4-year, 2-bed, etc.)
- Visual timeline showing planned families for 3 years
- Auto-suggestion of crop varieties based on plan

**Delivers:** Users can plan entire garden rotation year-by-year

---

### Phase 3 (Disease Tracking & History)
**Timeline:** 3-4 weeks
**Scope:** Learning from garden history

- UI for logging diseases/pests at harvest time
- Track which combinations caused problems
- Adjust recommendations based on user's disease history
- Show "this bed has history of X" warnings

**Delivers:** App learns from user's specific garden conditions

---

### Phase 4 (Regional Optimization & Advanced Features)
**Timeline:** 4-6 weeks
**Scope:** Climate-aware, sophisticated recommendations

- Detect user region (IP or profile setting)
- Adjust rotation rules by region (5yr vs 4yr, etc.)
- Suggest region-specific cover crops
- Integrate weather alerts ("High blight pressure this year")
- Nitrogen calculation (legume → feeder benefit quantified)

**Delivers:** App gives region-specific, weather-aware advice

---

## Data Flow Architecture

### Current State (Existing)

```
User plants tomato in Bed A
↓
Create grow_user_plant (name="tomato", species_slug="tomato")
↓
Create grow_bed_planting (plant_id, bed_id, planted_at)
↓
User removes tomato, set removed_at
```

### New State (Phase 1)

```
User plants tomato in Bed A
↓
Create grow_user_plant (name="tomato", species_slug="tomato")
↓
Create grow_bed_planting (plant_id, bed_id, planted_at, plant_family="Solanaceae")
  [plant_family pulled from grow_plant_species.slug lookup]
↓
User removes tomato, set removed_at
↓
System can now query: "Last family in this bed was Solanaceae, removed 3 months ago"
↓
API recommends: "Avoid Solanaceae for 5 years (last year was 2025); suggest Fabaceae (legume) for nitrogen"
```

---

## Key Data Definitions

### Plant Family Enum
```
Brassicaceae     // Cabbage, broccoli, kale, radish
Solanaceae       // Tomato, potato, pepper, eggplant
Fabaceae         // Pea, bean, legume
Alliaceae        // Onion, garlic, leek
Apiaceae         // Carrot, parsnip, celery
Cucurbitaceae    // Courgette, pumpkin, cucumber
Amaranthaceae    // Spinach, chard, beet
Asteraceae       // Lettuce, endive
Polygonaceae     // Buckwheat (cover crop)
Other
```

### Crop Category Enum
```
heavy_feeder      // Brassica, Solanaceae, Cucurbita
light_feeder      // Allium, Apiaceae, Amaranthaceae
nitrogen_fixer    // Fabaceae, Polygonaceae (some)
neutral           // Cover crops with no feeding benefit
```

### Rotation Scheme Enum
```
3_year            // 3 beds rotating through 3 families
4_year            // 4 beds, stricter rotation
2_bed_simple      // 2 beds with seasonal variety within beds
custom            // User-defined scheme
no_rotation       // Mixed planting (still tracked for history)
```

---

## Success Criteria

### Phase 1 MVP
- [x] Plant families are tracked for each planting
- [ ] Rotation suggestions appear when user plans next crop
- [ ] Suggestions include "why" explanations
- [ ] Critical warnings (Solanaceae, Brassica) are prominent
- [ ] Cover crop suggestions are offered
- [ ] Planting history is visible per bed
- [ ] Novice gardeners can understand and act on suggestions

### Phase 2
- [ ] Users can set rotation scheme (3-year, 4-year, etc.)
- [ ] Visual 3-year timeline shows planned families per bed
- [ ] Plan persists and auto-updates as user plants

### Phase 3
- [ ] Disease/pest logging at harvest time
- [ ] History affects future recommendations (clubroot → longer gap)
- [ ] "This bed has history of X" warnings appear

### Phase 4
- [ ] Atlantic climate users get 5-year Solanaceae gap by default
- [ ] Region-specific cover crop suggestions
- [ ] Weather integration (e.g., "high blight risk this year")

---

## Common Questions & Answers

**Q: Is 3-year rotation enough?**
A: 3-year rotation prevents 80% of pest/disease problems. For disease-prone regions (like Atlantic with blight), combine with resistant varieties and fungicide if needed. 4-5 year rotation is stricter but requires more beds.

**Q: Can mixed beds work?**
A: Yes, but not ideal. Track by zone within bed and rotate zones annually. Less effective than bed-level rotation, but better than nothing.

**Q: What if user ignores suggestions?**
A: Allow it, but show warnings. Users learn from mistakes; app should be educational, not restrictive.

**Q: Should we calculate nitrogen benefit numerically?**
A: Phase 4 feature. For now, just say "legume adds nitrogen" qualitatively. Quantification (kg/ha) is Phase 4.

**Q: How do we handle cover crops?**
A: Phase 1: Just suggest. Phase 2: Track as plantings with is_cover_crop=true. Phase 3: Calculate nitrogen benefit (1-3 kg/sqm for legume cover crops).

---

## Files & Paths

**Documentation:**
- `/sessions/confident-bold-euler/mnt/WotNow/docs/CROP_ROTATION_EXPERT_GUIDE.md` (32 KB)
- `/sessions/confident-bold-euler/mnt/WotNow/docs/CROP_ROTATION_IMPLEMENTATION_PLAN.md` (28 KB)
- `/sessions/confident-bold-euler/mnt/WotNow/docs/CROP_ROTATION_QUICK_REFERENCE.md` (9 KB)
- `/sessions/confident-bold-euler/mnt/WotNow/docs/CROP_ROTATION_SUMMARY.md` (this file)

**Existing Relevant Files:**
- `/sessions/confident-bold-euler/mnt/WotNow/supabase/migrations/20260305001_grow_garden_beds.sql` (bed & planting schema)
- `/sessions/confident-bold-euler/mnt/WotNow/supabase/migrations/20251214100001_enhance_grow_user_plants.sql` (plant species linking)

---

## Next Steps for Developer

1. **Read the implementation plan** - Understand schema changes and API structure
2. **Create database migrations** - Add fields to `grow_bed_plantings`, create `grow_plant_species` table
3. **Seed plant species data** - Populate with families using migration script in implementation plan
4. **Build rotation suggestion API** - Implement pseudocode from implementation plan
5. **Build UI components** - Create `BedRotationHistory` and `RotationSuggestion` components
6. **Test thoroughly** - Use test plan from implementation document
7. **Deploy to staging** - Gather feedback from gardeners
8. **Plan Phase 2** - Rotation planning visualization (multi-year timelines)

---

## Educational Messaging Strategy

**The app should teach incrementally:**

**Tier 1 (Beginner, 1st interaction):**
"Rotate plant families each year to prevent pests. Tomato this year? Plant something else next year."

**Tier 2 (After 2-3 seasons):**
"Moving families breaks pest cycles. Peas add nitrogen to soil. Plant peas before cabbage for best results."

**Tier 3 (Advanced user):**
"Legume nitrogen fixation adds 100-150 kg N/ha. Late blight persists 5 years in Solanaceae. Clubroot can persist 15 years in Brassica."

---

## Atlantic Climate Special Considerations

**This codebase will be used heavily by Spanish/UK/French gardeners. Atlantic climate is:**
- **High humidity + cool temps** = Perfect conditions for late blight
- **Heavy clay soils** = Clubroot and drainage risk
- **High rainfall** = Nutrient leaching (cover crops essential)
- **Long winter growing season** = Year-round planting possible

**Therefore:**
- Solanaceae gap should be **5 years minimum** (not 4)
- Brassicaceae gap should be **4 years minimum if acidic soil** (not 3)
- Cover crop suggestions should favor winter legumes (hairy vetch, clover, field beans)
- Disease warnings should emphasize blight and clubroot specifically

---

## Conclusion

Crop rotation is one of the most important soil health practices for home gardeners, especially in high-rainfall climates like Atlantic regions. Grow Daisy can significantly improve user gardens by:

1. **Tracking planting history** (already partially in place with `grow_bed_plantings`)
2. **Making smart suggestions** based on rotation rules (Phase 1)
3. **Educating users gradually** about why rotation matters (all phases)
4. **Protecting against region-specific risks** like blight and clubroot (Phase 4)

The documentation provided gives both the horticultural rationale and the technical implementation blueprint needed to build this feature successfully.

---

**Documentation prepared by:** Horticulture Expert & Permaculture Educator
**For:** Grow Daisy Development Team
**Ready for:** Phase 1 Implementation
**Last updated:** March 9, 2026
