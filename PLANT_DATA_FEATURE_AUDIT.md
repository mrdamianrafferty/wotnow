# Plant Species Data -- Feature Audit

**Date:** 2026-03-06
**Author:** Tech Lead audit (automated codebase analysis)
**Scope:** All Grow Daisy features that read from `plant_species` table (463 rows)

---

## Executive Summary

The `plant_species` table is read by 8 major feature areas. The most critical data gaps are:

1. **`frost_tolerance`** -- Recently bulk-populated via migration `20260306006`. Should now be complete for all 463 rows. This is the single most important column for safety-critical features (frost alerts, planting calendar frost context).

2. **`days_to_maturity_min` / `days_to_maturity_max`** -- Recently bulk-populated via migration `20260306004`. Coverage unknown for non-vegetable species (ornamentals, trees). Missing data causes Harvest Horizon, Growth Stage tracking, and bed status indicators to silently exclude plants.

3. **`rotation_group`** -- Recently added via migration `20260306002`. Coverage likely partial (only common veg). Missing data means rotation warnings silently skip species, giving users false confidence that "no rotation needed".

4. **`companions_with` / `companions_avoid`** -- Data source unclear. If mostly NULL, companion planting advice in bed intelligence returns empty arrays (no warnings, no suggestions).

5. **`frost_tolerance` / `water_needs` on `grow_user_plants`** -- The weather-tasks API reads these from the *user plant row*, NOT from `plant_species`. These columns are likely NULL for most user plants because there is no visible mechanism to backfill them from species data at plant-add time.

---

## Feature-by-Feature Audit

### 1. Weather Alerts / Frost Warnings

| Item | Detail |
|------|--------|
| **Files** | `lib/grow/localSignals.ts`, `lib/grow/weatherTaskEngine.ts`, `pages/api/grow/weather-tasks.ts`, `hooks/useWeatherTasks.ts`, `components/grow/homepage/UrgencyBanner.tsx`, `pages/api/cron/grow/weather-alerts.ts` |
| **Data flow** | Weather-tasks API reads `frost_tolerance`, `water_needs`, `temperature_min_c`, `temperature_max_c` from **`grow_user_plants`** (NOT `plant_species`). Local signals (`localSignals.ts`) use hardcoded plant lists (e.g., `['tender plants', 'tomatoes', 'peppers']`) and do NOT query user's garden. |

**Columns queried from `grow_user_plants`:**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `frost_tolerance` | Determines which plants are affected by frost alerts, severity escalation | Falls back to category-based guessing in `weatherTaskEngine.ts` (line ~150). If NULL, uses hardcoded -5C default. **Frost alerts may miss tender plants or over-alert for hardy ones.** |
| `water_needs` | Watering recommendation adjustments | Falls back to `'medium'` default. Minor impact. |
| `temperature_min_c` | Per-plant frost threshold | Falls back to `frost_tolerance` category defaults (hardy=-10, half_hardy=-3, tender=0). OK as fallback. |
| `temperature_max_c` | Heat stress detection per plant | Falls back to 35C default. Minor impact. |

**Critical gap:** The weather-tasks API reads from `grow_user_plants`, not `plant_species`. When a user adds a plant, these columns are likely NULL unless explicitly set. There is no visible backfill trigger that copies `frost_tolerance` from `plant_species` to `grow_user_plants` at add-time.

**Local Signals (`localSignals.ts`):** Does NOT read from any database table. Uses hardcoded `affectedPlants` arrays (e.g., `['roses', 'beans', 'peppers']`). Does NOT check the user's actual garden. Impact: generic advice, not personalized.

**Deprecated cron (`weather-alerts.ts`):** Hardcodes `['tomatoes', 'peppers', 'cucumbers']` for pest alerts regardless of user's garden. Marked deprecated.

---

### 2. Smart Nudges / Watering

| Item | Detail |
|------|--------|
| **Files** | `components/grow/homepage/SmartNudge.tsx`, `lib/grow/smartTasks.ts`, `lib/grow/weatherTaskEngine.ts`, `pages/api/grow/weather-tasks.ts` |

**Columns queried from `grow_user_plants`:**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `frost_tolerance` | Frost protection task generation in `smartTasks.ts` | Falls back to assuming non-tender. Tender plants may not get frost protection nudges. |
| `water_needs` | Watering frequency adjustments | Falls back to `'medium'`. Drought-tolerant or high-water plants get generic advice. |
| `last_watered_at` | Calculate days since last watered | If NULL, watering recommendation uses weather-only logic. Acceptable degradation. |
| `watering_frequency_days` | Override default watering interval | If NULL, uses weather-based calculation. Acceptable. |

**Columns queried from `plant_species` (indirectly via smartTasks):**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `frost_tolerance` (from species) | Only if copied to `grow_user_plants` at add-time | See gap above. |

**SmartNudge component itself** does NOT query plant_species. It only displays data from the `weatherData` prop (from `useWeatherTasks` hook).

---

### 3. What to Sow/Plant Now

| Item | Detail |
|------|--------|
| **Files** | `components/grow/homepage/WhatToStart.tsx`, `pages/api/grow/planting-calendar.ts` |

**Columns queried from `plant_species`:**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `slug` | Join key to calendar windows | Required, always populated. |
| `name` | Display name in UI | Falls back to slug. Minor cosmetic issue. |
| `frost_tolerance` | Frost context: identifies tender plants, shows "Frost tender" badge in UI | If NULL, tender plants shown without frost warning badge. **User may plant tender species during frost-risk period without warning.** |
| `frost_protection_needed` | Additional frost context flag | If NULL, defaults to `false`. Minor -- `frost_tolerance === 'tender'` is the primary check. |

**Note:** The planting calendar data itself comes from `plant_task_calendar_default` and `climate_zone_task_offset` tables, NOT from columns on `plant_species`. The species table is used only for metadata (name, frost tolerance) to enrich the calendar windows.

**Data population status:** `frost_tolerance` was bulk-populated in migration `20260306006`. Should be complete.

---

### 4. Harvest Horizon

| Item | Detail |
|------|--------|
| **Files** | `components/grow/homepage/HarvestHorizon.tsx`, `pages/api/grow/harvest-horizon.ts`, `lib/grow/growthStage.ts` |

**Columns queried from `plant_species`:**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `slug` | Join key | Required. |
| `days_to_maturity_min` | Growth stage calculation, days-remaining estimate | **If BOTH min and max are NULL, the plant is silently excluded from Harvest Horizon.** User sees no harvest countdown for that plant. |
| `days_to_maturity_max` | Upper bound of maturity range | Falls back to `days_to_maturity_min` if only max is NULL (and vice versa). |

**Impact of missing data:**
- If `days_to_maturity_min` AND `days_to_maturity_max` are both NULL: **Plant completely invisible in Harvest Horizon.** `getGrowthStage()` returns `null`, and the API skips it. No error shown to user -- the plant simply doesn't appear.
- This affects bed status indicators too (the "ready to harvest" / "approaching harvest" badges on bed cards in `pages/api/grow/beds/index.ts`).

**Data population status:** Bulk-populated in migration `20260306004` for common vegetables. Likely NOT populated for:
- Ornamental plants (don't have meaningful "harvest")
- Trees (should use 365+ for perennial establishment)
- Herbs (may be partially populated)
- Cover crops / green manures

---

### 5. Bed Intelligence / Planting Advice

| Item | Detail |
|------|--------|
| **Files** | `lib/grow/server/bedIntelligence.ts`, `pages/api/grow/beds/[bedId]/intelligence.ts`, `lib/grow/bedIntelligenceTypes.ts` |

**5a. Rotation Warnings**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `rotation_group` | Determines which crop family was in the bed | **If NULL, species is silently skipped.** No rotation warning generated. User may plant same family in same bed without warning. |

**Data population status:** Added in migration `20260306002`. Likely populated for common vegetables (brassica, legume, solanaceae, cucurbit, root_allium). Probably NOT populated for herbs, ornamentals, cover crops.

**5b. Companion Planting**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `companions_with` | Array of slugs that benefit this plant | If NULL or empty array, returns `{ goodCompanions: [], badCompanions: [] }`. **No companion suggestions shown.** |
| `companions_avoid` | Array of slugs that harm this plant | If NULL or empty, no conflict warnings. **Potentially harmful combinations planted without warning.** |

**Data population status:** Unknown. These are array columns. If they were seeded from Perenual data, they may contain Perenual slugs that don't match our internal slugs.

**5c. Quick Fill Suggestions (empty bed)**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `name` | Display name | Falls back to slug. Minor. |
| `category` | Categorization | Falls back to null. Minor cosmetic. |
| `sun_requirements` | Filter suggestions by bed sun exposure | If NULL, plant is included regardless of sun compatibility. May suggest shade plants for full-sun beds. |

**5d. Succession Prompts**

Uses `grow_planting_calendar` table, not `plant_species` directly.

---

### 6. Growth Stage Tracking

| Item | Detail |
|------|--------|
| **Files** | `lib/grow/growthStage.ts` (used by harvest-horizon and bed index APIs) |

**Columns used (passed as parameters, queried upstream):**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `days_to_maturity_min` | Stage boundary calculation | If BOTH NULL, returns `null` -- no stage info. |
| `days_to_maturity_max` | Stage boundary calculation | Falls back to min (and vice versa). |

**Additional consideration:** `maturity_basis` (`'from_sowing'` or `'from_transplant'`) is stored but NOT currently used in the `getGrowthStage()` function. The function always compares against `planted_at` date. This means:
- If basis is `'from_sowing'` but the user logged a transplant date, the countdown will be too long.
- If basis is `'from_transplant'` but the user logged the sowing date, the countdown will be too short.

This is a **logic gap**, not a data gap. The column exists and is populated, but the code doesn't use it.

---

### 7. Companion Planting / Guild System

| Item | Detail |
|------|--------|
| **Files** | `lib/grow/guild.ts` (permaculture guilds), `lib/grow/server/bedIntelligence.ts` (bed-level companions) |

**7a. Permaculture Guilds (`lib/grow/guild.ts`)**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `slug` | Join key for guild blueprints | Required. |
| `name` | Display focal/companion plant name | Falls back to slugified name. Minor. |
| `category` | Display category | Falls back to undefined. Minor. |

Guild data comes from `guild_blueprint` and `guild_blueprint_member` tables, not from `plant_species` companion columns. The species table is only used for display names.

**7b. Bed-Level Companions (`bedIntelligence.ts`)**

| Column | Used For | Impact if NULL |
|--------|----------|----------------|
| `companions_with` | Good companion suggestions | Empty array returned. No helpful suggestions. |
| `companions_avoid` | Conflict warnings | Empty array returned. **No warnings about harmful combinations.** |
| `rotation_group` | Rotation warnings | Silently skipped. See section 5a. |

---

### 8. Species Pages / Search

| Item | Detail |
|------|--------|
| **Files** | `pages/api/grow/species/index.ts`, `pages/api/grow/species/[slug].ts`, `pages/api/grow/species/batch.ts`, `lib/grow/species.ts` |

**Columns returned to UI (from BASE_SELECT):**

All species endpoints return a comprehensive set of ~80+ columns. Key functional columns:

| Column Group | Columns | Impact if NULL |
|-------------|---------|----------------|
| **Identity** | `slug`, `name`, `scientific_name`, `category` | Slug required. Others: cosmetic gaps. |
| **Growing** | `sun_requirements`, `soil_type`, `plant_size`, `usda_zone_min/max` | UI shows blank sections. Not critical. |
| **Perenual data** | `growth_rate`, `maintenance`, `watering`, `care_level`, `dimensions`, etc. | Many fields from Perenual sync. If Perenual match was wrong (see PLANT_SPECIES_REVIEW.md for fruit-orange, fruit-cherimoya), data is actively misleading. |
| **Safety** | `poisonous_to_humans`, `poisonous_to_pets` | **Critical if wrong.** Migration `20260306005` fixes known errors. |
| **Companion** | `companions_with`, `companions_avoid` | Shown on species detail page. Empty = no info shown. |
| **Maturity** | `days_to_maturity_min/max`, `maturity_basis`, `maturity_notes` | Shown on species detail page. Empty = section hidden. |
| **Rotation** | `rotation_group` | Shown on species detail page. Empty = no rotation info. |
| **Translations** | `name_fr`, `name_es`, `name_it`, `name_de`, `name_pt`, `name_nl`, `name_pl` | Multi-language support. If NULL, falls back to English name. |
| **Search** | `name_en_aliases`, `search_terms` | Affects search discoverability. Missing = plant harder to find. |

---

## Priority Summary: Columns That MUST Be Filled

### P0 -- CRITICAL (features break or give dangerous advice)

| Column | Table | Status | Impact |
|--------|-------|--------|--------|
| `frost_tolerance` | `plant_species` | Recently bulk-populated (migration 006). **Verify 0 NULLs remain.** | Planting calendar frost warnings, smart task frost protection. Without it, tender plants may be planted during frost without warning. |
| `frost_tolerance` | `grow_user_plants` | **Likely mostly NULL.** No backfill mechanism found. | Weather-tasks API reads from HERE, not plant_species. Frost alerts will use fallback defaults for most users' plants. |
| `poisonous_to_humans` / `poisonous_to_pets` | `plant_species` | Partially populated; migration 005 fixes known errors. | Safety-critical. Wrong values could lead to harm. |

### P1 -- HIGH (features silently produce no output)

| Column | Table | Status | Impact |
|--------|-------|--------|--------|
| `days_to_maturity_min` / `days_to_maturity_max` | `plant_species` | Recently bulk-populated for vegetables (migration 004). **Unknown coverage for herbs, ornamentals, trees.** | Harvest Horizon shows nothing for plants without maturity data. Bed status badges don't show harvest-ready state. Growth stage tracking returns null. |
| `rotation_group` | `plant_species` | Recently added (migration 002). **Unknown coverage.** | Bed intelligence gives no rotation warnings for species without this. Silent omission = false sense of safety. |
| `water_needs` | `grow_user_plants` | **Likely mostly NULL.** No backfill mechanism found. | Watering recommendations use generic defaults. Less personalized but not broken. |

### P2 -- MEDIUM (features degrade gracefully but miss opportunities)

| Column | Table | Status | Impact |
|--------|-------|--------|--------|
| `companions_with` / `companions_avoid` | `plant_species` | **Unknown coverage.** Likely sparse. | Companion planting advice returns empty. No warnings about bad combinations. |
| `sun_requirements` | `plant_species` | Partially populated from Perenual. Some values wrong (see PLANT_SPECIES_REVIEW.md). | Quick-fill suggestions may recommend wrong plants for bed's sun exposure. |
| `maturity_basis` | `plant_species` | Populated where maturity data exists. | Currently NOT used in code (`getGrowthStage` ignores it). Logic gap, not data gap. |

### P3 -- LOW (cosmetic or search impact)

| Column | Table | Status | Impact |
|--------|-------|--------|--------|
| `name_fr/es/it/de/pt/nl/pl` | `plant_species` | Partially populated. | Non-English users see English fallback names. |
| `search_terms` / `name_en_aliases` | `plant_species` | Partially populated. | Some plants harder to find via search. |
| `image_key` | `plant_species` | Partially populated. | Plants without images show placeholder. |

---

## Recommended Actions

1. **Backfill `grow_user_plants.frost_tolerance` from `plant_species`** -- Write a migration or trigger that copies `frost_tolerance` from `plant_species` to `grow_user_plants` when `grow_user_plants.species_slug` matches `plant_species.slug`. This is the single highest-impact fix because the weather-tasks API (the app's key differentiator) reads from `grow_user_plants`, not `plant_species`.

2. **Verify `frost_tolerance` coverage** -- Run: `SELECT COUNT(*) FROM plant_species WHERE frost_tolerance IS NULL OR frost_tolerance = '';` -- target is 0 remaining.

3. **Audit `days_to_maturity` coverage** -- Run: `SELECT category, COUNT(*) as total, COUNT(days_to_maturity_min) as has_maturity FROM plant_species GROUP BY category;` -- identify which categories still need data.

4. **Audit `rotation_group` coverage** -- Run: `SELECT category, COUNT(*) as total, COUNT(rotation_group) as has_rotation FROM plant_species WHERE category = 'vegetable' GROUP BY category;` -- all vegetables should have rotation groups.

5. **Audit `companions_with/avoid` coverage** -- Determine if these arrays contain valid internal slugs or Perenual-format slugs. If Perenual slugs, they won't match and the feature is effectively broken.

6. **Fix `maturity_basis` usage in code** -- `getGrowthStage()` should adjust its calculation based on whether the basis is `from_sowing` or `from_transplant` relative to what the user logged as `planted_at`.

7. **Add species-to-user-plant data sync** -- When a plant is added to the garden with a `species_slug`, automatically populate `frost_tolerance`, `water_needs`, and temperature bounds from the species record.
