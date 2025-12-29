# Onboarding Briefing: Go Daisy & Grow Daisy
## For Joe - Biology & SQL Database Review

**Prepared:** December 28, 2025
**Focus:** Data validation and biological assumptions review
**Scope:** Go Daisy (weather/activities) & Grow Daisy (gardening) - NOT Findr

---

## Welcome!

Hi Joe, welcome to the team! Your biology expertise and SQL knowledge are exactly what we need to validate the scientific foundations of our apps. This document will help you understand what we've built, be honest about our limitations, and highlight areas where your expertise can make a real impact.

---

## TL;DR - Quick Context

| App | Purpose | Data Sources | Your Review Focus |
|-----|---------|--------------|-------------------|
| **Go Daisy** | "Should I go outside today?" - Weather-based activity recommendations | OpenWeather, Stormglass, custom algorithms | Activity-weather correlations, environmental thresholds |
| **Grow Daisy** | Gardening assistant with plant care tasks and alerts | Perenual API, climate zone data, custom planting calendars | Horticultural assumptions, frost/hardiness logic, plant relationships |

---

## Part 1: Go Daisy - Activity Recommendations

### What It Does


### Database Tables (Supabase)

```sql
-- Main tables you'll encounter:
user_location_preferences   -- User's saved locations (lat/lng, name)
user_favourites             -- Activities the user has favorited
weather_cache               -- Cached weather API responses (3-hour TTL)
translation_cache           -- Multi-language translations (DeepL)
```

**Note:** Most activity logic is NOT in the database - it's in TypeScript files. The database primarily stores user preferences and caches.

### Key Files to Review

| File | Purpose | Lines |
|------|---------|-------|
| `/utils/activitySuitability.ts` | Core scoring algorithm | ~680 |
| `/data/activityTypes.ts` | Activity definitions with weather conditions | ~300 |
| `/data/activityMessages.ts` | User-facing descriptions | ~200 |
| `/utils/activityHelpers.ts` | Helper functions for recommendations | ~150 |

### How Activity Scoring Works

Each activity has **condition strings** that define suitable weather:

```typescript
// Example: Cycling
conditions: {
  perfect: "temperature=15..25 & windSpeed<15 & precipitation=0",
  good: "temperature=10..28 & windSpeed<25 & precipitation<2",
  poor: "temperature<5 | temperature>35 | windSpeed>40 | precipitation>5"
}
```

**Scoring System (0-100):**
- Base score: 25 (neutral)
- Perfect conditions met: 80-100
- Good conditions met: 60-80
- Poor conditions active: 0-40 (penalties)
- Plus modifiers for snow, wind, mud, air quality

### HONEST LIMITATIONS & CONCERNS

#### 1. **No Scientific Sources Cited**
The weather-activity thresholds are based on common sense, not peer-reviewed research. For example:
- "Cycling is good at 10-28°C" - Where did these numbers come from?
- "Wind >40 km/h is dangerous for cycling" - Is this backed by safety data?

**What Joe Can Do:** Research actual safety thresholds for outdoor activities. Are there sports science or meteorology papers we should reference?

#### 2. **Missing Physiological Factors**
We don't account for:
- Humidity + temperature combined (heat index / feels-like)
- UV index warnings
- Air quality index (we mention it but don't heavily integrate it)
- Altitude effects on exertion

**What Joe Can Do:** Identify which physiological factors matter most for which activities.

#### 3. **Generic, Not Personalized**
Currently all users see the same recommendations. We don't consider:
- User's fitness level
- Age-related sensitivity
- Health conditions (asthma → air quality matters more)

**What Joe Can Do:** Help design a system for user-specific adjustments.

#### 4. **Condition Operators Are Basic**
Our current system uses simple range matching. We can't express:
- "Wind direction matters for beach activities" (we added this for surfing but it's incomplete)
- "Consecutive dry days affect trail conditions"
- "Recent rainfall matters more than forecast rainfall"

**What Joe Can Do:** Suggest more sophisticated environmental models.

### Suggested Review Tasks (Go Daisy)

1. **Audit Activity Thresholds**
   Open `/data/activityTypes.ts` and review each activity's temperature, wind, and precipitation ranges. Flag anything that seems off biologically/scientifically.

2. **Check Marine Activities**
   Surfing, kitesurfing, coasteering use Stormglass wave/wind data. Are the wave height thresholds (0.5-2.5m for surfing) reasonable?

3. **Seasonal Logic Review**
   We have basic stargazing astronomy data (moon phase, ISS visibility). The implementation is in `/pages/astronomy.tsx`.

---

## Part 2: Grow Daisy - Gardening Assistant

### What It Does

Grow Daisy helps gardeners know when to plant, water, and protect their plants. It uses weather data combined with plant-specific requirements.

### Database Tables (Supabase)

```sql
-- Core tables:
grow_user_plants            -- Plants the user has added to their garden
plant_species               -- Master plant database (synced from Perenual API)
grow_planting_calendar      -- Planting windows by climate zone
plant_companions            -- Companion planting relationships
grow_user_preferences       -- User settings (location, alerts)
```

### Key Schema Details

**`plant_species` table (from Perenual API):**
```sql
perenual_id             -- External API ID
common_name, scientific_name
hardiness_min, hardiness_max  -- USDA zone range (integer 1-13)
frost_tolerance         -- ENUM: 'hardy' / 'half_hardy' / 'tender'
min_temp_c              -- Minimum survival temperature (Celsius)
sunlight                -- TEXT[] array: ['Full sun', 'Part shade', etc.]
watering                -- String: 'Frequent', 'Average', 'Minimum'
growth_rate             -- String: 'Fast', 'Moderate', 'Slow'
maintenance             -- String: 'High', 'Moderate', 'Low'
drought_tolerant        -- Boolean
toxic_to_humans         -- Boolean
toxic_to_pets           -- Boolean
attracts                -- TEXT[]: ['Bees', 'Butterflies', 'Birds']
```

**`grow_planting_calendar` table:**
```sql
plant_slug              -- Reference to plant
climate_zone_code       -- E.g., 'atlantic_mild', 'continental_cool'
window_type             -- ENUM: 'sow_indoor', 'sow_outdoor', 'transplant', 'harvest'
start_day_of_year       -- Integer 1-365
end_day_of_year         -- Integer 1-365
tasks                   -- TEXT[] array of associated tasks
data_quality            -- 'authoritative' / 'derived' / 'estimated'
```

### Key Files to Review

| File | Purpose |
|------|---------|
| `/utils/plantingOffsets.ts` | Elevation-based date adjustments |
| `/components/grow/Homepage.tsx` | Main dashboard logic |
| `/supabase/migrations/20251214000001_perenual_integration.sql` | Perenual API schema |
| `/supabase/migrations/20251222000002_add_frost_sensitivity.sql` | Frost tolerance additions |

### Biological Logic Currently Implemented

#### 1. Soil Temperature Gates

We use soil temperature to determine when seeds can germinate:

```typescript
// Cool-season crops (peas, lettuce, kale): germinate at ≥7°C soil temp
// Warm-season crops (tomatoes, peppers): germinate at ≥10°C soil temp
```

**Source:** Open-Meteo historical soil temperature data (30-day moving average)

#### 2. Elevation Penalty (Lapse Rate)

Higher elevations are colder, so we delay planting:

```typescript
// Default: 0.5°C per 100m elevation
// Delay (days) = Temperature deficit ÷ Local warming rate
// Cool crops: 65% of calculated delay (they're more cold-tolerant)
// Range: Clamped to ±10-21 days
```

#### 3. Frost Sensitivity Categories

```typescript
// Hardy:       Survives hard frost (-15°C), e.g., kale, garlic, roses
// Half-hardy:  Tolerates light frost (-2°C), e.g., lettuce, peas
// Tender:      Killed by frost (0°C+), e.g., tomatoes, peppers, basil
```

#### 4. Climate Zones (6 European zones)

| Zone Code | Description | Example Regions |
|-----------|-------------|-----------------|
| `atlantic_mild` | Mild oceanic | SW Ireland, Cornwall |
| `cool_maritime` | Cool oceanic | UK, Northern France |
| `continental_cool` | Cold winters, warm summers | Eastern Europe |
| `med_marine` | Mediterranean | Southern France, Italy |
| `southern_hot_dry` | Hot, dry summers | Spain, Portugal |
| `mountain_cool` | Alpine | Swiss Alps |

### HONEST LIMITATIONS & CONCERNS

#### 1. **Planting Calendar Data Quality is Mixed**

We have ~50 planting calendars marked as `authoritative`, ~200 as `derived` (from general guidance), and the rest as `estimated` (educated guesses).

**What Joe Can Do:**
- Review `authoritative` entries - are they actually correct?
- Identify which `estimated` entries need proper research
- Suggest better data sources (RHS, university extension services)

#### 2. **Hardiness Zones Oversimplify Microclimates**

USDA hardiness zones are based on average annual minimum temperature only. They don't account for:
- Maritime vs continental climate (summer heat matters too)
- Urban heat islands
- South-facing vs north-facing gardens
- Drainage/frost pockets

**What Joe Can Do:** Research whether the RHS Hardiness Rating (H1-H7) is better for our European audience. How should we handle microclimates?

#### 3. **Companion Planting Data is Thin**

We have `plant_companions` table but it's sparsely populated. Much companion planting advice is based on:
- Folklore (some valid, some not)
- Anecdotal evidence
- Actual research (allelopathy, pest confusion)

**What Joe Can Do:** Help separate scientifically-validated companion planting from gardening myths.

#### 4. **Frost Tolerance Categories Are Crude**

"Hardy / Half-hardy / Tender" is a simplification. In reality:
- Some plants tolerate dry cold but not wet cold
- Acclimatization matters (hardened-off plants survive more)
- Crown hardiness vs foliage hardiness differs

**What Joe Can Do:** Should we have more granular frost categories? What factors actually matter?

#### 5. **Watering Guidance is Vague**

Perenual gives us strings like "Frequent", "Average", "Minimum" - but this varies hugely by:
- Soil type (sandy drains fast, clay retains)
- Container vs ground planting
- Mulching
- Climate (Mediterranean summer vs UK summer)

**What Joe Can Do:** Design a better watering model that accounts for these variables.

#### 6. **No Pest/Disease Integration Yet**

We store `attracts` (bees, butterflies) but don't have:
- Pest susceptibility data
- Disease risk warnings based on weather (blight conditions, etc.)
- Regional pest calendars

**What Joe Can Do:** This could be a major feature addition. What data would we need?

### Suggested Review Tasks (Grow Daisy)

1. **Query the plant_species table**
   ```sql
   -- Find plants with frost data
   SELECT common_name, hardiness_min, hardiness_max, frost_tolerance, min_temp_c
   FROM plant_species
   WHERE frost_tolerance IS NOT NULL
   ORDER BY hardiness_min;
   ```

2. **Review planting calendars by quality**
   ```sql
   -- Count by data quality
   SELECT data_quality, COUNT(*)
   FROM grow_planting_calendar
   GROUP BY data_quality;

   -- Review 'estimated' entries
   SELECT plant_slug, climate_zone_code, window_type, start_day_of_year, end_day_of_year
   FROM grow_planting_calendar
   WHERE data_quality = 'estimated'
   LIMIT 50;
   ```

3. **Check companion relationships**
   ```sql
   SELECT plant_slug, companion_name, relationship_type, notes
   FROM plant_companions
   WHERE relationship_type = 'harmful'
   ORDER BY plant_slug;
   ```

4. **Audit elevation offset logic**
   Review `/utils/plantingOffsets.ts` - is the 0.5°C/100m lapse rate correct for growing conditions?

---

## Part 3: How to Access the Database

### Supabase Dashboard
URL: https://supabase.com/dashboard (ask Damian for credentials)

### Local Development
```bash
# Sync env vars for CLI scripts
npm run env:sync

# Then you can run SQL via psql
source .env.cli
psql "$SUPABASE_URL"
```

### Key Documentation Files
- `/DATABASE_SCHEMA_REFERENCE.md` - Complete table/column reference
- `/RPC_TYPE_CASTING_GUIDE.md` - SQL function gotchas
- `/GETTING_STARTED.md` - Architecture overview

---

## Part 4: Improvement Suggestions

Based on our limitations, here are areas where your expertise would be most valuable:

### High Priority

1. **Validate Frost Tolerance Logic**
   Is our hardy/half_hardy/tender classification correct for the plants we have? What's missing?

2. **Review Planting Calendar Accuracy**
   Spot-check 10-20 calendar entries against authoritative sources (RHS, local extension services).

3. **Audit Activity Safety Thresholds**
   Are our wind/temperature/precipitation limits safe and reasonable?

### Medium Priority

4. **Improve Soil Temperature Model**
   Our 7°C/10°C thresholds are rough. What's the actual germination science?

5. **Companion Planting Validation**
   Separate evidence-based relationships from folklore.

6. **Better Hardiness Zone Integration**
   Should we use RHS H-ratings instead of/alongside USDA zones for Europe?

### Future Opportunities

7. **Disease Risk Prediction**
   Could we warn about blight conditions, mildew risk, etc. based on weather patterns?

8. **Personalized Activity Recommendations**
   Help design physiological adjustments (age, fitness, health conditions).

9. **Better Watering Model**
   Account for soil type, container vs ground, recent rainfall.

---

## Part 5: Quick Reference

### Running SQL Queries

```bash
# One-liner queries
source .env.cli && psql "$SUPABASE_URL" -c "SELECT COUNT(*) FROM plant_species;"

# Interactive session
source .env.cli && psql "$SUPABASE_URL"
```

### Useful Queries

```sql
-- All plants with their hardiness data
SELECT common_name, scientific_name, hardiness_min, hardiness_max,
       frost_tolerance, min_temp_c, drought_tolerant
FROM plant_species
WHERE perenual_id IS NOT NULL
ORDER BY hardiness_min NULLS LAST
LIMIT 100;

-- Planting windows for a specific plant
SELECT * FROM grow_planting_calendar
WHERE plant_slug ILIKE '%tomato%';

-- Plants toxic to pets
SELECT common_name, toxic_to_humans, toxic_to_pets
FROM plant_species
WHERE toxic_to_pets = true;

-- Weather cache recent entries
SELECT * FROM weather_cache
ORDER BY cached_at DESC
LIMIT 10;
```

### Key Contacts

- **Damian Rafferty** - Project owner, product decisions
- **Claude (AI Assistant)** - Codebase knowledge, SQL help

---

## Questions?

Feel free to explore, break things in dev, and ask questions. We built this with AI assistance, so there may be assumptions we made that don't hold up to expert scrutiny - that's exactly why you're here!

Welcome aboard!

---

*Last updated: December 28, 2025*
