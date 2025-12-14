# wotnow
React PWA for WotNow Activity Companion

## Environment helpers

Sync the core backend secrets from `.env.local` into a CLI-friendly env file (default `.env.cli`) so one-off Node/TSX scripts pick up the same credentials:

```
npm run env:sync
```

Options:

- `npm run env:sync -- --from .env.local --to supabase/.env` – copy into a different target file.
- Add `--all` to copy every key instead of the curated subset (`SUPABASE_*`, `MOON_API_KEY`, etc.).

The generated file is safe to add to `.gitignore`; it’s meant for local usage only.

## Supabase migrations

New migrations live under `supabase/migrations`. To ensure the moon cache table exists (required for `/api/moon` caching), run the latest migrations against your Supabase project:

```
supabase db push
```

The migration `202509300003_ensure_moon_cache_schema.sql` creates or upgrades `public.moon_cache` with the columns used by the moon service and adds protective indexes.

## Findr Validation System

The app includes a comprehensive catch logging and validation system for fishing predictions. Key features:

- **Automatic Validation**: Links prediction views to actual catch outcomes
- **User-Friendly Logging**: Time picker, validation questions, and blank trip recording
- **Real-time Sync**: API integration with localStorage fallback for offline use
- **Data Quality**: Rate limiting, environmental snapshots, and comprehensive logging

### Quick Start

1. Run migrations: `supabase db push`
2. Seed test data: `npm run seed:findr-validation`  
3. Navigate to `/findr/log` to test the catch logging interface

### API Endpoints

- `POST /api/findr/record-impression` - Track prediction views
- `GET/POST /api/findr/catch-log` - Manage catch entries  
- `POST /api/findr/record-blank-trip` - Log unsuccessful trips

### Documentation

See `docs/FINDR_VALIDATION_SYSTEM.md` for complete implementation details, database schema, API reference, and usage examples.

## Database Schema
See `docs/Supabase Snippet Public Schema Column Inventory-2.csv` for the complete Supabase database schema reference.

## Powered By

This project uses the following APIs and services:

- 🌱 **[Plant.id API](https://plant.id)** - AI-powered plant identification for the Grow Daisy gardening feature
- 🌿 **[Perenual API](https://perenual.com)** - Comprehensive plant care database
- 🌤️ **[OpenWeather](https://openweathermap.org)** - Weather data and forecasts
- 🗺️ **[Google Maps](https://developers.google.com/maps)** - Location services
- 🔐 **[Supabase](https://supabase.com)** - Database and authentication