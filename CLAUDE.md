npm run build:strict     # Explicit strict build with linting
npm start                # Start production server
npm run typecheck        # TypeScript type checking without emit

# CLAUDE.md

**Updated: 2026-09-05**

## Project Overview

This repo contains two main apps:

- **Go Daisy**: Generalist PWA for weather-informed outdoor activity recommendations (hiking, cycling, stargazing, etc.).
- **Grow Daisy**: Gardening planner and smart garden assistant (web and mobile).

**Findr** (fishing app) is now in its own repo. Ignore any leftover `findr` files here.

**App Family Pattern:**
- Shared Supabase auth, location, weather, translation, and UI systems.
- Each app has its own branding, domain, and specialist features.
- All apps use Next.js, Tailwind CSS, DaisyUI, and React Query.

---

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build (includes lint)

npm run test             # Run Jest tests
npm run deploy           # Deploy to Vercel
npm run env:sync         # Sync .env.local to .env.cli for scripts
```

---

## Architecture

### Go Daisy

- **Routes:** `/`, `/weather`, `/activities`, `/grow` (Grow Daisy entry)
- **Features:** Weather dashboards, astronomy, tides, wind, soil, general activity suggestions.
- **Shared Components:** Location context, weather services, translation, user preferences, DaisyUI-based UI.

### Grow Daisy

- **Routes:** `/grow`, `/grow/garden`, `/grow/plan`, `/grow/activities`, `/grow/species/[slug]`, `/grow/settings`, etc.
- **Features:**  
  - Plant database (450 species, 8 languages)
  - Smart planting calendar (climate-aware)
  - Weather-integrated gardening tasks (soil temp, frost, watering, pest/disease risk)
  - Companion planting, guilds, harvest tracking, photo log
  - Push notifications (mobile), camera/photo support, climate zone detection
  - Monetization: Free tier + paid (Sprout, Bloom, Harvest, etc.) via Stripe/RevenueCat
- **Mobile:**  
  - Capacitor-based iOS/Android apps (`capacitor.config.growdaisy.ts`)
  - Subdomain: `grow.godaisy.io` (can migrate to own domain)
  - Shared Supabase auth (Apple/Google sign-in, deep links)
  - App icons/splash screens generated via script

### Shared Patterns

- **Monorepo:** All apps share code, config, and infra.
- **Supabase:** Auth, user data, gardening/fishing/weather DBs, RLS enforced.
- **React Query:** Data fetching/caching.
- **Tailwind + DaisyUI:** Unified design system.
- **Translation:** DeepL API, multi-language, cached in DB.
- **Testing:** Jest and Playwright E2E. See `__tests__/` and `e2e/`.

---

## Key Directories

- `pages/` – Next.js routes
- `components/` – React components (general + app-specific)
- `hooks/` – Custom React hooks
- `lib/` – Utilities, business logic
- `context/` – React context providers
- `types/` – TypeScript types
- `data/` – Static data, lookup tables
- `supabase/migrations/` – DB migrations

---

## Environment Variables

See `.env.example` for required vars.  
Sync with `npm run env:sync` for scripts.

---

## Deployment

- **Platform:** Vercel
- **Domains:**  
  - Go Daisy: `godaisy.io`  
  - Grow Daisy: `grow.godaisy.io` (or future own domain)
- **Build:**  
  - Lint runs pre-build
  - `next build` via `vercel-build.sh`
  - Use `./scripts/vercel-env-add.sh` for env vars (avoids linebreak issues)

---

## Best Practices

- **Do not edit Tailwind/PostCSS config** — Tailwind 4 + DaisyUI 5, tuned; changes there have broken the build before
- Use DaisyUI classes for UI
- Keep shared logic in general dirs, specialist logic in app-specific dirs
- Use `<TranslatedText>` for all user-facing text
- Use React Query for all data fetching
- All new features should consider reusability for future apps

---

## Grow Daisy: Specialist Details

- **Plant Data:**  
  - Table: `plant_species` (**450 rows** — verified 2026-09-05, not the 50k this file
    claimed for months; 410 have a French common name. 8 languages via `name_*`
    columns. `description`, `advice` and `care_guides` are English-only and are
    translated on demand at request time, not stored per language.)
  - API: `/api/grow/species/[slug]`, `/api/grow/species/batch`
  - Images: `/public/grow/plants/` (multiple sizes)
  - Perenual API enrichment (see `lib/grow/perenualApi.ts`)
- **Smart Tasks:**  
  - Weather-driven: soil temp, frost, watering, pest/disease risk
  - Push notifications (Capacitor, LocalNotifications)
  - Monetization: RevenueCat integration (iOS/Android)
- **Mobile:**  
  - Capacitor config: `capacitor.config.growdaisy.ts`
  - iOS project in `ios-growdaisy/`; Android is the `growdaisy` flavour of `android/`
  - App icons/splash: `scripts/generate-growdaisy-icons.ts`
  - Auth: Apple/Google sign-in, deep links, shared Supabase config

---

## Common Tasks

- **Add a plant:** Add to `plant_species`, image to `/public/grow/plants/`, update image map, run `validate:taxonomy`
- **Add API endpoint:** Create in `pages/api/grow/`, use Supabase server client, add types, handle errors
- **Debug weather/gardening logic:** See `PLANT_DATA_FEATURE_AUDIT.md`
- **Test:** Use Jest for unit/integration, Playwright for E2E

---

## Documentation

See the Documentation Index below for the eleven root documents that exist.
Anything referenced here and missing was archived on 2026-09-08 — check
`Archived projects stuff/wotnow-root-docs-2025` on the drive, or git history.

---

## Updating This File

- Add "Updated: YYYY-MM-DD" at the top
- Keep under 250 lines
- Remove Findr details (now external)
- Add/adjust Grow Daisy details as features evolve

---
**Activities Supported:**
- Weather dashboards (current and forecast)
- Astronomy highlights (ISS visibility, moon phases)
- Tide predictions
- Soil conditions
- Wind recommendations
- General outdoor activity suggestions



### Authentication & User Management

**Shared Auth System:**
- Both Go Daisy and Grow Daisy use the same Supabase authentication database
- Users can authenticate once and access both apps (separate routes, shared auth)
- Supabase RLS (Row-Level Security) policies protect user data
- Auth helpers: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (API routes)

**User Data:**
- `user_location_preferences` - Location history and preferences (shared across apps)
- All user tables include RLS policies tied to `auth.users`

### Context Providers

**UnifiedLocationContext** (`context/UnifiedLocationContext.tsx`):
- Manages location state across the app (coordinates, place names)
- Syncs with Supabase user preferences (`user_location_preferences`)
- Provides location detection and rectangle lookup

**UserPreferencesContext** (`context/UserPreferencesContext.tsx`):
- User settings (language, units, etc.)
- Persists to localStorage and Supabase

**LanguageContext** (`context/LanguageContext.tsx`):
- Multi-language support (EN, FR, ES, DE, IT, PT)
- Uses DeepL API for translations with caching

### API Endpoints

**Other Endpoints:**
- `/api/weather` - Weather data (OpenWeather)
- `/api/marine` - Marine weather (Stormglass)
- `/api/tides` - Tide predictions
- `/api/moon` - Moon phase data (cached)
- `/api/translate` - DeepL translation endpoint

## Database Schema

**📚 ESSENTIAL REFERENCE:** See [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) for comprehensive table schemas, column types, and type casting requirements.

**Key Tables:**
needs to be completed
All tables include Row-Level Security (RLS) policies for data protection.

**When Working with RPC Functions:**
- **ALWAYS** consult [RPC_TYPE_CASTING_GUIDE.md](./RPC_TYPE_CASTING_GUIDE.md) before creating or modifying RPC functions
- Common pitfalls: VARCHAR vs TEXT, ENUM types, INTEGER vs NUMERIC in CASE statements
- All column names and types documented in [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)

## Key Development Patterns

### Hooks Usage


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

- **DO NOT modify Tailwind/PostCSS config**
- Use DaisyUI component classes (badge, card, btn, etc.)
- Responsive design: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Framer Motion for animations (`motion.*` components)

### Environment Variables

See `.env.example` for required variables. Key ones:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Database connection
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Location search
- `STORMGLASS_SECRET_KEY` - Marine weather
- `DEEPL_API_KEY` - Translations

**Important:** Use `npm run env:sync` to sync `.env.local` credentials to `.env.cli` for TSX scripts.

## Testing

Jest is configured with Next.js integration. Test files use `.test.ts` or `.test.tsx` extensions.

- Tests live alongside source files or in `__tests__/` directories
- Use `@testing-library/react` for component tests
- Mock Supabase client with `jest.mock()`

**API Test Documentation:**
  - Test patterns for RPC mocking, createClient mocking, serverClient mocking
  - All predictions, catch-log, conditions, and marine-weather tests passing (100%)
  - Documented approach for fixing remaining species-details tests

**E2E Test Documentation:**
  - Multi-browser testing: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
  - Test coverage: Go Daisy (homepage, weather, activities) and Findr (predictions, catch-log)
  - Helper utilities for authentication and location selection
  - Run with: `npm run test:e2e` or `npm run test:e2e:ui` for interactive mode

## Git Workflow

**Pre-commit hooks** (`.githooks/`):
- Linting runs automatically via git hooks
- Configured in `postinstall` script

**Branch:** `main` is the primary development branch

**Commit Messages:**
- Use conventional format: `feat:`, `fix:`, `chore:`, etc.
- Include attribution: `Co-Authored-By: Claude <noreply@anthropic.com>`

## Important Notes

### There is dead code in here on purpose. Don't chase it.

Roughly **200 files under `components/`, `lib/`, `utils/` and `hooks/`, and
about **345 under `scripts/`**, are unreachable from any entry point. That is
known, it is deliberate, and it is not a task waiting for you.

**It costs nothing that matters.** Unreachable files are never bundled — webpack
builds from entry points — so there is no runtime cost, no bundle weight and no
user-visible effect. The parts that *did* cost something have been dealt with:
the dependencies they held open were dropped (#201), and the files that were
actively misleading were removed (#199).

**So do not spend an afternoon on them.** Not a sweep, not a ticket, not a
"while I'm here". The remaining case for removing them is readability, and that
is worth far less than the time it takes to verify 200 files safely.

**What to do instead, when one gets in your way:** delete that one, with the
check below, and move on.

#### Before deciding anything is dead

Two rules, both learned the hard way in one afternoon:

1. **Ask what reaches it, not what imports it.** Walk the import graph out from
   the real entry points — `pages/`, `app/`, `supabase/functions/`, tests, the
   scripts named in `package.json`, and every config a tool loads by convention
   (`middleware.ts`, `instrumentation.ts`, `next-sitemap.config.cjs`,
   `capacitor.config.*.ts`, `worker/`). Anything unreached is dead; anything
   merely "unimported" might just be convention-loaded.

2. **Match by exact import specifier, never by name.** A substring search for
   `Card` hits `ThreatCard`, `WaveCard` and `SpeciesCarousel`; one for `Popup`
   hits leaflet's own. That false positive made a genuinely dead module look
   alive through an entire investigation.

And one trap that is not about imports at all: `scripts/prebake-call-images.ts`
resolves image sources **by constructed path** at build time. A text search
cannot see it. Run `npm run build` and compare `already present` / `source
missing` against `main` before removing anything under `public/`.


### App Family Strategy
- **Go Daisy** has been released as a generalist weather-informed activity app
- **Grow** has been released as a specialist gardening app
- Future specialist apps will follow the same pattern for other activities
- When developing features, consider reusability across the app family
- Shared components should live in general directories, not activity-specific ones
- Activity-specific logic should be clearly separated (e.g. `pages/grow/`, `components/grow/`)

### Which native project ships — `android/` builds all three

**There is one Android project, and its name does not say so.** `android/` is not
Findr's; it carries a product flavour for each app, and it is what every real
build path uses:

| | |
|---|---|
| `.github/workflows/android-release.yml` | `working-directory: android`, `./gradlew bundle${Flavor}Release` |
| `scripts/build-android.sh` | `cd android` — behind all six `android:build:*` / `android:release:*` scripts |
| `android/app/build.gradle` | reads `app-versions.json` for each flavour's versionCode and versionName |

So a release is: bump `app-versions.json` (`scripts/bump-version.sh`), then tag
`godaisy-v*` / `growdaisy-v*`, or run `npm run android:release:godaisy` locally.
The build script swaps in the flavour's capacitor config around `npx cap sync
android` and restores it afterwards — do not do that by hand.

`android-godaisy/` and `android-growdaisy/` used to sit beside it and were
deleted in #202. They were stale copies stuck at versionCode 1 that no workflow
ever built, and they were **reachable** — `npm run cap:godaisy:open:android`
opened one in Android Studio, so anyone following the obvious script was editing
a project that could never ship, with no way to tell. Those scripts went too. If
you find yourself recreating either directory, you have taken a wrong turn.

**iOS is genuinely different.** There are no flavours, so `ios-godaisy/` and
`ios-growdaisy/` are real, separate projects and `cap:godaisy:open:ios` is the
right way in. `.vercelignore` still lists the deleted Android directories on
purpose — `npx cap add` recreates them locally, and 108 MB of untracked Gradle
output under one of them once broke a production deploy.

### CSS Configuration
**DO NOT MODIFY** Tailwind or PostCSS configs without review. Existing setup uses Tailwind 4 with DaisyUI 5 and specific optimizations.

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

**Adding Vercel Environment Variables:**
- **ALWAYS** use the helper script to prevent line break issues:
  ```bash
  ./scripts/vercel-env-add.sh VAR_NAME "value" production
  ```
- NEVER use `echo "multiline\nvalue" | vercel env add` directly
- The script automatically strips line breaks from values (important for private keys)

**Domains:**
- Go Daisy: `godaisy.io` (generalist app)
- Grow Daisy: `grow.godaisy.io` (gardening specialist app, with `grow.godaisy.io` redirect handling)
- Both apps deployed from the same codebase with route-based separation

**Future Platforms:**
- Android native apps planned after ios apps are polished
- Native app development has not yet started

Deployment specifics are in the Deployment section above.

## Quick Start

**NEW TO THE PROJECT?** Start with this file, then `LAUNCH_ROADMAP.md`.

This comprehensive guide covers:
- 🏗️ Architecture overview (tech stack, directory structure)
- 🎣 How Findr predictions work (complete pipeline)
- 🌊 Environmental matching system (guild weights)
- 📊 Database schema (key tables explained)
- 🔧 API endpoints (with examples)
- 🚀 Performance optimizations
- 🧪 Development workflow
- 🐛 Debugging guide

## Documentation Index

Eleven markdown files live at the repo root. That is the whole list, and it is
meant to stay roughly this short.

**Current plans**
- `LAUNCH_ROADMAP.md` — Go Daisy & Grow Daisy launch readiness
- `GODAISY_PLUS_IMPLEMENTATION_PLAN.md` — free/paid gating
- `MOBILE_APP_IMPLEMENTATION_GUIDE.md` — the native wrappers
- `APP_STORE_COMPLIANCE_PLAN.md`, `QA_REVENUECAT_IAP_TEST_PLAN.md`

**Grow Daisy**
- `GROW_DAISY_EDITORIAL_VOICE.md`, `PLANT_SPECIES_REVIEW.md`,
  `PLANT_DATA_FEATURE_AUDIT.md`, `GUILD_UX_HORTICULTURE_REVIEW.md`

**And** `README.md` and this file.

### Where everything else went

421 root documents were archived on 2026-09-08. Almost all were Findr-era —
bite score, bio-bands, species data, Copernicus ingestion — and 422 of the 432
had not been touched since 2025.

They are on the archive drive under
`Archived projects stuff/wotnow-root-docs-2025`, with a MANIFEST. **Git history
is the real backup**: any of them is still `git show <rev>:<path>`.

Findr itself now lives in its own repository. Its documentation, native app,
store assets and species imagery are all there.

### 📋 Documentation Best Practices

**The repo root is for documents that are still being worked from.** A finished
write-up — a fix that shipped, an analysis that is now settled, a phase that is
over — belongs in `docs/archive/` or off the repo entirely, not at the root.

This rule exists because it was missing. 432 markdown files accumulated at the
root, 422 of them untouched since 2025, because nobody had said where else to
put them. Every one was a reasonable thing to write; the problem was only that
there was no exit.

**When creating new documentation:**
1. Ask whether it needs to be a file at all. A PR description is often the
   better home for "what I did and why" — it stays attached to the change.
2. If it is a file and it describes finished work, put it in `docs/archive/`
   on the day you write it, not later.
3. Mark status clearly: ✅ **DEPLOYED**, 🚧 **IN PROGRESS**, ⏳ **PLANNED**.
4. Add it to the Documentation Index above, and take it out again when it stops
   being current. An index nobody prunes is how this happened.

**Large files:** CI fails any PR adding a file over 5 MB
(`.github/workflows/large-file-guard.yml`). Build output, virtualenvs,
ephemerides and raw media do not belong in git — the repo carried a 4.59 GiB
pack because that check did not exist. If a large file genuinely belongs,
label the PR `large-file-ok`.

**When Updating Existing Documentation:**
1. Add "Updated: YYYY-MM-DD" to the top of the doc
2. Note what changed in a "Changelog" section
3. Move to "Outdated" section in this index if superseded
4. Keep old docs for historical reference (don't delete)

**Quick Reference Docs Should:**
- Be < 100 lines
- Have clear command examples
- Focus on "how" not "why"
- Be named with `_QUICK_REF.md` suffix

## Common Tasks

**Adding a new species:**
1. Add entry to `plant_species` table via migration
2. Add image to `/public/PNGS/` with slug filename
3. Update `data/speciesImageMap.ts` with image metadata
4. Add environmental preferences (temperature range, depth, substrate, guild)
5. Run `npm run validate:taxonomy` to verify data integrity

**Adding a new API endpoint:**
1. Create file in `pages/api/`
2. Use `getSupabaseServerClient()` for database access
3. Implement proper error handling and HTTP status codes
4. Add TypeScript types for request/response bodies

**Debugging predictions:**
1. Check browser console for API response details
2. Use `?bypassCache=true` query param to skip cache
3. Check `findr_prediction_sessions` table for cached results
4. Verify CMEMS data coverage in `copernicus_data` table
5. Test scripts in `scripts/test-*.ts` for isolated component testing
6. **NEW:** Check query timing with `LOG_QUERY_TIMING=true` environment variable

---

## supabase/functions/ingest-conditions — belongs to findr, not to this project

This repository hosts one Supabase Edge Function, `ingest-conditions`. It writes
`grid_conditions_latest`, which is **findr's** marine grid. Nothing in Go Daisy or Grow Daisy
calls it or reads its output; every caller is in `Dovieandi-se-tovya-sagain/godaisy-core`. A move
to that repo is open and sensible.

**Before changing it, read `docs/2026-08-08-prediction-system.md` section 9 in the findr
repository.** These facts have each already cost real time:

- **Two callers, two credentials, and both must keep working.** pg_cron's `_invoke_ingest` sends
  `X-Ingest-Secret` and no Authorization header; godaisy-core's Actions call
  `supabase.functions.invoke()` with a service-role client, which sends `Authorization: Bearer`
  and no secret. It is deployed `verify_jwt: false` with an in-function check accepting either.
  Validating only one breaks three live workflows.
- **A pre-push lint hook is why this function's source drifted nine months out of git.** The
  deployed code contained `any` casts that fail `@typescript-eslint/no-explicit-any`, so it
  could not be pushed. If a deploy will not push, check the hook before assuming the code is
  wrong — and always deploy *and* push. Deploying alone is how the drift started.
- **`{"skipped":"already_running"}` is success**, not failure — the concurrency lock working.
- **Do not reinstate the CMEMS provider.** Its endpoint (`nrt.cmems-du.eu`) lapsed to a
  domain-interception service that received Copernicus credentials on every request. It was
  removed, and godaisy-core already ingests Copernicus properly via the Marine Toolbox.

Deploy with `supabase functions deploy ingest-conditions --no-verify-jwt --project-ref
swmviqpxetwziqxhzldh`.

## Before merging any pull request

**Read the reviews, not just the checks.** `gh pr checks` reporting "no checks reported on the
branch" means CI is not configured — it does not mean nobody has commented.

On 2026-08-11 six PRs were merged unread. Copilot had left eleven review comments across three of
them, and three were real defects in code already running in production: a retry loop that backed
off 35 seconds on a 404, a leaked connection per retry, and a `TextDecoder` that dropped
multi-byte characters split across chunk boundaries.

```bash
gh api "repos/{owner}/{repo}/pulls/N/reviews"  -q '.[] | .user.login+" ["+.state+"] "+(.body//"")'
gh api "repos/{owner}/{repo}/pulls/N/comments" -q '.[] | .path+":"+((.line//0)|tostring)+"  "+.body'
```

Both. `reviews` carries the summary verdict; `comments` carries the inline findings, and the
inline ones are where the defects are — a review can be `COMMENTED` with a clean-sounding summary
and still hold three bugs underneath.

**A review that contradicts your own commit message is a reason to check, not to argue.** One of
those eleven claimed the grid was 65,884 cells rather than 7,649. Measuring showed the reviewer
was wrong and the repo's own constant was stale — which meant the coverage step had been reporting
progress against a denominator 8.6× too large. Verifying the objection found a second bug.
