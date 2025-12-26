# Local Pages Generator

This script generates data-driven local landing pages for Findr.

Usage (CI):

1. Provide these environment variables in your CI environment:
   - `SUPABASE_URL` - your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - service role key (or another key with read access)

2. Run the script before building the site:

```bash
node scripts/generate-local-pages.js
```

What it does:
- Fetches up to 1000 coastal rectangles from `ices_rectangles` ordered by `priority_level`.
- Attempts to fetch top species for each rectangle from the `predictions` table (best-effort).
- Writes `data/local/{rectangle}.json` for each rectangle and a `data/local-manifest.json`.
- Caches results in `.next/local-pages-cache.json` for 7 days by default to avoid repeated Supabase calls during frequent builds.

Config:
- `LOCAL_PAGES_CACHE_TTL_MS` overrides the cache TTL in milliseconds.

Notes:
- The script attempts a best-effort query for a `predictions` table — if your schema differs, update the query in `scripts/generate-local-pages.js`.
- The generator is conservative: if Supabase credentials are missing the script falls back to `lib/findr/rectangles.js` and produces minimal JSON files suitable for a pilot.

CI integration example (GitHub Actions):

```yaml
- name: Generate local pages
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: node scripts/generate-local-pages.js
```
