# Grow Daisy: Complete Monetization & Feature Plan

## Executive Summary

Grow Daisy has **three unique competitive moats** no competitor possesses:
1. **Weather-integrated smart tasks** - Tasks adjust to real weather, not generic schedules
2. **Soil temperature at 4 depths** - Critical for seed germination timing (unique in consumer space)
3. **Threat risk engine tied to actual weather** - Pest/disease probability based on real conditions

**Core Strategy:** "Give away what competitors charge for. Charge for what only we can provide."

---

## Part 1: Current State

### What's Already Built (ALL FREE Currently)

| Asset | Count/Status | Notes |
|-------|--------------|-------|
| Plant species database | 50,000+ | 8 languages |
| Guild blueprints | 84 | In database |
| Companion relationships | 2,431 | In database |
| Threat library | 100+ | Ready |
| Soil temp data (4 depths) | Live | FREE from Open-Meteo |
| Soil moisture (4 depths) | Live | FREE from Open-Meteo |
| Wind data | Live | Speed, direction, gusts |
| Weather forecasts | 14-day | Ready |
| Planting calendars | Climate-adjusted | Ready |
| AI plant identification | Working | €0.05/call |
| AI pest/disease diagnosis | Working | €0.05-0.10/call |
| Stripe payment infrastructure | Ready | From Findr |

### The Critical Gap

| Feature | Built | Gap |
|---------|-------|-----|
| **Smart Tasks** | Framework only | Weather NOT connected to task generation |
| **Weather Data** | Multi-source, 4-depth soil | NOT used for anything except display |
| **Threat Engine** | Excellent architecture | Weather rules NOT populated |
| **Guilds** | 84 in database | UI uses hardcoded 2-guild fallback |

**The Big Insight:** We have amazing weather data but it's NOT CONNECTED to anything useful yet.

---

## Part 2: Competitor Analysis

### Competitor Pricing

| App | Monthly | Annual | Lifetime |
|-----|---------|--------|----------|
| Planta | $7.99 | $35.99 | - |
| PlantIn | $19.99 | - | $49.99 |
| Greg | $6.50 | $29.99 | $49.99 |
| GrowVeg | - | $29 | - |
| Gardenize | $4.40 | $44 | - |

### What Competitors Charge For (We Can Give Away)
- Unlimited plant identification
- Push notifications/reminders
- Expert botanist support
- Unlimited photos
- Disease diagnosis
- Detailed care instructions

### What We Have That They Don't (Our Moats)

| Feature | Planta | Greg | PlantIn | GrowVeg | Grow Daisy |
|---------|--------|------|---------|---------|------------|
| Soil temp (4 depths) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Weather-smart tasks | ❌ | ❌ | ❌ | ❌ | ✅ |
| Frost alerts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Weather threat engine | ❌ | ❌ | ❌ | ❌ | ✅ |
| Wind-aware gardening | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Per-bed microclimate** | ❌ | ❌ | ❌ | ❌ | ✅ |
| Harvest tracking | ❌ | ❌ | ❌ | ❌ | ✅ |
| Yield predictions | ❌ | ❌ | ❌ | ❌ | ✅ |
| Permaculture guilds (84!) | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI Expert (garden context) | ❌ | ❌ | ❌ | ❌ | ✅ |

**We have 10 unique features no competitor offers.**

---

## Part 3: Pricing Strategy

### Confirmed Decisions
1. ✅ **Separate subscriptions** - Grow Daisy premium is independent from Findr
2. ✅ **Generous free tier** - 25 plants + 5 AI IDs/month (best for word-of-mouth)
3. ✅ **Lifetime purchases** - Offer lifetime option alongside subscriptions
4. ✅ **Full 4 tiers** - Launch with Free, Sprout, Bloom, Harvest from day one

### Final Pricing Table

| Tier | Monthly | Annual | Lifetime | Target User |
|------|---------|--------|----------|-------------|
| **SEED** | Free | Free | Free | Everyone |
| **SPROUT** | €3.99 | €29.99 | €59.99 | Casual gardeners |
| **BLOOM** ⭐ | €6.99 | €49.99 | €99.99 | Serious gardeners |
| **HARVEST** | €11.99 | €79.99 | €149.99 | Market gardeners |
| **ORCHARD** | - | €199 | €399 | Professionals |

---

## Part 4: Feature Specifications by Tier

### SEED (Free Forever)

| Feature | Limit | Status |
|---------|-------|--------|
| Plant database access | Full 50,000+ | ✅ Built |
| Plant tracking | 25 plants | ✅ Built (needs limit) |
| AI Plant ID | 5/month | ✅ Built (needs limit) |
| AI Pest/Disease diagnosis | 2/month | ✅ Built (needs limit) |
| Basic weather (air temp) | 3-day forecast | ✅ Built (needs gate) |
| Photo storage | 100 photos | ✅ Built (needs limit) |
| Basic planting calendar | Yes | ✅ Built |
| Push notifications | Basic reminders | ⏳ Needs build |

**Why generous:** 25 plants covers most casual gardeners. They become advocates. Serious gardeners hit limits within a season.

---

### SPROUT (€3.99/mo) - "The Organized Gardener"

| Feature | Value | Status |
|---------|-------|--------|
| Plant tracking | 75 plants | Gate only |
| AI Plant ID | 20/month | Gate only |
| AI Pest/Disease diagnosis | 10/month | Gate only |
| Weather forecast | 7-day | Gate only |
| Photo storage | Unlimited | Gate only |
| Planting calendar | Elevation-adjusted | ✅ Built, gate it |
| Task history | 6 months | Easy UI build |
| Export garden data | CSV/PDF | Medium build |

---

### BLOOM (€6.99/mo) - "The Weather-Smart Gardener" ⭐ ANCHOR TIER

**This is where the magic happens. These features use weather data.**

| Feature | Value | Status |
|---------|-------|--------|
| Plant tracking | Unlimited | Gate only |
| AI Plant ID | Unlimited | Gate only |
| AI Pest/Disease diagnosis | 30/month | Gate only |
| **SOIL TEMPERATURE (4 depths)** | ✅ THE MOAT | Data exists, need UI |
| **FROST ALERTS (48hr advance)** | ✅ THE MOAT | Need build |
| **SMART WATERING** | ✅ THE MOAT | Need build |
| **WIND-AWARE GARDENING** | ✅ THE MOAT | Data exists, need logic |
| **WEATHER THREAT ENGINE** | ✅ THE MOAT | Architecture exists, need rules |
| Companion planting guilds | Full 84 guilds | Data exists, need UI wiring |
| Multi-garden management | Up to 3 | Need build |
| Historical data | 1 year | Need build |
| Offline mode | Yes | Need build |

#### B1: SOIL TEMPERATURE (4 Depths) 🔥

**User Experience:**
```
🌱 Soil Temperature Right Now
├── Surface (0cm): 14°C ❄️ Too cold for tomatoes
├── Seed depth (6cm): 12°C
├── Root zone (18cm): 10°C
└── Deep roots (54cm): 8°C

Tomato seeds need 16°C at 6cm depth.
Current: 12°C. Wait ~10-14 days based on forecast trend.
```

**Why killer:** Seeds don't read air temperature - they read SOIL temperature. No consumer app shows this.

#### B2: SMART WATERING 🔥

**User Experience:**
```
💧 Watering Recommendation: SKIP TODAY

Your tomatoes usually need watering, but:
• Soil moisture at 3cm: 42% (adequate)
• Rain forecast: 15mm tomorrow morning
• Humidity: 78% (low evaporation)

💡 Check soil moisture Thursday after rain.
```

**Why killer:** No competitor integrates real weather into watering recommendations.

#### B3: FROST ALERTS (48-Hour Advance) 🔥

**User Experience:**
```
⚠️ FROST ALERT - Action Required

Frost predicted: Tomorrow night (Oct 15)
Low temperature: -2°C
Your tender plants at risk:
• 12 Tomato plants
• 4 Pepper plants
• 2 Basil plants

🛡️ Action: Cover with fleece or move indoors tonight.
```

**Why killer:** Frost kills tender plants in hours. 48 hours notice = time to save them.

#### B4: WEATHER THREAT ENGINE 🔥

**User Experience:**
```
🔴 HIGH BLIGHT RISK - Your Tomatoes

Weather conditions match blight outbreak pattern:
• Rain last 72 hours: 35mm ✓
• Humidity >90% for 6+ hours: Yes ✓
• Temperature 15-25°C: Yes ✓

Prevention:
• Apply copper fungicide before next rain
• Improve air circulation (prune lower leaves)
```

**Weather Rules to Populate:**
```
Late Blight: rain_72h > 20mm AND rh_6h > 90% AND temp 15-25°C
Powdery Mildew: rh_night > 90% AND dry_days > 3 AND temp 20-30°C
Aphids: temp > 15°C AND wind < 10km/h AND growing_season
Slugs: rain_24h > 5mm AND temp > 5°C AND night_time
Botrytis: rh_24h > 85% AND temp 15-25°C AND wet_foliage
```

#### B8: WIND-AWARE GARDENING 🔥 MOAT

**What:** Task recommendations that account for wind speed and its effects on plants and activities

**Why it's a killer feature:**
- Wind increases water loss (evapotranspiration) - need to water MORE in windy conditions
- Wind drift makes spraying pesticides/fertilizers dangerous and wasteful
- High winds damage tall plants, break stems, uproot seedlings
- Wind chill affects plant stress even when air temp seems OK
- No competitor factors wind into gardening recommendations

**Wind Effects on Plants:**
| Condition | Effect | Action |
|-----------|--------|--------|
| **Sustained wind >30 km/h** | Physical damage, broken stems | Stake tall plants, delay planting |
| **Wind + dry soil** | Rapid desiccation | Increase watering frequency |
| **Wind + newly transplanted** | Transplant shock, wilting | Delay transplanting or provide shelter |
| **Wind + flowering** | Poor pollination, flower drop | Protect pollinators, hand pollinate |
| **Gusty conditions** | Unpredictable damage | Secure containers, check supports |

**Wind Effects on Tasks (Already in activities.ts):**
| Activity | Max Wind | Reason |
|----------|----------|--------|
| Spraying pesticides | 10 km/h | Drift is dangerous |
| Fertilizing lawn | 15 km/h | Drift wastes product |
| Direct sowing seeds | 15 km/h | Seeds blow away |
| Watering | 20 km/h | Water evaporates/drifts |
| Mulching | 20 km/h | Light mulch blows away |
| Transplanting | 20 km/h | Increases transplant shock |
| Most other activities | 25-30 km/h | Comfort/safety |

**User Experience:**
```
💨 WIND ALERT - Adjust Your Plans

Current wind: 25 km/h (gusty)
Forecast: Dropping to 10 km/h tomorrow morning

⚠️ Today - NOT RECOMMENDED:
• Spraying or fertilizing (drift risk)
• Sowing small seeds
• Watering (will evaporate quickly)

✅ BETTER TOMORROW (low wind forecast):
• Spray treatments - optimal conditions 6-10am
• Sow carrots and lettuce seeds
• Apply granular fertilizer

💧 WATERING ADJUSTMENT:
Your plants need 20% more water in these windy conditions.
Soil moisture is dropping faster than usual.
```

**Implementation:**
- Data: Wind speed, direction, gusts already available
- Logic: `calculateWindImpact(windSpeed, activity, plantType)`
- Integration: Factor wind into smart watering calculations
- UI: Wind warning banner, task rescheduling suggestions

**Wind-Smart Watering Formula:**
```
Base watering need × wind_factor

Wind Factor:
- 0-10 km/h: 1.0x (normal)
- 10-20 km/h: 1.15x (+15%)
- 20-30 km/h: 1.3x (+30%)
- >30 km/h: 1.5x (+50%) + warning
```

**Shelter Recommendations (Future):**
For persistently windy gardens, suggest:
- Windbreak planting (hedges, screens)
- Guild companions that provide wind protection
- Structural solutions (fences, walls)
- Plant selection for wind tolerance

#### B6: GARDEN BED MANAGEMENT 🔥 MOAT

**What:** Per-bed microclimate conditions that power smart plant recommendations

**Why it's a killer feature:**
- No competitor offers per-bed conditions (shade, soil type, moisture)
- Enables truly personalized plant recommendations
- Integrates with weather data for bed-specific alerts
- Creates "garden memory" that increases switching costs

**Competitor Gap Analysis:**
| App | Bed Features | Per-Bed Conditions |
|-----|-------------|-------------------|
| GrowVeg | Visual planning | Size/shape only |
| Planter | Basic builder | None |
| VegPlotter | Scale design | None |
| Gardenize | Basic naming | None |
| **Grow Daisy** | Smart beds | Full microclimate ✅ |

**Database Schema:**
```sql
CREATE TABLE grow_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  garden_id UUID REFERENCES grow_gardens,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,

  -- Size (optional)
  length_cm INTEGER,
  width_cm INTEGER,
  shape TEXT DEFAULT 'rectangle',

  -- Microclimate conditions (THE DIFFERENTIATOR)
  sun_exposure TEXT NOT NULL DEFAULT 'full_sun',  -- full_sun, partial_shade, full_shade, dappled
  soil_type TEXT DEFAULT 'loam',            -- clay, sandy, loam, chalky, peat
  moisture_level TEXT DEFAULT 'moderate',   -- dry, moderate, moist, wet
  drainage TEXT DEFAULT 'good',             -- poor, moderate, good, excellent
  is_raised BOOLEAN DEFAULT false,
  is_covered BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link plants to beds
ALTER TABLE grow_user_plants ADD COLUMN bed_id UUID REFERENCES grow_beds;
```

**User Experience - Creating a Bed:**
```
🌱 Create New Bed

Name: [Shady Border          ]

Sun Exposure:
○ Full Sun (6+ hours direct)
● Partial Shade (3-6 hours)
○ Full Shade (< 3 hours)
○ Dappled (filtered through trees)

Soil Type:
○ Clay (heavy, slow draining)
● Loam (balanced, ideal)
○ Sandy (light, fast draining)
○ Chalky (alkaline, thin)

☑ This is a raised bed
```

**User Experience - Smart Recommendations:**
```
🌿 Plants Perfect for "Shady Border"
   Partial shade • Loam soil • Moderate moisture

Recommended:
├── Hostas - Thrives in partial shade
├── Ferns - Loves shady, moist spots
├── Astilbe - Beautiful in dappled light
└── Bleeding Heart - Partial shade favorite

💡 Suggestion: Astilbe would complement
   your hostas perfectly!
```

**Weather Integration (Unique to Us):**
```
⚠️ Heat Wave Alert for "Sunny Veg Patch"

Your tomatoes in full-sun bed are at risk:
• Forecast: 32°C for 3 days
• Soil temp at surface: 28°C (hot!)

Recommendations:
• Water deeply morning & evening
• Consider temporary shade cloth
• Plants in "Shady Border" will appreciate extra warmth!
```

**Feature Tier Limits:**
| Feature | SEED | SPROUT | BLOOM | HARVEST |
|---------|------|--------|-------|---------|
| Beds | 2 | 5 | 10 | Unlimited |
| Per-bed conditions | Sun only | Full | Full + history | Full + analytics |
| Plant recommendations | Top 5 | Top 20 | Unlimited | Unlimited + AI |
| Crop rotation per bed | ❌ | ❌ | ✅ | ✅ (3-year) |

**Implementation:**
- Week 12 with Multi-Garden feature
- Create `grow_beds` table
- Add `bed_id` to `grow_user_plants`
- Build bed selector UI
- Implement plant recommendation engine based on bed conditions
- Add bed-specific weather alerts

---

#### B5: COMPANION PLANTING GUILDS

**Database Assets:**
- 84 guild blueprints
- 21 unique focal plants (apple, pear, plum, cherry, citrus, olive, fig, etc.)
- 2,431 companion relationships
- 5 climate zones with variations

**User Experience:**
```
🌿 Apple Guild for Atlantic Mild Climate

Your 3 apple trees can benefit from these companions:

Nitrogen Fixers:
├── White Clover - fixes nitrogen, pollinator magnet
└── Lupine - adds nitrogen to acidic soils

Dynamic Accumulators:
└── Comfrey - chop-and-drop leaves feed tree

Pest Repellents:
├── Garlic Chives - sulfur compounds repel borers
└── Daffodil - bulb barrier discourages rodents
```

---

### HARVEST (€11.99/mo) - "The Productive Gardener"

| Feature | Value | Status |
|---------|-------|--------|
| AI Pest/Disease diagnosis | Unlimited | Gate only |
| Hyperlocal microclimate modeling | ✅ | Future |
| Multi-garden management | Unlimited | Need build |
| Team/family sharing | 5 members | Need build |
| **Harvest yield tracking** | ✅ UNIQUE | Need build |
| **Yield predictions** | ✅ UNIQUE | Need build |
| Crop rotation planning (3-year) | Yes | Need build |
| Historical data | 5 years | Need build |
| Analytics dashboard | Yes | Need build |
| "Ask an Expert" credits | 2/month (AI) | Need build |
| API access | Limited | Future |

#### H1: HARVEST YIELD TRACKING 🔥

**User Experience:**
```
🍅 Log Harvest

Plant: Tomatoes (Gardener's Delight)
Harvest date: Today
Amount: [___] kg / lbs / count

Your season total: 12.5 kg
vs Last year: 8.2 kg (+52%!)
vs Average for your zone: 10 kg/plant
```

#### H2: YIELD PREDICTIONS 🔥

**User Experience:**
```
📊 Season Prediction

Based on your 12 tomato plants, weather patterns, and care history:

Expected harvest: 15-20 kg
Harvest window: Aug 15 - Sep 30

Factors:
✅ Good soil temp at planting (+15%)
✅ Regular watering adherence (+10%)
⚠️ Late blight risk period (-5%)
```

#### H3: CROP ROTATION PLANNER

**User Experience:**
```
🔄 Crop Rotation Planner

Bed #1 History:
• 2024: Tomatoes (heavy feeder)
• 2023: Peppers (heavy feeder)
• 2022: Beans (nitrogen fixer)

⚠️ Two years of heavy feeders! Soil may be depleted.

Recommended for 2025:
• Legumes (beans, peas) - to restore nitrogen
• Root crops (carrots, beets) - different nutrient needs
```

#### H6: AI EXPERT (GPT-4 with Garden Context)

**User Experience:**
```
🧑‍🌾 Ask the Expert

Your question: "Why are my tomato leaves turning yellow?"

[AI analyzes your garden context: 12 tomatoes, planted May 15,
atlantic_mild climate, last watered 2 days ago, recent rain...]

Expert Response:
Based on your garden data, the yellowing is likely due to...
```

---

### ORCHARD (€199/year) - "The Professional"

| Feature | Value | Status |
|---------|-------|--------|
| White-label client portals | 20 clients | Future |
| Professional reporting | PDF reports | Future |
| Full API access | Yes | Future |
| Commercial use license | Yes | Future |
| Priority support | Yes | Future |
| "Ask an Expert" credits | 10/month | Future |

**Status:** Defer for Phase 2

---

## Part 5: Implementation Plan

### Phase 1: Monetization Foundation (Weeks 1-3)
**Goal:** Launch paid tiers with existing features gated

| Task | Effort | Files |
|------|--------|-------|
| Create `grow_usage` table migration | Easy | `supabase/migrations/` |
| Add `grow_subscription_tier` to profiles | Easy | `supabase/migrations/` |
| Build `useGrowSubscription` hook | Medium | `hooks/useGrowSubscription.ts` |
| Create `<GrowPremiumGate>` component | Easy | `components/grow/premium/` |
| Implement usage tracking in identify-plant API | Medium | `pages/api/grow/identify-plant.ts` |
| Add plant count limit enforcement | Easy | `pages/api/grow/plants/` |
| Build pricing page with Stripe | Medium | `pages/grow/premium.tsx` |
| Create `UpgradePrompt` component | Easy | `components/grow/premium/` |
| Gate soil temp display for free users | Easy | `components/grow/WeatherPage.tsx` |
| Gate extended forecast (7-day vs 3-day) | Easy | `components/grow/WeatherPage.tsx` |

**Deliverable:** Users can subscribe to SPROUT/BLOOM/HARVEST tiers

---

### Phase 2: Weather Moats (Weeks 4-7)
**Goal:** Activate the weather data that's sitting unused

#### Week 4: Soil Temperature Display
| Task | Effort | Files |
|------|--------|-------|
| Create `SoilTemperatureCard` component | Medium | `components/grow/SoilTemperatureCard.tsx` |
| Add germination temp data to species | Easy | Data update |
| Build "soil too cold for X" logic | Easy | `lib/grow/soilTemperature.ts` |
| Show "wait X days" based on forecast trend | Medium | `lib/grow/soilTemperature.ts` |
| Gate behind BLOOM tier | Easy | Wrap in `<GrowPremiumGate>` |

#### Week 5: Smart Watering + Wind Adjustment
| Task | Effort | Files |
|------|--------|-------|
| Create `calculateWateringNeed()` function | Medium | `lib/grow/smartWatering.ts` |
| Integrate soil moisture data | Easy | Already have from Open-Meteo |
| Integrate rain forecast | Easy | Already have |
| **Add wind factor to watering calculation** | Easy | `lib/grow/smartWatering.ts` |
| Create `SmartWateringCard` component | Medium | `components/grow/SmartWateringCard.tsx` |
| Add "skip watering - rain coming" logic | Medium | `lib/grow/smartWatering.ts` |
| **Add "water more - windy conditions" logic** | Easy | `lib/grow/smartWatering.ts` |
| Connect to smart tasks system | Medium | `lib/grow/smartTasks.ts` |

#### Week 5b: Wind-Aware Task Scheduling
| Task | Effort | Files |
|------|--------|-------|
| Create `calculateWindImpact()` function | Easy | `lib/grow/windAwareness.ts` |
| Add wind warnings to task cards | Easy | Component updates |
| Suggest rescheduling for wind-sensitive tasks | Medium | `lib/grow/smartTasks.ts` |
| Create `WindAlertBanner` component | Easy | `components/grow/WindAlertBanner.tsx` |
| Add "better tomorrow" forecasting | Medium | Look-ahead logic |

#### Week 6: Frost Alerts
| Task | Effort | Files |
|------|--------|-------|
| Create `checkFrostRisk()` function | Easy | `lib/grow/frostAlerts.ts` |
| Build `FrostAlertBanner` component | Medium | `components/grow/FrostAlertBanner.tsx` |
| Identify user's tender plants | Easy | Query `grow_user_plants` |
| Create frost protection task in smart tasks | Easy | `lib/grow/smartTasks.ts` |
| Add push notification trigger | Hard | Service worker + notification API |
| Gate detailed alerts behind BLOOM | Easy | Show "Frost risk detected" free, details paid |

#### Week 7: Weather Threat Engine
| Task | Effort | Files |
|------|--------|-------|
| Populate weather rules in `garden_threat` | Medium | Database update |
| Create `evaluateWeatherThreatRules()` | Medium | `lib/grow/threats/weatherRules.ts` |
| Add rules for: Late blight, Powdery mildew, Aphids, Slugs | Medium | Data + logic |
| Connect to existing ThreatCard component | Easy | Already built |
| Add "conditions match" explanations | Easy | UI text |
| Gate weather-triggered threats behind BLOOM | Easy | Filter by tier |

---

### Phase 3: Harvest & Productivity (Weeks 8-10)

#### Week 8: Harvest Tracking
| Task | Effort | Files |
|------|--------|-------|
| Create `grow_harvests` table | Easy | `supabase/migrations/` |
| Build `HarvestLogModal` component | Medium | `components/grow/HarvestLogModal.tsx` |
| Create harvest API endpoints | Medium | `pages/api/grow/harvests/` |
| Build `HarvestHistoryCard` component | Medium | `components/grow/HarvestHistoryCard.tsx` |
| Add season totals calculation | Easy | SQL aggregation |
| Year-over-year comparison | Medium | Query logic |

#### Week 9: Analytics Dashboard
| Task | Effort | Files |
|------|--------|-------|
| Create `AnalyticsPage` | Medium | `pages/grow/analytics.tsx` |
| Task completion rate chart | Medium | Use existing chart library |
| Harvest productivity charts | Medium | |
| Garden health trends | Medium | |
| Season comparison view | Medium | |

#### Week 10: Guild Database Integration
| Task | Effort | Files |
|------|--------|-------|
| Create API to fetch guilds from database | Easy | `pages/api/grow/guilds/` |
| Update `lib/grow/guild.ts` to use API | Easy | `lib/grow/guild.ts` |
| Filter guilds by user's climate zone | Easy | Query param |
| Match user's plants to available focal plants | Medium | `lib/grow/guildSuggestions.ts` |
| Enhance GuildModal to show all 84 guilds | Medium | `components/grow/GuildModal.tsx` |

---

### Phase 4: Advanced Features (Weeks 11-14)

#### Week 11: AI Expert
| Task | Effort | Files |
|------|--------|-------|
| Create `grow_expert_questions` table | Easy | `supabase/migrations/` |
| Build expert question API (GPT-4 + context) | Medium | `pages/api/grow/ask-expert.ts` |
| Create `AskExpertModal` component | Medium | `components/grow/AskExpertModal.tsx` |
| Include garden context in prompt | Medium | Build context from user data |
| Limit to 2/month for HARVEST tier | Easy | Usage tracking |

#### Week 12: Multi-Garden + Bed Management
| Task | Effort | Files |
|------|--------|-------|
| Create `grow_gardens` table | Easy | `supabase/migrations/` |
| Create `grow_beds` table with microclimate conditions | Easy | `supabase/migrations/` |
| Add `garden_id` and `bed_id` to `grow_user_plants` | Easy | Migration |
| Build garden selector UI | Medium | `components/grow/GardenSelector.tsx` |
| Build bed management UI (create/edit/delete) | Medium | `components/grow/BedManager.tsx` |
| Build bed selector for plant assignment | Easy | `components/grow/BedSelector.tsx` |
| Create plant recommendation engine for bed conditions | Medium | `lib/grow/bedRecommendations.ts` |
| Build "Plants for this bed" suggestion component | Medium | `components/grow/BedRecommendations.tsx` |
| Add bed-specific weather alerts | Medium | `lib/grow/bedAlerts.ts` |
| Update all queries for garden/bed filtering | Medium | Multiple files |

#### Week 13: Yield Predictions
| Task | Effort | Files |
|------|--------|-------|
| Create yield prediction model | Hard | `lib/grow/yieldPrediction.ts` |
| Factor in: plant count, weather quality, care adherence | Hard | |
| Build prediction UI | Medium | `components/grow/YieldPredictionCard.tsx` |

#### Week 14: Crop Rotation
| Task | Effort | Files |
|------|--------|-------|
| Add bed/plot location tracking | Medium | Schema + UI |
| Build rotation rules by plant family | Medium | `lib/grow/cropRotation.ts` |
| Create 3-year rotation planner UI | Hard | `components/grow/RotationPlanner.tsx` |

---

## Part 6: Database Changes

### New Tables

```sql
-- AI usage tracking
CREATE TABLE grow_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  month TEXT NOT NULL,  -- YYYY-MM
  plant_id_calls INTEGER DEFAULT 0,
  pest_disease_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Harvest tracking
CREATE TABLE grow_harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_id UUID REFERENCES grow_user_plants,
  date DATE NOT NULL,
  amount_value DECIMAL,
  amount_unit TEXT, -- kg, lbs, count
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Multi-garden support
CREATE TABLE grow_gardens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  soil_type TEXT,
  sun_exposure TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Garden beds with per-bed microclimate conditions
CREATE TABLE grow_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  garden_id UUID REFERENCES grow_gardens,
  name TEXT NOT NULL,
  description TEXT,
  length_cm INTEGER,
  width_cm INTEGER,
  shape TEXT DEFAULT 'rectangle',
  sun_exposure TEXT NOT NULL DEFAULT 'full_sun',  -- full_sun, partial_shade, full_shade, dappled
  soil_type TEXT DEFAULT 'loam',            -- clay, sandy, loam, chalky, peat
  moisture_level TEXT DEFAULT 'moderate',   -- dry, moderate, moist, wet
  drainage TEXT DEFAULT 'good',             -- poor, moderate, good, excellent
  is_raised BOOLEAN DEFAULT false,
  is_covered BOOLEAN DEFAULT false,         -- greenhouse, polytunnel
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link plants to beds
ALTER TABLE grow_user_plants ADD COLUMN bed_id UUID REFERENCES grow_beds;

-- Expert questions
CREATE TABLE grow_expert_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  question TEXT NOT NULL,
  garden_context JSONB,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);
```

### Profile Changes

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN grow_subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN grow_subscription_type TEXT; -- monthly, annual, lifetime
```

---

## Part 7: Files to Create/Modify

### New Files
```
/lib/grow/subscription.ts              - Subscription logic
/hooks/useGrowSubscription.ts          - React hook for subscription state
/components/grow/premium/GrowPremiumGate.tsx
/components/grow/premium/UpgradePrompt.tsx
/components/grow/premium/PricingCard.tsx
/pages/grow/premium.tsx                - Pricing page
/pages/api/grow/subscription/          - Subscription API endpoints
/lib/grow/featureGating.ts             - Feature limit enforcement
/lib/grow/usageTracking.ts             - AI usage tracking
/lib/grow/soilTemperature.ts           - Soil temp logic
/lib/grow/smartWatering.ts             - Weather-aware watering
/lib/grow/frostAlerts.ts               - Frost detection
/components/grow/SoilTemperatureCard.tsx
/components/grow/SmartWateringCard.tsx
/components/grow/FrostAlertBanner.tsx
/components/grow/HarvestLogModal.tsx
/pages/grow/analytics.tsx
/components/grow/BedManager.tsx             - Create/edit/delete beds
/components/grow/BedSelector.tsx            - Assign plants to beds
/components/grow/BedRecommendations.tsx     - Plants recommended for bed conditions
/lib/grow/bedRecommendations.ts             - Recommendation engine for bed conditions
/lib/grow/bedAlerts.ts                      - Bed-specific weather alerts
```

### Modify Files
```
/lib/grow/api.ts                       - Add usage tracking to AI calls
/lib/grow/guild.ts                     - Use database instead of hardcoded
/components/grow/Homepage.tsx          - Add upgrade prompts
/components/grow/WeatherPage.tsx       - Gate soil temp behind premium
/components/grow/GardenPage.tsx        - Enforce plant limits
/pages/api/grow/identify-plant.ts      - Add usage limits
/pages/api/grow/threats/               - Gate behind premium
```

### Reuse from Findr
```
/lib/stripe/server.ts                  - Stripe client (as-is)
/lib/stripe/client.ts                  - Browser Stripe (as-is)
/pages/api/stripe/webhook.ts           - Modify for Grow events
/lib/offline/subscriptionCache.ts      - Reuse pattern
/hooks/useSubscription.ts              - Reference for Grow version
```

---

## Part 8: Upgrade Trigger Points

### High-Converting Moments
1. **26th plant added** → "Upgrade to track more plants"
2. **6th AI identification** → "You've used 5 of 5 free IDs this month"
3. **Frost predicted** → "⚠️ Frost risk detected. Upgrade to see 48-hour alerts"
4. **User views soil temp** → "Soil temperature is a BLOOM feature"
5. **High pest risk** → "Blight conditions detected. Upgrade to see treatment plan"
6. **After 30 days active** → "You've completed 47 tasks! See your garden analytics"
7. **User searches guilds** → "Access all 84 permaculture guilds with BLOOM"
8. **3rd bed created** → "Create more beds with SPROUT (5 beds) or BLOOM (10 beds)"
9. **Plant added to bed** → "Upgrade for smart plant recommendations based on your bed conditions"

---

## Part 9: Revenue Projections

### Year 1 (Conservative)
| Metric | Value |
|--------|-------|
| Active users EOY | 25,000 |
| Conversion rate | 3% |
| Paying users | 750 |
| ARPU | €45 |
| Annual Revenue | €33,750 |
| AI costs (~20%) | €6,750 |
| Gross profit | €27,000 |

### Year 2 (Moderate)
| Metric | Value |
|--------|-------|
| Active users EOY | 150,000 |
| Conversion rate | 5% |
| Paying users | 7,500 |
| ARPU | €55 |
| Annual Revenue | €412,500 |

### Year 3 (Aggressive)
| Metric | Value |
|--------|-------|
| Active users EOY | 400,000 |
| Conversion rate | 6% |
| Paying users | 24,000 |
| ARPU | €60 |
| Annual Revenue | €1,440,000 |

---

## Part 10: Success Metrics

### Phase 1 Targets (Monetization)
- Conversion rate: 2%+
- Monthly churn: <5%
- NPS (paid users): 40+

### Phase 2 Targets (Weather Moats)
- Conversion rate: 4%+
- Weather feature engagement: 40% of BLOOM users weekly
- Frost alert acknowledgment: 80%

### Phase 3 Targets (Productivity)
- Conversion rate: 6%+
- Harvests logged: 10+ per user per season
- Analytics page visits: 50% of HARVEST users monthly

### Feature-Specific Metrics

| Feature | Success Metric | Target |
|---------|---------------|--------|
| Soil Temperature | Weekly active views | 60% of BLOOM users |
| Frost Alerts | Alert acknowledgment rate | 80% |
| Smart Watering | "Helpful" feedback | 75% |
| Weather Threats | Threat confirmation rate | 50% |
| Harvest Tracking | Harvests logged per user | 10+ per season |
| Yield Predictions | Prediction accuracy | Within 25% of actual |

---

## Part 11: Anti-Competitive Defenses

### If Planta Tries to Add Weather Integration
- They need 12-18 months to rebuild architecture
- By then we have 18+ months of weather-outcome training data
- They still won't have soil temperature

### If PlantIn Drops Prices
- Don't match - emphasize value difference
- "PlantIn tells you what plant this is. Grow Daisy tells you if it will survive."

### If VC-Funded Competitor Enters
- Data moat is defensible (user-generated, location-specific)
- Community features create switching costs
- Ecosystem integrations take years to build

### Time to Replicate Our Moats
- Weather-integrated tasks: 18-24 months
- Soil temperature integration: 12 months (if they know about Open-Meteo)
- Threat engine with weather rules: 12-18 months
- Data network effects: 3-5 years (we start collecting now)

---

## Quick Wins (Ship in Days)

1. **Gate soil temperature** - Data exists, just hide from free users
2. **Gate extended forecast** - Show 3-day free, 7-day paid
3. **Photo limits** - Easy database query
4. **Plant count limits** - Easy database query
5. **Elevation calendar** - Already built, just gate it
6. **Wire up 84 guilds** - Data in database, just need API

---

## Summary

**What we're building:** The only gardening app that uses REAL weather data to tell gardeners EXACTLY what to do, EXACTLY when to do it.

**Our unfair advantage:** We already have the weather data, soil data, and threat architecture. Competitors would need 18-24 months to catch up.

**The strategy:** Give away what competitors charge for (plant ID, photos, notifications). Charge for what only we can provide (soil temp, frost alerts, weather threats, harvest tracking).

**Timeline:** 14 weeks to full implementation. First revenue in Week 3.
