# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two related applications:

**Go Daisy** - A generalist PWA providing weather-informed recommendations for a wide range of outdoor activities (hiking, cycling, stargazing, etc.). This is the main application with reusable components and patterns for activity recommendations.

**Findr** - A specialist offshoot app focused exclusively on sea fishing predictions. It takes Go Daisy's approach and applies it with deep domain expertise to fishing, using real marine environmental data from CMEMS (Copernicus Marine Environment Monitoring Service) and ICES (International Council for the Exploration of the Sea) rectangular zones.

**Relationship:**
- Go Daisy provides the foundation: location systems, weather integration, UI patterns, translation, user preferences
- Findr reuses and extends these components with fishing-specific logic (species matching, marine data, catch logging)
- Both apps share the same Supabase authentication system (separate routes, shared auth)
- Features developed in Findr (e.g., auto-translation) may be backported to Go Daisy in the future
- Both will be released as separate apps with distinct domains and branding
- The pattern established here will be replicated for other specialist activities in a family of apps

**Domains:**
- Go Daisy: `godaisy.io`
- Findr: `fishfindr.eu`

**Platform Strategy:**
- Currently: Web-only PWAs (both apps)
- Future: iOS and Android native apps once polished (work not yet started)

**Tech Stack:**
- Next.js 15.5 (React 18.3, TypeScript 5.8)
- Supabase (PostgreSQL with RLS policies)
- Tailwind CSS 4 + DaisyUI 5
- TanStack React Query for data fetching
- Framer Motion for animations
- Node 20.x required

## Development Commands

### Core Development
```bash
npm run dev              # Start development server
npm run build            # Production build (includes lint:ci check)
npm run build:strict     # Explicit strict build with linting
npm start                # Start production server
```

### Linting & Type Checking
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run lint:ci          # CI-safe linting (max-warnings=0)
npm run typecheck        # TypeScript type checking without emit
```

### Testing
```bash
npm test                 # Run Jest tests
npm run test:ci          # CI mode with coverage
npm run test:wind        # Run wind recommendation tests
```

### Database & Migrations
```bash
supabase db push         # Apply migrations to Supabase
npm run env:sync         # Sync .env.local to .env.cli for scripts
```

### Deployment
```bash
npm run deploy           # Production deployment script
npm run deploy:quick     # Quick deployment (./quick-deploy.sh)
./vercel-build.sh        # Vercel build script
```

### Scripts & Utilities
```bash
npm run demo:wind        # Demo wind recommendations
npm run demo:soil        # Demo soil conditions
npm run validate:taxonomy # Validate taxonomy data
npm run smoke            # Run smoke tests (bash scripts/smoke-unified.sh)

# Findr-specific seeding
npm run seed:findr:rectangles   # Seed ICES rectangles
npm run seed:findr:conditions   # Seed conditions snapshots
```

## Architecture

### Core Application Structure

**Next.js Pages Router:**
- `pages/` - Route pages (Next.js conventions)
- `pages/api/` - Backend API endpoints
- `pages/index.tsx` - Go Daisy home page
- `pages/weather.tsx` - Main weather dashboard (Go Daisy)
- `pages/activities.tsx` - Activity recommendations (Go Daisy)
- `pages/findr/` - Fishing prediction UI pages (Findr specialist app)
- `pages/_app.tsx` - App wrapper with contexts
- `pages/_document.tsx` - HTML document customization

**Key Directories:**
- `components/` - React components (general + feature-specific)
- `components/findr/` - Findr-specific components (cards, modals, navigation)
- `hooks/` - Custom React hooks
- `lib/` - Shared utilities, services, and business logic
- `context/` - React context providers
- `types/` - TypeScript type definitions
- `data/` - Static data files and lookup tables
- `supabase/migrations/` - Database schema migrations

### Go Daisy Architecture (General Activity Recommendations)

**Core Concept:** Weather-informed activity recommendations for diverse outdoor activities. Components are designed to be reusable across different activity domains.

**Shared Components:**
- Location system (UnifiedLocationContext) - GPS, place search, coordinate management
- Weather services - OpenWeather, Stormglass for marine data
- Translation system - Multi-language support with DeepL API caching
- User preferences - Settings persistence across activities
- UI patterns - Cards, modals, navigation components built with DaisyUI

**Activities Supported:**
- Weather dashboards (current and forecast)
- Astronomy highlights (ISS visibility, moon phases)
- Tide predictions
- Soil conditions
- Wind recommendations
- General outdoor activity suggestions

### Findr Architecture (Fishing Predictions)

**Core Concept:** Specialist fishing predictions that extend Go Daisy's approach with deep domain expertise. Matches species environmental preferences against real-time marine data within ICES rectangular zones.

**Data Flow:**
1. User selects location → Mapped to ICES rectangle code (e.g., "31F1")
2. Frontend fetches predictions via `/api/findr/predictions`
3. API queries Supabase for species data and CMEMS marine conditions
4. Species are ranked by confidence score (environmental matching + guild weighting)
5. Results cached in `findr_prediction_sessions` table (3-hour TTL)

**Key Components:**

- **Rectangle System** (`lib/findr/rectangle.ts`):
  - ICES rectangles are 30min latitude × 1° longitude zones
  - Each rectangle has anchor coordinates for weather/marine data lookup
  - Database table: `ices_rectangles` with geometry and metadata

- **Environmental Matching** (`lib/findr/mapPrediction.ts`):
  - Matches species preferences (temperature, salinity, depth, substrate) against CMEMS data
  - Guild-specific weighting profiles (pelagic, reef_kelp, benthic, surf_estuary, cephalopod)
  - Returns confidence scores (0-100) with rationale

- **CMEMS Integration** (`lib/copernicus/`):
  - Real marine data from Copernicus Marine Service
  - Temperature, salinity, water clarity (kd490), ocean currents
  - Mock client for development (`mockClient.ts`), real client for production (`realClient.ts`)
  - Region routing for different data sources (MET Norway, CMEMS)

**Species Data:**
- Species table with environmental preferences (temperature ranges, depth, substrate)
- Localized names (FR, ES, DE, IT, PT) and playful bios
- Species images stored in `/public/PNGS/` with slug-based lookup
- Guild classifications affect environmental weighting

### Validation System

The catch logging system creates a feedback loop for prediction accuracy:

- **Impression Tracking**: Records when users view predictions (`findr_prediction_impressions`)
- **Catch Logging**: Users log catches with bait/habitat details (`findr_catch_entries`)
- **Automatic Linking**: Catches linked to recent impressions (24h window)
- **Validation Metrics**: Tracks prediction accuracy, advice effectiveness, confidence calibration

See `docs/FINDR_VALIDATION_SYSTEM.md` for complete details.

### Authentication & User Management

**Shared Auth System:**
- Both Go Daisy and Findr use the same Supabase authentication database
- Users can authenticate once and access both apps (separate routes, shared auth)
- Auth pages primarily in Findr: `pages/findr/auth.tsx`, `pages/findr/simple-auth.tsx`, `pages/findr/magic-link.tsx`
- Supabase RLS (Row-Level Security) policies protect user data
- Auth helpers: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (API routes)

**User Data:**
- `user_favourites` - Species favorites (Findr-specific, but pattern reusable)
- `user_location_preferences` - Location history and preferences (shared across apps)
- All user tables include RLS policies tied to `auth.users`

### Context Providers

**UnifiedLocationContext** (`context/UnifiedLocationContext.tsx`):
- Manages location state across the app (coordinates, place names, ICES rectangles)
- Syncs with Supabase user preferences (`user_location_preferences`)
- Provides location detection and rectangle lookup

**UserPreferencesContext** (`context/UserPreferencesContext.tsx`):
- User settings (language, units, etc.)
- Persists to localStorage and Supabase

**LanguageContext** (`context/LanguageContext.tsx`):
- Multi-language support (EN, FR, ES, DE, IT, PT)
- Uses DeepL API for translations with caching

### API Endpoints

**Findr Endpoints:**
- `/api/findr/predictions` - Main predictions endpoint (cached, localized)
- `/api/findr/conditions` - Environmental conditions for a rectangle
- `/api/findr/rectangles` - ICES rectangle lookup by coordinates
- `/api/findr/catch-log` - Catch logging and retrieval
- `/api/findr/record-impression` - Track prediction views
- `/api/findr/favourites` - User favorite species management

**Other Endpoints:**
- `/api/weather` - Weather data (OpenWeather)
- `/api/marine` - Marine weather (Stormglass)
- `/api/tides` - Tide predictions
- `/api/moon` - Moon phase data (cached)
- `/api/translate` - DeepL translation endpoint

## Database Schema

**Key Tables:**
- `species` - Fish species with environmental preferences and localized names
- `ices_rectangles` - ICES fishing zones with geometry
- `copernicus_data` - Cached CMEMS marine data
- `findr_prediction_sessions` - Cached prediction results (3h TTL)
- `findr_prediction_impressions` - Prediction view tracking
- `findr_catch_entries` - User catch logs with validation linkage
- `user_favourites` - User favorite species with RLS policies
- `user_location_preferences` - User location history and preferences
- `moon_cache` - Cached moon phase data
- `translation_cache` - DeepL translation cache

All tables include Row-Level Security (RLS) policies for data protection.

See `docs/Supabase Snippet Public Schema Column Inventory-2.csv` for complete schema reference.

## Key Development Patterns

### Hooks Usage

**Location & Predictions:**
- `useFishingPredictions()` - Fetch and cache predictions for a rectangle
- `useFindrRectangleOptions()` - Manage rectangle selection dropdown
- `usePersistentFindrSettings()` - Persist Findr UI state (language, date, region)
- `useFavourites()` - Manage user favorite species with optimistic updates

**Data Fetching:**
- Prefer React Query (`@tanstack/react-query`) for API calls
- SWR (`swr`) used for some weather endpoints
- Custom hooks wrap API logic with loading/error states

### TypeScript Patterns

- Path alias `@/*` maps to project root
- Use `JsonValue` type for Supabase JSONB columns
- Interface naming: `FooBar` for types, `UseFooBarState` for hook return types
- API responses should match Supabase row types

### Styling

- **DO NOT modify Tailwind/PostCSS config** - See `DO_NOT_TOUCH_CSS_CONFIG.md`
- Use DaisyUI component classes (badge, card, btn, etc.)
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Framer Motion for animations (`motion.*` components)

### Environment Variables

See `.env.example` for required variables. Key ones:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Database connection
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Location search
- `STORMGLASS_SECRET_KEY` - Marine weather
- `COPERNICUS_USERNAME` / `COPERNICUS_PASSWORD` - Real CMEMS data
- `DEEPL_API_KEY` - Translations

**Important:** Use `npm run env:sync` to sync `.env.local` credentials to `.env.cli` for TSX scripts.

## Testing

Jest is configured with Next.js integration. Test files use `.test.ts` or `.test.tsx` extensions.

- Tests live alongside source files or in `__tests__/` directories
- Use `@testing-library/react` for component tests
- Mock Supabase client with `jest.mock()`

## Git Workflow

**Pre-commit hooks** (`.githooks/`):
- Linting runs automatically via git hooks
- Configured in `postinstall` script

**Branch:** `main` is the primary development branch

**Commit Messages:**
- Use conventional format: `feat:`, `fix:`, `chore:`, etc.
- Include attribution: `Co-Authored-By: Claude <noreply@anthropic.com>`

## Important Notes

### App Family Strategy
- **Go Daisy** will be released as a generalist weather-informed activity app
- **Findr** will be released as a specialist fishing app
- Future specialist apps will follow the same pattern for other activities
- When developing features, consider reusability across the app family
- Shared components should live in general directories, not activity-specific ones
- Activity-specific logic should be clearly separated (e.g., `pages/findr/`, `components/findr/`)

### Phase 10 Status (Findr-specific)
Real CMEMS data integration is complete on the backend (99.7% coverage, <24h data freshness). Frontend UI integration for displaying environmental factors is partially complete. See `PHASE_10_COMPLETE_SUMMARY.md` for details.

### CSS Configuration
**DO NOT MODIFY** Tailwind or PostCSS configs without review. Existing setup uses Tailwind 4 with DaisyUI 5 and specific optimizations. See `DO_NOT_TOUCH_CSS_CONFIG.md`.

### Translation System
- All user-facing text (species names, activity descriptions, etc.) should use `<TranslatedText>` components for i18n support
- Currently implemented in Findr with DeepL API integration
- Translations cached in `translation_cache` table to avoid redundant API calls
- Supports: English, French, Spanish, German, Italian, Portuguese
- **Note:** This feature was developed for Findr and may be backported to Go Daisy in the future (work not yet attempted)

### Cache Management
Prediction cache uses 3-hour TTL. To clear cache for testing:
```bash
node scripts/clear-prediction-cache.js
tsx scripts/clear-all-cache-for-date.js
```

## Deployment

**Platform:** Vercel

**Build Process:**
1. Pre-build: `lint:ci` runs automatically
2. Build: `next build` via `vercel-build.sh`
3. Environment variables must be set in Vercel dashboard

**Domains:**
- Go Daisy: `godaisy.io` (generalist app)
- Findr: `fishfindr.eu` (fishing specialist app, with `www.fishfindr.eu` redirect handling)
- Both apps deployed from the same codebase with route-based separation

**Future Platforms:**
- iOS and Android native apps planned after web apps are polished
- Native app development has not yet started

See `DEPLOYMENT.md` for detailed deployment procedures.

## Common Tasks

**Adding a new species:**
1. Add entry to `species` table via migration
2. Add image to `/public/PNGS/` with slug filename
3. Update `data/speciesImageMap.ts` with image metadata
4. Add environmental preferences (temperature range, depth, substrate, guild)
5. Run `npm run validate:taxonomy` to verify data integrity

**Adding a new API endpoint:**
1. Create file in `pages/api/`
2. Use `getSupabaseServerClient()` for database access
3. Implement proper error handling and HTTP status codes
4. Add TypeScript types for request/response bodies

**Updating marine data:**
1. CMEMS data refreshes automatically via cron job (`.github/workflows/findr-copernicus-ingest.yml`)
2. Manual trigger: `tsx scripts/ingest-copernicus-data.ts`
3. Data stored in `copernicus_data` table with spatial indexing

**Debugging predictions:**
1. Check browser console for API response details
2. Use `?bypassCache=true` query param to skip cache
3. Check `findr_prediction_sessions` table for cached results
4. Verify CMEMS data coverage in `copernicus_data` table
5. Test scripts in `scripts/test-*.ts` for isolated component testing
