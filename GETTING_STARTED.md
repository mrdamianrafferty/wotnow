# Getting Started with GoDaisy & Findr

**Last Updated**: October 18, 2025

This guide provides a quick overview of how GoDaisy and Findr are built and work. For detailed information, see the references at the bottom.

---

## 🎯 What is This?

**GoDaisy** is a platform designed to get people off their phones and doing something better - engaging in real-world activities like sports, hobbies, outdoor adventures, and more.

**Findr** is the sea fishing app within GoDaisy that provides species-specific, location-based fishing predictions to help anglers find the best times and places to fish in European waters.

---

## 🏗️ Architecture Overview

### Technology Stack

```
Frontend:
├── Next.js 15.5 (React framework)
├── TypeScript (type safety)
├── TailwindCSS (styling)
├── React Query (@tanstack/react-query) (data fetching & caching)
└── Mapbox GL (interactive maps)

Backend:
├── Next.js API Routes (serverless functions)
├── Supabase (PostgreSQL + Auth)
├── PostGIS (spatial/geographic queries)
└── Edge Functions (real-time data processing)

Data Sources:
├── Copernicus CMEMS (marine environmental data)
├── EMODnet (seabed bathymetry & substrate)
├── Met.no (weather forecasts)
└── FishBase (species characteristics)
```

### Key Directories

```
/pages
├── /api                    # API endpoints
│   ├── /findr             # Fishing predictions API
│   ├── /weather           # Weather integration
│   └── /auth              # Authentication
├── index.tsx              # GoDaisy homepage (activity recommendations)
├── activities.tsx         # All selected activities view
├── weather.tsx            # Detailed weather conditions
├── interests.tsx          # Activity selection/preferences
├── onboarding.tsx         # First-time user experience
├── /findr                 # Findr sea fishing app
│   ├── index.tsx          # Main predictions page
│   ├── favourites.tsx     # User favorites
│   ├── conditions.tsx     # Environmental conditions
│   └── log.tsx            # Catch logging
├── account.tsx            # User account management
├── AboutUs.tsx            # About GoDaisy
├── HowWeDoIt.tsx          # How the platform works
└── FAQs.tsx               # Frequently asked questions

/lib
├── /supabase              # Database utilities
│   ├── queryWithTiming.ts # Performance monitoring
│   └── server.ts          # Server-side client
├── /services              # Business logic
│   ├── weatherService.ts  # Weather integration
│   └── predictionService.ts # Prediction logic
└── /utils                 # Helpers
    ├── getSuggestionsByDay.ts  # Activity scoring engine
    ├── activityHelpers.ts      # Activity utilities
    └── weatherUtils.ts         # Weather conversions

/hooks
├── useFishingPredictions.ts  # Findr predictions hook
├── useFavourites.ts          # Favorites management
└── useWeather.ts             # Weather data

/components
├── AppHeader.tsx          # Navigation header
├── BottomNav.tsx          # Mobile navigation
├── ActivityOutlooks.tsx   # Activity cards
├── EnvironmentalIndicators.tsx  # Weather/environmental display
├── /findr                 # Findr-specific components
├── /weather-cards         # Weather detail cards
│   ├── HourlyCard.tsx    # Hourly forecast
│   ├── WindCard.tsx      # Wind conditions
│   ├── WaveCard.tsx      # Marine wave data
│   ├── TidesCard.tsx     # Tide predictions
│   └── [20+ more cards]
├── /map                   # Map components
└── /ui                    # Reusable UI components

/data
├── /activities            # Activity definitions (100+ activities)
│   ├── team.ts           # Team sports (football, rugby, etc.)
│   ├── individual.ts     # Individual sports (tennis, golf, etc.)
│   ├── watersports.ts    # Water activities (surfing, kayaking, etc.)
│   ├── fishing.ts        # Fishing activities
│   ├── cycling.ts        # Cycling activities
│   ├── snow.ts           # Snow sports (skiing, snowboarding, etc.)
│   ├── ice.ts            # Ice sports (skating, hockey, etc.)
│   ├── outdoor.ts        # Outdoor recreation (hiking, camping, etc.)
│   ├── nature.ts         # Nature activities (birdwatching, etc.)
│   ├── social.ts         # Social activities (picnics, BBQ, etc.)
│   ├── wellness.ts       # Wellness activities (yoga, meditation, etc.)
│   └── lifestyle.ts      # Lifestyle activities (photography, etc.)
├── activityTypes.ts      # Activity type definitions
├── emojiMap.ts           # Activity emoji mappings
├── bgMap.ts              # Activity background images
└── activityMessages.ts   # Activity-specific messages

/scripts
├── ingest-copernicus-data.ts  # Marine data ingestion (Findr)
├── test-*.ts                  # Testing utilities
└── migrate-*.ts               # Database migrations

/supabase
├── /migrations            # Database schema changes
└── /functions             # Edge functions
```

---

## 🌟 GoDaisy Platform Features

### Core Concept

**Mission**: Get people off their phones and doing better things - real-world activities that improve physical health, mental wellbeing, and social connections.

### How It Works

1. **Onboarding** (`/onboarding`)
   - User selects location (home or coastal)
   - Chooses activities they're interested in (100+ options)
   - Sets preferences and constraints

2. **Homepage** (`/`)
   - Shows **weather-optimized activity recommendations** for today
   - Hero card highlights the best activity based on current conditions
   - Scoring algorithm evaluates all user's activities against:
     - Current weather conditions
     - Marine conditions (for water activities)
     - Seasonal appropriateness
     - Activity-specific requirements
   - Categories: Perfect, Good, Fair, Indoor alternatives

3. **Activity Selection** (`/interests`)
   - Organized by category:
     - 🏃‍♂️ **Active Sports** - Team & individual sports
     - 🌊 **Water Activities** - Surfing, kayaking, swimming, etc.
     - ❄️ **Winter Sports** - Skiing, snowboarding, ice skating
     - 🚴 **Cycling** - Road, mountain, gravel cycling
     - 🎣 **Fishing** - Shore, boat, fly fishing
     - 🏕️ **Outdoor Recreation** - Hiking, camping, climbing
     - 🦅 **Nature** - Wildlife watching, photography
     - 🧘 **Wellness** - Yoga, meditation, tai chi
     - 🎨 **Lifestyle** - Photography, painting, gardening
     - 🍔 **Social** - BBQ, picnics, outdoor dining
   - Smart recommendations based on location and season
   - AI-powered personalization

4. **Activities Page** (`/activities`)
   - Landscape cards for each selected activity
   - Real-time weather assessment
   - Activity-specific conditions:
     - Land activities: temperature, wind, rain, humidity
     - Marine activities: waves, water temp, wind, tides
   - Visual indicators (Perfect ✅, Good 👍, Fair 🤔, Indoor 🏠)
   - Share functionality (native + WhatsApp)

5. **Weather Page** (`/weather`)
   - Comprehensive weather dashboard
   - 48-hour hourly forecast with marine data
   - Specialized cards:
     - Wind (speed, gusts, direction, Beaufort scale)
     - Waves (height, period, direction)
     - Tides (high/low times and heights)
     - Pressure (barometric dial with trend)
     - UV index, Air quality, Pollen
     - Sunrise/sunset, Moon phase
     - Sea temperature
     - Humidity, Visibility, "Feels like"
   - 7-day extended forecast
   - Location-specific (uses user's saved location or GPS)

### Activity Scoring Algorithm

The heart of GoDaisy is `getSuggestionsByDay()` which evaluates each activity:

```typescript
// Scoring factors
1. Temperature match (optimal range per activity)
2. Wind conditions (some activities love wind, others hate it)
3. Precipitation (rain tolerance varies by activity)
4. Marine conditions (waves, water temp, tides for water sports)
5. Seasonal appropriateness (skiing needs snow, swimming needs warmth)
6. Time of day (some activities better morning/evening)
7. Special conditions (snow depth, air quality, pollen)

// Output
{
  activityId: string;
  score: number;  // 0-100
  evaluation: 'perfect' | 'good' | 'fair' | 'poor' | 'indoor';
  reasoning: string;  // Human-readable explanation
  outOfSeason?: boolean;  // Flag for seasonal activities
  snow?: { level, message };  // Snow sport recommendations
}
```

### 100+ Activities Supported

**Team Sports**: Football, Rugby, Cricket, Basketball, Volleyball, Hockey, Baseball, etc.
**Individual Sports**: Tennis, Golf, Badminton, Squash, Archery, Running, etc.
**Water Sports**: Surfing, Kitesurfing, Windsurfing, Kayaking, SUP, Diving, Swimming
**Fishing**: Shore, Boat, Fly fishing, Sea angling
**Cycling**: Road, Mountain, Gravel, Commuting
**Snow Sports**: Skiing, Snowboarding, Cross-country, Snowshoeing
**Ice Sports**: Ice skating, Ice hockey, Curling
**Outdoor**: Hiking, Climbing, Camping, Trail running, Mountain biking
**Nature**: Birdwatching, Wildlife photography, Foraging, Stargazing
**Wellness**: Yoga, Meditation, Tai chi, Outdoor fitness
**Social**: BBQ, Picnics, Beach days, Outdoor dining
**Lifestyle**: Photography, Painting, Gardening, Dog walking

Each activity has:
- Optimal weather conditions
- Wind tolerance
- Rain sensitivity
- Temperature ranges
- Marine requirements (if applicable)
- Seasonal constraints
- Indoor alternatives

### GoDaisy Pages

**Public Pages**:
- `/` - Homepage with activity recommendations
- `/activities` - All activities landscape view
- `/weather` - Detailed weather conditions
- `/interests` - Activity selection
- `/onboarding` - First-time user setup
- `/AboutUs` - About the platform
- `/HowWeDoIt` - How recommendations work
- `/FAQs` - Frequently asked questions
- `/support` - Contact support

**User Account Pages**:
- `/account` - Profile management
- `/auth/*` - Sign in/sign up flows

**Legal Pages**:
- `/PrivacyPolicy`
- `/TermsAndConditions`
- `/CookiePolicy`

### GoDaisy Components

**Layout Components**:
- `AppHeader` - Navigation with location picker
- `BottomNav` - Mobile bottom navigation (Home, Activities, Weather, Findr, Account)
- `Footer` - Site footer with links

**Activity Components**:
- `ActivityOutlooks` - Hero cards for activities
- `EnvironmentalIndicators` - Weather condition icons
- `HomeDayTabs` - Today/Tomorrow switcher
- `SimplifiedShareModal` - Activity sharing

**Weather Components**:
- `HourlyCard` - Hourly forecast cards
- `HourlyMarineCard` - Hourly marine conditions
- `ForecastCards` - Multi-day forecasts
- `WindDirectionIcon` - Compass wind arrows
- `BeaufortIcon` - Beaufort scale icons
- `WeatherAnimationLayer` - Animated backgrounds (rain, snow, etc.)

**Location Components**:
- `LocationPicker` - Location search and selection
- `CoastalLocationDialog` - Marine location selector
- `ModernLocationSearch` - Autocomplete location search
- `MapPicker` - Interactive map selection

**Specialized Components**:
- `AirQualityWarning` - Air quality alerts
- `PollenWarning` - Pollen level warnings
- `MoonNugget` - Moon phase display
- `PrettyTideWaveRolling` - Animated tide visualization

---

## 🎣 How Findr (Sea Fishing) Works

### The Prediction Pipeline

```
1. User Input
   ├── Location (ICES rectangle or lat/lon)
   ├── Date (default: today)
   └── Language preference

2. Data Gathering (Parallelized)
   ├── Rectangle metadata (region, center point)
   ├── Environmental data (Copernicus CMEMS)
   │   ├── Temperature
   │   ├── Salinity
   │   ├── Oxygen
   │   ├── Chlorophyll
   │   ├── Nitrate
   │   ├── Phosphate
   │   └── pH
   ├── Seabed data (EMODnet)
   │   ├── Bathymetry (depth)
   │   └── Substrate type
   └── Weather forecast (Met.no)
       ├── Temperature
       ├── Wind speed/direction
       ├── Precipitation
       └── Cloud cover

3. Species Matching
   ├── Load all active species with preferences
   ├── Match each species to conditions
   │   ├── Temperature match
   │   ├── Depth match
   │   ├── Substrate match
   │   └── Bio-bands match (guild-specific)
   └── Calculate match scores

4. Confidence Scoring
   ├── Base score from environmental match
   ├── Weather impact (guild-weighted)
   │   ├── Pelagic: wind matters most
   │   ├── Demersal: pressure matters most
   │   └── Rock-dwelling: minimal weather impact
   ├── Data completeness bonus
   └── Final score: 0-100

5. Ranking & Response
   ├── Sort by confidence score
   ├── Add metadata (region, cache timestamp)
   └── Cache for 3 hours
```

### Data Flow Diagram

```
User Request → API Endpoint → Cache Check
                                    ↓
                              Cache Miss
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Rectangle Data                  Weather Forecast
                    ↓                               ↓
            EMODnet Queries                 Met.no API
        (Bathymetry + Substrate)                   ↓
                    ↓                        Apply Guild Weights
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                        Copernicus Environmental Data
                        (7 marine variables)
                                    ↓
                        Species Environmental Match
                        (RPC: get_predictions_enhanced)
                                    ↓
                        Confidence Calculation
                                    ↓
                        Sort & Format Response
                                    ↓
                        Cache for 3 Hours
                                    ↓
                        Return to Client
```

---

## 🌊 Environmental Matching System

### Two-Phase Matching

**Phase 1: Environmental Suitability**
- Temperature within species range → score
- Depth within species range → score
- Substrate matches species preference → score
- Bio-bands (guild-specific environmental factors) → score

**Phase 2: Weather Impact** (Guild-Weighted)
- Each guild has different weather sensitivities
- Applied as multiplier to base environmental score

### Guild Weighting Profiles

```typescript
// Pelagic fish (e.g., Mackerel, Bass)
pelagic: {
  wind: 0.30,        // Very sensitive to wind
  temperature: 0.25, // Moderately sensitive
  pressure: 0.20,    // Less sensitive
  precipitation: 0.15,
  cloudCover: 0.10
}

// Demersal fish (e.g., Cod, Plaice)
demersal: {
  pressure: 0.30,    // Most sensitive to pressure
  temperature: 0.25,
  wind: 0.20,        // Less affected by surface wind
  precipitation: 0.15,
  cloudCover: 0.10
}

// Rock-dwelling (e.g., Wrasse, Conger Eel)
rock_dwelling: {
  temperature: 0.30,
  pressure: 0.25,
  wind: 0.15,        // Protected by structure
  precipitation: 0.15,
  cloudCover: 0.15
}
```

---

## 📊 Database Schema (Key Tables)

### Species & Taxonomy

```sql
species
├── id (uuid)
├── scientific_name (text)
├── common_name (text)
├── slug (text) -- URL-friendly identifier
├── guild (text) -- pelagic, demersal, rock_dwelling, etc.
├── min_temp / max_temp (numeric) -- Temperature range (°C)
├── min_depth / max_depth (numeric) -- Depth range (meters)
├── substrate_preferences (text[]) -- Array of preferred substrates
└── is_active (boolean)

species_translations
├── species_id (uuid)
├── language (text) -- 'en', 'da', 'de', 'fr', etc.
├── common_name (text)
└── description (text)
```

### Spatial Data

```sql
ices_rectangles
├── rectangle_code (text) -- e.g., '39F3'
├── region (text) -- e.g., 'North Sea'
├── center_lat / center_lon (numeric)
├── geometry (geography) -- PostGIS polygon
└── statistical_rectangle (text)

copernicus_data
├── id (uuid)
├── rectangle_code (text)
├── data_date (date)
├── temperature (numeric)
├── salinity (numeric)
├── oxygen (numeric)
├── chlorophyll (numeric)
├── nitrate (numeric)
├── phosphate (numeric)
├── ph (numeric)
└── created_at (timestamp)
```

### User Data

```sql
user_favourites
├── id (uuid)
├── user_id (uuid) -- references auth.users
├── species_id (uuid) -- references species
└── created_at (timestamp)

catch_logs
├── id (uuid)
├── user_id (uuid)
├── species_id (uuid)
├── rectangle_code (text)
├── caught_at (timestamp)
├── weight_kg (numeric)
├── length_cm (numeric)
└── notes (text)
```

### Caching

```sql
findr_prediction_sessions
├── id (uuid)
├── rectangle_code (text)
├── prediction_date (date)
├── predictions (jsonb) -- Full prediction response
├── metadata (jsonb) -- Request context
├── created_at (timestamp)
└── expires_at (timestamp) -- 3 hours TTL
```

---

## 🔧 Key API Endpoints

### Predictions

```typescript
POST /api/findr/predictions
{
  rectangleCode: string;      // Required: e.g., '39F3'
  predictionDate?: string;    // Optional: ISO date (default: today)
  language?: string;          // Optional: 'en' | 'da' | 'de' (default: 'en')
  latitude?: number;          // Optional: for EMODnet queries
  longitude?: number;         // Optional: for EMODnet queries
}

Response: {
  predictions: Array<{
    species_id: string;
    common_name: string;
    scientific_name: string;
    confidence_score: number;  // 0-100
    guild: string;
    image_url: string;
    environmental_match: object;
    weather_impact: object;
  }>;
  metadata: {
    rectangleCode: string;
    predictionDate: string;
    region: string;
    requestedAt: string;
  };
}
```

### Weather

```typescript
GET /api/weather/forecast?lat={lat}&lon={lon}

Response: {
  current: {
    temperature: number;
    wind_speed: number;
    wind_direction: number;
    pressure: number;
    precipitation: number;
    cloud_cover: number;
  };
  hourly: Array<...>;
  daily: Array<...>;
}
```

### Favorites

```typescript
GET /api/findr/favourites
POST /api/findr/favourites { species_id: string }
DELETE /api/findr/favourites/:id
```

---

## 🚀 Performance Optimizations

### Recent Improvements (Oct 18, 2025)

All **Priority 1 Quick Wins** implemented (see `SUPABASE_QUICK_WINS_COMPLETE.md`):

1. **Query Parallelization** ✅
   - Rectangle + EMODnet queries run in parallel
   - Reduced prediction time by 46% (650ms → 350ms)
   - See: `QUICK_WIN_1_COMPLETE.md`

2. **Performance Monitoring** ✅
   - `queryWithTiming()` utility logs all queries
   - Automatic warnings for queries >500ms
   - Enable with `LOG_QUERY_TIMING=true`

3. **React Query Integration** ✅
   - Migrated `useFishingPredictions` hook
   - Client-side caching (30 min stale time)
   - Automatic request deduplication
   - Background refetching
   - See: `QUICK_WIN_2_COMPLETE.md`

4. **Favourites Forecast Optimization** ✅
   - Parallelized 7-day forecast fetching
   - Reduced from 35 API calls to 7 (80% reduction)
   - 95% faster for users with 5 favorites (7,150ms → 350ms)
   - See: `QUICK_WIN_3_COMPLETE.md`

5. **Server-Side Caching**
   - Predictions cached for 3 hours in database
   - Rectangle-specific cache keys
   - Automatic expiration

### Cache Strategy

```
Level 1: React Query (Client)
├── Stale Time: 30 minutes
├── GC Time: 3 hours
└── Shared across components

Level 2: Database (Server)
├── TTL: 3 hours
├── Key: rectangle_code + prediction_date
└── Invalidation: manual or expiration

Level 3: CDN (Vercel Edge)
├── Static assets cached globally
└── API responses cached per region
```

---

## 🧪 Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Test specific features
npx tsx scripts/test-comprehensive-weather.ts
npx tsx scripts/test-guild-weather-weights.ts
npx tsx scripts/verify-temp-weights.ts
```

### Database Migrations

```bash
# Create new migration
npx supabase migration new migration_name

# Apply migrations
npx supabase db push

# Reset database (development only!)
npx supabase db reset
```

### Data Ingestion

```bash
# Ingest Copernicus data for specific rectangles
npx tsx scripts/ingest-copernicus-data.ts

# Triggered automatically by GitHub Actions cron job
# See: .github/workflows/findr-copernicus-ingest.yml
```

---

## 🐛 Debugging Guide

### Common Issues

**Predictions returning empty array**
1. Check Copernicus data coverage: Query `copernicus_data` table
2. Verify rectangle code exists in `ices_rectangles`
3. Check species `is_active` flag
4. Look for RPC errors in server logs

**Slow predictions (>1s)**
1. Enable query timing: `LOG_QUERY_TIMING=true`
2. Check for cache hits in `findr_prediction_sessions`
3. Verify Copernicus data is recent (not stale)
4. Monitor Supabase dashboard for slow queries

**Weather not showing**
1. Check Met.no API status: https://api.met.no/weatherapi/status
2. Verify lat/lon are valid
3. Check browser console for CORS errors
4. Test with: `curl "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55&lon=10"`

**Species images not loading**
1. Check file exists in `/public/PNGS/{slug}.png`
2. Verify `speciesImageMap.ts` has entry
3. Check image format (must be PNG)
4. Clear Next.js cache: `rm -rf .next && npm run dev`

### Debugging Tools

```bash
# Check query performance
LOG_QUERY_TIMING=true npm run dev

# Test predictions without cache
curl -X POST http://localhost:3000/api/findr/predictions?bypassCache=true \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode": "39F3"}'

# Check database directly
npx supabase db connect
> SELECT * FROM copernicus_data WHERE rectangle_code = '39F3' LIMIT 5;
> SELECT * FROM species WHERE is_active = true LIMIT 10;

# View prediction cache
> SELECT rectangle_code, prediction_date, created_at, expires_at 
  FROM findr_prediction_sessions 
  ORDER BY created_at DESC LIMIT 10;
```

---

## 📚 Deep Dive Documentation

### Core Systems
- **`FINDR_PREDICTIONS_DATA_SOURCES.md`** - Complete prediction engine explanation
- **`CONFIDENCE_SCORING_ALGORITHM.md`** - How scores are calculated
- **`ENVIRONMENTAL_MATCHING_SUMMARY.md`** - Species matching logic
- **`ENVIRONMENTAL_MATCHING_TWO_PHASE_SYSTEM.md`** - Detailed matching strategy

### Data & Integration
- **`COPERNICUS_DATA_INGESTION_GUIDE.md`** - CMEMS data ingestion process
- **`COPERNICUS_COMPLETE_COVERAGE_ANALYSIS.md`** - Data coverage by region
- **`PHASE_10_COMPLETE_SUMMARY.md`** - Latest integration work (biogeochemical data)
- **`BIO_BAND_CONFIDENCE_QUICK_REFERENCE.md`** - Guild weighting system

### Performance
- **`SUPABASE_OPTIMIZATION_IMPLEMENTATION_COMPLETE.md`** - Latest optimizations (Oct 18, 2025)
- **`PERFORMANCE_ANALYSIS.md`** - Performance metrics and targets
- **`SUPABASE_OPTIMIZATION_ACTION_PLAN.md`** - Optimization roadmap

### Operations
- **`DIAGNOSIS_QUICK_REF.md`** - Quick troubleshooting reference
- **`ENHANCED_REINGEST_QUICK_REF.md`** - Data re-ingestion commands
- **`CACHE_CLEARING_GUIDE.md`** - Cache management

### Main Reference
- **`CLAUDE.md`** - Complete project guide (architecture, patterns, tasks)

---

## 🎯 Next Steps

1. **Read `CLAUDE.md`** (lines 1-200) for project overview
2. **Explore `FINDR_PREDICTIONS_DATA_SOURCES.md`** to understand predictions
3. **Run the app locally** with `npm run dev`
4. **Test predictions** with the test scripts
5. **Check the database schema** in `supabase/migrations/`

---

**Questions?** Check the documentation index in `CLAUDE.md` or the `/archive/` folder for historical context.

**Last Updated**: October 18, 2025
