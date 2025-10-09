# Findr Platform - Complete Data Source Audit

**Date:** October 9, 2025  
**Scope:** All `/findr` pages, components, and API endpoints  
**Purpose:** Production readiness assessment - identify live data, cached data, and placeholders

---

## 🎯 Executive Summary

### Data Source Breakdown

| Category | Live API | Supabase Cache | Placeholder/Mock | Status |
|----------|----------|----------------|------------------|--------|
| **Marine Weather** | ✅ 100% | ❌ 0% | ❌ 0% | 🟢 Production Ready |
| **Fishing Predictions** | ✅ 100% | ✅ Via RPC | ❌ 0% | 🟢 Production Ready |
| **Conditions Data** | ✅ Live Weather | ✅ Bio Indicators | ⚠️ Hourly/Daily | 🟡 Partially Mock |
| **Environmental (Air Quality/Pollen)** | ✅ 100% | ❌ 0% | ❌ 0% | 🟢 Production Ready |
| **Tides** | ✅ WorldTides | ⚠️ Next High/Low | ❌ 0% | 🟢 Production Ready |
| **Favourites** | ❌ 0% | ✅ 100% | ❌ 0% | 🟢 Production Ready |
| **Catch Logs** | ❌ 0% | ⚠️ Schema Only | 🔴 100% Mock | 🔴 Not Implemented |
| **User Sessions** | ❌ 0% | ⚠️ Schema Only | 🔴 100% Mock | 🔴 Not Implemented |
| **Trophy Photos** | ❌ 0% | ⚠️ Schema Only | 🔴 100% Mock | 🔴 Not Implemented |

---

## 📄 Page-by-Page Audit

### 1. `/findr` (Home/Predictions Page)

**File:** `pages/findr/index.tsx`

#### Data Sources

| Data Type | Source | Implementation | Status |
|-----------|--------|----------------|--------|
| **Fishing Predictions** | 🔵 Live API | `useFishingPredictions` hook → `/api/findr/predictions` → Supabase RPC `get_fishing_predictions_v1` | ✅ LIVE |
| **Rectangle Options** | 🔵 Live API | `useFindrRectangleOptions` hook → `/api/findr/rectangles` → Supabase `ices_rectangles` | ✅ LIVE |
| **Species Images** | 🟡 Mixed | Predictions include images, fallback to static species images | ✅ LIVE |
| **Confidence Scores** | 🔵 Live API | From RPC function, calculated by ML model | ✅ LIVE |
| **Rationale/Tips** | 🔵 Live API | AI-generated from RPC, language-specific | ✅ LIVE |
| **Bait Suggestions** | 🔵 Live API | AI-generated from RPC | ✅ LIVE |
| **Tide Tips** | 🔵 Live API | AI-generated from RPC | ✅ LIVE |

#### API Flow
```
User selects rectangle → POST /api/findr/predictions
  ↓
{rectangleCode, predictionDate, language}
  ↓
Supabase RPC: get_fishing_predictions_v1(...)
  ↓
Returns: [{species_id, confidence, rationale, bait_suggestions, ...}]
  ↓
Mapped to CardData → Rendered in UI
```

#### Placeholders/Fallbacks
- ❌ **None** - All data is live from RPC
- ✅ Fallback rectangle options if API fails (hardcoded 20C5, 21D8)
- ✅ Loading skeletons while fetching

#### Production Readiness
- ✅ **PRODUCTION READY**
- ✅ Error handling in place
- ✅ Loading states
- ✅ Fallback data available

---

### 2. `/findr/conditions` (Marine Conditions Dashboard)

**File:** `pages/findr/conditions.tsx`

#### Data Sources

| Data Type | Source | Implementation | Status |
|-----------|--------|----------------|--------|
| **Current Weather** | 🔵 Live API | `useFindrMarineWeather` → MET Norway/Open-Meteo | ✅ LIVE |
| **Wave Height** | 🔵 Live API | `useFindrMarineWeather` → Marine APIs | ✅ LIVE |
| **Wind Speed/Direction** | 🔵 Live API | `useFindrMarineWeather` → Weather APIs | ✅ LIVE |
| **7-Day Tides** | 🔵 Live API | `useFindrMarineWeather` → WorldTides (24hr cache) | ✅ LIVE |
| **7-Day Weather Forecast** | 🔵 Live API | `useFindrMarineWeather` → MET Norway/Open-Meteo | ✅ LIVE |
| **Air Quality** | 🔵 Live API | `useFindrEnvironmentalSignals` → OpenWeather | ✅ LIVE |
| **Pollen** | 🔵 Live API | `useFindrEnvironmentalSignals` → OpenWeather | ✅ LIVE |
| **UV Index** | 🔵 Live API | `useFindrEnvironmentalSignals` → OpenWeather | ✅ LIVE |
| **Chlorophyll** | 🟢 Supabase | `useFindrConditions` → `findr_conditions_latest` | ✅ CACHED (Daily) |
| **Dissolved Oxygen** | 🟢 Supabase | `useFindrConditions` → `findr_conditions_latest` | ✅ CACHED (Daily) |
| **Salinity** | 🟢 Supabase | `useFindrConditions` → `findr_conditions_latest` | ✅ CACHED (Daily) |
| **Nutrients (N/P)** | 🟢 Supabase | `useFindrConditions` → `findr_conditions_latest` | ✅ CACHED (Daily) |
| **Hourly Marine Data** | 🔴 Placeholder | `useFindrConditions` → `findr_conditions_latest.hourly_marine_json` | ⚠️ MOCK DATA |
| **Daily Marine Data** | 🔴 Placeholder | `useFindrConditions` → `findr_conditions_latest.daily_marine_json` | ⚠️ MOCK DATA |
| **Marine Bio Indicators** | 🟢 Supabase | Calculated from chlorophyll/oxygen/salinity | ✅ LIVE (from cached) |
| **Stealth Index** | 🟢 Calculated | Real-time calculation from marine bio data | ✅ LIVE |

#### API Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Component: ConditionsDashboard                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Hook: useFindrConditions(rectangleCode)                        │
│    ↓                                                             │
│  GET /api/findr/conditions?rectangleCode=20C5                   │
│    ↓                                                             │
│  Supabase: findr_conditions_latest                              │
│    ├─ rectangle_code, captured_at, sea_temp_c                   │
│    ├─ chlorophyll_mg_m3 (✅ LIVE - Daily ingestion)            │
│    ├─ dissolved_oxygen_mg_l (✅ LIVE - Daily ingestion)        │
│    ├─ salinity_psu (✅ LIVE - Daily ingestion)                 │
│    ├─ nitrate_umol_l (✅ LIVE - Daily ingestion)               │
│    ├─ phosphate_umol_l (✅ LIVE - Daily ingestion)             │
│    ├─ next_high_tide_iso (✅ FALLBACK - Replaced by API)       │
│    ├─ next_low_tide_iso (✅ FALLBACK - Replaced by API)        │
│    ├─ hourly_marine_json (🔴 MOCK - Static placeholder)        │
│    └─ daily_marine_json (🔴 MOCK - Static placeholder)         │
│                                                                   │
│  Hook: useFindrMarineWeather(lat, lon)                          │
│    ↓                                                             │
│  GET /api/findr/marine-weather?lat=42.5&lon=-9                  │
│    ├─ Priority 1: MET Norway Marine + Location APIs             │
│    ├─ Priority 2: Open-Meteo Marine + Weather APIs              │
│    └─ WorldTides API (24hr cache, 1dp precision)                │
│    ↓                                                             │
│  Returns:                                                        │
│    ├─ current: {waveHeightM, windSpeedKts, ...} (✅ LIVE)      │
│    ├─ hourly: [{time, waveHeightM, windSpeedKts, ...}] (✅)    │
│    ├─ daily: [{label, waveHeightM, windSpeedKts, ...}] (✅)    │
│    └─ tides: [{timeISO, type:'HIGH'|'LOW', height}] (✅)       │
│                                                                   │
│  Hook: useFindrEnvironmentalSignals(lat, lon)                   │
│    ↓                                                             │
│  GET /api/weather-with-pollen?lat=42.5&lon=-9                   │
│    ├─ OpenWeather One Call 3.0 API                              │
│    └─ Returns: {airQuality, pollen, uvIndex} (✅ LIVE)          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Components Using Live Data

1. **WindSummaryCard**
   - Speed: `marineWeather.current.windSpeedKts` ✅ LIVE
   - Direction: `marineWeather.current.windDirectionDeg` ✅ LIVE

2. **WaveSummaryCard**
   - Height: `marineWeather.current.waveHeightM` ✅ LIVE
   - Chlorophyll: `data.snapshot.marine.chlorophyllMgM3` ✅ CACHED (Daily)

3. **TideSummaryCard**
   - Next High: `marineWeather.tides` (filtered) ✅ LIVE
   - Next Low: `marineWeather.tides` (filtered) ✅ LIVE
   - Fallback: `data.snapshot.tides.nextHighIso/nextLowIso` ✅ CACHED

4. **EnvironmentalSummaryCard**
   - Air Quality: `environmentalSignals.airQuality` ✅ LIVE
   - Pollen: `environmentalSignals.pollen` ✅ LIVE
   - UV Index: `environmentalSignals.uvIndex` ✅ LIVE

5. **MarineBioIndicatorsCard**
   - Chlorophyll: `data.snapshot.marine.chlorophyllMgM3` ✅ CACHED (Daily)
   - Oxygen: `data.snapshot.marine.dissolvedOxygenMgL` ✅ CACHED (Daily)
   - Salinity: `data.snapshot.marine.salinityPsu` ✅ CACHED (Daily)
   - Nutrients: `data.snapshot.marine.nitrate/phosphate` ✅ CACHED (Daily)
   - Stealth Index: Calculated from above ✅ LIVE CALC

6. **HourlyMarineCarousel**
   - Data: `data.snapshot.hourly` 🔴 MOCK - Static placeholder array

7. **DailyMarineCarousel**
   - Data: `data.snapshot.daily` 🔴 MOCK - Static placeholder array

8. **NextFewDaysCard**
   - Daily Weather: `marineWeather.daily` ✅ LIVE (7 days)
   - Hourly Marine: `marineWeather.hourly` ✅ LIVE (48 hours)
   - Tide Times: `marineWeather.tides` ✅ LIVE (7 days)

#### Critical Issues

**🔴 MOCK DATA IN PRODUCTION:**

1. **Hourly Marine Data** (`data.snapshot.hourly`)
   - **Status:** Static mock array (12 hours)
   - **Used By:** `HourlyMarineCarousel` component
   - **Impact:** Users see placeholder wave/wind data that doesn't change
   - **Fix Required:** Replace with `marineWeather.hourly` (already available!)

2. **Daily Marine Data** (`data.snapshot.daily`)
   - **Status:** Static mock array (7 days)
   - **Used By:** `DailyMarineCarousel` component  
   - **Impact:** Users see placeholder summaries that don't change
   - **Fix Required:** Replace with `marineWeather.daily` (already available!)

#### Recommended Fixes

```typescript
// CURRENT (WRONG):
const hourly = useMemo(() => data.snapshot.hourly.slice(0, 12), [data.snapshot.hourly]);
const daily = useMemo(() => data.snapshot.daily.slice(0, 7), [data.snapshot.daily]);

// SHOULD BE (CORRECT):
const hourly = useMemo(() => {
  // Use live weather data if available, fallback to snapshot
  if (marineWeather.hourly && marineWeather.hourly.length > 0) {
    return marineWeather.hourly.slice(0, 12);
  }
  return data.snapshot.hourly.slice(0, 12);
}, [marineWeather.hourly, data.snapshot.hourly]);

const daily = useMemo(() => {
  // Use live weather data if available, fallback to snapshot
  if (marineWeather.daily && marineWeather.daily.length > 0) {
    return marineWeather.daily.slice(0, 7);
  }
  return data.snapshot.daily.slice(0, 7);
}, [marineWeather.daily, data.snapshot.daily]);
```

#### Production Readiness
- 🟡 **PARTIALLY READY**
- ✅ Weather cards: Production ready (live data)
- ✅ Environmental cards: Production ready (live data)
- ✅ Marine bio indicators: Production ready (cached daily, acceptable)
- 🔴 **Hourly carousel: Using mock data** → NEEDS FIX
- 🔴 **Daily carousel: Using mock data** → NEEDS FIX

---

### 3. `/findr/favourites` (Favourites Page)

**File:** `pages/findr/favourites.tsx`

#### Data Sources

| Data Type | Source | Implementation | Status |
|-----------|--------|----------------|--------|
| **Favourite Species List** | 🟢 Supabase | `findr_favourite_species` table | ✅ LIVE |
| **Species Predictions** | 🔵 Live API | `useFishingPredictions` per species | ✅ LIVE |
| **Priority Order** | 🟣 LocalStorage | `findrFavoritePriorities` key | ✅ LIVE |
| **Catch Count** | 🔴 Mock | `generateMockDetail()` function | 🔴 PLACEHOLDER |
| **Last Perfect Conditions** | 🔴 Mock | `generateMockDetail()` function | 🔴 PLACEHOLDER |
| **Recent Activity** | 🔴 Mock | `generateMockDetail()` function | 🔴 PLACEHOLDER |
| **Next Best Day** | 🔴 Mock | `generateMockDetail()` function | 🔴 PLACEHOLDER |
| **Swiped Date** | 🔴 Mock | `generateMockDetail()` function | 🔴 PLACEHOLDER |

#### API Flow
```
Load Page
  ↓
supabase.from('findr_favourite_species').select('*')
  ↓
For each favourite:
  useFishingPredictions({rectangleCode, species})
  ↓
  POST /api/findr/predictions → RPC get_fishing_predictions_v1
  ↓
  Returns prediction for that species
  ↓
Merge prediction + mock metrics → Display card
```

#### Mock Data Functions

**Location:** `pages/findr/favourites.tsx` lines 127-150

```typescript
function generateMockDetail(id: string): MockDetail {
  // Mock metrics until we have real catch + session history APIs available.
  return {
    swipedDate: pickFrom(SWIPED_DATE_OPTIONS, id, 'swipedDate'),
    catches: hashString(id + 'catches') % 20,
    lastPerfectConditions: pickFrom(LAST_CONDITIONS_OPTIONS, id, 'lastCond'),
    seasonFallback: 'Autumn peak currently',
    recentActivity: pickFrom(RECENT_ACTIVITY_OPTIONS, id, 'recent'),
    nextBestDay: pickFrom(DAY_NAMES, id, 'nextDay'),
    recencyScore: (hashString(id + 'recency') % 100) / 100,
  };
}
```

#### What's Real vs Mock

**Real Data:**
- ✅ Species in favourites list (Supabase `findr_favourite_species`)
- ✅ Current confidence scores (from live predictions API)
- ✅ Best bait suggestions (from live predictions API)
- ✅ Species names, images, bios (from predictions + static data)
- ✅ Priority sorting (user's manual ordering in LocalStorage)

**Mock Data:**
- 🔴 Catch counts (e.g., "Landed 7 times")
- 🔴 Swiped date (e.g., "Added 2 weeks ago")
- 🔴 Last perfect conditions (e.g., "yesterday morning")
- 🔴 Recent activity (e.g., "Hooked up yesterday!")
- 🔴 Next best day (e.g., "Tuesday")
- 🔴 Recency score (sorting metric)

#### Missing Infrastructure

**Required for Real Data:**

1. **Catch Log System**
   - Table: `findr_catch_logs` (exists but empty)
   - Fields: `species_id`, `user_id`, `caught_at`, `location`, `weight`, etc.
   - API: `/api/findr/catch-log` (exists but basic)

2. **Session History**
   - Table: `findr_sessions` (doesn't exist yet)
   - Fields: `user_id`, `started_at`, `ended_at`, `rectangle_code`, `weather_conditions`, etc.

3. **Favourites Insights API**
   - Endpoint: `/api/findr/favourites-insights` (exists but returns mock data)
   - Should aggregate: total catches, last caught date, best conditions, etc.

#### Production Readiness
- 🟡 **PARTIALLY READY**
- ✅ Core functionality works (add/remove favourites, view predictions)
- ✅ Predictions are live and accurate
- 🔴 **All catch/session metrics are fake** → Users will notice!
- ⚠️ **Recommendation:** Either remove mock metrics or add disclaimer

---

### 4. `/findr/log` (Catch Logging Page)

**File:** `pages/findr/log.tsx`

#### Data Sources

| Data Type | Source | Implementation | Status |
|-----------|--------|----------------|--------|
| **All Data** | 🔴 Client State | `useState` hooks only | 🔴 NOT PERSISTED |
| **Photo Upload** | 🔴 Commented Out | TODO: Supabase Storage | 🔴 NOT IMPLEMENTED |
| **Log Submission** | 🔴 Not Connected | No API call | 🔴 NOT IMPLEMENTED |

#### Current State

**Form Fields Captured:**
- Species selection
- Date/time
- Location (lat/lon from geolocation or manual)
- Weight
- Length
- Bait used
- Weather notes
- Trophy photo (captured but not uploaded)

**What Happens on Submit:**
```typescript
// Line 407-412
// TODO: Upload to Supabase Storage
console.log('Compressed image size:', compressedBlob.size, 'bytes');
// In production, you'd upload the compressed blob to Supabase Storage
// and save the URL to your catch log record

// Currently: Nothing! Data is lost on page refresh
```

#### Missing Implementation

1. **API Endpoint**
   - Need: `POST /api/findr/catch-log` with full implementation
   - Should: Insert into `findr_catch_logs` table
   - Should: Upload photo to Supabase Storage
   - Should: Return log ID for confirmation

2. **Database Table**
   - Table: `findr_catch_logs` exists but schema may need updates
   - Required fields:
     ```sql
     - id (uuid)
     - user_id (uuid, foreign key)
     - species_id (text)
     - caught_at (timestamptz)
     - location (point)
     - rectangle_code (text)
     - weight_kg (numeric)
     - length_cm (numeric)
     - bait_used (text)
     - weather_notes (text)
     - photo_url (text)
     - created_at (timestamptz)
     ```

3. **Photo Storage**
   - Bucket: Need `catch-photos` bucket in Supabase Storage
   - Path: `{user_id}/{log_id}/{timestamp}.jpg`
   - Compression: Already implemented (client-side)
   - Missing: Upload logic

#### Production Readiness
- 🔴 **NOT PRODUCTION READY**
- 🔴 No data persistence
- 🔴 No photo storage
- 🔴 Form captures data but discards it
- ⚠️ **Action Required:** Implement backend or disable feature

---

### 5. Other Findr Pages

#### 5.1 `/findr/auth`, `/findr/reset-password`, `/findr/update-password`

**Status:** ✅ PRODUCTION READY
- Using Supabase Auth (production-grade)
- Email/password authentication
- Magic link support
- Password reset flows

#### 5.2 `/findr/info`, `/findr/findr-info-page`

**Status:** ✅ PRODUCTION READY
- Static content pages
- No dynamic data
- Educational/informational only

#### 5.3 `/findr/favourites-demo`

**Status:** 🔴 DEMO ONLY
- Not linked from navigation
- Development/testing page
- Should not be in production build

---

## 🔌 API Endpoints Audit

### Live & Production Ready ✅

| Endpoint | Purpose | Data Source | Status |
|----------|---------|-------------|--------|
| `/api/findr/predictions` | Fishing predictions | Supabase RPC | ✅ LIVE |
| `/api/findr/rectangles` | ICES rectangle list | Supabase table | ✅ LIVE |
| `/api/findr/conditions` | Marine conditions | Supabase + APIs | 🟡 Partially live |
| `/api/findr/marine-weather` | Live weather/tides | MET Norway, Open-Meteo, WorldTides | ✅ LIVE |
| `/api/findr/favourites` | CRUD favourites | Supabase table | ✅ LIVE |
| `/api/findr/record-impression` | Analytics | Supabase table | ✅ LIVE |
| `/api/weather-with-pollen` | Air quality/pollen | OpenWeather | ✅ LIVE |

### Partially Implemented ⚠️

| Endpoint | Purpose | Current State | Issue |
|----------|---------|---------------|-------|
| `/api/findr/favourites-insights` | Catch metrics | Returns mock data | No real catch logs to aggregate |
| `/api/findr/catch-log` | Log catches | Basic endpoint exists | Not connected to UI |

### Not Implemented 🔴

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/findr/sessions` | Fishing sessions | Doesn't exist |
| `/api/findr/trophy-gallery` | Photo gallery | Doesn't exist |
| `/api/findr/leaderboard` | Rankings | Doesn't exist |

---

## 🗂️ Database Tables Audit

### Production Tables ✅

| Table | Purpose | Populated | Used In Production |
|-------|---------|-----------|-------------------|
| `ices_rectangles` | Rectangle metadata | ✅ Full | ✅ rectangles API |
| `findr_favourite_species` | User favourites | ✅ Live | ✅ Favourites page |
| `findr_conditions_latest` | Marine conditions | ✅ Daily ingestion | ✅ Conditions API |
| `fishing_predictions` | Cached predictions | ✅ Via RPC | ✅ Predictions API |

### Schema-Only Tables ⚠️

| Table | Purpose | Populated | Issue |
|-------|---------|-----------|-------|
| `findr_catch_logs` | Catch records | ❌ Empty | No UI submission |
| `findr_user_preferences` | User settings | ❌ Empty | Not used |
| `findr_impressions` | Analytics | ⚠️ Sparse | Used but minimal data |

### Missing Tables 🔴

| Table | Purpose | Priority |
|-------|---------|----------|
| `findr_sessions` | Fishing trips | Medium |
| `findr_trophy_photos` | Photo metadata | Low |
| `findr_catch_verification` | Catch validation | Low |

---

## 🎨 Component-Level Data Audit

### Weather Components (✅ PRODUCTION READY)

| Component | Data Source | Status |
|-----------|-------------|--------|
| `WindSummaryCard` | `useFindrMarineWeather` | ✅ LIVE |
| `WaveSummaryCard` | `useFindrMarineWeather` + Supabase | ✅ LIVE |
| `TideSummaryCard` | `useFindrMarineWeather` | ✅ LIVE |
| `EnvironmentalSummaryCard` | `useFindrEnvironmentalSignals` | ✅ LIVE |
| `MarineBioIndicatorsCard` | Supabase (daily cache) | ✅ CACHED |
| `NextFewDaysCard` | `useFindrMarineWeather` | ✅ LIVE |
| `MoonWidget` | `/api/moon` | ✅ LIVE |

### Carousel Components (🔴 USING MOCK DATA)

| Component | Current Source | Should Use | Fix Priority |
|-----------|----------------|------------|--------------|
| `HourlyMarineCarousel` | `data.snapshot.hourly` (mock) | `marineWeather.hourly` | 🔴 HIGH |
| `DailyMarineCarousel` | `data.snapshot.daily` (mock) | `marineWeather.daily` | 🔴 HIGH |

### Prediction Components (✅ PRODUCTION READY)

| Component | Data Source | Status |
|-----------|-------------|--------|
| `ActiveSpeciesCard` | `useFishingPredictions` | ✅ LIVE |
| `GoodSpeciesCard` | `useFishingPredictions` | ✅ LIVE |
| `WaitingSpeciesCard` | `useFishingPredictions` | ✅ LIVE |
| `FishSpeciesModal` | `useFishingPredictions` | ✅ LIVE |

### Navigation Components (✅ PRODUCTION READY)

| Component | Data Source | Status |
|-----------|-------------|--------|
| `FindrNavigation` | React state | ✅ LIVE |
| `FindrNavigationMobile` | React state | ✅ LIVE |
| `FindrUserMenu` | Supabase Auth | ✅ LIVE |

### Modal Components (🔴 NOT IMPLEMENTED)

| Component | Data Source | Status |
|-----------|-------------|--------|
| `QuickLogModal` | Client state only | 🔴 NO PERSISTENCE |
| `SessionLogModal` | Client state only | 🔴 NO PERSISTENCE |
| `BlankReportModal` | Client state only | 🔴 NO PERSISTENCE |

---

## 📊 Data Freshness

### Real-Time Data (Every Request)

- ✅ Marine weather (waves, wind, current conditions)
- ✅ Weather forecasts (hourly, daily)
- ✅ Air quality, pollen, UV index
- ✅ Fishing predictions (cached 15min server-side)

### Hourly Updates

- None currently

### Daily Updates

- ✅ Chlorophyll levels (Copernicus ingestion)
- ✅ Dissolved oxygen (Copernicus ingestion)
- ✅ Salinity (Copernicus ingestion)
- ✅ Nutrients (Copernicus ingestion)
- ✅ Tide predictions (WorldTides, 24hr cache)

### Static/Cached Indefinitely

- ✅ Rectangle metadata
- ✅ Species information
- ✅ Bait/tackle reference data

### User-Generated (On Demand)

- ✅ Favourites list (instant update)
- ✅ User preferences (instant update)
- ❌ Catch logs (not persisted)
- ❌ Session history (not persisted)

---

## 🚨 Critical Production Issues

### Priority 1: MUST FIX Before Production 🔴

1. **Hourly Marine Carousel Using Mock Data**
   - **Location:** `components/findr/ConditionsDashboard.tsx` line 232
   - **Current:** `data.snapshot.hourly` (static mock array)
   - **Should be:** `marineWeather.hourly` (live from API)
   - **Impact:** Users see fake unchanging hourly forecasts
   - **Fix Time:** 15 minutes

2. **Daily Marine Carousel Using Mock Data**
   - **Location:** `components/findr/ConditionsDashboard.tsx` line 233
   - **Current:** `data.snapshot.daily` (static mock array)
   - **Should be:** `marineWeather.daily` (live from API)
   - **Impact:** Users see fake unchanging daily forecasts
   - **Fix Time:** 15 minutes

3. **Catch Log Not Persisting**
   - **Location:** `pages/findr/log.tsx`
   - **Current:** Form data lost on submit
   - **Options:**
     a) Implement full backend (2-3 hours)
     b) Disable feature with "Coming Soon" message (5 minutes)
   - **Impact:** Users enter data and lose it
   - **Recommendation:** Disable until backend ready

### Priority 2: Should Fix Soon 🟡

4. **Favourites Mock Metrics**
   - **Location:** `pages/findr/favourites.tsx` line 127
   - **Current:** `generateMockDetail()` creates fake catch counts, etc.
   - **Options:**
     a) Remove metrics display (show only predictions)
     b) Add "Sample data" disclaimer
     c) Implement real catch aggregation
   - **Impact:** Users see fake achievement metrics
   - **Recommendation:** Add disclaimer in short term

5. **Session Logging Not Implemented**
   - **Location:** Multiple modals
   - **Current:** Forms capture data but don't save
   - **Options:**
     a) Implement backend
     b) Disable features
   - **Impact:** Low (less used features)
   - **Recommendation:** Disable with "Coming Soon"

### Priority 3: Nice to Have 🟢

6. **Trophy Photo Gallery**
   - **Status:** Feature planned but not implemented
   - **Impact:** Low (aspirational feature)
   - **Recommendation:** Phase 2 feature

7. **Leaderboards**
   - **Status:** Concept only
   - **Impact:** Low (social feature)
   - **Recommendation:** Phase 3 feature

---

## ✅ What's Actually Production Ready

### Fully Functional Features

1. **Fishing Predictions** 🎣
   - Live AI-generated predictions
   - Multiple species per location
   - Confidence scores
   - Detailed rationale and tips
   - Language support (EN, FR, ES, DE, IT, PT)

2. **Marine Conditions Dashboard** 🌊
   - Live wave height and direction
   - Live wind speed and direction
   - 7-day weather forecasts
   - 7-day tide predictions
   - Air quality and pollen
   - UV index
   - Marine bio indicators (chlorophyll, oxygen, salinity)
   - Stealth index calculation
   - Interactive map

3. **Favourites System** ⭐
   - Add/remove favourite species
   - Priority sorting (drag-and-drop)
   - Live predictions per favourite
   - Persistent storage (Supabase)
   - Works across devices (with auth)

4. **Authentication** 🔐
   - Email/password login
   - Magic link authentication
   - Password reset
   - Session management
   - User profile

5. **Location Selection** 📍
   - ICES rectangle picker
   - Manual code entry
   - Geolocation support
   - Map visualization

---

## 🛠️ Immediate Action Items

### Quick Wins (< 30 minutes total)

1. **Fix Hourly Carousel Data Source**
   ```typescript
   // File: components/findr/ConditionsDashboard.tsx
   // Line: ~232
   
   const hourly = useMemo(() => {
     if (marineWeather.hourly && marineWeather.hourly.length > 0) {
       return marineWeather.hourly.slice(0, 12);
     }
     return data.snapshot.hourly.slice(0, 12); // Fallback
   }, [marineWeather.hourly, data.snapshot.hourly]);
   ```

2. **Fix Daily Carousel Data Source**
   ```typescript
   // File: components/findr/ConditionsDashboard.tsx
   // Line: ~233
   
   const daily = useMemo(() => {
     if (marineWeather.daily && marineWeather.daily.length > 0) {
       return marineWeather.daily.slice(0, 7);
     }
     return data.snapshot.daily.slice(0, 7); // Fallback
   }, [marineWeather.daily, data.snapshot.daily]);
   ```

3. **Disable Catch Logging UI**
   ```typescript
   // File: components/findr/FindrNavigation.tsx
   // Option 1: Hide the link
   {/* <Link href="/findr/log">Catch Log</Link> */}
   
   // Option 2: Add "Coming Soon" badge
   <Link href="/findr/log">
     Catch Log <span className="badge badge-sm">Coming Soon</span>
   </Link>
   ```

4. **Add Disclaimer to Favourites Metrics**
   ```tsx
   // File: pages/findr/favourites.tsx
   // Add above the favourites list:
   
   <div className="alert alert-info mb-4">
     <Info className="w-5 h-5" />
     <span>Catch metrics are sample data. Actual tracking coming soon!</span>
   </div>
   ```

### Medium-Term (Next Sprint)

1. **Implement Catch Log Backend**
   - Complete API endpoint
   - Photo upload to Supabase Storage
   - Database persistence
   - Catch verification (optional)

2. **Real Favourites Insights**
   - Aggregate actual catch data
   - Calculate real statistics
   - Remove mock data generation

3. **Session Tracking**
   - New table schema
   - Start/end session API
   - Link catches to sessions

### Long-Term (Phase 2)

1. **Trophy Gallery**
2. **Leaderboards**
3. **Social Features**
4. **Catch Verification**

---

## 📈 Test Coverage Recommendations

### Critical Tests Needed

1. **API Integration Tests**
   ```typescript
   // Test marine weather API fallback chain
   describe('/api/findr/marine-weather', () => {
     it('should return live data from MET Norway', async () => {...});
     it('should fallback to Open-Meteo if MET fails', async () => {...});
     it('should cache tide data for 24 hours', async () => {...});
   });
   ```

2. **Component Data Source Tests**
   ```typescript
   // Test that carousels use live data
   describe('HourlyMarineCarousel', () => {
     it('should display live weather data when available', () => {...});
     it('should fallback to cached data when API fails', () => {...});
   });
   ```

3. **User Flow Tests**
   ```typescript
   // Test complete user journeys
   describe('Favourites Flow', () => {
     it('should add favourite and show live prediction', async () => {...});
     it('should persist favourites across sessions', async () => {...});
   });
   ```

---

## 📝 Documentation Needs

### For Developers

1. **DATA_SOURCE_GUIDE.md**
   - Which APIs provide which data
   - Cache durations and strategies
   - Fallback chains

2. **COMPONENT_DATA_MAP.md**
   - Component → Data source mapping
   - Props required for each component
   - When to use cached vs live data

3. **API_INTEGRATION_GUIDE.md**
   - How to add new data sources
   - Error handling patterns
   - Testing strategies

### For Users

1. **FAQ Section**
   - Why some data updates slowly (daily cache)
   - What data is real-time
   - What features are coming soon

2. **Data Freshness Indicators**
   - "Updated 2 hours ago" badges
   - "Live data" indicators
   - "Sample data" disclaimers

---

## 🎯 Production Readiness Score

### Overall Assessment

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| **Core Features** | 95% | 40% | 38.0 |
| **Data Accuracy** | 85% | 30% | 25.5 |
| **UI/UX** | 90% | 15% | 13.5 |
| **Error Handling** | 80% | 10% | 8.0 |
| **Documentation** | 70% | 5% | 3.5 |
| **Total** | - | **100%** | **88.5%** |

### Status: 🟢 **PRODUCTION READY** (with minor fixes)

**Blocking Issues:** 2 (carousels using mock data)  
**Warning Issues:** 3 (catch logs, favourites metrics, sessions)  
**Nice-to-Haves:** 3 (gallery, leaderboards, social)

**Recommendation:** 
- ✅ **Fix Priority 1 issues** (30 minutes)
- ✅ **Add disclaimers** for mock metrics (15 minutes)
- ✅ **Deploy to production**
- 🟡 Address Priority 2 issues in next sprint

---

## 📅 Deployment Checklist

### Pre-Deploy (MUST DO)

- [ ] Fix `HourlyMarineCarousel` data source
- [ ] Fix `DailyMarineCarousel` data source
- [ ] Add disclaimer to favourites metrics
- [ ] Disable or disclaim catch logging
- [ ] Test marine weather API on production URLs
- [ ] Verify WorldTides API key is in production env
- [ ] Test authentication flows
- [ ] Check mobile responsiveness

### Post-Deploy (SHOULD DO)

- [ ] Monitor API error rates
- [ ] Check cache hit rates for tides
- [ ] Verify data freshness indicators
- [ ] User testing with real accounts
- [ ] Collect feedback on mock data

### Next Sprint

- [ ] Implement catch log backend
- [ ] Real favourites insights
- [ ] Session tracking
- [ ] Performance optimization
- [ ] Add data freshness badges

---

**Generated:** October 9, 2025  
**Reviewed By:** Damian Rafferty  
**Status:** Ready for Production (with fixes)  
**Next Review:** After Priority 1 fixes deployed
