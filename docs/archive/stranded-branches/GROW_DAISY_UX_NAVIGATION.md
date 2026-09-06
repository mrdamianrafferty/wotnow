# Grow Daisy: Navigation & UX Design

**Date:** November 12, 2025
**Purpose:** Define navigation structure, swipeable task cards, and urgency calculation
**Status:** Design Specification

---

## Table of Contents

1. [Navigation Structure](#navigation-structure)
2. [Home Dashboard Design](#home-dashboard-design)
3. [Swipeable Task Cards](#swipeable-task-cards)
4. [Task Urgency Algorithm](#task-urgency-algorithm)
5. [Section Details](#section-details)
6. [UI Component Specifications](#ui-component-specifications)

---

## Navigation Structure

### Primary Navigation (Bottom Nav Bar)

```
┌────────────────────────────────────────────────┐
│                                                │
│              Main Content Area                 │
│                                                │
├────────────────────────────────────────────────┤
│  🏠      📅      🌱      🌤️      ℹ️          │
│ Home  Calendar  Gallery  Weather  Info        │
└────────────────────────────────────────────────┘
```

#### 1. **🏠 Home** (Default Landing)
**Purpose:** What to do RIGHT NOW - actionable task feed

**Components:**
- Swipeable task cards (top half of screen)
- Urgency-ordered task list (bottom half)
- Quick stats bar (zones active, plants tracked, harvest ready)

**Mental Model:** "Open app → See what to do today → Swipe → Done"

---

#### 2. **📅 Calendar** (Planning & Forecasting)
**Purpose:** Look ahead, plan seasons, order seeds

**Tabs:**
- **Month View**: Planting windows, frost dates, harvest predictions
- **Season View**: Crop rotation planning, succession planting
- **Year View**: Frost-free periods, regional growing zones

**Features:**
- Moon phase overlay on calendar
- "Order seeds" reminders (8 weeks before planting)
- Frost date predictions with confidence intervals
- GDD accumulation timeline for planted items

**Mental Model:** "When should I start tomatoes indoors? When will carrots be ready?"

---

#### 3. **🌱 Gallery** (Plant ID & Browse)
**Purpose:** Identify plants, browse plant database, manage favorites

**Tabs:**
- **Identify**: Camera-based plant ID (PlantNet integration?)
- **Browse**: Searchable plant database (filter by season, difficulty, sun)
- **Favorites**: Saved plants for quick access
- **My Garden**: Currently planted items with photos

**Features:**
- AR plant visualization (future)
- Companion planting suggestions
- "Plants for your conditions" (filtered by current soil/weather)

**Mental Model:** "What is this plant? What should I grow next?"

---

#### 4. **🌤️ Weather** (Gardeners' Conditions)
**Purpose:** Environmental data optimized for gardening decisions

**Gardener-Specific Weather:**
- **Soil Conditions** (4-depth temp + moisture) ⭐ KILLER FEATURE
- **Frost Risk** (48h forecast + seasonal dates)
- **Watering Needs** (evapotranspiration + rain forecast)
- **Pest Pressure** (temperature + humidity alerts)
- **UV Index** (for outdoor work safety)
- **Moon Phase** (lunar planting calendar)

**NOT Generic Weather:**
- ❌ "It's 22°C and sunny" → ✅ "Perfect planting day: soil 15°C, moist, no frost for 10 days"
- ❌ "60% humidity" → ✅ "Slug risk HIGH - check lettuce tonight"
- ❌ "5mm rain forecast" → ✅ "Skip watering - 8mm rain tonight covers tomatoes' needs"

**Mental Model:** "Should I water today? Is it safe to plant?"

---

#### 5. **ℹ️ Info** (Settings & Help)
**Purpose:** Account, zones, preferences, help

**Sections:**
- **My Zones**: Manage garden locations (add/edit/archive)
- **Settings**: Notifications, language, units
- **Account**: Subscription, profile
- **Learn**: Growing guides, tips, tutorials
- **Support**: FAQ, contact

---

## Home Dashboard Design

### Layout (Mobile-First)

```
┌─────────────────────────────────────────┐
│ ☀️ Good Morning, Damian                 │  ← Personalized greeting
│ 3 tasks need attention today           │  ← Summary
├─────────────────────────────────────────┤
│                                         │
│    [ Swipeable Task Cards ]             │  ← Main interaction
│         (Tinder-style)                  │     400px height
│                                         │
│      👈 Later      Today 👉             │  ← Swipe hints
│                                         │
├─────────────────────────────────────────┤
│ 🔥 URGENT (Today)                       │
│  • Water tomatoes: 12mm (soil dry)      │  ← Ordered task list
│                                   ✓ ⏰  │     Quick actions
│ ⚠️ HIGH (This Week)                     │
│  • Harvest lettuce (GDD 98%)            │
│  • Check brassicas for slugs            │
│                                         │
│ 📌 MEDIUM (This Month)                  │
│  • Prune apple tree                     │
│  • Fertilize tomatoes                   │
└─────────────────────────────────────────┘
```

---

## Swipeable Task Cards

### Card Structure (Adapt Findr's SpeciesCard)

```tsx
interface GardenTaskCard {
  id: string;
  task_type: 'water' | 'plant' | 'harvest' | 'prune' | 'fertilize' | 'protect' | 'pest_control';
  title: string;              // "Water Tomatoes"
  subtitle: string;           // "Raised Bed 1"
  urgency: 'critical' | 'high' | 'medium' | 'low';
  urgency_score: number;      // 0-100 (for sorting)

  // Visual
  icon: string;               // Emoji or icon name
  image_url?: string;         // Plant photo
  urgency_color: string;      // Red/Orange/Yellow/Green

  // Action details
  reason: string;             // "Soil dry (0.28 m³/m³, needs 0.35+)"
  action_detail: string;      // "Water 12mm (3.6L)"
  timing: string;             // "Before 10am to avoid midday stress"

  // Context
  zone_id?: string;
  zone_name?: string;
  planted_item_id?: string;
  plant_name?: string;

  // Weather/soil data
  conditions: {
    soil_moisture?: number;
    soil_temp?: number;
    air_temp?: number;
    frost_risk?: boolean;
    rain_forecast_mm?: number;
  };

  // Timing sensitivity
  time_window?: string;       // "Next 6 hours", "This week", "This month"
  deadline?: Date;            // Hard deadline (e.g., "before frost tonight")
}
```

### Swipe Gestures

**Swipe RIGHT (👉)** → Add to Today's Todo List
- Visual: Card slides right with green checkmark
- Action: Add to `today_tasks` with status `pending`
- Feedback: Haptic + "Added to today" toast
- Next card slides in from bottom

**Swipe LEFT (👈)** → Snooze / Do Later
- Visual: Card slides left with clock icon
- Action: Snooze for 1-7 days (depends on urgency)
  - Critical → Snooze 1 day
  - High → Snooze 3 days
  - Medium → Snooze 7 days
- Feedback: "We'll remind you in 3 days"
- Next card slides in

**Tap Card** → Expand for Details
- Full-screen modal with:
  - Why now? (rationale with data)
  - How to do it? (instructions)
  - Related tasks (e.g., "Also check for pests while watering")
  - Photo upload (log completion with photo)
  - Mark done / Snooze / Dismiss

### Card Examples

#### Example 1: Critical Watering Task
```
┌──────────────────────────────────────┐
│ 🔴 URGENT                            │
│                                      │
│       🍅                             │  ← Plant photo
│                                      │
│  Water Tomatoes                      │  ← Title
│  Raised Bed 1 • 6 plants             │  ← Subtitle
│                                      │
│  Soil dry at 9cm depth               │  ← Reason (data-driven!)
│  0.28 m³/m³ (needs 0.35+)            │
│                                      │
│  💧 Water 12mm (3.6L total)          │  ← Action detail
│  ⏰ Before 10am today                │  ← Timing
│                                      │
│        👈 Later      Today 👉        │
└──────────────────────────────────────┘
```

#### Example 2: Harvest Task
```
┌──────────────────────────────────────┐
│ 🟠 HIGH PRIORITY                     │
│                                      │
│       🥬                             │
│                                      │
│  Harvest Lettuce                     │
│  Garden • 12 heads                   │
│                                      │
│  Ready to harvest!                   │
│  GDD 98% complete (595/600)          │
│                                      │
│  ✂️ Cut at base, leave roots         │
│  📦 Best before they bolt            │
│                                      │
│        👈 Later      Today 👉        │
└──────────────────────────────────────┘
```

#### Example 3: Frost Protection
```
┌──────────────────────────────────────┐
│ 🔴 CRITICAL - Tonight!               │
│                                      │
│       🥶                             │
│                                      │
│  Protect from Frost                  │
│  All zones • 8 vulnerable plants     │
│                                      │
│  Frost forecast: -2°C at 4am         │
│  Tomatoes, peppers, basil at risk    │
│                                      │
│  🛡️ Cover with fleece or move pots  │
│  ⏰ Before sunset (6:30 PM)          │
│                                      │
│        👈 Later      Today 👉        │
└──────────────────────────────────────┘
```

#### Example 4: Planting Opportunity
```
┌──────────────────────────────────────┐
│ 🟢 OPTIMAL CONDITIONS                │
│                                      │
│       🥕                             │
│                                      │
│  Plant Carrots                       │
│  Perfect timing!                     │
│                                      │
│  Soil 15°C at 6cm (optimal 10-18°C)  │  ← Real-time soil data!
│  Moist, no frost for 10 days         │
│  🌙 Waning moon (root crops)         │  ← Lunar planting
│                                      │
│  🌱 Direct sow outdoors              │
│  📅 Harvest late August              │
│                                      │
│        👈 Later      Today 👉        │
└──────────────────────────────────────┘
```

---

## Task Urgency Algorithm

### Urgency Levels

**🔴 CRITICAL (Urgency Score: 90-100)**
- **Must be done today** to prevent damage/loss
- Examples:
  - Watering when soil moisture < critical threshold
  - Frost protection (frost forecast within 24h)
  - Harvest overripe crops (GDD >105%, visual signs of spoilage)
  - Pest outbreak (active infestation spreading)

**🟠 HIGH (Urgency Score: 70-89)**
- **Should be done this week** for optimal results
- Examples:
  - Watering when soil approaching dry threshold
  - Harvest crops at peak (GDD 95-105%)
  - Transplant root-bound seedlings
  - Pest control (high pressure conditions)
  - Planting in narrow seasonal window (closing soon)

**🟡 MEDIUM (Urgency Score: 40-69)**
- **Can be done this month** without major consequences
- Examples:
  - Fertilizing on schedule (not yet deficient)
  - Pruning within seasonal window (multiple weeks available)
  - Companion planting
  - General maintenance (staking, thinning)

**🟢 LOW (Urgency Score: 0-39)**
- **Optional or long-term planning**
- Examples:
  - Seed ordering (months ahead)
  - Garden redesign
  - Soil amendment (off-season)
  - Future crop planning

---

### Urgency Calculation Formula

```typescript
interface UrgencyFactors {
  soil_moisture_deficit: number;      // 0-1 (1 = critical)
  frost_risk_hours: number;           // Hours until frost (lower = more urgent)
  harvest_readiness_pct: number;      // GDD % (>100% = overripe)
  seasonal_window_pct: number;        // % of planting window remaining (0 = closing)
  pest_pressure: number;              // 0-1 (1 = active infestation)
  time_sensitivity: 'hours' | 'days' | 'weeks' | 'months';
}

function calculateUrgencyScore(task: GardenTask, factors: UrgencyFactors): number {
  let score = 0;

  // Base score by task type
  const baseScores = {
    water: 50,
    protect: 80,       // Frost/heat protection inherently urgent
    harvest: 60,
    pest_control: 70,
    plant: 40,
    fertilize: 30,
    prune: 30,
  };

  score = baseScores[task.task_type] || 40;

  // WATERING URGENCY
  if (task.task_type === 'water') {
    const deficit = factors.soil_moisture_deficit;

    if (deficit > 0.8) {
      score = 95; // Critical - wilting imminent
    } else if (deficit > 0.6) {
      score = 80; // High - stress starting
    } else if (deficit > 0.4) {
      score = 60; // Medium - getting dry
    } else {
      score = 30; // Low - preventive watering
    }

    // Rain forecast reduces urgency
    if (factors.rain_forecast_mm > 5) {
      score = Math.max(10, score - 40); // Rain covers needs
    }

    // Plant type modifiers
    if (task.plant_drought_tolerance === 'low') {
      score += 15; // Lettuce, basil can't skip watering
    }

    // Growth stage modifiers
    if (task.plant_stage === 'seedling') {
      score += 10; // Seedlings more sensitive
    } else if (task.plant_stage === 'flowering') {
      score += 10; // Fruit set critical
    }
  }

  // FROST PROTECTION URGENCY
  if (task.task_type === 'protect' && factors.frost_risk_hours) {
    if (factors.frost_risk_hours < 12) {
      score = 100; // Tonight! Critical!
    } else if (factors.frost_risk_hours < 24) {
      score = 95; // Tomorrow morning
    } else if (factors.frost_risk_hours < 48) {
      score = 85; // Day after tomorrow
    }
  }

  // HARVEST URGENCY
  if (task.task_type === 'harvest') {
    const readiness = factors.harvest_readiness_pct;

    if (readiness > 105) {
      score = 95; // Overripe - quality declining
    } else if (readiness > 98) {
      score = 80; // Peak - harvest now for best quality
    } else if (readiness > 90) {
      score = 60; // Almost ready - plan ahead
    } else {
      score = 30; // Still growing
    }

    // Weather modifiers
    if (factors.heavy_rain_forecast) {
      score += 15; // Harvest before rain (splitting/rotting risk)
    }

    if (factors.heat_wave_forecast) {
      score += 10; // Lettuce will bolt
    }
  }

  // PLANTING URGENCY
  if (task.task_type === 'plant') {
    const windowRemaining = factors.seasonal_window_pct;

    if (windowRemaining < 0.1) {
      score = 90; // Last chance this season!
    } else if (windowRemaining < 0.3) {
      score = 75; // Closing soon
    } else if (windowRemaining < 0.5) {
      score = 60; // Mid-season
    } else {
      score = 40; // Plenty of time
    }

    // Optimal conditions boost
    if (factors.soil_temp_optimal && factors.moon_phase_optimal) {
      score += 15; // Perfect conditions right now!
    }
  }

  // PEST CONTROL URGENCY
  if (task.task_type === 'pest_control') {
    if (factors.pest_pressure > 0.8) {
      score = 90; // Active infestation spreading
    } else if (factors.pest_pressure > 0.5) {
      score = 75; // High pressure, treat preventively
    } else {
      score = 50; // Monitoring only
    }
  }

  // TIME SENSITIVITY MULTIPLIER
  const timeSensitivityMultipliers = {
    hours: 1.2,    // Must do today
    days: 1.0,     // This week
    weeks: 0.8,    // This month
    months: 0.5,   // Planning ahead
  };

  score *= timeSensitivityMultipliers[factors.time_sensitivity];

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

---

### Example Urgency Calculations

#### Example 1: Watering Tomatoes
```typescript
{
  task_type: 'water',
  plant: 'Tomato',
  zone: 'Raised Bed 1',

  factors: {
    soil_moisture_deficit: 0.7,        // Actual 0.28, needs 0.35+ → 70% deficit
    rain_forecast_mm: 0,               // No rain forecast
    plant_drought_tolerance: 'medium',
    plant_stage: 'flowering',          // Fruit set - critical!
    time_sensitivity: 'hours',
  },

  calculation:
    base_score = 50 (watering)
    + 30 (deficit 0.7 → score 80)
    + 10 (flowering stage)
    * 1.2 (hours sensitivity)
    = 90 * 1.2 = 108 → capped at 100

  result: CRITICAL (100) ← Do today!
}
```

#### Example 2: Pruning Apple Tree
```typescript
{
  task_type: 'prune',
  plant: 'Apple Tree',
  zone: 'Orchard',

  factors: {
    seasonal_window_pct: 0.6,          // 60% of pruning window remaining (late winter)
    time_sensitivity: 'weeks',
  },

  calculation:
    base_score = 30 (pruning)
    * 0.8 (weeks sensitivity)
    = 24

  result: LOW (24) ← Can wait, plenty of time
}
```

#### Example 3: Harvest Lettuce
```typescript
{
  task_type: 'harvest',
  plant: 'Lettuce',
  zone: 'Garden',

  factors: {
    harvest_readiness_pct: 98,         // GDD 98% - peak!
    heat_wave_forecast: true,          // 30°C+ next 3 days
    time_sensitivity: 'days',
  },

  calculation:
    base_score = 60 (harvest)
    + 20 (readiness 98% → score 80)
    + 10 (heat wave - will bolt!)
    * 1.0 (days sensitivity)
    = 90

  result: HIGH (90) ← Harvest this week before bolting!
}
```

#### Example 4: Frost Protection
```typescript
{
  task_type: 'protect',
  plant: 'Tomatoes, Peppers, Basil',
  zone: 'All zones',

  factors: {
    frost_risk_hours: 8,               // Frost at 4am (8 hours away)
    frost_temp_forecast: -2,           // Hard frost
    time_sensitivity: 'hours',
  },

  calculation:
    base_score = 80 (protect)
    + 20 (frost < 12 hours → score 100)
    * 1.2 (hours sensitivity)
    = 100 * 1.2 = 120 → capped at 100

  result: CRITICAL (100) ← Cover plants before sunset!
}
```

---

## Section Details

### 📅 Calendar Section (Detailed)

#### Month View
```
┌──────────────────────────────────────┐
│  < May 2026 >                  🌙 ☀️ │  ← Moon/weather toggle
├──────────────────────────────────────┤
│  S   M   T   W   T   F   S          │
│          1🌱 2   3   4🌙  5          │  ← 1st: Plant lettuce
│  6   7   8   9  10  11  12          │     4th: Full moon
│ 13  14🥕15  16  17  18  19          │     14th: Plant carrots
│ 20  21  22  23  24  25🥶 26          │     25th: Last frost date
│ 27  28  29  30  31                  │
├──────────────────────────────────────┤
│ 🌱 Planting windows                  │  ← Legend
│ 🥕 Harvest predictions               │
│ 🥶 Frost dates                       │
│ 🌙 Moon phases                       │
└──────────────────────────────────────┘
```

#### Tap on Date → Daily Detail
```
┌──────────────────────────────────────┐
│ May 15, 2026                    🌙 ⚫ │  ← New moon (root crops)
├──────────────────────────────────────┤
│ 🌱 PLANT TODAY                       │
│  • Carrots (optimal soil 15°C)       │  ← Real-time recommendation
│  • Radishes (waning moon)            │
│                                      │
│ 🥕 HARVEST READY                     │
│  • Lettuce (GDD 98%)                 │
│  • Spinach (before bolting)          │
│                                      │
│ 📦 ORDER SEEDS                       │
│  • Tomato seeds (plant in 8 weeks)   │
│                                      │
│ 🌤️ CONDITIONS                        │
│  Soil: 15°C, moist (0.34 m³/m³)     │
│  Air: 18°C, no frost risk           │
└──────────────────────────────────────┘
```

#### Season View (Gantt Chart Style)
```
┌──────────────────────────────────────┐
│ Spring 2026 (Mar - May)              │
├──────────────────────────────────────┤
│ Mar     Apr     May                  │
│ |-------|-------|                    │
│                                      │
│ Lettuce ████████░░░░ (plant-harvest) │
│ Carrots    ████████████              │
│ Tomatoes      🌱██████████ (indoors) │
│ Peas    ██████░░░░                   │
│                                      │
│ ████ Growing   🌱 Indoors            │
│ ░░░░ Harvest   ❄️ Frost risk         │
└──────────────────────────────────────┘
```

---

### 🌱 Gallery Section (Plant ID & Browse)

#### Browse Tab
```
┌──────────────────────────────────────┐
│ 🔍 Search plants...                  │
├──────────────────────────────────────┤
│ Filters: ☀️ Full Sun | 🌡️ Cool | 🟢 Easy │
├──────────────────────────────────────┤
│                                      │
│ 🥬 Lettuce                      95%  │  ← Suitability score (current conditions)
│ Cool season • Easy • Harvest 45d    │
│ ✅ Perfect soil temp (12°C)          │  ← Real-time data!
│                                      │
│ 🥕 Carrots                      92%  │
│ Cool season • Medium • Harvest 70d  │
│ ✅ Soil warm enough (15°C)           │
│ 🌙 Optimal moon phase (waning)      │
│                                      │
│ 🍅 Tomatoes                     45%  │
│ Warm season • Medium • Harvest 80d  │
│ ❌ Soil too cold (12°C, needs 15°C)  │
│ ⏰ Wait 2 weeks                      │
└──────────────────────────────────────┘
```

#### Identify Tab (Camera)
```
┌──────────────────────────────────────┐
│  [Camera Viewfinder]                 │
│                                      │
│         📸                           │  ← Tap to capture
│                                      │
│  Point camera at plant               │
│                                      │
│  Or upload from gallery 🖼️           │
└──────────────────────────────────────┘

After capture:
┌──────────────────────────────────────┐
│ 🌿 Likely: Garden Mint (85%)         │
│ Mentha spicata                       │
├──────────────────────────────────────┤
│ [Plant Photo]                        │
├──────────────────────────────────────┤
│ ✅ Add to My Garden                  │  ← Quick add
│ 📖 View Growing Guide                │
│ ❤️ Save to Favorites                 │
└──────────────────────────────────────┘
```

---

### 🌤️ Weather (Gardeners' Conditions)

```
┌──────────────────────────────────────┐
│ Gardeners' Weather                   │
│ Today • Raised Bed 1                 │  ← Zone selector
├──────────────────────────────────────┤
│                                      │
│ 🌱 SOIL CONDITIONS                   │  ⭐ KILLER FEATURE
│ Surface (0cm):     12°C  ░░░▓▓▓ Moist│
│ Shallow (6cm):     11°C  ░░░▓▓▓      │
│ Root zone (18cm):  10°C  ░░▓▓▓▓      │
│ Deep (54cm):        9°C  ░▓▓▓▓▓      │
│                                      │
│ 💧 WATERING                          │
│ ✅ Skip today - soil moist            │
│ 🌧️ Rain forecast: 8mm tonight        │
│ Next check: May 17                   │
│                                      │
│ 🥶 FROST RISK                        │
│ ✅ No frost for next 10 days          │
│ Last frost: May 10 (5 days ago)     │
│ First frost: ~Oct 15 (150 days)     │
│                                      │
│ 🌙 LUNAR PLANTING                    │
│ New Moon (4% illuminated)            │
│ ✅ Optimal for root crops             │
│ Plant: Carrots, radishes, onions    │
│                                      │
│ 🐌 PEST PRESSURE                     │
│ ⚠️ Slug risk MODERATE                │
│ Temp 15°C + humid (70%)             │
│ Check: Lettuce, brassicas           │
│                                      │
│ ☀️ SUN & AIR                         │
│ Air temp: 18°C (feels like 18°C)    │
│ UV Index: 6 (High - wear sunscreen) │
│ Wind: 12 km/h W                     │
└──────────────────────────────────────┘
```

---

## UI Component Specifications

### SwipeableTaskCard Component

```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useState } from 'react';

interface SwipeableTaskCardProps {
  task: GardenTaskCard;
  onSwipeRight: (taskId: string) => void;  // Add to today
  onSwipeLeft: (taskId: string) => void;   // Snooze
  onTap: (taskId: string) => void;         // View details
}

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  onSwipeRight,
  onSwipeLeft,
  onTap,
}) => {
  const x = useMotionValue(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  // Visual feedback based on drag position
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Swipe thresholds
  const SWIPE_THRESHOLD = 100;

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;

    if (offset > SWIPE_THRESHOLD) {
      // Swipe right - Add to today
      setExitDirection('right');
      onSwipeRight(task.id);
    } else if (offset < -SWIPE_THRESHOLD) {
      // Swipe left - Snooze
      setExitDirection('left');
      onSwipeLeft(task.id);
    }
  };

  // Urgency color mapping
  const urgencyColors = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50',
  };

  const urgencyIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity }}
      initial={{ scale: 0, y: 50 }}
      animate={{
        scale: exitDirection ? 0 : 1,
        y: 0,
        x: exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onTap(task.id)}
      className={`
        relative w-full h-[400px] rounded-2xl border-4 p-6
        ${urgencyColors[task.urgency]}
        shadow-lg cursor-grab active:cursor-grabbing
      `}
    >
      {/* Urgency badge */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-white rounded-full text-sm font-bold">
        {urgencyIcons[task.urgency]} {task.urgency.toUpperCase()}
      </div>

      {/* Plant image or icon */}
      <div className="flex justify-center mt-12 mb-4">
        {task.image_url ? (
          <img src={task.image_url} alt={task.title} className="w-32 h-32 object-cover rounded-full" />
        ) : (
          <div className="text-6xl">{task.icon}</div>
        )}
      </div>

      {/* Title and subtitle */}
      <h3 className="text-2xl font-bold text-center mb-2">{task.title}</h3>
      <p className="text-md text-gray-600 text-center mb-4">{task.subtitle}</p>

      {/* Reason (data-driven!) */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-800">{task.reason}</p>
      </div>

      {/* Action detail */}
      <div className="flex items-center justify-center space-x-2 mb-2">
        <span className="text-lg">{task.action_detail}</span>
      </div>

      {/* Timing */}
      <div className="flex items-center justify-center space-x-2">
        <span className="text-sm text-gray-600">⏰ {task.timing}</span>
      </div>

      {/* Swipe hints */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 text-sm text-gray-500">
        <span>👈 Later</span>
        <span>Today 👉</span>
      </div>
    </motion.div>
  );
};
```

---

### TaskList Component

```tsx
interface TaskListProps {
  tasks: GardenTaskCard[];
  onMarkDone: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onMarkDone, onSnooze }) => {
  // Group by urgency
  const critical = tasks.filter(t => t.urgency === 'critical');
  const high = tasks.filter(t => t.urgency === 'high');
  const medium = tasks.filter(t => t.urgency === 'medium');

  return (
    <div className="space-y-6">
      {/* Critical tasks */}
      {critical.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center">
            <span className="mr-2">🔥</span> URGENT (Today)
          </h3>
          <div className="space-y-2">
            {critical.map(task => (
              <TaskRow key={task.id} task={task} onMarkDone={onMarkDone} onSnooze={onSnooze} />
            ))}
          </div>
        </div>
      )}

      {/* High priority tasks */}
      {high.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-orange-600 mb-2 flex items-center">
            <span className="mr-2">⚠️</span> HIGH (This Week)
          </h3>
          <div className="space-y-2">
            {high.map(task => (
              <TaskRow key={task.id} task={task} onMarkDone={onMarkDone} onSnooze={onSnooze} />
            ))}
          </div>
        </div>
      )}

      {/* Medium priority tasks */}
      {medium.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-yellow-600 mb-2 flex items-center">
            <span className="mr-2">📌</span> MEDIUM (This Month)
          </h3>
          <div className="space-y-2">
            {medium.map(task => (
              <TaskRow key={task.id} task={task} onMarkDone={onMarkDone} onSnooze={onSnooze} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskRow: React.FC<{
  task: GardenTaskCard;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
}> = ({ task, onMarkDone, onSnooze }) => {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow">
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-gray-600">{task.action_detail}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onMarkDone(task.id)}
          className="px-3 py-1 bg-green-500 text-white rounded-full text-sm"
        >
          ✓
        </button>
        <button
          onClick={() => onSnooze(task.id)}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded-full text-sm"
        >
          ⏰
        </button>
      </div>
    </div>
  );
};
```

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)
1. ✅ Navigation structure (bottom nav bar)
2. ✅ Home dashboard layout
3. ✅ Basic task card (no swipe yet)
4. ✅ Task list with urgency grouping
5. ✅ Urgency calculation algorithm (watering + frost)

### Phase 2: Swipeable Cards (Week 3)
1. ✅ Framer Motion swipe gestures
2. ✅ Card stack animation
3. ✅ Swipe feedback (haptics, toasts)
4. ✅ Task completion tracking

### Phase 3: Full Sections (Week 4-6)
1. ✅ Calendar section (month view, planting windows)
2. ✅ Gallery section (browse, favorites)
3. ✅ Weather section (gardeners' conditions)
4. ✅ Info section (settings, zones)

### Phase 4: Advanced Features (Week 7-8)
1. ✅ Plant ID camera integration
2. ✅ GDD-based harvest predictions
3. ✅ Pest pressure alerts
4. ✅ Lunar calendar integration

---

## User Flow Examples

### Flow 1: Morning Routine
```
1. Open app
   ↓
2. See "Good morning! 3 urgent tasks"
   ↓
3. Swipe card: "Water tomatoes - 12mm"
   → Swipe RIGHT (add to today)
   ↓
4. Next card: "Harvest lettuce (GDD 98%)"
   → Swipe RIGHT (add to today)
   ↓
5. Next card: "Prune apple tree"
   → Swipe LEFT (do later)
   ↓
6. View task list below cards
   ↓
7. Go to garden, complete tasks, mark done ✓
```

### Flow 2: Planning Weekend
```
1. Tap "Calendar" tab
   ↓
2. View May 2026
   ↓
3. See "Last frost: May 25"
   ↓
4. Tap May 27
   ↓
5. See "Optimal planting: Tomatoes, peppers"
   ↓
6. Tap "Order seeds" reminder
   ↓
7. Navigate to seed shop (affiliate link)
```

### Flow 3: What Can I Plant Today?
```
1. Tap "Gallery" tab
   ↓
2. Filter by "Full Sun" + "Easy"
   ↓
3. See lettuce at 95% suitability
   ↓
4. Tap lettuce card
   ↓
5. See: "Perfect soil temp (12°C), moist, no frost"
   ↓
6. Tap "Add to My Garden"
   ↓
7. Select zone "Raised Bed 1"
   ↓
8. Confirm planting date: Today
   ↓
9. Task added: "Plant lettuce - Raised Bed 1"
```

---

**Document Version:** 1.0
**Last Updated:** November 12, 2025
**Author:** Claude Code
**Status:** Design Specification - Ready for Review
