# Crop Rotation Documentation Index

**For Grow Daisy Veg Patch Feature**

A comprehensive suite of 4 documents covering horticultural guidance, technical implementation, and quick reference materials.

---

## Document Guide

### 1. Start Here: CROP_ROTATION_SUMMARY.md
**Read this first if you're new to the project.**

- Overview of all 4 documents
- Core principles for horticulturists and developers
- Implementation roadmap (Phase 1-4)
- Data flow architecture
- Success criteria
- Next steps for developers

**Read time:** 10 minutes
**Audience:** Everyone

---

### 2. Deep Dive: CROP_ROTATION_EXPERT_GUIDE.md
**Read this if you need horticultural context and rationale.**

**Sections:**

1. **Executive Summary** - Why rotation matters, what's covered

2. **Plant Families & Rotation Logic** (Section 1)
   - 8 major plant families with botanical/common names
   - Character traits (nitrogen needs, pest susceptibility, root depth)
   - Why families matter for rotation
   - Climate-specific family behavior (Atlantic region)

3. **Rotation Rules & Logic** (Section 2)
   - "Never follow" rules with biological rationale
   - Why legumes precede brassicas (nitrogen fixation mechanism)
   - Friendly follows (synergistic combinations)
   - Examples with timelines

4. **Atlantic Climate Considerations** (Section 3)
   - High humidity = blight risk
   - Heavy clay = clubroot risk
   - Long winter = year-round planting
   - Extended rotation gaps required (5-year for Solanaceae)
   - Seasonal pattern for Asturias/Atlantic regions

5. **Practical Simplification** (Section 4)
   - 2-bed garden rotation (simple 3-year)
   - 3-bed garden rotation (RECOMMENDED)
   - 4-bed garden rotation (ideal)
   - Acceptable compromises for space constraints

6. **Mixed Beds & Non-Rotation Guidance** (Section 5)
   - Value of mixed beds despite lack of strict rotation
   - Tracking benefits even without formal rotation
   - Warnings system for risky combinations
   - Sub-bed zone rotation for very small gardens

7. **Cover Crops & Green Manures** (Section 6)
   - Why cover crops matter in Atlantic climate
   - Best crops for Atlantic Spain (hairy vetch, buckwheat, clover, field beans)
   - Rotation-integrated cover crop strategy
   - Regional recommendations

8. **Database Schema** (Section 7)
   - What data to track per bed/season
   - Minimum viable data for rotation support
   - Rotation recommendation engine (API logic)
   - UI flow for rotation planning

9. **Educational Messaging** (Section 8)
   - Tier 1: Absolute beginners
   - Tier 2: Intermediate users
   - Tier 3: Advanced gardeners
   - Specific warning messages (high, medium, low priority)

10. **Implementation Priorities** (Section 9)
    - Phase 1, 2, 3, 4 breakdown

11. **Quick Lookup Tables** (Section 10)
    - "What follows what" matrix
    - Atlantic climate seasonal planting guide

12. **Appendix: FAQs** (Section 10)
    - Common questions answered

**Read time:** 30-40 minutes
**Audience:** Product managers, educators, horticulturists, developers wanting context

---

### 3. Technical Blueprint: CROP_ROTATION_IMPLEMENTATION_PLAN.md
**Read this if you're building the feature.**

**Sections:**

1. **Phase 1: Data Model Extensions**
   - Schema additions to existing tables
   - New `grow_plant_species` reference table
   - Extended `grow_bed_plantings` fields
   - Indexes for fast queries
   - Migration script with backfill logic

2. **Phase 1: Backend API Endpoints**
   - Complete `/api/grow/beds/[bedId]/rotation-suggestions` implementation
   - Pseudocode for rotation rules engine
   - Helper functions (determine forbidden, suggest families, cover crop logic)
   - `/api/grow/beds/[bedId]/planting-history` endpoint (brief)

3. **Phase 1: Frontend Components**
   - `BedRotationHistory.tsx` - Visual timeline of plantings
   - `RotationSuggestion.tsx` - Smart recommendation widget with warnings
   - Both with React Query integration and real data fetching

4. **Phase 1: Database Seed**
   - SQL migration to populate `grow_plant_species` table
   - All major vegetables with family classification
   - Cover crop species

5. **Phase 1: Testing**
   - Unit tests (rules engine, history queries)
   - API tests (suggestions endpoint, history endpoint)
   - Integration tests (full planting → suggestion flow)

6. **Phase 2: Rotation Plans (Future)**
   - Schema for user rotation schemes
   - API endpoints for plan CRUD
   - UI visualization (multi-year timeline)

7. **Phase 3: Disease Tracking (Future)**
   - Enhanced pest_disease_log JSONB structure
   - API for logging harvest observations
   - Impact on recommendations

8. **Phase 1: Deployment Checklist**
   - Step-by-step deployment items

9. **Configuration & Environment**
   - No new environment variables (Phase 1)

10. **Rollback Plan**
    - How to revert if issues arise

11. **Developer Notes**
    - Species data reuse considerations
    - Denormalization strategy
    - RLS policy implications
    - Cover crop timing assumptions

**Read time:** 45-60 minutes
**Audience:** Backend developers, full-stack developers, DevOps

---

### 4. Quick Lookup: CROP_ROTATION_QUICK_REFERENCE.md
**Use this for quick facts, cheat sheets, and decision-making.**

**Sections:**

1. **The 3 Essential Rules** - Table format, quick reference
2. **Plant Families Quick ID** - Heavy feeders, nitrogen fixers, light feeders
3. **3-Year Rotation Patterns** - 2-bed, 3-bed, 4-bed (copy-paste ready)
4. **"Never Follows" Cheat Sheet** - What to avoid by family
5. **"Best Follows" Synergies** - Beneficial combinations
6. **Atlantic Climate Tweaks** - Rule adjustments for wet regions
7. **Cover Crops by Season** - Table with timing and benefits
8. **Disease & Pest Persistence** - Soil pathogen timeline
9. **How to Explain Rotation** - Scripts for beginners, intermediates, advanced
10. **Rotation Scheme Selection** - Decision flow (beds → scheme choice)
11. **Common Mistakes** - What users do wrong and app warnings
12. **Algorithm Pseudocode** - Implementation logic in plain English
13. **Testing Checklist** - Verify all features work
14. **Decision Trees** - "Which scheme does this user need?"

**Read time:** 10-15 minutes (or use as reference)
**Audience:** Everyone - ideal for tooltips, UI help text, developer reference

---

## How to Use These Documents

### If you are a...

**Product Manager:**
1. Read CROP_ROTATION_SUMMARY.md (10 min)
2. Skim CROP_ROTATION_EXPERT_GUIDE.md sections 1-2, 4, 8 (15 min)
3. Bookmark CROP_ROTATION_QUICK_REFERENCE.md for user-facing copy

**Horticulturist/Educator:**
1. Read CROP_ROTATION_EXPERT_GUIDE.md fully (40 min)
2. Use CROP_ROTATION_QUICK_REFERENCE.md for teaching scripts
3. Reference CROP_ROTATION_SUMMARY.md for implementation context

**Backend Developer:**
1. Read CROP_ROTATION_SUMMARY.md (10 min)
2. Read CROP_ROTATION_IMPLEMENTATION_PLAN.md sections 1-2 (30 min)
3. Implement database migrations and API endpoints per plan
4. Use CROP_ROTATION_QUICK_REFERENCE.md for rules engine logic

**Frontend Developer:**
1. Read CROP_ROTATION_SUMMARY.md (10 min)
2. Read CROP_ROTATION_IMPLEMENTATION_PLAN.md section 3 (15 min)
3. Implement React components per specifications
4. Reference CROP_ROTATION_QUICK_REFERENCE.md for UI copy/tooltips

**QA/Tester:**
1. Read CROP_ROTATION_QUICK_REFERENCE.md sections 1-4 (5 min)
2. Use testing checklist from Quick Reference
3. Reference CROP_ROTATION_IMPLEMENTATION_PLAN.md section 5 (testing scenarios)

**Support/Customer Success:**
1. Read CROP_ROTATION_QUICK_REFERENCE.md (10 min)
2. Reference CROP_ROTATION_EXPERT_GUIDE.md section 8 (educational messaging)
3. Use decision tree for guiding users to best rotation scheme

---

## Key Facts (TL;DR)

**The Core Rules:**
- Tomato/potato family (Solanaceae): 5-year gap minimum (Atlantic climate)
- Cabbage family (Brassicaceae): 3-year gap minimum
- Legumes before heavy feeders: Nitrogen benefit is real (100-150 kg/ha/year)

**Best Rotation for Home Gardens:**
- 3-bed garden: Rotate families A → B → C → A every year (simple, clean)
- 2-bed garden: Use seasonal variety within beds, rotate zones
- 4+ beds: Even stricter 4-year rotation possible

**Atlantic Climate Specifics:**
- Blight pressure is HIGH (wet, cool = perfect blight conditions)
- Clubroot risk in acid clay (lime to pH 7.0+ to prevent)
- Year-round growing possible (Feb-May legumes → Jun-Aug tomato → Sep-Feb brassica)
- Cover crops essential (hairy vetch for winter, buckwheat for summer)

**What the App Needs:**
- Track plant_family for each planting (already tracking removal date)
- Show warnings: Solanaceae last year? Don't plant Solanaceae again
- Suggest best next family: Legumes restore nitrogen; suggest after heavy feeders
- Offer cover crops: Hairy vetch (Nov-Mar), buckwheat (May-Jul)

---

## File Locations

All files are in the project documentation directory:

```
/sessions/confident-bold-euler/mnt/WotNow/docs/
├── CROP_ROTATION_INDEX.md (this file)
├── CROP_ROTATION_SUMMARY.md (start here: overview & roadmap)
├── CROP_ROTATION_EXPERT_GUIDE.md (deep dive: horticultural context)
├── CROP_ROTATION_IMPLEMENTATION_PLAN.md (blueprint: technical specs)
└── CROP_ROTATION_QUICK_REFERENCE.md (cheat sheet: lookup tables)
```

---

## Document Versions & Updates

| Document | Version | Last Updated | Status |
|----------|---------|---|---|
| CROP_ROTATION_SUMMARY.md | 1.0 | Mar 9, 2026 | ✅ Complete |
| CROP_ROTATION_EXPERT_GUIDE.md | 1.0 | Mar 9, 2026 | ✅ Complete |
| CROP_ROTATION_IMPLEMENTATION_PLAN.md | 1.0 | Mar 9, 2026 | ✅ Ready for Phase 1 |
| CROP_ROTATION_QUICK_REFERENCE.md | 1.0 | Mar 9, 2026 | ✅ Complete |
| CROP_ROTATION_INDEX.md | 1.0 | Mar 9, 2026 | ✅ This file |

---

## Next Steps

**For Developers:**
1. Start with CROP_ROTATION_SUMMARY.md
2. Read CROP_ROTATION_IMPLEMENTATION_PLAN.md
3. Create database migrations (add fields, create species table)
4. Implement API endpoints
5. Build React components
6. Run tests
7. Deploy to staging for user feedback

**For Product/Design:**
1. Read CROP_ROTATION_SUMMARY.md for roadmap
2. Use CROP_ROTATION_QUICK_REFERENCE.md for UI copy
3. Reference CROP_ROTATION_EXPERT_GUIDE.md section 8 for messaging strategy
4. Plan Phase 2 (rotation planning visualization)

**For Customer Success/Support:**
1. Read CROP_ROTATION_QUICK_REFERENCE.md
2. Memorize the 3 essential rules
3. Use decision tree to guide users to right scheme
4. Reference expert guide for education

---

## Questions or Clarifications?

If you need clarification on any aspect:
- **Horticultural questions:** See CROP_ROTATION_EXPERT_GUIDE.md + Appendix FAQ
- **Technical questions:** See CROP_ROTATION_IMPLEMENTATION_PLAN.md
- **Quick lookup:** Use CROP_ROTATION_QUICK_REFERENCE.md
- **Big picture:** See CROP_ROTATION_SUMMARY.md

---

**Package created:** March 9, 2026
**For:** Grow Daisy Development Team
**Subject:** Crop Rotation Support for Veg Patch
**Status:** Ready for Phase 1 Implementation

Thank you for prioritizing crop rotation—a foundational soil health practice that will significantly improve gardener outcomes, especially in Atlantic climate regions with high blight and clubroot pressure.
