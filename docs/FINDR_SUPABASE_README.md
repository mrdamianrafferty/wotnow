# Findr Supabase & Application Reference

_A living guide to the Findr fishing experience – schema, APIs, components, and operational playbooks._

---

## 🎯 Purpose
This document captures everything needed to work on Findr’s Supabase-backed fishing experience:

- Database tables, views, relationships, and relevant migrations.
- Server APIs, cron scripts, and data flows that hydrate those tables.
- Client-side pages, components, and hooks that consume Findr data.
- Operational guidance for ingestion jobs, troubleshooting, and future enhancements.

Keep this file updated as schema or features evolve so engineers can ramp quickly without spelunking through migrations or code.

---

## 🗺️ High-level architecture

```mermaid
graph LR
  subgraph Client (Next.js)
    A[Findr Pages]
    B[Hooks]
    C[Components]
  end

  subgraph Supabase
    D[Postgres Tables]
    E[Views]
    F[Functions]
  end

  subgraph Jobs & Scripts
    G[Ingestion scripts]
    H[CRON workflows]
  end

  A -->|fetch| I[/API Routes/]
  B -->|fetch| I
  C --> A
  I -->|RPC/REST| D
  I -->|RPC/REST| E
  G -->|service role| D
  H --> G
```

- **Client**: `/findr` UI surfaces (pages + shared components) use hooks to call Next.js API routes.
- **Server APIs**: `/pages/api/findr/*.ts` orchestrate Supabase reads or fallbacks.
- **Database**: Supabase schema (`public`) stores rectangles, predictions, conditions, favourite stats, and caches.
- **Jobs**: Node scripts plus GitHub Actions cron keep marine conditions and DATRAS data current.

---

## 🧱 Supabase schema
This section summarises Findr-specific schema. Cross-check against migrations in `supabase/migrations/` if adding columns or relationships.

### Tables

| Table | Purpose | Key Columns | Relationships / Notes |
| --- | --- | --- | --- |
| `findr_rectangles` | Curated list of coastal rectangles (primary catalogue for Findr). | `rectangle_code` PK (text), `region`, `center_lat`, `center_lon`, `distance_to_shore_km`, `is_coastal`, optional coastal sample columns. | Referenced by `findr_conditions_snapshots.rectangle_code`. Seed via `scripts/seedFindrRectangles.ts`. RLS currently disabled per Supabase lint report – add if exposing via PostgREST. |
| `ices_rectangles` | Canonical ICES dataset with UUID primary key. | `id` PK (uuid), `rectangle_code`, `center_lat`, `center_lon`, `is_coastal`, etc. | Many tables reference `id` (UUID) including `species_frequency`, `weather_predictions`, `findr_prediction_sessions`, etc. Use when UUIDs required (e.g., DATRAS views). |
| `findr_conditions_snapshots` | Rolling marine + bio metrics per rectangle. Created in `202509290001_create_findr_conditions_snapshots.sql`. | `id` PK, `rectangle_code` FK→`findr_rectangles.rectangle_code`, `captured_at`, `sea_temp_c`, `chlorophyll_mg_m3`, `wave_height_m`, `wind_speed_kts`, `hourly_marine_json`, `daily_marine_json`, `source`. | Unique index on `(rectangle_code, captured_at DESC)`. Indexed on `captured_at`. API and dashboards read via helper view `findr_conditions_latest`. |
| `findr_prediction_sessions` | Cached responses from prediction RPC to reduce load. | Composite key (`rectangle_code`, `prediction_date`, `language`), `payload`, `fetched_at`, `expires_at`. | Accessed by `/api/findr/predictions`. Consider TTL cleanup job. |
| `weather_predictions` | Stores derived weather-weighted catches (legacy/optional). | `rectangle_id` FK→`ices_rectangles.id`, `species_id`, `prediction_date`, weather metrics. | Upserted by `/pages/api/fishing/predictions.ts` caching logic. |
| `species_monthly_abundance` | DATRAS monthly abundance per rectangle/species. | `rectangle_code`, `species_id`, `jan`..`dec`, `data_source`, `last_updated`. | Uploaded via `scripts/uploadMonthlyAbundance.ts`. Feed for datras views. |
| `species_frequency` | Core weekly/quarterly fish likelihood (Findr species deck). | `rectangle_id` FK→`ices_rectangles.id`, `species_id` FK→`species.id`, `week_of_year`, `quarter`, `base_frequency`, `confidence_level`, `data_source`, `sample_size`. | API `/api/findr/predictions` ultimately consumes this through RPC `get_fishing_predictions`. |
| `findr_favourite_stats` | Aggregated stats for swiped favourites. | `species_id`, `catches_total`, `swiped_date_label`, `preferred_bait`, etc. | Queried by `/api/findr/favourites-insights`. |
| `moon_cache` | Daily lunar data by lat/lon buckets. Created in `202509290002` and enforced in `202509300003`. | `lat_bucket`, `lon_bucket`, `local_date`, solar & lunar timestamps, `moon_phase_name`, `moon_phase_fraction`, `moon_illumination_pct`, `source`, `raw`, `expires_at`. | Used by `/components/findr/MoonWidget` via `/api/moon` (not in scope but share same cache). |
| `user_catches` / `fishing_reports` / `findr_conditions_latest_rows.csv` | Additional catch logging tables referenced in docs (see `FINDR_CATCH_LOG_MIGRATION_PLAN.md`). Not fully wired yet but keep in mind for future catch log rollout. |
| `stormglass_bio_readings`, `species_bio_bands`, etc. | Support broader Findr analytics; see CSV inventories for full columns. |

> **RLS**: Several tables (e.g., `findr_rectangles`, `findr_conditions_snapshots`) are flagged in `docs/Supabase Performance Security Lints...csv` for missing RLS. Ensure appropriate policies before exposing via PostgREST.

### Views

| View | Defined In | Purpose |
| --- | --- | --- |
| `findr_conditions_latest` | `202509290001_create_findr_conditions_snapshots.sql` | `SELECT DISTINCT ON (rectangle_code)` latest snapshot per rectangle. API `/api/findr/conditions` uses this for fresh data. |
| `datras_monthly_abundance_long` | `202509300001_add_datras_support.sql` | Unpivots monthly abundance columns to long form while mapping to `ices_rectangles.id`. |
| `species_datras_quarterly_support` | same migration | Aggregates monthly abundance into quarterly means/peaks with `has_datras` flag. |
| `species_frequency_with_datras` | same migration | Left-joins datras support onto `species_frequency` by `rectangle_id` (UUID), `species_id`, `quarter`; adds `datras_mean_abundance`, `presence_qualifier`. |

### Functions & RPCs

| Function | Notes |
| --- | --- |
| `get_fishing_predictions(rectangle_code_input text, prediction_date_input date, user_language text)` | Canonical RPC returning deck predictions, called by `/api/findr/predictions`. Typed table-returning version remains; JSON stub removed in `202509300002_remove_stub_get_fishing_predictions.sql` to avoid PostgREST conflicts. |
| `get_monthly_abundance_json(...)` | Diagnostic helper introduced in same migration for quick JSON view of monthly abundance (not used by app). |

---

## 🌊 Data ingestion & cron jobs

### Scripts

| Script | Description | Credentials |
| --- | --- | --- |
| `scripts/ingestFindrConditions.ts` | Hydrates `findr_conditions_snapshots` by probing MET Norway, Open-Meteo, and Stormglass. Supports env toggles (`FINDR_CONDITIONS_LIMIT`, `FINDR_MET_ONLY`, etc.). See `docs/FINDR_CONDITIONS_INGESTION.md` for full playbook. | Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Stormglass key optional but recommended. |
| `scripts/ingestFindrConditionsBatched.ts` | Batch variant for long-running schedules, respects batch size/interval envs. | Same as above. |
| `scripts/seedFindrConditionsSnapshot.ts` | Seeds fallback snapshot payloads for local/dev testing. | Needs Supabase service key. |
| `scripts/seedFindrRectangles.ts` | Seeds `findr_rectangles` from `lib/findr/fallbackRectangles.ts`. | Service role key. |
| `scripts/uploadMonthlyAbundance.ts` | Loads DATRAS JSON dumps into `species_monthly_abundance`. | Service role key. |
| `scripts/env-sync.ts` | Syncs env variables across `.env` files (handy for Supabase creds). |

### Scheduled workflows (GitHub Actions)
From `docs/FINDR_CONDITIONS_INGESTION.md`:

| Workflow | Cron | Command | Purpose |
| --- | --- | --- | --- |
| `FINDR MET Norway ingestion (4x daily)` | `0 */6 * * *` | `FINDR_MET_ONLY=1 FINDR_MET_SIMPLE_PROBES=1 npx tsx scripts/ingestFindrConditions.ts` | High-frequency MET refresh without fallbacks. |
| `FINDR Open-Meteo ingestion (daily)` | `30 2 * * *` | `FINDR_MET_SIMPLE_PROBES=1 npx tsx scripts/ingestFindrConditions.ts` | Daily run allowing Open-Meteo fallback (no Stormglass). |
| Optional Stormglass run | On-demand or separate cron | Provide `STORMGLASS_SECRET_KEY` | Fill metrics when MET + Open-Meteo fail. |

### Data flow highlights
1. `ingestFindrConditions.ts` reads rectangles (Supabase → fallback list). Nudges coordinates, fetches marine metrics, upserts snapshots.
2. View `findr_conditions_latest` surfaces most recent snapshot; Next.js API returns fallback if missing.
3. `uploadMonthlyAbundance.ts` populates DATRAS monthly data -> view pipeline -> exposed via `species_frequency_with_datras` for future UI use.
4. Prediction RPC `get_fishing_predictions` composes weekly deck + JSON helpers; API caches responses in `findr_prediction_sessions` to prevent repeated RPC hits.

---

## 🧭 Pages & routes (`/pages/findr/*`)

| Path | Description | Key dependencies |
| --- | --- | --- |
| `/findr/index.tsx` | Main Findr deck (“Catch of the day”) with fish cards, predictions, favourites, settings. | Hooks: `useFishingPredictions`, `useFindrRectangleOptions`, `usePersistentFindrSettings`; components: `FindrNavigation`, `SettingsForm`, `FishSpeciesModal`, `FindrModal`; maps predictions via `lib/findr/mapPrediction`. |
| `/findr/favourites.tsx` | Favourite species insights surface. | Hook `useFavouriteInsights`; API `/api/findr/favourites-insights`. |
| `/findr/log.tsx` | Prototype catch log UI (currently mock data but references future Supabase schema). | Will eventually integrate with catch tables from migration plan docs. |
| `/findr/conditions.tsx` | Marine conditions dashboard + moon widget. | Hook `useFindrConditions` (calls `/api/findr/conditions`); `ConditionsDashboard`, `MoonWidget`, `SettingsForm`. |
| `/findr/info.tsx` / `findr-info-page.tsx` | Marketing/educational pages describing algorithm, data sources. | Static content; rely on `FindrNavigation`. |

### Shared components (`/components/findr/*`)

| Component | Purpose |
| --- | --- |
| `FindrNavigation.tsx` | Horizontal nav tabs across Findr sections. |
| `SettingsForm.tsx` | Shared control panel for area selection, language, prediction date, deck tools. |
| `ConditionsDashboard.tsx` / `ConditionsMap.tsx` | Present marine metrics and map overlays using data from `useFindrConditions`. |
| `FishSpeciesModal.tsx` | Modal with species details and tips. |
| `FindrInfoModal.tsx` | Rich narrative about Findr algorithm (used in marketing experiences). |
| `MoonWidget.tsx` | Pulls `/api/moon` (leveraging `moon_cache`) to show lunar guidance. |
| `Modal.tsx`, `FindrModal.tsx` | Generic modal wrappers. |

### Hooks (`/hooks/*`)

| Hook | Description |
| --- | --- |
| `useFishingPredictions.ts` | POST `/api/findr/predictions`; handles caching, localization result augmentation, and errors. |
| `useFindrRectangleOptions.ts` | GET `/api/findr/rectangles`; merges Supabase vs fallback sources. |
| `useFindrConditions.ts` | GET `/api/findr/conditions`; surfaces fallback vs Supabase source. |
| `useFavouriteInsights.ts` | POST `/api/findr/favourites-insights`. |
| `usePersistentFindrSettings.ts` | LocalStorage persistence for rectangle code, date, language. |
| `useSharing.ts` | Social sharing for Findr results (links to `/findr/sharing/...`). |

---

## 🔌 API routes (`/pages/api/findr/*.ts`)

| Route | Method | Description | Supabase touchpoints |
| --- | --- | --- | --- |
| `/api/findr/predictions` | POST | Validates rectangle + date, reads cache (`findr_prediction_sessions`), falls back to Supabase REST RPC `get_fishing_predictions`. Augments with localized names from `species` table. | Uses service client via server-side; writes cache entries with TTL; warns if schema missing. |
| `/api/findr/conditions` | GET | Normalizes rectangle code, loads metadata from `findr_rectangles` or `ices_rectangles`, queries `findr_conditions_latest`, returns fallback payload if missing. | Accesses Supabase view; logs when falling back; respects `x-findr-conditions-source` header. |
| `/api/findr/favourites-insights` | POST | Batch loads `findr_favourite_stats` rows for given species IDs. | Returns fallback on table missing/ errors. |
| `/api/findr/rectangles` | GET | Attempts `findr_rectangles` (prefers coastal) then `ices_rectangles`, returning sorted options; handles missing tables gracefully. |

> **Other APIs**: `/api/fishing/predictions.ts` uses Supabase RPC directly plus `weather_predictions` caching; ties into broader weather service but outside this readme’s scope.

---

## 📦 Supporting libraries & data files

- `lib/findr/fallbackRectangles.ts` – curated rectangles used when Supabase unavailable.
- `lib/findr/fallbackConditions.ts` – static marine payload fallback.
- `lib/findr/mapPrediction.ts` – transforms prediction RPC rows into display-ready cards (emoji, bios, localized names).
- `data/findrFishBios.ts` + `data/speciesImageMap.ts` – fun bios and imagery for deck presentation.
- `docs/Supabase Snippet *.csv` – snapshots from Supabase inspector listing columns, indexes, coastal samples (valuable for quick lookups). Keep them updated when schema changes.

---

## 🛠️ Local setup & credentials

1. Ensure `.env.local` contains Supabase credentials. Use `npm run env:sync -- --from .env.example --to .env.local` (or similar) to copy fields.
2. Required keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (for scripts)
   - `SUPABASE_ANON_KEY` (for API routes)
   - Optional: `STORMGLASS_SECRET_KEY`, `OPEN_METEO_*`, etc., for ingestion scripts.
3. Supabase CLI configured with project ref `swmviqpxetwziqxhzldh`. Use `supabase db push` to apply migrations.
4. For local Postgres diff introspection you’ll need Docker running (`supabase db diff` uses shadow DB).

---

## 🚨 Troubleshooting & notes

- **Migration gotchas**: `202509300001_add_datras_support.sql` must join `species_monthly_abundance` with `ices_rectangles` to align UUID comparisons; failure manifests as `operator does not exist: text = uuid` during `supabase db push`.
- **Prediction cache**: If `findr_prediction_sessions` missing, API logs warning and bypasses cache. Create table before enabling caching in production.
- **RLS warnings**: Address flagged tables before exposing to clients. At minimum restrict `findr_conditions_snapshots` and `findr_rectangles` to service role if using public endpoints.
- **Stormglass quota**: Cron strategy separates MET-only and fallback runs. Monitor success logs to ensure coverage.
- **Moon data**: `moon_cache` ensures `/api/moon` stays performant; run migration `202509300003` if missing columns.

---

## 📈 Future enhancements & TODOs

- Implement catch log schema from `docs/FINDR_CATCH_LOG_MIGRATION_PLAN.md` and hook `/findr/log.tsx` into Supabase tables (`findr_catch_entries`).
- Add Supabase row-level security policies for public tables, especially if exposing via client SDK.
- Surface DATRAS qualifiers (`species_frequency_with_datras`) in UI once backend endpoints return new fields (update `mapPrediction`).
- Create monitoring dashboards for ingestion success/failures (e.g., Supabase functions logs, third-party API quotas).
- Automate cleanup for `findr_prediction_sessions` and stale `moon_cache` entries.

---

## 📚 Reference links

- **Docs**: `docs/FINDR_CONDITIONS_INGESTION.md`, `docs/FINDR_CATCH_LOG_MIGRATION_PLAN.md`, Supabase CSV inventories.
- **Supabase CLI**: `supabase login`, `supabase link --project-ref swmviqpxetwziqxhzldh`, `supabase db push`.
- **Primary migrations**: `202509290001_create_findr_conditions_snapshots.sql`, `202509300001_add_datras_support.sql`, `202509300002_remove_stub_get_fishing_predictions.sql`, `202509300003_ensure_moon_cache_schema.sql`.
- **Key scripts**: `scripts/ingestFindrConditions.ts`, `scripts/uploadMonthlyAbundance.ts`, `scripts/seedFindrRectangles.ts`.

Let this serve as the single source of truth for Findr’s backend and application surface. Update sections as new tables, pages, or pipelines are introduced.
