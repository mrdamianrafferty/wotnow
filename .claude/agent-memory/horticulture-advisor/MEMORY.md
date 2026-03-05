# Horticulture Advisor - Persistent Memory

## Project: Grow Daisy (WotNow monorepo)

### Key Data Files Reviewed
- `/Users/damianrafferty/Projects/WotNow/supabase/migrations/20260305001_grow_garden_beds.sql` - beds + plantings schema
- `/Users/damianrafferty/Projects/WotNow/lib/grow/server/beds.ts` - BedRow, BedPlantingRow, SerializedBedPlanting types
- `/Users/damianrafferty/Projects/WotNow/lib/grow/server/plants.ts` - PlantRow, SerializedPlant types
- `/Users/damianrafferty/Projects/WotNow/lib/grow/species.ts` - PlantSpeciesRow (rich species data, includes companions_with / companions_avoid arrays)
- `/Users/damianrafferty/Projects/WotNow/lib/grow/guild.ts` - 84 guild blueprints, 2431 companion relationships in DB
- `/Users/damianrafferty/Projects/WotNow/data/grow/planting_calendar_baseline.json` - climate-zone-keyed sowing/transplant windows (RHS + Teagasc + INRAE sources)

### Schema: grow_garden_beds
Fields: id, user_id, name, type (raised_bed|container|in_ground|greenhouse|polytunnel|other), color, sort_order, sun_exposure (full_sun|partial_shade|full_shade), soil_type (free text), size_label (free text), notes, created_at, updated_at.
MISSING for hort features: rotation_group, dimensions_m2, irrigation_type, last_amended_at, year_label.

### Schema: grow_bed_plantings
Fields: id, bed_id, plant_id, quantity, planted_at (date), removed_at (date), harvest_data (jsonb), created_at.
MISSING: row_spacing_cm, plant_spacing_cm, sow_method (direct|transplant), succession_interval_days, position_in_bed (jsonb for grid), notes.

### Schema: grow_user_plants
Fields: id, user_id, name, type, location, health, planted_at, last_watered_at, notes, species_slug, variety, quantity, source, expected_harvest_at, cost_cents, photo_url, bed_id (FK).
MISSING: rotation_group (critical for rotation logic), days_to_maturity, spacing_cm.

### Schema: plant_species (Supabase table)
Rich table - has companions_with[], companions_avoid[], harvest_season, care_guides, sun_requirements, soil_type, usda_zone, pest_susceptibility etc.
NOTE: species table has RLS that blocks direct reads - must use service role client in API routes.

### Companion Data
Guild system is already rich: 84 blueprints, 2431 relationships, 13 permaculture roles.
companions_with / companions_avoid arrays also exist on plant_species rows.
See `/Users/damianrafferty/Projects/WotNow/lib/grow/guild.ts` for role catalog.

### Planting Calendar
`planting_calendar_baseline.json` uses climate_zone_code keys: atlantic_mild, cool_maritime, continental_cool.
Windows expressed as day_of_year integers (1-365). Sources: RHS, Teagasc, INRAE, SRUC.
Currently covers: tomato, lettuce, carrot (and more - file truncated at review).

### Rotation Groups (recommended definitions - 2026-03-05)
See bed-features-advisory.md for full definitions. Summary:
- GROUP 1: Brassicas (Brassicaceae) - heavy feeders, need lime, clubroot risk
- GROUP 2: Legumes (Fabaceae) - nitrogen fixers, follow brassicas or potatoes
- GROUP 3: Roots/Alliums (Apiaceae + Alliaceae) - low feeders, avoid fresh manure
- GROUP 4: Potatoes/Tomatoes (Solanaceae) - heavy feeders, blight/eelworm risk
- GROUP 5: Cucurbits (Cucurbitaceae) - heavy feeders, can break rotation
- GROUP 6: Permanent/Other - strawberries, asparagus, sweetcorn, lettuce (not rotated)

### Regional Assumptions
- App is UK/Ireland focused (RHS primary reference, Teagasc for Ireland)
- Climate zones: atlantic_mild (SW England, Ireland), cool_maritime (Scotland, N England, Wales), continental_cool (E England, upland areas)
- Hardiness: UK zones H1-H7 map approximately to USDA 6-10 for most of UK
- Frost dates: atlantic_mild last frost ~late March, cool_maritime ~late April/early May

### Content Gaps Identified (2026-03-05)
- No rotation_group field on plants or species - critical for rotation logic
- No spacing data per planting (only species-level dimensions)
- No feeding schedule data
- No succession planting links between plant records
- No bed-level "year plan" or rotation history view
- harvest_data jsonb on grow_bed_plantings is undefined/unused - needs schema

### BedDetailPage Review Findings (2026-03-05)
File: `/Users/damianrafferty/Projects/WotNow/components/grow/BedDetailPage.tsx`
STATUS: Substantially built as of second review. Species data is now loaded. CareGuideCard and PlantSpeciesInfo are rendered in expanded plant cards. Frost/heat warnings exist. This Week calendar section exists.

REMAINING PROBLEMS:
- Rotation warning logic BUG: uses planted_at year instead of removed_at year — fires against currently-growing crops (e.g. brassica planted in 2026 warns "avoid until 2029" while still in ground). Fix: query only removed_at IS NOT NULL plantings; use removed_at year; suppress warnings for groups still actively growing.
- ROTATION_GROUP_LABELS contains non-user-friendly terms: "Solanaceae", "Cucurbits" - not legible to home gardeners
- No positive rotation guidance: messages say "avoid until 2029" but don't say what TO plant
- No harvest countdown on plant cards (planted_at exists; days_to_maturity needs population on plant_species)
- Same-family concentration advisory missing: if all bed plants share a rotation_group, no advisory fires. Particularly important for brassica beds (clubroot, cabbage white risk).
- companion conflict message shows raw species slugs rather than common names

KEY FILES FOR ROTATION LOGIC:
- `/Users/damianrafferty/Projects/WotNow/lib/grow/server/bedIntelligence.ts` - getRotationWarnings() needs removed_at fix
- `/Users/damianrafferty/Projects/WotNow/lib/grow/bedIntelligenceTypes.ts` - ROTATION_GROUP_LABELS needs friendly version

RECOMMENDED ADDITIONS TO bedIntelligenceTypes.ts:
- Add ROTATION_GROUP_FRIENDLY: Record<RotationGroup, {label, examples, followWith}>
- Extend RotationWarning interface with friendlyLabel, examples, followWith fields

HORTICULTURE NOTE - Cabbage + Chinese Cabbage together in a bed:
- Both are Brassicaceae - concentrates clubroot, cabbage white, cabbage root fly, aphid risk
- This inter-bed same-family concentration is not flagged anywhere currently
- Should trigger advisory: "All plants here are from the cabbage family — consider companion planting to reduce pest pressure. Nasturtium, dwarf French bean, or dill at the edges would help."
- Succession direction (brassica out -> lettuce/carrot in) is horticulturally sound
- March outdoor lettuce sowing needs cloche caveat for cool_maritime zone
- March carrot sowing needs soil temp >7C caveat for cool_maritime zone

CONTENT GAP: days_to_maturity field on plant_species - needed for harvest countdown feature. Needs audit/population.

UK MARCH GARDENING CONTEXT (for seasonal banner feature):
- Soil temps: atlantic_mild 6-9C, cool_maritime 4-7C
- Open: tomato sowing indoors (all zones), chitting potatoes, broad beans outdoors
- Borderline (caveat needed): direct carrots (need >7C soil), outdoor lettuce (need cloche in cool_maritime)
- Rotation gap (2-3 weeks): onion sets from late March (atlantic_mild) / April (cool_maritime)
- Good rotation follow: legumes after brassicas (nitrogen benefit); brassicas after potatoes (with lime)
