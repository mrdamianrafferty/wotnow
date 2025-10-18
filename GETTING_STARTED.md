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

# Run Jest unit tests
npm test

# Run tests with coverage
npm run test:ci

# Run specific test file
npm test -- activityHelpers.windOrientation.test.ts

# Test specific features (integration tests)
npx tsx scripts/test-comprehensive-weather.ts
npx tsx scripts/test-guild-weather-weights.ts
npx tsx scripts/verify-temp-weights.ts
```

**Test Structure:**
- Tests located in `__tests__/` directory
- Jest + React Testing Library
- Test naming: `*.test.ts` or `*.test.tsx`
- Coverage reports in `coverage/` directory

**Available Test Suites:**
```
__tests__/
├── activityHelpers.windOrientation.test.ts    # Wind direction matching
├── activitySnowScoring.test.ts                # Snow sport scoring
├── activitySuitability.comparatorScoring.test.ts  # Activity evaluation
├── airQuality.activityReasons.test.ts         # Air quality logic
├── getSuggestionsByDay.humidityReason.test.ts # Humidity scoring
├── windRecommendations.test.ts                # Wind-based recommendations
├── unifiedWeather.moon.test.ts                # Moon phase calculations
├── useCatchLogger.test.ts                     # Findr catch logging
├── copernicus/                                # Copernicus data tests
└── [12+ more test files]
```

**Writing Tests:**
```typescript
// Example test structure
import { describe, it, expect } from '@jest/globals';
import { yourFunction } from '../utils/yourModule';

describe('yourFunction', () => {
  it('should return expected result', () => {
    const result = yourFunction(input);
    expect(result).toBe(expectedOutput);
  });
  
  it('should handle edge cases', () => {
    expect(yourFunction(null)).toBeNull();
  });
});
```

**Test Coverage Goals:**
- Critical paths: >80% coverage
- Utility functions: >90% coverage
- API routes: Integration tested
- Components: Key interactions tested

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

**1. Build Workflow** (`.github/workflows/build.yml`)
- **Triggers**: On all pull requests
- **Purpose**: Verify code quality before merge
- **Steps**:
  1. Checkout code
  2. Setup Node.js 20
  3. Install dependencies (`npm ci`)
  4. Run ESLint with zero warnings (`npm run lint:ci`)
  5. TypeScript type check and build (`npm run build`)

**2. Lint Workflow** (`.github/workflows/lint.yml`)
- **Triggers**: On push to main, pull requests
- **Purpose**: Enforce code quality standards
- **Steps**: Fast ESLint check

**3. Copernicus Data Ingestion** (`.github/workflows/findr-copernicus-ingest.yml`)
- **Triggers**: 
  - Cron: Daily at 3 AM UTC (`0 3 * * *`)
  - Manual: `workflow_dispatch`
- **Purpose**: Update marine environmental data for Findr predictions
- **Timeout**: 120 minutes
- **Steps**:
  1. Setup Node.js
  2. Run `npx tsx scripts/ingest-copernicus-data.ts`
  3. Verify data was ingested
  4. Post to Slack on failure (optional)
- **Required Secrets**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `COPERNICUS_USERNAME`
  - `COPERNICUS_PASSWORD`

**4. Met.no Weather Ingestion** (`.github/workflows/findr-met-ingest.yml`)
- **Triggers**: Cron schedule
- **Purpose**: Cache weather forecasts

**5. Astro Canaries** (`.github/workflows/astro_canaries.yml`)
- **Triggers**: Scheduled
- **Purpose**: Validate astronomy data service

### Deployment Flow

```
Developer → Git Push → GitHub
                          ↓
                    Pre-push Hooks
                    ├── ESLint
                    └── TypeScript
                          ↓
                    GitHub Actions
                    ├── Build Check
                    └── Lint Check
                          ↓
                    Vercel (auto-deploy)
                    ├── Install deps
                    ├── Run build
                    ├── Deploy to edge
                    └── Generate preview URL
                          ↓
                    Production (if main branch)
                    └── https://godaisy.io
```

**Manual Workflow Triggers:**
```bash
# Trigger Copernicus ingestion manually
# Go to: GitHub > Actions > FINDR Copernicus ingestion > Run workflow

# Or use GitHub CLI
gh workflow run findr-copernicus-ingest.yml
```

---

## 🔧 Environment Variables

### Complete Reference

**Required for All Environments:**
```bash
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-only, NEVER expose

# Mapbox (Maps)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

**Required for Findr (Marine Data):**
```bash
# Copernicus Marine Service
COPERNICUS_USERNAME=your_cmems_username
COPERNICUS_PASSWORD=your_cmems_password
COPERNICUS_ENABLED=true
COPERNICUS_PROVIDER=live  # or 'mock' for testing
```

**Weather Services:**
```bash
# Primary weather source (Met.no is free, no key required)
# Backup/additional sources:
NEXT_PUBLIC_OPENWEATHER_KEY=your_openweather_api_key  # Optional
STORMGLASS_SECRET_KEY=your_stormglass_key  # Optional (marine data backup)
```

**Third-Party Integrations:**
```bash
# Google Maps (for location search)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Astronomy data
N2YO_API_KEY=your_n2yo_key  # Satellite tracking
MOON_API_KEY=your_moon_api_key  # Moon phase data (if needed)

# Optional integrations
EVENTBRITE_API_KEY=your_eventbrite_key  # Event discovery
```

**App Configuration:**
```bash
# Base URL for absolute links
NEXT_PUBLIC_BASE_URL=https://godaisy.io  # Production
# NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Development

# Performance monitoring
LOG_QUERY_TIMING=true  # Development only - logs database query times
```

**Development vs Production:**

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://godaisy.io` |
| `LOG_QUERY_TIMING` | `true` (optional) | `false` or omit |
| `COPERNICUS_PROVIDER` | `mock` (faster) | `live` |
| `NODE_ENV` | `development` | `production` |

### Setup Instructions

**Local Development:**
```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Edit .env.local with your actual keys
nano .env.local

# 3. Sync to CLI-friendly format (for scripts)
npm run env:sync

# 4. Start development server
npm run dev
```

**Vercel Production:**
```bash
# Add via Vercel Dashboard:
# 1. Go to Project Settings > Environment Variables
# 2. Add each variable
# 3. Select environment: Production, Preview, Development
# 4. Save and redeploy

# Or use Vercel CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... etc
```

**Required Secrets for GitHub Actions:**
```bash
# In GitHub: Settings > Secrets and variables > Actions
# Add these repository secrets:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- COPERNICUS_USERNAME
- COPERNICUS_PASSWORD
```

### Troubleshooting Environment Variables

**"Cannot find module" or undefined errors:**
```bash
# Check .env.local exists
ls -la .env.local

# Restart dev server (env changes require restart)
# Press Ctrl+C, then:
npm run dev

# Verify variables are loaded
# Add to a page temporarily:
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

**Variables not working in browser:**
- Only `NEXT_PUBLIC_*` variables are exposed to browser
- Server-only variables (like service keys) are only available in API routes
- Restart dev server after changes

---

## 📊 Data Models & Types

### Key TypeScript Interfaces

**Activity Type:**
```typescript
// data/activities/types.ts
interface ActivityType {
  id: string;                    // e.g., 'surfing'
  name: string;                  // e.g., 'Surfing'
  category: string;              // e.g., 'watersports'
  tags: string[];                // e.g., ['marine', 'outdoor', 'fitness']
  conditions: {
    temperature?: { min?: number; max?: number; optimal?: number };
    windSpeed?: { min?: number; max?: number; optimal?: number };
    precipitation?: { max?: number };
    humidity?: { min?: number; max?: number };
    uvIndex?: { max?: number };
    // ... more conditions
  };
  marine?: {
    waveHeight?: { min?: number; max?: number; optimal?: number };
    waterTemp?: { min?: number };
    tidePreference?: 'high' | 'low' | 'rising' | 'falling';
  };
  seasonal?: {
    months?: number[];           // 1-12 (January-December)
    hemisphere?: 'north' | 'south' | 'both';
  };
}
```

**Weather Data:**
```typescript
// types/weatherTypes.ts
interface WeatherForecastDay {
  dt: number;                    // Unix timestamp
  temp: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;              // hPa
  humidity: number;              // %
  wind_speed: number;            // m/s
  wind_deg: number;              // degrees
  wind_gust?: number;            // m/s
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: number;                // %
  pop: number;                   // Probability of precipitation (0-1)
  rain?: number;                 // mm
  snow?: number;                 // mm
  uvi: number;                   // UV index
}

interface MarineHour {
  time: string;                  // ISO timestamp
  waveHeight: number;            // meters
  wavePeriod: number;            // seconds
  waveDirection: number;         // degrees
  swellHeight: number;           // meters
  swellPeriod: number;           // seconds
  swellDirection: number;        // degrees
  waterTemp: number;             // °C
  currentSpeed?: number;         // m/s
  currentDirection?: number;     // degrees
}
```

**Findr Predictions:**
```typescript
// Prediction response from /api/findr/predictions
interface PredictionResponse {
  predictions: Array<{
    species_id: string;
    common_name: string;
    scientific_name: string;
    slug: string;
    confidence_score: number;    // 0-100
    guild: string;               // 'pelagic' | 'demersal' | 'rock_dwelling' | etc.
    image_url: string;
    environmental_match: {
      temperature_score: number;
      depth_score: number;
      substrate_score: number;
      bio_bands_score: number;
    };
    weather_impact: {
      wind_factor: number;
      pressure_factor: number;
      temperature_factor: number;
      overall_multiplier: number;
    };
  }>;
  metadata: {
    rectangleCode: string;
    predictionDate: string;
    region: string;
    requestedAt: string;
    cacheHit: boolean;
  };
}

// Species database model
interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  slug: string;
  guild: string;
  min_temp: number | null;
  max_temp: number | null;
  min_depth: number | null;
  max_depth: number | null;
  substrate_preferences: string[] | null;
  is_active: boolean;
  created_at: string;
}
```

**User Data:**
```typescript
// User favorites
interface UserFavourite {
  id: string;
  user_id: string;
  species_id: string;
  created_at: string;
  species?: Species;             // Joined data
}

// Catch log
interface CatchLog {
  id: string;
  user_id: string;
  species_id: string;
  rectangle_code: string;
  caught_at: string;
  weight_kg: number | null;
  length_cm: number | null;
  notes: string | null;
  weather_conditions: Record<string, any> | null;
  validation_data: Record<string, any> | null;
  created_at: string;
}
```

---

## 🎣 Findr Validation System

### Catch Logging & Prediction Validation

The Findr app includes a comprehensive system to validate fishing predictions against real-world catches.

**Features:**
- **Impression Tracking**: Records when users view predictions
- **Catch Logging**: Easy interface to log successful catches
- **Blank Trip Recording**: Log unsuccessful fishing trips for data quality
- **Environmental Snapshots**: Captures weather/marine conditions at catch time
- **Validation Questions**: Links catches back to predictions viewed

**Database Tables:**
```sql
-- Track prediction views
findr_prediction_impressions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  rectangle_code text,
  prediction_date date,
  viewed_at timestamp,
  species_ids text[]  -- Species shown in prediction
)

-- Log catches
catch_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  species_id uuid REFERENCES species,
  rectangle_code text,
  caught_at timestamp,
  weight_kg numeric,
  length_cm numeric,
  notes text,
  weather_conditions jsonb,
  validation_data jsonb,  -- Links to prediction impression
  created_at timestamp
)

-- Log unsuccessful trips
blank_trips (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  rectangle_code text,
  fished_at timestamp,
  duration_minutes integer,
  conditions_snapshot jsonb,
  created_at timestamp
)
```

**API Endpoints:**

```typescript
// Record prediction view
POST /api/findr/record-impression
{
  rectangleCode: string;
  predictionDate: string;
  speciesIds: string[];
}

// Log a catch
POST /api/findr/catch-log
{
  speciesId: string;
  rectangleCode: string;
  caughtAt: string;  // ISO timestamp
  weightKg?: number;
  lengthCm?: number;
  notes?: string;
  predictionImpressionId?: string;  // Links to prediction
}

// Retrieve user's catch logs
GET /api/findr/catch-log
Response: CatchLog[]

// Record unsuccessful trip
POST /api/findr/record-blank-trip
{
  rectangleCode: string;
  fishedAt: string;
  durationMinutes: number;
  conditions: object;
}
```

**Usage in App:**
```typescript
// In /findr/log page
import { useCatchLogger } from '@/hooks/useCatchLogger';

function CatchLogPage() {
  const { logCatch, loading, error } = useCatchLogger();
  
  const handleSubmit = async (data) => {
    await logCatch({
      speciesId: data.species,
      rectangleCode: data.location,
      caughtAt: data.timestamp,
      weightKg: data.weight,
      lengthCm: data.length,
    });
  };
  
  // ... form UI
}
```

**Future Analytics:**
- Prediction accuracy by species
- Catch rate by rectangle and season
- User feedback loop to improve predictions
- Confidence score calibration

---

## 🌐 Third-Party Service Dependencies

### Service Overview & Limits

**1. Copernicus CMEMS** (Marine Environmental Data)
- **Provider**: Copernicus Marine Environment Monitoring Service (EU)
- **Purpose**: Ocean temperature, salinity, nutrients, oxygen, pH
- **Authentication**: Username + Password
- **Rate Limits**: Reasonable use, daily ingestion cron
- **Data Coverage**: European waters, 30km resolution
- **Cost**: Free for registered users
- **Docs**: https://marine.copernicus.eu/
- **Fallback**: Cached data (3-hour TTL), mock provider for testing

**2. EMODnet** (Bathymetry & Substrate)
- **Provider**: European Marine Observation and Data Network
- **Purpose**: Seabed depth and substrate type
- **Authentication**: None (public API)
- **Rate Limits**: Fair use
- **Data Coverage**: European waters
- **Cost**: Free
- **Docs**: https://emodnet.ec.europa.eu/
- **Fallback**: Default depth values if unavailable

**3. Met.no** (Weather Forecasts)
- **Provider**: Norwegian Meteorological Institute
- **Purpose**: Weather forecasts (temp, wind, precipitation, pressure)
- **Authentication**: None required
- **Rate Limits**: ~20 req/sec recommended
- **User-Agent**: Required (identify your app)
- **Data Coverage**: Global
- **Cost**: Free
- **Docs**: https://api.met.no/
- **Fallback**: Cached forecasts, degraded predictions

**4. Mapbox** (Interactive Maps)
- **Provider**: Mapbox
- **Purpose**: Map tiles, geocoding, location search
- **Authentication**: API token (NEXT_PUBLIC_MAPBOX_TOKEN)
- **Rate Limits**: 
  - Free tier: 50,000 map loads/month
  - 100,000 geocoding requests/month
- **Cost**: Free tier, then pay-as-you-go
- **Docs**: https://docs.mapbox.com/
- **Fallback**: Disable map features

**5. Google Maps** (Location Autocomplete)
- **Provider**: Google Maps Platform
- **Purpose**: Place search and autocomplete
- **Authentication**: API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
- **Rate Limits**: Based on billing plan
- **Cost**: $200 free credit/month, then paid
- **Docs**: https://developers.google.com/maps
- **Fallback**: Manual location entry

**6. Supabase** (Database & Auth)
- **Provider**: Supabase (PostgreSQL + PostGIS)
- **Purpose**: Primary database, user authentication, storage
- **Authentication**: Project URL + API keys
- **Rate Limits**: Based on plan (Free: 500MB, 2GB bandwidth)
- **Cost**: Free tier, Pro at $25/month
- **Docs**: https://supabase.com/docs
- **Fallback**: None (critical dependency)

### API Key Setup & Best Practices

**Mapbox Setup:**
```bash
# 1. Sign up at https://account.mapbox.com/
# 2. Create token with these scopes:
#    - styles:read
#    - fonts:read
#    - datasets:read
# 3. Restrict to domains: godaisy.io, *.vercel.app
# 4. Add to .env.local:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJhYmMxMjMifQ...
```

**Google Maps Setup:**
```bash
# 1. Go to Google Cloud Console
# 2. Enable APIs: Maps JavaScript API, Places API, Geocoding API
# 3. Create credentials > API key
# 4. Restrict key:
#    - Application restrictions: HTTP referrers
#    - Add: godaisy.io/*, *.vercel.app/*
#    - API restrictions: Select only needed APIs
# 5. Add to .env.local:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC...
```

**Rate Limiting Best Practices:**
- Use caching aggressively (React Query, database cache)
- Implement exponential backoff on failures
- Monitor usage in provider dashboards
- Set up billing alerts
- Use mock providers in development/testing

---

## 💻 Development Best Practices

### Code Organization Patterns

**1. Client vs Server Components**
```typescript
// Default to Server Components (no 'use client')
// pages/index.tsx - Server Component
export default async function HomePage() {
  // Can fetch data directly
  const data = await fetch('...');
  return <div>...</div>;
}

// Use 'use client' only when needed:
// - useState, useEffect, event handlers
// - Browser APIs (localStorage, window)
// - Third-party libraries requiring browser context
'use client';
export function InteractiveComponent() {
  const [state, setState] = useState();
  return <button onClick={() => setState(...)}>Click</button>;
}
```

**2. API Route Patterns**
```typescript
// pages/api/example.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Check HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Validate input
  const { param } = req.body;
  if (!param) {
    return res.status(400).json({ error: 'Missing required parameter' });
  }

  // 3. Get authenticated user (if needed)
  const supabase = getSupabaseServerClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 4. Perform operation
  try {
    const result = await someOperation(param);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Operation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**3. Database Query Patterns**
```typescript
// Use queryWithTiming for performance monitoring
import { queryWithTiming } from '@/lib/supabase/queryWithTiming';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const supabase = getSupabaseServerClient();

// Single query with timing
const species = await queryWithTiming(
  async () => {
    const { data, error } = await supabase
      .from('species')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },
  'fetch_active_species'
);

// Parallel queries
import { timedParallelQueries } from '@/lib/supabase/queryWithTiming';

const [rectangles, conditions] = await timedParallelQueries([
  {
    name: 'fetch_rectangles',
    fn: async () => {
      const { data } = await supabase.from('ices_rectangles').select('*');
      return data;
    }
  },
  {
    name: 'fetch_conditions',
    fn: async () => {
      const { data } = await supabase.from('copernicus_data').select('*');
      return data;
    }
  }
]);
```

**4. Caching Strategies**
```typescript
// Client-side: React Query
import { useQuery } from '@tanstack/react-query';

function usePredictions(rectangleCode: string) {
  return useQuery({
    queryKey: ['predictions', rectangleCode],
    queryFn: () => fetchPredictions(rectangleCode),
    staleTime: 1000 * 60 * 30,     // 30 min fresh
    cacheTime: 1000 * 60 * 60 * 3,  // 3 hours in memory
    refetchOnWindowFocus: false,
  });
}

// Server-side: Database cache
// Check cache in findr_prediction_sessions table
// TTL: 3 hours (expires_at column)
// Invalidate manually or wait for expiration
```

**5. Error Handling**
```typescript
// API routes: Always return proper status codes
try {
  const data = await riskyOperation();
  return res.status(200).json(data);
} catch (error) {
  console.error('[API] Operation failed:', error);
  
  // Differentiate error types
  if (error.code === 'PGRST116') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  if (error.message.includes('permission')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  return res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// Frontend: User-friendly messages
try {
  const result = await apiCall();
} catch (error) {
  toast.error('Unable to load predictions. Please try again.');
  console.error('Detailed error:', error);
}
```

---

## 🤝 Contributing Guidelines

### Code Style & Conventions

**TypeScript:**
- Use strict type checking (`tsconfig.json` with `strict: true`)
- Avoid `any` - use `unknown` or specific types
- Export types and interfaces for reusability
- Use `interface` for object shapes, `type` for unions/intersections

**Naming Conventions:**
```typescript
// Files: camelCase for utilities, PascalCase for components
// utils/weatherUtils.ts
// components/ActivityCard.tsx

// Variables: camelCase
const userLocation = getUserLocation();

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Functions: camelCase, descriptive verbs
function calculateConfidenceScore() { }

// Components: PascalCase
function WeatherCard() { }

// Types/Interfaces: PascalCase
interface UserPreference { }
type ActivityId = string;
```

**React Patterns:**
```typescript
// Prefer functional components
function MyComponent({ prop1, prop2 }: Props) {
  return <div>{prop1}</div>;
}

// Use hooks at top level
function MyComponent() {
  const [state, setState] = useState();
  const data = useQuery(...);
  
  // Not inside conditionals or loops
  if (condition) {
    // const data = useQuery(...); // ❌ Wrong
  }
}

// Extract complex logic to custom hooks
function useComplexLogic() {
  const [state, setState] = useState();
  useEffect(() => { /* ... */ }, []);
  return { state, setState };
}
```

**Comments:**
```typescript
// Good: Explain WHY, not WHAT
// Use 3-hour cache to align with Copernicus update frequency
const CACHE_TTL = 1000 * 60 * 60 * 3;

// Bad: Obvious from code
// Set cache time to 3 hours
const CACHE_TTL = 1000 * 60 * 60 * 3;

// Good: Document complex algorithms
/**
 * Calculates fishing confidence score using two-phase matching:
 * 1. Environmental suitability (temperature, depth, substrate)
 * 2. Weather impact (guild-weighted multipliers)
 * 
 * @returns Score from 0-100
 */
function calculateConfidence() { }
```

### Git Workflow

**Branch Naming:**
```bash
feature/add-species-search      # New features
fix/prediction-cache-bug        # Bug fixes
docs/update-api-documentation   # Documentation
refactor/optimize-db-queries    # Code improvements
chore/update-dependencies       # Maintenance
```

**Commit Messages:**
```bash
# Format: <type>: <subject>

# Examples:
feat: Add species filtering to predictions API
fix: Resolve cache invalidation issue in predictions
docs: Update GETTING_STARTED with environment variables
refactor: Extract weather fetching to separate service
chore: Update dependencies to latest versions
perf: Parallelize rectangle and EMODnet queries
test: Add unit tests for confidence scoring algorithm

# Multi-line for complex changes:
feat: Implement catch logging validation system

- Add catch_logs and blank_trips tables
- Create API endpoints for logging catches
- Link catches to prediction impressions
- Add environmental snapshot at catch time
```

**Pull Request Process:**
1. Create feature branch from `main`
2. Make changes with clear commits
3. Run `npm run lint:ci` and `npm run typecheck`
4. Push and create PR with description
5. Address review comments
6. Squash merge to `main`

### Code Review Checklist

**Before Submitting PR:**
- [ ] Code follows style guidelines
- [ ] TypeScript types are specific (no `any`)
- [ ] ESLint passes with zero warnings
- [ ] TypeScript compiles without errors
- [ ] Added tests for new functionality
- [ ] Updated documentation if needed
- [ ] Checked for console.log() debugging statements
- [ ] Verified no sensitive data in commits

**Reviewer Checklist:**
- [ ] Code is readable and maintainable
- [ ] Logic is sound and efficient
- [ ] Error handling is appropriate
- [ ] Types are correctly defined
- [ ] Tests cover edge cases
- [ ] No security vulnerabilities
- [ ] Performance impact considered

---

## 🆘 Troubleshooting & FAQ

### Common Setup Issues

**Q: `npm install` fails with dependency errors**
```bash
# A: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Q: Port 3000 already in use**
```bash
# A: Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

**Q: Environment variables not loading**
```bash
# A: Check file exists and restart server
ls -la .env.local

# Restart dev server (Ctrl+C, then):
npm run dev

# Verify in API route:
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

**Q: Database connection errors**
```bash
# A: Verify Supabase credentials
# Check .env.local has correct:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# Test connection:
npx supabase db ping
```

**Q: TypeScript errors in IDE but build succeeds**
```bash
# A: Restart TypeScript server
# VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"

# Or rebuild types:
npm run typecheck
```

**Q: Images not loading**
```bash
# A: Check Next.js image optimization
# Verify images in /public directory
# Check next.config.js domains configuration
# Clear .next cache:
rm -rf .next && npm run dev
```

### Common Runtime Issues

**Q: Predictions returning empty array**
```typescript
// A: Check data pipeline
// 1. Verify Copernicus data exists
const { data } = await supabase
  .from('copernicus_data')
  .select('*')
  .eq('rectangle_code', 'YOUR_RECTANGLE')
  .order('data_date', { ascending: false })
  .limit(1);

// 2. Check active species
const { data: species } = await supabase
  .from('species')
  .select('*')
  .eq('is_active', true);

// 3. Check RPC function exists
const { data, error } = await supabase.rpc('get_predictions_enhanced', {...});
```

**Q: Slow predictions (>2 seconds)**
```bash
# A: Enable query timing
LOG_QUERY_TIMING=true npm run dev

# Check logs for slow queries
# Look for warnings: "Slow query: ... (>500ms)"

# Verify cache is working
# Check findr_prediction_sessions table
```

**Q: Authentication not working**
```typescript
// A: Check Supabase Auth configuration
// 1. Verify email templates in Supabase dashboard
// 2. Check redirect URLs are whitelisted
// 3. Test with console logs:
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

**Q: Maps not displaying**
```bash
# A: Check Mapbox token
# 1. Verify NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
# 2. Check browser console for errors
# 3. Verify token scopes in Mapbox dashboard
# 4. Check domain restrictions
```

### Performance Issues

**Q: Slow page loads**
```bash
# A: Run Lighthouse audit
# Chrome DevTools > Lighthouse > Generate report

# Check for:
# - Large bundle sizes (use dynamic imports)
# - Unoptimized images (use next/image)
# - Blocking third-party scripts
# - Excessive client-side JavaScript
```

**Q: High memory usage**
```bash
# A: Check for memory leaks
# 1. Use React DevTools Profiler
# 2. Check for:
#    - Unmounted components with active listeners
#    - Large arrays/objects in state
#    - Infinite re-renders
#    - Missing cleanup in useEffect
```

### Data Issues

**Q: Copernicus data ingestion failing**
```bash
# A: Check GitHub Actions logs
# 1. Go to: Actions > FINDR Copernicus ingestion
# 2. Check latest run for errors
# 3. Common issues:
#    - Invalid credentials (check secrets)
#    - CMEMS API downtime (retry later)
#    - Rate limiting (adjust delay)

# Manual test:
COPERNICUS_USERNAME=xxx COPERNICUS_PASSWORD=xxx \
  npx tsx scripts/ingest-copernicus-data.ts
```

**Q: Stale weather data**
```bash
# A: Check Met.no API
curl "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55&lon=10"

# Verify cache expiry
# Weather cached client-side for 30 min
# Clear React Query cache or wait for stale time
```

### Development Workflow Issues

**Q: Hot reload not working**
```bash
# A: Clear Next.js cache
rm -rf .next
npm run dev

# Or restart with clean build:
pkill -f "next dev"
rm -rf .next
npm run dev
```

**Q: Git pre-push hooks failing**
```bash
# A: Fix linting/type errors first
npm run lint:fix
npm run typecheck

# To bypass hooks (emergency only):
git push --no-verify
```

**Q: Vercel deployment failing**
```bash
# A: Check Vercel logs
# 1. Go to Vercel dashboard > Deployments
# 2. Click failed deployment > View logs
# 3. Common issues:
#    - Missing environment variables
#    - Build timeout (optimize build)
#    - TypeScript errors (run typecheck locally)
#    - Dependency conflicts (check package.json)
```

### FAQ

**Q: What Node version should I use?**
A: Node.js 20.x (specified in `package.json` engines)

**Q: Can I use yarn or pnpm instead of npm?**
A: Yes, but npm is recommended for consistency. Lock file is `package-lock.json`.

**Q: How do I add a new activity?**
A: Add to appropriate file in `data/activities/`, export from `index.ts`, add emoji to `emojiMap.ts`, add background image to `bgMap.ts`.

**Q: How do I add a new species to Findr?**
A: Create migration to insert into `species` table, add image to `/public/PNGS/`, add translations if needed.

**Q: Where are API routes defined?**
A: In `pages/api/` directory. Each file exports a handler function.

**Q: How do I clear all caches?**
```bash
# Client cache (React Query):
# Refresh browser or wait for stale time

# Server cache (database):
DELETE FROM findr_prediction_sessions WHERE expires_at < NOW();

# Build cache:
rm -rf .next

# Node modules:
rm -rf node_modules package-lock.json && npm install
```

**Q: How do I run in production mode locally?**
```bash
npm run build
npm start
```

**Q: Where can I find more help?**
- Check `CLAUDE.md` for project overview
- Read specific docs: `FINDR_PREDICTIONS_DATA_SOURCES.md`, `CONFIDENCE_SCORING_ALGORITHM.md`
- Check `DIAGNOSIS_QUICK_REF.md` for troubleshooting
- Review GitHub Issues for similar problems

---

## 📚 Deep Dive Documentation

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

## � Deployment & Operations

### Deployment Checklist

**Pre-Deployment Verification:**
```bash
# 1. Run all checks locally
npm run typecheck          # TypeScript compilation
npm run lint              # ESLint (max-warnings=0)
npm run build             # Next.js production build

# 2. Test critical paths
npx tsx scripts/test-comprehensive-weather.ts
npx tsx scripts/test-guild-weather-weights.ts

# 3. Verify environment variables
# Required in production:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_MAPBOX_TOKEN
# - COPERNICUS_USERNAME (for data ingestion)
# - COPERNICUS_PASSWORD (for data ingestion)

# 4. Check database migrations
npx supabase db diff        # Any pending migrations?
npx supabase db push        # Apply if needed

# 5. Verify data freshness
# Check copernicus_data has recent entries
# Check findr_prediction_sessions cache expiry

# 6. Review git status
git status                  # No uncommitted changes
git log --oneline -5        # Verify commits
```

**Deployment Flow:**
1. Push to `main` branch triggers Vercel deployment
2. Pre-push hooks run ESLint + TypeScript checks
3. Vercel builds and deploys automatically
4. Monitor deployment logs in Vercel dashboard
5. Verify production at https://godaisy.io

**Post-Deployment Verification:**
```bash
# Test production endpoints
curl https://godaisy.io/api/health
curl -X POST https://godaisy.io/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode": "39F3"}'

# Check weather integration
curl "https://godaisy.io/api/weather/forecast?lat=55&lon=10"

# Verify static assets load
# Check browser console for errors
# Test user flows (auth, favorites, predictions)
```

---

### Monitoring & Alerts

**What to Watch in Production:**

**Performance Metrics:**
- API response times (target: <1s for predictions)
- Database query times (warn if >500ms)
- Cache hit rate (target: >70%)
- Error rates (4xx/5xx responses)
- Build times (Vercel deployments)

**Vercel Dashboard:**
- Real-time function logs
- Edge function performance
- Bandwidth usage
- Build logs and deployment status

**Supabase Dashboard:**
- Database load (CPU, memory, disk)
- Active connections
- Slow queries (>500ms)
- Table sizes and growth
- Auth events (sign-ups, logins)

**Critical Alerts to Set Up:**
1. **API Error Rate** - Alert if >5% errors for 5 minutes
2. **Database CPU** - Alert if >80% for 10 minutes
3. **Cache Miss Rate** - Alert if >50% (data ingestion issue)
4. **Build Failures** - Immediate notification
5. **Auth Issues** - Alert on repeated failed logins

**Monitoring Tools:**
```bash
# Enable query timing in development
LOG_QUERY_TIMING=true npm run dev

# Check Supabase logs
npx supabase db logs

# Monitor Copernicus data ingestion
# GitHub Actions: .github/workflows/findr-copernicus-ingest.yml
# Check workflow runs for failures
```

**Key Performance Indicators (KPIs):**
- Findr predictions: 90th percentile <1s
- Weather API: 95th percentile <500ms
- Homepage load: LCP <2.5s
- Cache hit rate: >70%
- Uptime: >99.5%

---

### Rollback Procedure

**If Something Breaks in Production:**

**Option 1: Vercel Instant Rollback (Fastest)**
```bash
# Via Vercel Dashboard:
1. Go to https://vercel.com/mrdamianrafferty/wotnow/deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"
4. Confirm rollback

# Via Vercel CLI:
npx vercel rollback
```

**Option 2: Git Revert + Redeploy**
```bash
# Revert the problematic commit
git revert HEAD           # Or specific commit hash
git push origin main      # Triggers new deployment

# Or reset to last working commit (use with caution!)
git reset --hard <commit-hash>
git push --force origin main
```

**Option 3: Emergency Hotfix**
```bash
# For critical bugs, create hotfix directly on main
git checkout main
# Make minimal fix
git add .
git commit -m "hotfix: critical bug description"
git push origin main
```

**Database Rollback:**
```bash
# If migration caused issues
npx supabase db reset     # Development only!

# Production: Manually revert in Supabase SQL Editor
# Or create new migration to undo changes
npx supabase migration new revert_feature_name
# Write SQL to undo previous migration
npx supabase db push
```

**Communication During Incidents:**
1. Post status update (if using status page)
2. Notify users via Twitter/social media
3. Document incident in post-mortem
4. Update monitoring to catch similar issues

---

### Performance Benchmarks

**Expected Response Times by Endpoint:**

**Findr Predictions API** (`/api/findr/predictions`)
- Cold start: ~1,000ms (cache miss, all data fetched)
- Warm cache: ~350ms (cache hit)
- p50: <500ms
- p90: <1,000ms
- p99: <2,000ms

**Weather API** (`/api/weather/forecast`)
- Met.no API call: ~300ms
- Marine data merge: ~100ms
- Total: <500ms
- p90: <800ms

**Favorites API** (`/api/findr/favourites`)
- GET: <100ms (simple query)
- POST: <150ms (insert + return)
- DELETE: <100ms

**Health Check** (`/api/health`)
- Target: <50ms (no DB queries)

**Data Ingestion** (`scripts/ingest-copernicus-data.ts`)
- Per rectangle: ~2-5 seconds
- Full run (all rectangles): ~10-30 minutes
- Runs daily via GitHub Actions cron

**Database Query Benchmarks:**
```sql
-- Rectangle lookup: <10ms
SELECT * FROM ices_rectangles WHERE rectangle_code = '39F3';

-- Copernicus data fetch: <50ms (indexed by rectangle_code + data_date)
SELECT * FROM copernicus_data 
WHERE rectangle_code = '39F3' 
AND data_date = CURRENT_DATE;

-- Species list: <20ms
SELECT * FROM species WHERE is_active = true;

-- RPC predictions: <150ms
SELECT * FROM get_predictions_enhanced(...);

-- Cache lookup: <30ms
SELECT * FROM findr_prediction_sessions 
WHERE rectangle_code = '39F3' 
AND prediction_date = CURRENT_DATE 
AND expires_at > NOW();
```

**Frontend Performance:**
- First Contentful Paint (FCP): <1.8s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Cumulative Layout Shift (CLS): <0.1

---

### Security Considerations

**Row-Level Security (RLS) Policies:**

**User Favorites:**
```sql
-- Users can only see/modify their own favorites
CREATE POLICY "Users can view own favourites"
ON user_favourites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
ON user_favourites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
ON user_favourites FOR DELETE
USING (auth.uid() = user_id);
```

**Catch Logs:**
```sql
-- Users can only see/modify their own catch logs
CREATE POLICY "Users can view own catches"
ON catch_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own catches"
ON catch_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Public Data (No RLS):**
- `species` - Public read access
- `ices_rectangles` - Public read access
- `copernicus_data` - Public read access
- `findr_prediction_sessions` - Public read access (cached predictions)

**API Key Security:**

**Supabase Keys:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (RLS enforced)
- `SUPABASE_SERVICE_ROLE_KEY` - **NEVER expose** (bypasses RLS)
- Rotate service role key if compromised
- Store in Vercel environment variables (encrypted)

**Third-Party API Keys:**
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Public (restricted to domain)
- `COPERNICUS_USERNAME` / `COPERNICUS_PASSWORD` - Server-only
- `WEATHERSTACK_API_KEY` - Server-only (if used)

**API Key Rotation Procedure:**
```bash
# 1. Generate new key in service dashboard
# 2. Update Vercel environment variables
# 3. Redeploy application
# 4. Verify new key works in production
# 5. Revoke old key after 24-48 hours
```

**Authentication Security:**
- Magic link email authentication (passwordless)
- Session tokens via Supabase Auth
- Automatic token refresh
- Secure cookie storage (httpOnly, sameSite)

**CORS & CSP:**
- CORS restricted to godaisy.io, fishfindr.eu domains
- Content Security Policy headers in production
- API rate limiting (future consideration)

**Data Privacy:**
- User data encrypted at rest (Supabase default)
- HTTPS enforced (TLS 1.3)
- GDPR compliance via data deletion hooks
- Privacy policy at `/PrivacyPolicy`

**Monitoring Security Events:**
- Failed login attempts (Supabase Auth logs)
- Unusual API usage patterns
- Database connection attempts
- Service role key usage (should be minimal)

**Backup & Recovery:**
- Supabase automatic daily backups (7-day retention)
- Point-in-time recovery available
- Export data via Supabase dashboard
- Keep separate backups of critical migrations

**Incident Response:**
1. Identify breach scope
2. Rotate compromised credentials immediately
3. Review audit logs
4. Notify affected users (if PII exposed)
5. Document incident and prevention measures

---

## �📚 Deep Dive Documentation

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
