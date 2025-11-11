# Grow Daisy Implementation Guide

**Status**: Planning Phase
**Created**: 2025-01-11
**App Family**: Go Daisy → Grow Daisy (gardening specialist)

---

## Executive Summary

**Grow Daisy** is the third app in the Go Daisy family, following the specialist pattern established by Findr. While Go Daisy provides general outdoor activity recommendations and Findr focuses on fishing predictions, Grow Daisy will specialize in **weather-informed gardening guidance**.

**Core Value Proposition**: Tell gardeners what to do *right now* based on weather, season, and their specific plants.

**Target Domain**: `growdaisy.io`
**Platform**: Web PWA initially, native apps later (following Go Daisy/Findr pattern)

---

## Table of Contents

1. [Navigation & User Experience](#navigation--user-experience)
2. [Feature Specifications](#feature-specifications)
3. [Data Architecture](#data-architecture)
4. [API Integration Points](#api-integration-points)
5. [Component Reuse Strategy](#component-reuse-strategy)
6. [Database Schema](#database-schema)
7. [Implementation Phases](#implementation-phases)
8. [Technical Specifications](#technical-specifications)
9. [Open Questions & Decisions](#open-questions--decisions)

---

## Navigation & User Experience

### Mobile Navigation (Bottom Nav - 5 Items)

Following Findr's proven mobile-first pattern with touch-optimized 48px tap targets:

```
┌─────────────────────────────────────────────────────┐
│ 🏡 Today  📅 Plan  🌱 Garden  🌤️ Conditions  ℹ️ Info │
└─────────────────────────────────────────────────────┘
```

**Routes**:
- `/grow` → Today's tasks (home)
- `/grow/calendar` → Planning & calendar
- `/grow/garden` → My plants gallery
- `/grow/conditions` → Gardeners' weather
- `/grow/info` → Info pages

### Desktop Navigation (Horizontal Menu)

Following Findr's horizontal menu pattern (`components/findr/FindrNavigationMobile.tsx`):

```
┌────────────────────────────────────────────────────────────────┐
│ [Grow Daisy Logo] Today | Plan | Garden | Conditions | Info   │
│                                   [Zone/Location] [User] [Lang] │
└────────────────────────────────────────────────────────────────┘
```

### Navigation Components to Create

**New files** (following Findr pattern):
- `components/grow/GrowNavigation.tsx` (based on `FindrNavigationMobile.tsx`)
- `components/grow/GrowUserMenu.tsx` (based on `FindrUserMenu.tsx`)
- `components/grow/ZoneDisplay.tsx` (adapted from Findr's `LocationDisplay.tsx`)
- `components/GrowFooter.tsx` (based on `FindrFooter.tsx`)

---

## Feature Specifications

### 1. Today Page (`/grow`) - "What to Do Now"

**Purpose**: Show weather-informed gardening tasks for today based on user's location, hardiness zone, season, and plant inventory.

#### Hero Task Card

Similar to Go Daisy's hero activity pattern (`pages/index.tsx:836-904`):

**Structure**:
```tsx
┌─────────────────────────────────────────────┐
│ [Weather Icon]                    [Date]    │
│                                              │
│ 🍅 Water Tomatoes                           │
│ "Dry spell incoming - deep water tonight"   │
│                                    [95% 💯] │
│                                              │
│ Also Perfect Today:                          │
│ • ✂️ Prune roses (92%)                       │
│ • 🌱 Transplant seedlings (88%)              │
│                                              │
│ Good Options:                                │
│ • 🦗 Check for pests (75%)                   │
│ • 🍃 Weed garden beds (68%)                  │
│                                              │
│ Alerts:                                      │
│ ⚠️ Frost warning tonight - protect tender   │
│    plants before 8 PM                        │
└─────────────────────────────────────────────┘
```

**Key Elements**:
- **Weather context**: Temperature, precipitation, wind (from OpenWeather API)
- **Task urgency score** (0-100): Based on weather window + plant needs
- **Time-sensitive alerts**: Frost warnings, watering deadlines, harvest windows
- **Plant-specific tasks**: Only show tasks relevant to user's garden
- **Swipeable multi-day view**: Today, tomorrow, next 7 days

#### Task Scoring Algorithm

Similar to Findr's bite score calculation (`lib/findr/mapPrediction.ts`):

```typescript
interface TaskScore {
  taskId: string;
  score: number; // 0-100
  urgency: 'critical' | 'optimal' | 'good' | 'neutral';
  reasoning: string[];
  weatherFactors: {
    temperatureScore: number;
    moistureScore: number;
    windScore: number;
    timingScore: number;
  };
}
```

**Scoring factors**:
1. **Weather window** (40%): Is today optimal for this task?
   - Watering: High after dry spell, low before rain
   - Pruning: High on dry days, low when wet
   - Planting: Optimal soil temp + moisture
2. **Plant need** (30%): How urgently does plant need attention?
   - Days since last watering
   - Growth stage (seedling vs. established)
   - Pest pressure indicators
3. **Seasonal timing** (20%): Is this the right time of year?
   - Planting windows for hardiness zone
   - Pruning seasons (dormant vs. growing)
4. **Forecast optimization** (10%): Will conditions worsen?
   - Frost coming (urgent protection)
   - Heat wave (urgent watering)
   - Rain forecast (delay watering)

#### Components to Build

**New components**:
- `components/grow/TaskCard.tsx` (based on Go Daisy's activity card)
- `components/grow/TaskModal.tsx` (detailed task guidance)
- `components/grow/WeatherAlert.tsx` (frost/heat warnings)
- `components/grow/PlantNeedIndicator.tsx` (visual water/feed gauge)

**Reusable from Go Daisy**:
- Weather fetching hook (`hooks/useFetchForecastData` from `pages/index.tsx:168`)
- Day label utilities (`getDayLabel`, `pages/index.tsx:321`)
- Card styling patterns (`.activity-card-enhanced`, globals.css)

---

### 2. Calendar/Planning Page (`/grow/calendar`)

**Purpose**: Forward-looking planting schedule, frost dates, seed ordering reminders.

#### Monthly Calendar View

```
┌─────────────────────────────────────────────────────────┐
│ < May 2025 >                     [Zone 7b] [Add Event]  │
├─────────────────────────────────────────────────────────┤
│ Sun  Mon  Tue  Wed  Thu  Fri  Sat                       │
├─────────────────────────────────────────────────────────┤
│           1    2    3    4    5                          │
│                   🌱   🍅                                 │
│      6    7    8    9   10   11   12                     │
│                               ❄️                          │
│     13   14   15  [16]  17   18   19                     │
│           ✂️               🌾                             │
│     20   21   22   23   24   25   26                     │
│                                                          │
│     27   28   29   30   31                               │
└─────────────────────────────────────────────────────────┘

Legend:
🌱 Planting windows    ❄️ Frost risk    ✂️ Pruning tasks
🍅 Harvest ready       🌾 Fertilize     💧 Watering schedule
```

#### Planting Windows

Based on hardiness zone data + local weather averages:

**Data sources**:
- USDA Hardiness Zone Database (JSON/API)
- Last/first frost dates by ZIP code
- Growing degree days (GDD) calculations
- Historical weather data (30-year averages)

**Example planting window**:
```typescript
interface PlantingWindow {
  crop: string;
  scientificName: string;
  sowIndoorsStart: string; // ISO date
  sowIndoorsEnd: string;
  transplantStart: string;
  transplantEnd: string;
  directSowStart: string;
  directSowEnd: string;
  harvestStart: string; // Calculated from DTM (days to maturity)
  harvestEnd: string;
  soilTempMin: number; // °F
  soilTempOptimal: number;
  frostTolerance: 'tender' | 'hardy' | 'semi-hardy';
}
```

**Example for Tomatoes in Zone 7b**:
```json
{
  "crop": "Tomato",
  "scientificName": "Solanum lycopersicum",
  "sowIndoorsStart": "2025-03-15",
  "sowIndoorsEnd": "2025-04-15",
  "transplantStart": "2025-05-10",
  "transplantEnd": "2025-06-01",
  "directSowStart": null,
  "directSowEnd": null,
  "harvestStart": "2025-07-15",
  "harvestEnd": "2025-10-01",
  "soilTempMin": 50,
  "soilTempOptimal": 70,
  "frostTolerance": "tender"
}
```

#### Seed Shopping List

Generated from calendar + user's plant selections:

```
┌─────────────────────────────────────────────┐
│ Seeds to Order by March 1:                  │
├─────────────────────────────────────────────┤
│ □ Tomato - 'Brandywine' (6 plants)          │
│ □ Pepper - 'Jalapeño' (4 plants)            │
│ □ Basil - 'Genovese' (1 packet)             │
│                                              │
│ [Export to PDF] [Email List] [Share]        │
└─────────────────────────────────────────────┘
```

#### Components to Build

**New components**:
- `components/grow/CalendarView.tsx` (monthly grid)
- `components/grow/PlantingWindowCard.tsx` (crop-specific timeline)
- `components/grow/FrostDateIndicator.tsx` (countdown to last frost)
- `components/grow/ShoppingList.tsx` (seed/supply list)
- `components/grow/SeasonalGuide.tsx` (month-by-month tasks)

**Data models**:
- Crop planting database (600+ common vegetables/flowers)
- Zone-specific frost dates (5,000+ US locations)
- Growing calendar templates (by zone)

---

### 3. Garden Gallery (`/grow/garden`) - "My Plants"

**Purpose**: User's plant inventory, growth tracking, photo journal.

#### Two-Tab Interface

Following Findr's modal pattern (`pages/findr/index.tsx:1372-1395`):

**Tab 1: My Garden**
- Grid/list of user's plants
- Photos, planting dates, notes
- Health status indicators
- Quick actions (water, fertilize, harvest)

**Tab 2: Identify**
- Camera integration for plant/pest ID
- AI recognition (future: integrate vision API)
- "Add to garden" after successful ID

#### Plant Card

Similar to Findr's species card (`pages/findr/index.tsx:1152-1291`):

```tsx
┌─────────────────────────────────────────────────────┐
│ [Photo]  Tomato 'Brandywine'         [Edit] [❤️]    │
│          Planted: May 10, 2025       Day 35         │
│                                                      │
│ Health: ●●●●○ (Good)                                 │
│                                                      │
│ Last Tasks:                                          │
│ • Watered: 2 days ago                                │
│ • Fertilized: 12 days ago                            │
│ • Pruned: Never                                      │
│                                                      │
│ Next Actions:                                        │
│ • 💧 Water in 1 day                                  │
│ • 🍃 Remove suckers (due now)                        │
│ • 🌾 Feed in 2 days                                  │
│                                                      │
│ Growth Stage: Flowering → Fruiting (2 weeks)        │
│ Expected Harvest: July 15 - Sept 1                  │
│                                                      │
│ [Log Task] [Add Photo] [View History]               │
└─────────────────────────────────────────────────────┘
```

#### Plant Data Model

```typescript
interface UserPlant {
  id: string; // UUID
  userId: string; // FK to auth.users
  speciesId: string; // FK to plant_species
  commonName: string;
  variety?: string; // e.g., 'Brandywine', 'Big Boy'
  nickname?: string; // User's custom name
  plantedDate: string; // ISO date
  location: 'indoor' | 'outdoor' | 'greenhouse';
  bedName?: string; // "Raised Bed 1", "North Garden"
  quantity: number; // Number of plants
  photos: string[]; // Array of image URLs
  notes: string;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  lastWatered?: string;
  lastFertilized?: string;
  lastPruned?: string;
  harvestLog: {
    date: string;
    quantity: number;
    units: 'lbs' | 'oz' | 'count';
    notes: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
```

#### Components to Build

**New components**:
- `components/grow/PlantCard.tsx` (individual plant display)
- `components/grow/PlantModal.tsx` (detailed plant view)
- `components/grow/PlantHealthGauge.tsx` (visual health indicator)
- `components/grow/GrowthTimeline.tsx` (seedling → harvest timeline)
- `components/grow/TaskLogger.tsx` (log watering, feeding, etc.)
- `components/grow/HarvestLogger.tsx` (record yields)
- `components/grow/PlantIdentifier.tsx` (camera + AI)

**Reusable from Findr**:
- Favorites/gallery pattern (`pages/findr/favourites.tsx`)
- Catch logging system (`pages/findr/log.tsx`, `pages/findr/my-catches.tsx`)
- Image upload patterns
- Modal system (`components/findr/Modal.tsx`, `FishSpeciesModal.tsx`)

---

### 4. Conditions Page (`/grow/conditions`) - "Gardeners' Weather"

**Purpose**: Weather data tailored for gardening decisions.

#### Key Metrics (Beyond Standard Weather)

Following Findr's conditions approach (`pages/findr/conditions.tsx`):

**Gardening-Specific Data**:

1. **Soil Temperature**
   - Current soil temp (4-inch depth)
   - Min/max for past 7 days
   - Planting readiness indicators
   - Formula: Soil temp ≈ (Air temp + Ground temp) / 2, lag factor
   - API: Some weather services provide soil temp, else estimate

2. **Soil Moisture**
   - Dry → Moist → Saturated scale
   - Calculated from: Recent rain + evapotranspiration + irrigation
   - Formula: `moisture = (rainfall_mm - ET_mm) / field_capacity`
   - Visual: Progress bar or gauge

3. **Growing Degree Days (GDD)**
   - Accumulated heat units for crop development
   - Formula: `GDD = (Tmax + Tmin) / 2 - Tbase`
   - Base temps vary by crop (50°F for tomatoes, 40°F for peas)
   - Track vs. crop maturity requirements

4. **Evapotranspiration (ET)**
   - Water loss from soil + plants
   - Indicates irrigation needs
   - Penman-Monteith equation or simplified FAO method
   - API: Some ag weather services provide ET

5. **Day Length (Photoperiod)**
   - Sunrise/sunset times
   - Hours of daylight
   - Critical for day-neutral/short-day/long-day plants
   - Calculate from lat/lon + date

6. **Frost Risk**
   - Probability next 10 days
   - Based on forecast lows + dew point
   - Critical alerts for tender plants

7. **Heat Stress Index**
   - Temperature + humidity combination
   - Plant stress indicators
   - Similar to "feels like" for humans

8. **UV Index**
   - For sun-sensitive plants
   - Gardener sun protection
   - Already in Go Daisy pollen data

9. **Wind Chill/Wind Speed**
   - Affects watering evaporation
   - Transplant shock risk
   - Support needs for tall plants

10. **Pollen Count**
    - Already integrated in Go Daisy (`pages/index.tsx:141-149`)
    - Affects pollination success
    - Gardener allergy awareness

#### Conditions Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│ Conditions for Your Garden - Zone 7b, Richmond, VA  │
├──────────────────────────────────────────────────────┤
│                                                       │
│ SOIL CONDITIONS                                       │
│ ┌─────────────────┬─────────────────┬──────────────┐│
│ │ Temperature     │ Moisture        │ GDD          ││
│ │ 65°F            │ ■■■■□□ Moist    │ 124 / 2500   ││
│ │ ↗ +3° today     │ Water in 2 days │ Tomato stage ││
│ └─────────────────┴─────────────────┴──────────────┘│
│                                                       │
│ WEATHER WINDOW                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Today:    🌤️ Ideal planting conditions           │ │
│ │ Tomorrow: ☀️ Water deeply before noon            │ │
│ │ Wed:      🌧️ No irrigation needed                │ │
│ │ Fri:      ⚠️ FROST WARNING - Protect plants!     │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ DAYLIGHT & TEMPERATURE                                │
│ ┌─────────────────┬─────────────────────────────────┐│
│ │ Sunrise: 6:23   │ High/Low: 72°F / 55°F           ││
│ │ Sunset: 20:14   │ Growing hours: 13h 51m          ││
│ └─────────────────┴─────────────────────────────────┘│
│                                                       │
│ DETAILED FORECAST (7 days)                            │
│ [Graph: Soil temp, air temp, moisture over time]     │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### Data Sources

**Weather APIs**:
- OpenWeather One Call API 3.0 (already integrated in Go Daisy)
- Stormglass API (for advanced marine data, already in Findr)
- NOAA/NWS API (free, detailed forecasts)
- Visual Crossing Weather API (historical averages)

**Agricultural APIs**:
- USDA NRCS Soil Data (soil types, field capacity)
- FAO CLIMWAT (ET calculations)
- NASA POWER (solar radiation data)

**Calculated Metrics**:
- Soil temperature (air temp lag model)
- Soil moisture (water balance model)
- GDD (daily accumulation)
- Photoperiod (astronomical calculations)

#### Components to Build

**New components**:
- `components/grow/SoilConditionsCard.tsx`
- `components/grow/GDDTracker.tsx`
- `components/grow/FrostRiskIndicator.tsx`
- `components/grow/PhotoperiodChart.tsx`
- `components/grow/WeatherWindowCalendar.tsx`
- `components/grow/PlantStressIndicator.tsx`

**Reusable from Findr/Go Daisy**:
- Weather fetching infrastructure
- Environmental data display patterns (`components/findr/EnvironmentalInfo.tsx`)
- Conditions page layout (`pages/findr/conditions.tsx`)

---

### 5. Info Section (`/grow/info`)

Standard pages following Findr's pattern (`pages/findr/info.tsx`, `about.tsx`, etc.):

- About Grow Daisy
- How It Works (scoring algorithm explanation)
- Terms & Conditions
- Privacy Policy
- Cookie Policy
- Support
- FAQ

**Components to reuse**:
- Findr info page templates
- Legal page layout
- SEO components

---

## Data Architecture

### Core Data Models

#### 1. Plant Species Database

Similar to Findr's `species` table:

```typescript
interface PlantSpecies {
  id: string; // UUID
  code: string; // Unique identifier, e.g., "TOM001"
  commonName: string; // "Tomato"
  scientificName: string; // "Solanum lycopersicum"
  variety?: string; // "Brandywine", "Cherokee Purple"
  category: 'vegetable' | 'fruit' | 'herb' | 'flower' | 'tree' | 'shrub';

  // Growing preferences
  hardinessZoneMin: number; // 1-13
  hardinessZoneMax: number;
  soilTempMin: number; // °F
  soilTempOptimal: number;
  soilTempMax: number;
  soilPH_Min: number; // 5.5-7.5
  soilPH_Optimal: number;
  soilPH_Max: number;
  soilType: string[]; // ["loam", "sandy-loam", "clay-loam"]
  moisturePreference: 'dry' | 'moderate' | 'moist' | 'wet';
  sunRequirement: 'full-sun' | 'partial-shade' | 'full-shade';

  // Growing cycle
  daysToMaturity: number; // From transplant or direct sow
  plantingMethod: 'direct-sow' | 'transplant' | 'both';
  sowIndoorsWeeksBefore: number; // Weeks before last frost
  transplantWeeksAfter: number; // Weeks after last frost
  directSowWeeksAfter: number;
  spacingInches: number;
  depthInches: number;

  // Care requirements
  wateringFrequency: 'daily' | 'twice-weekly' | 'weekly' | 'biweekly';
  fertilizingFrequency: 'weekly' | 'biweekly' | 'monthly';
  pruningRequired: boolean;
  stakingRequired: boolean;

  // Companion planting
  companions: string[]; // Species codes
  antagonists: string[]; // Species codes

  // Localization
  names: {
    en: string;
    es: string;
    fr: string;
    de: string;
  };
  description: string;
  careNotes: string[];

  // Images
  imageUrl: string;
  thumbnailUrl: string;

  createdAt: string;
  updatedAt: string;
}
```

**Initial database size**: 200-500 common garden plants (vegetables, herbs, flowers)

#### 2. Hardiness Zone Data

```typescript
interface HardinessZone {
  id: string;
  zone: string; // "7b"
  zoneNumber: number; // 7.5
  tempMin: number; // °F
  tempMax: number;

  // Location boundaries
  country: string;
  state?: string;
  region: string;
  zipCodes: string[];

  // Frost dates (average)
  lastFrostDate: string; // "MM-DD" format
  firstFrostDate: string;
  frostFreeDays: number;

  // Growing season
  growingSeasonStart: string; // "MM-DD"
  growingSeasonEnd: string;
  growingSeasonDays: number;
}
```

**Data source**: USDA Plant Hardiness Zone Map (JSON export)

#### 3. User Plants (Garden Inventory)

```typescript
interface UserPlant {
  id: string;
  userId: string; // FK to auth.users
  speciesId: string; // FK to plant_species

  // Plant details
  commonName: string; // Denormalized for quick display
  variety?: string;
  nickname?: string;
  plantedDate: string;

  // Location
  location: 'indoor' | 'outdoor' | 'greenhouse';
  bedName?: string;
  quantity: number;

  // Media
  photos: {
    url: string;
    caption: string;
    takenAt: string;
  }[];

  // Status
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'dead';
  currentStage: 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'dormant';
  notes: string;

  // Task tracking
  lastWatered?: string;
  lastFertilized?: string;
  lastPruned?: string;
  lastHarvested?: string;

  // Harvest log
  harvests: {
    date: string;
    quantity: number;
    units: 'lbs' | 'oz' | 'kg' | 'g' | 'count';
    notes: string;
  }[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
```

#### 4. Task Definitions

```typescript
interface TaskDefinition {
  id: string;
  code: string; // "WATER", "PRUNE", "FERTILIZE"
  name: string;
  category: 'watering' | 'feeding' | 'pruning' | 'pest-control' | 'harvesting' | 'planting' | 'maintenance';

  // Applicable to
  applicableSpecies: string[]; // Species codes, or "*" for all
  applicableStages: string[]; // Growth stages

  // Weather dependencies
  weatherRequirements: {
    tempMin?: number;
    tempMax?: number;
    maxWindSpeed?: number;
    maxPrecipitation?: number;
    requiresDryConditions?: boolean;
  };

  // Scheduling
  frequencyDays?: number; // Recurring task interval
  seasonalMonths?: number[]; // [3,4,5] for spring

  // Instructions
  instructions: string;
  tips: string[];
  estimatedMinutes: number;

  // Scoring weights (for task prioritization)
  weatherWeight: number; // 0-1
  urgencyWeight: number;
  seasonalWeight: number;
}
```

#### 5. User Task Log

```typescript
interface UserTaskLog {
  id: string;
  userId: string;
  userPlantId?: string; // Optional: specific plant
  taskDefinitionId: string;

  completedAt: string;
  notes: string;
  photos: string[];

  // Conditions at time of task
  weather: {
    temperature: number;
    conditions: string;
    soilTemp?: number;
  };
}
```

---

## API Integration Points

### Weather APIs (Reuse from Go Daisy)

**Already integrated**:
- OpenWeather One Call API 3.0 (`/api/weather-with-pollen`)
- Pollen data (`pollenByDate`)
- Air quality (`airQualityByDate`)

**New endpoints to create**:
- `/api/grow/conditions` - Gardening-specific weather
- `/api/grow/soil-temp` - Soil temperature estimates
- `/api/grow/frost-risk` - Frost probability calculations
- `/api/grow/gdd` - Growing degree days for location

### Plant Data APIs

**Options**:
1. **Trefle API** (free tier: 120 req/day)
   - 400,000+ plant species
   - Growing information, images
   - https://trefle.io/

2. **Perenual API** (plant database)
   - Care guides, pest information
   - https://perenual.com/docs/api

3. **USDA Plants Database**
   - Free, authoritative
   - Native/invasive species info
   - https://plants.usda.gov/

4. **Custom database** (recommended)
   - Build from open sources
   - Full control over data structure
   - No API rate limits

### Location APIs

**Already integrated**:
- Google Maps API (location search)
- GPS coordinates

**New integrations**:
- ZIP code → Hardiness zone lookup
- Coordinates → Zone mapping
- Local climate data (NOAA API)

### Future AI Integration

**Plant identification**:
- Google Cloud Vision API
- PlantNet API
- Custom ML model (TensorFlow.js)

**Pest identification**:
- Custom training on pest images
- Integration with extension service databases

---

## Component Reuse Strategy

### From Go Daisy (General App)

**Location & Weather**:
- ✅ `context/UnifiedLocationContext.tsx` - Location management
- ✅ `context/UserPreferencesContext.tsx` - Settings persistence
- ✅ `context/LanguageContext.tsx` - Multi-language support
- ✅ Weather fetching patterns (`pages/index.tsx:168-316`)
- ✅ Weather icon utilities
- ✅ Activity scoring logic (adapt for tasks)

**UI Components**:
- ✅ `components/AppHeader.tsx` → `components/GrowHeader.tsx`
- ✅ `components/CoastalLocationDialog.tsx` → `components/ZonePicker.tsx`
- ✅ `components/BottomNav.tsx` → Integrate with Grow nav
- ✅ Activity card styling (`.activity-card-enhanced`)
- ✅ Hero activity pattern

### From Findr (Specialist App)

**Navigation**:
- ✅ `components/findr/FindrNavigationMobile.tsx` → `components/grow/GrowNavigation.tsx`
- ✅ `components/findr/FindrUserMenu.tsx` → `components/grow/GrowUserMenu.tsx`
- ✅ `FindrFooter.tsx` → `GrowFooter.tsx`

**Data Management**:
- ✅ `hooks/useFishingPredictions` → `hooks/useGardenTasks`
- ✅ `hooks/useFavourites` → `hooks/useGardenPlants`
- ✅ `hooks/useFindrRectangleOptions` → `hooks/useHardinessZones`
- ✅ `hooks/usePersistentFindrSettings` → `hooks/usePersistentGrowSettings`

**UI Patterns**:
- ✅ Swipeable card deck (`pages/findr/index.tsx:473-621`)
- ✅ Species modal → Plant modal
- ✅ Catch logging → Task/harvest logging
- ✅ Favorites gallery → Garden gallery
- ✅ Conditions page layout

**Translation**:
- ✅ `components/translation/TranslatedFishCard.tsx` → `TranslatedPlantCard.tsx`
- ✅ `TranslatedText` component (reuse as-is)
- ✅ DeepL integration pattern

---

## Database Schema

### New Tables (Supabase)

Based on Findr's schema patterns:

#### plant_species
```sql
CREATE TABLE plant_species (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- e.g., "TOM001"
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  variety TEXT,
  category TEXT NOT NULL CHECK (category IN ('vegetable', 'fruit', 'herb', 'flower', 'tree', 'shrub')),

  -- Growing preferences (JSONB for flexibility)
  hardiness_zone_min INTEGER,
  hardiness_zone_max INTEGER,
  soil_temp_min NUMERIC,
  soil_temp_optimal NUMERIC,
  soil_temp_max NUMERIC,
  soil_ph_min NUMERIC,
  soil_ph_optimal NUMERIC,
  soil_ph_max NUMERIC,
  soil_types TEXT[],
  moisture_preference TEXT,
  sun_requirement TEXT,

  -- Growing cycle
  days_to_maturity INTEGER,
  planting_method TEXT,
  sow_indoors_weeks_before INTEGER,
  transplant_weeks_after INTEGER,
  direct_sow_weeks_after INTEGER,
  spacing_inches NUMERIC,
  depth_inches NUMERIC,

  -- Care
  watering_frequency TEXT,
  fertilizing_frequency TEXT,
  pruning_required BOOLEAN DEFAULT FALSE,
  staking_required BOOLEAN DEFAULT FALSE,

  -- Companion planting
  companions TEXT[], -- Array of species codes
  antagonists TEXT[],

  -- Localized content
  names JSONB, -- {en: "", es: "", fr: "", de: ""}
  description TEXT,
  care_notes TEXT[],

  -- Media
  image_url TEXT,
  thumbnail_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plant_species_code ON plant_species(code);
CREATE INDEX idx_plant_species_category ON plant_species(category);
CREATE INDEX idx_plant_species_common_name ON plant_species(common_name);
```

#### hardiness_zones
```sql
CREATE TABLE hardiness_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone TEXT NOT NULL, -- "7b"
  zone_number NUMERIC NOT NULL, -- 7.5
  temp_min INTEGER, -- °F
  temp_max INTEGER,

  -- Location
  country TEXT NOT NULL,
  state TEXT,
  region TEXT,
  zip_codes TEXT[],

  -- Frost dates (MM-DD format)
  last_frost_date TEXT,
  first_frost_date TEXT,
  frost_free_days INTEGER,

  -- Growing season
  growing_season_start TEXT, -- "MM-DD"
  growing_season_end TEXT,
  growing_season_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hardiness_zones_zone ON hardiness_zones(zone);
CREATE INDEX idx_hardiness_zones_zip ON hardiness_zones USING GIN(zip_codes);
```

#### user_plants
```sql
CREATE TABLE user_plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID REFERENCES plant_species(id) ON DELETE SET NULL,

  -- Plant details
  common_name TEXT NOT NULL,
  variety TEXT,
  nickname TEXT,
  planted_date DATE NOT NULL,

  -- Location
  location TEXT CHECK (location IN ('indoor', 'outdoor', 'greenhouse')),
  bed_name TEXT,
  quantity INTEGER DEFAULT 1,

  -- Media
  photos JSONB DEFAULT '[]'::jsonb, -- [{url, caption, takenAt}]

  -- Status
  health_status TEXT DEFAULT 'good' CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'dead')),
  current_stage TEXT CHECK (current_stage IN ('seed', 'seedling', 'vegetative', 'flowering', 'fruiting', 'dormant')),
  notes TEXT,

  -- Task tracking
  last_watered TIMESTAMPTZ,
  last_fertilized TIMESTAMPTZ,
  last_pruned TIMESTAMPTZ,
  last_harvested TIMESTAMPTZ,

  -- Harvest log
  harvests JSONB DEFAULT '[]'::jsonb, -- [{date, quantity, units, notes}]

  -- Metadata
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_plants_user_id ON user_plants(user_id);
CREATE INDEX idx_user_plants_species_id ON user_plants(species_id);
CREATE INDEX idx_user_plants_archived ON user_plants(archived) WHERE NOT archived;

-- RLS Policies
ALTER TABLE user_plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plants"
  ON user_plants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plants"
  ON user_plants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plants"
  ON user_plants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plants"
  ON user_plants FOR DELETE
  USING (auth.uid() = user_id);
```

#### task_definitions
```sql
CREATE TABLE task_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- "WATER", "PRUNE", etc.
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('watering', 'feeding', 'pruning', 'pest-control', 'harvesting', 'planting', 'maintenance')),

  -- Applicability
  applicable_species TEXT[], -- Species codes, or ["*"] for all
  applicable_stages TEXT[], -- Growth stages

  -- Weather dependencies
  weather_requirements JSONB, -- {tempMin, tempMax, maxWindSpeed, etc.}

  -- Scheduling
  frequency_days INTEGER,
  seasonal_months INTEGER[], -- [3,4,5] for spring

  -- Instructions
  instructions TEXT NOT NULL,
  tips TEXT[],
  estimated_minutes INTEGER,

  -- Scoring weights
  weather_weight NUMERIC DEFAULT 0.4,
  urgency_weight NUMERIC DEFAULT 0.3,
  seasonal_weight NUMERIC DEFAULT 0.2,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_task_definitions_code ON task_definitions(code);
CREATE INDEX idx_task_definitions_category ON task_definitions(category);
```

#### user_task_log
```sql
CREATE TABLE user_task_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_plant_id UUID REFERENCES user_plants(id) ON DELETE CASCADE,
  task_definition_id UUID REFERENCES task_definitions(id) ON DELETE SET NULL,

  -- Task details
  task_code TEXT NOT NULL, -- Denormalized for quick queries
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  photos TEXT[],

  -- Conditions at time of task
  weather_conditions JSONB, -- {temperature, conditions, soilTemp}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_task_log_user_id ON user_task_log(user_id);
CREATE INDEX idx_user_task_log_user_plant_id ON user_task_log(user_plant_id);
CREATE INDEX idx_user_task_log_completed_at ON user_task_log(completed_at DESC);

-- RLS Policies
ALTER TABLE user_task_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task logs"
  ON user_task_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task logs"
  ON user_task_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### grow_task_cache
```sql
CREATE TABLE grow_task_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  prediction_date DATE NOT NULL,

  -- Cached task recommendations
  tasks JSONB NOT NULL, -- Array of TaskScore objects

  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(user_id, prediction_date)
);

-- Index for cache lookups
CREATE INDEX idx_grow_task_cache_lookup ON grow_task_cache(user_id, prediction_date, expires_at);

-- Auto-cleanup old cache entries
CREATE INDEX idx_grow_task_cache_expiry ON grow_task_cache(expires_at);

-- RLS
ALTER TABLE grow_task_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cached tasks"
  ON grow_task_cache FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up routing, navigation, basic pages

**Tasks**:
- [ ] Create `/grow` route structure
- [ ] Build `GrowNavigation` component (mobile + desktop)
- [ ] Set up database tables (plant_species, hardiness_zones, user_plants)
- [ ] Create zone picker component
- [ ] Implement user preferences context for Grow Daisy
- [ ] Basic "Today" page with placeholder data

**Deliverable**: Navigable app skeleton with zone selection

---

### Phase 2: Today Page - Core Tasks (Weeks 3-4)
**Goal**: Weather-informed task recommendations

**Tasks**:
- [ ] Build task scoring algorithm
- [ ] Integrate weather API (reuse Go Daisy patterns)
- [ ] Create task card components
- [ ] Implement task modal with detailed guidance
- [ ] Add weather alert system (frost warnings)
- [ ] Create swipeable multi-day view

**Deliverable**: Functional "Today" page with dynamic task recommendations

---

### Phase 3: Garden Gallery (Weeks 5-6)
**Goal**: User plant inventory and tracking

**Tasks**:
- [ ] Build plant card components
- [ ] Implement plant CRUD operations
- [ ] Create plant modal with full details
- [ ] Add photo upload functionality
- [ ] Build task logger (watering, feeding, etc.)
- [ ] Implement harvest logger
- [ ] Create health status indicators

**Deliverable**: Full plant inventory system

---

### Phase 4: Conditions Page (Week 7)
**Goal**: Gardening-specific weather dashboard

**Tasks**:
- [ ] Calculate soil temperature estimates
- [ ] Implement GDD tracking
- [ ] Create soil moisture gauge
- [ ] Build frost risk indicator
- [ ] Add photoperiod chart
- [ ] Design conditions dashboard layout

**Deliverable**: Comprehensive gardeners' weather page

---

### Phase 5: Calendar/Planning (Weeks 8-9)
**Goal**: Forward-looking planting schedule

**Tasks**:
- [ ] Build monthly calendar view
- [ ] Implement planting window calculator
- [ ] Create frost date indicators
- [ ] Build shopping list generator
- [ ] Add seasonal guide
- [ ] Implement event/reminder system

**Deliverable**: Full planning and calendar system

---

### Phase 6: Plant Database (Week 10)
**Goal**: Comprehensive plant species data

**Tasks**:
- [ ] Populate plant_species table (200-500 plants)
- [ ] Add plant images (thumbnails + full size)
- [ ] Create plant search/filter functionality
- [ ] Implement companion planting suggestions
- [ ] Add localized plant names (ES, FR, DE)

**Deliverable**: Rich plant database with search

---

### Phase 7: Polish & Optimization (Weeks 11-12)
**Goal**: Production-ready app

**Tasks**:
- [ ] Implement offline mode (service worker + cache)
- [ ] Add loading skeletons
- [ ] Optimize images (WebP, lazy loading)
- [ ] Add animations (Framer Motion)
- [ ] Implement error boundaries
- [ ] Add analytics
- [ ] Write E2E tests (Playwright)
- [ ] Performance audit

**Deliverable**: Polished, performant PWA

---

### Phase 8: Advanced Features (Future)
**Goal**: AI and community features

**Tasks**:
- [ ] Plant identification (camera + AI)
- [ ] Pest identification
- [ ] Community garden sharing
- [ ] Social features (friends, compare gardens)
- [ ] Advanced analytics (yield tracking, ROI)
- [ ] Integration with smart irrigation systems
- [ ] Native mobile apps (iOS/Android)

---

## Technical Specifications

### Environment Variables

Add to `.env.local`:

```bash
# Grow Daisy specific
NEXT_PUBLIC_GROW_ENABLED=true

# Plant APIs (optional)
TREFLE_API_KEY=your_key_here
PERENUAL_API_KEY=your_key_here

# Weather APIs (already configured for Go Daisy)
# OPENWEATHER_API_KEY=...
# STORMGLASS_SECRET_KEY=...

# Database (already configured)
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...

# Google Maps (already configured)
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Translation (already configured)
# DEEPL_API_KEY=...
```

### Performance Targets

Following Findr's optimization success:

- **Initial page load**: < 2s (3G connection)
- **Time to Interactive**: < 3s
- **API response time**: < 500ms (cached), < 2s (fresh)
- **Image optimization**: WebP with fallbacks
- **Bundle size**: < 300KB initial JS
- **Lighthouse score**: > 90 (all categories)

### Caching Strategy

Similar to Findr's 3-hour cache:

- **Task recommendations**: 6-hour cache (longer than Findr due to less volatile data)
- **Weather data**: 1-hour cache
- **Plant species data**: 7-day cache (static)
- **User plants**: Real-time (no cache)
- **Hardiness zones**: Indefinite (static)

### Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Touch target size: min 44x44px (mobile)

---

## Open Questions & Decisions

### 1. Plant Database Strategy

**Options**:
A. Use external API (Trefle, Perenual) - Easy to start, rate limits
B. Build custom database - Full control, more work upfront
C. Hybrid - External for ID, custom for core data

**Recommendation**: **C (Hybrid)** - Build custom database for 200-500 common plants (full control), use external API for plant identification feature later.

---

### 2. User Onboarding Flow

**Questions**:
- Should users set up garden inventory before seeing recommendations?
- Or show generic tasks first, then personalize?

**Recommendation**: **Progressive onboarding**:
1. Ask for location/zone (required)
2. Show generic seasonal tasks immediately
3. Prompt to add plants for personalized recommendations
4. Gradually reveal advanced features

---

### 3. Task Scoring Complexity

**Options**:
A. Simple scoring (weather + season only)
B. Advanced scoring (weather + season + plant needs + forecast)

**Recommendation**: **Start with A**, iterate to B based on user feedback. Too complex initially may have bugs.

---

### 4. Freemium vs. Free

**Questions**:
- Should Grow Daisy be fully free like Go Daisy?
- Or freemium like Findr (basic free, advanced paid)?

**Recommendation**: **Freemium model**:
- Free: 10 plants, basic tasks, 7-day forecast
- Premium: Unlimited plants, advanced analytics, pest/disease ID, frost alerts, calendar export

---

### 5. Social Features Priority

**Questions**:
- Should Phase 1 include any social features?
- Or focus purely on individual gardening first?

**Recommendation**: **Individual first** (Phases 1-7), social later (Phase 8+). Get core features solid before adding complexity.

---

### 6. Native App Timeline

**Questions**:
- When to start native iOS/Android development?
- Or stay web-only indefinitely?

**Recommendation**: Follow Go Daisy/Findr pattern:
1. Launch web PWA first
2. Gather user feedback (6-12 months)
3. Decide on native apps based on demand
4. Native apps allow better camera integration for plant ID

---

## Next Steps

### Immediate Actions

1. **Decision**: Review and approve this implementation guide
2. **Setup**: Create `/grow` route structure and basic navigation
3. **Database**: Set up Supabase tables and seed initial data
4. **Design**: Create mockups for key screens (Today, Garden, Conditions)
5. **Prototype**: Build a simple "Today" page with hardcoded task recommendations

### Questions to Answer Before Starting

1. What hardiness zone(s) should we target initially? (US-only, or include EU zones?)
2. What 50 plants should we prioritize for initial database? (Common vegetables? Regional favorites?)
3. Should we support metric units from day 1? (°C, cm, liters vs. °F, inches, gallons)
4. What's the target launch date? (Affects scope - aim for spring 2025?)
5. Will this be a separate domain (`growdaisy.io`) or subdirectory (`godaisy.io/grow`)?

---

## References

### Internal Documentation
- `CLAUDE.md` - Project overview and architecture
- `GETTING_STARTED.md` - Developer onboarding
- `FINDR_VALIDATION_SYSTEM.md` - Validation patterns to adapt
- `SUPABASE_OPTIMIZATION_*.md` - Performance optimization strategies

### External Resources
- USDA Plant Hardiness Zone Map: https://planthardiness.ars.usda.gov/
- Trefle Plant API: https://trefle.io/
- Growing Degree Days Calculator: https://mrcc.purdue.edu/gismaps/info/gddinfo.htm
- Companion Planting Guide: https://www.almanac.com/companion-planting-guide
- FAO Crop Water Requirements: https://www.fao.org/3/x0490e/x0490e00.htm

---

**Document Status**: Draft - Ready for review
**Next Update**: After Phase 1 completion
**Maintainer**: Claude + Development Team
